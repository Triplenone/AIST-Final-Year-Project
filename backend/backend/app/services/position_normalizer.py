"""Normalize elderly-care indoor positioning payloads for Mongo upstream."""

from __future__ import annotations

from typing import Any, Dict, Iterable, Optional

SCHEMA_VERSION = 2
SCENARIO = "elderly_care"
COORDINATE_SPACE = "elderly_care_v1"
MAP_ASSET = "ElderlyCare.png"
MAP_WIDTH_PX = 1755
MAP_HEIGHT_PX = 2309
REAL_WIDTH_M = 12.0
REAL_HEIGHT_M = 16.0


ZONE_INFO: Dict[str, Dict[str, Any]] = {
    "door1": {"location_zone_id": 1, "name": "Door 1"},
    "door2": {"location_zone_id": 2, "name": "Door 2"},
    "nurse_station": {"location_zone_id": 3, "name": "Nurse Station"},
    "activity_room": {"location_zone_id": 4, "name": "Activity Room"},
    "rehabilitation_room": {"location_zone_id": 5, "name": "Rehabilitation Room"},
    "central_common_area": {"location_zone_id": 6, "name": "Central Common Area"},
    "toilet": {"location_zone_id": 7, "name": "Toilet"},
    "bedroom": {"location_zone_id": 8, "name": "Bedroom"},
}

ZONE_ID_TO_KEY = {
    int(value["location_zone_id"]): key for key, value in ZONE_INFO.items()
}

NAME_ALIASES = {
    "door 1": "door1",
    "door1": "door1",
    "entrance": "door1",
    "main entrance": "door1",
    "check-in": "activity_room",
    "check in": "activity_room",
    "checkin": "activity_room",
    "activity": "activity_room",
    "activity room": "activity_room",
    "customer services": "nurse_station",
    "customer service": "nurse_station",
    "nurse station": "nurse_station",
    "security": "rehabilitation_room",
    "security check": "rehabilitation_room",
    "rehabilitation": "rehabilitation_room",
    "rehabilitation room": "rehabilitation_room",
    "rehabilitaion room": "rehabilitation_room",
    "gate": "bedroom",
    "gate 10": "bedroom",
    "gate 11": "bedroom",
    "boarding gate": "bedroom",
    "gate a12": "bedroom",
    "bedroom": "bedroom",
    "toilet": "toilet",
    "restroom": "toilet",
    "washroom": "toilet",
    "baggage": "central_common_area",
    "baggage services": "central_common_area",
    "public concourse": "central_common_area",
    "immigration & customs": "central_common_area",
    "immigration and customs": "central_common_area",
    "central common area": "central_common_area",
    "common area": "central_common_area",
    "door 2": "door2",
    "door2": "door2",
    "exit": "door2",
}

BEACON_ALIASES: Dict[str, Dict[str, Any]] = {
    "20:a7:16:60:f7:c4": {"alias": "Activity Room Beacon 1", "zone_key": "activity_room", "x_m": 7.6, "y_m": 14.6},
    "20:a7:16:60:eb:73": {"alias": "Activity Room Beacon 2", "zone_key": "activity_room", "x_m": 7.6, "y_m": 14.6},
    "20:a7:16:60:f7:ca": {"alias": "Nurse Station Beacon 1", "zone_key": "nurse_station", "x_m": 6.2, "y_m": 4.0},
    "20:a7:16:61:02:42": {"alias": "Nurse Station Beacon 2", "zone_key": "nurse_station", "x_m": 6.2, "y_m": 4.0},
    "20:a7:16:5e:ef:24": {"alias": "Rehabilitation Room Beacon 1", "zone_key": "rehabilitation_room", "x_m": 6.6, "y_m": 10.4},
    "20:a7:16:61:02:03": {"alias": "Rehabilitation Room Beacon 2", "zone_key": "rehabilitation_room", "x_m": 6.6, "y_m": 10.4},
    "20:a7:16:61:02:3f": {"alias": "Toilet Beacon 1", "zone_key": "toilet", "x_m": 1.6, "y_m": 2.2},
    "20:a7:16:61:02:2a": {"alias": "Toilet Beacon 2", "zone_key": "toilet", "x_m": 1.6, "y_m": 2.2},
    "20:a7:16:61:09:40": {"alias": "Bedroom Beacon 1", "zone_key": "bedroom", "x_m": 4.4, "y_m": 1.8},
    "20:a7:16:60:fb:ff": {"alias": "Bedroom Beacon 2", "zone_key": "bedroom", "x_m": 4.4, "y_m": 1.8},
    "20:a7:16:5e:bc:32": {"alias": "Bedroom Beacon 3", "zone_key": "bedroom", "x_m": 8.0, "y_m": 1.8},
    "20:a7:16:60:f3:d9": {"alias": "Bedroom Beacon 4", "zone_key": "bedroom", "x_m": 8.0, "y_m": 1.8},
}


def _as_record(value: Any) -> Optional[Dict[str, Any]]:
    if isinstance(value, dict):
        return value
    return None


def _to_float(value: Any) -> Optional[float]:
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)):
        if value != value:
            return None
        return float(value)
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        try:
            parsed = float(text)
            if parsed != parsed:
                return None
            return parsed
        except ValueError:
            return None
    return None


def _to_int(value: Any) -> Optional[int]:
    if isinstance(value, bool) or value is None:
        return None
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    return parsed


def _norm_text(value: Any) -> Optional[str]:
    if not isinstance(value, str):
        return None
    text = value.strip()
    return text or None


def _zone_key_from_name(value: Any) -> Optional[str]:
    text = _norm_text(value)
    if not text:
        return None
    lowered = " ".join(text.lower().replace("_", " ").split())
    if lowered in NAME_ALIASES:
        return NAME_ALIASES[lowered]
    for token, zone_key in NAME_ALIASES.items():
        if token in lowered:
            return zone_key
    return None


def _zone_key_from_id(value: Any) -> Optional[str]:
    zone_id = _to_int(value)
    if zone_id is None:
        return None
    return ZONE_ID_TO_KEY.get(zone_id)


def _zone_key_from_coords(x_m: Optional[float], y_m: Optional[float]) -> Optional[str]:
    if x_m is None or y_m is None:
        return None
    if y_m < 3.2 and x_m >= 4.0:
        return "bedroom"
    if y_m < 3.6 and x_m < 4.0:
        return "toilet"
    if y_m >= 12.0 and x_m < 4.0:
        return "nurse_station"
    if y_m >= 12.0 and x_m < 8.0:
        return "activity_room"
    if y_m >= 12.0:
        return "rehabilitation_room"
    if 8.0 <= y_m < 12.0 and x_m >= 4.0:
        return "rehabilitation_room"
    if 3.2 <= y_m < 8.0 and 4.0 <= x_m < 8.0:
        return "nurse_station"
    return "central_common_area"


def _zone_info(zone_key: Optional[str]) -> Dict[str, Any]:
    if zone_key and zone_key in ZONE_INFO:
        return ZONE_INFO[zone_key]
    return {}


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def _meters_from_point(source: Dict[str, Any], axis: str, real_size: float, pixel_size: int) -> Optional[float]:
    meter = _to_float(source.get(f"{axis}_m"))
    if meter is not None:
        return _clamp(meter, 0.0, real_size)
    direct = _to_float(source.get(axis))
    if direct is not None:
        return _clamp(direct, 0.0, real_size)
    ratio = _to_float(source.get(f"{axis}_ratio"))
    if ratio is not None:
        return _clamp(ratio, 0.0, 1.0) * real_size
    pixel = _to_float(source.get(f"{axis}_px"))
    if pixel is not None:
        return _clamp(pixel, 0.0, float(pixel_size)) / float(pixel_size) * real_size
    return None


def _normalize_point(source: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not source:
        return None
    x_m = _meters_from_point(source, "x", REAL_WIDTH_M, MAP_WIDTH_PX)
    y_m = _meters_from_point(source, "y", REAL_HEIGHT_M, MAP_HEIGHT_PX)
    if x_m is None or y_m is None:
        return None

    zone_key = (
        _zone_key_from_id(source.get("location_zone_id"))
        or _zone_key_from_id(source.get("zone_id"))
        or _zone_key_from_id(source.get("locationZoneId"))
        or _zone_key_from_name(source.get("zone_key"))
        or _zone_key_from_name(source.get("name"))
        or _zone_key_from_coords(x_m, y_m)
    )
    info = _zone_info(zone_key)
    x_ratio = _clamp(x_m / REAL_WIDTH_M, 0.0, 1.0)
    y_ratio = _clamp(y_m / REAL_HEIGHT_M, 0.0, 1.0)

    return {
        "x_m": round(x_m, 4),
        "y_m": round(y_m, 4),
        "x_ratio": round(x_ratio, 6),
        "y_ratio": round(y_ratio, 6),
        "x_px": int(round(x_ratio * MAP_WIDTH_PX)),
        "y_px": int(round(y_ratio * MAP_HEIGHT_PX)),
        "location_zone_id": info.get("location_zone_id"),
        "zone_key": zone_key,
        "name": info.get("name") or _norm_text(source.get("name")),
        "accuracy_m": _to_float(source.get("accuracy_m") or source.get("accuracy")),
        "quality": _norm_text(source.get("quality") or source.get("position_quality")),
    }


def _iter_beacon_sources(position: Dict[str, Any], location: Dict[str, Any]) -> Iterable[Any]:
    for value in (position.get("beacons"), location.get("beacons"), location.get("beacons_used")):
        if isinstance(value, list):
            yield from value
    current = _as_record(location.get("current")) or {}
    value = current.get("beacons_used")
    if isinstance(value, list):
        yield from value


def _normalize_beacon(item: Any) -> Optional[Dict[str, Any]]:
    if isinstance(item, str):
        source: Dict[str, Any] = {"mac": item}
    elif isinstance(item, dict):
        source = item
    else:
        return None

    mac = _norm_text(source.get("mac") or source.get("uuid") or source.get("beacon_mac") or source.get("id"))
    if not mac:
        return None
    mac_key = mac.lower()
    known = BEACON_ALIASES.get(mac_key, {})
    zone_key = known.get("zone_key") or _zone_key_from_name(source.get("zone_key") or source.get("name"))
    info = _zone_info(zone_key)
    x_m = _to_float(source.get("x_m") or source.get("x") or known.get("x_m"))
    y_m = _to_float(source.get("y_m") or source.get("y") or known.get("y_m"))
    out: Dict[str, Any] = {
        "mac": mac_key,
        "alias": known.get("alias") or _norm_text(source.get("alias")) or mac,
        "zone_key": zone_key,
        "location_zone_id": info.get("location_zone_id"),
        "name": info.get("name"),
        "x_m": round(x_m, 4) if x_m is not None else None,
        "y_m": round(y_m, 4) if y_m is not None else None,
        "rssi": _to_int(source.get("rssi") or source.get("last_rssi")),
        "distance_m": _to_float(source.get("distance_m") or source.get("distance")),
        "confidence": _to_float(source.get("confidence")),
    }
    return {k: v for k, v in out.items() if v is not None}


def normalize_position_payload(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Return a canonical elderly-care position block, or None when no position exists."""
    position = _as_record(data.get("position")) or {}
    location = _as_record(data.get("location")) or {}

    current_source = _as_record(position.get("current")) or _as_record(location.get("current"))
    if current_source is None and any(key in location for key in ("x", "y", "x_m", "y_m", "x_ratio", "y_ratio")):
        current_source = location
    target_source = _as_record(position.get("target")) or _as_record(location.get("target"))

    current = _normalize_point(current_source)
    target = _normalize_point(target_source)
    beacons = [
        beacon for beacon in (_normalize_beacon(item) for item in _iter_beacon_sources(position, location)) if beacon
    ]
    if current is None and target is None and not beacons:
        return None

    normalized: Dict[str, Any] = {
        "coordinate_space": COORDINATE_SPACE,
        "origin": "top-left",
        "map_asset": MAP_ASSET,
        "map_width_px": MAP_WIDTH_PX,
        "map_height_px": MAP_HEIGHT_PX,
        "real_width_m": REAL_WIDTH_M,
        "real_height_m": REAL_HEIGHT_M,
    }
    if current is not None:
        normalized["current"] = current
    if target is not None:
        normalized["target"] = target
    if beacons:
        normalized["beacons"] = beacons
    return normalized
