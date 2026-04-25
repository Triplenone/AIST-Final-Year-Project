"""MongoDB raw upstream query routes."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from bson.objectid import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.db.mongo import COLLECTION_RAW_UPSTREAM, get_mongo_db
from app.services.elderly_device_queries import VITALS_UPSTREAM_DATA_TYPES, devices_by_elderly_user_ids
from app.services.sensor_vitals_extract import extract_hr_spo2_from_sensors

router = APIRouter()


def _mongo_unavailable(exc: Exception) -> HTTPException:
    return HTTPException(
        status_code=503,
        detail={
            "message": "MongoDB raw upstream is unavailable",
            "db_name": settings.MONGO_DB_NAME,
            "collection": COLLECTION_RAW_UPSTREAM,
            "error": str(exc),
        },
    )


def _get_collection():
    db = get_mongo_db()
    return db[COLLECTION_RAW_UPSTREAM]


def _apply_time_range_server_received_ms(
    query: Dict[str, Any],
    start_ts: Optional[int],
    end_ts: Optional[int],
) -> None:
    """
    start_ts / end_ts from the frontend are Unix epoch in milliseconds (Date.now()).
    Filter on server_received_at. Device payload `timestamp` is often not comparable
    (e.g. small integers or non-ms values) and would otherwise return zero rows.
    """
    if start_ts is None and end_ts is None:
        return
    bounds: Dict[str, Any] = {}
    if start_ts is not None:
        bounds["$gte"] = datetime.fromtimestamp(start_ts / 1000.0, tz=timezone.utc)
    if end_ts is not None:
        bounds["$lte"] = datetime.fromtimestamp(end_ts / 1000.0, tz=timezone.utc)
    query["server_received_at"] = bounds


def _serialize_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    if not doc:
        return doc
    out = _deep_serialize_mongo_value(dict(doc))
    if "_id" in out:
        out["_id"] = str(out["_id"])
    return out


def _to_iso_utc(value: Any) -> Any:
    if isinstance(value, datetime):
        dt = value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat()
    return value


def _deep_serialize_mongo_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: _deep_serialize_mongo_value(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_deep_serialize_mongo_value(v) for v in value]
    return _to_iso_utc(value)


def _resolve_device_filter_candidates(raw_device_id: str) -> Tuple[List[str], List[int]]:
    """
    双读策略：输入可为外部设备 ID（ESP32_...）或 MySQL 数字 ID（1/2/...）。
    返回候选：
    - device_id 字段：字符串候选（外部 ID + 数字字符串）
    - mysql_device_id 字段：数字候选
    """
    raw = (raw_device_id or "").strip()
    if not raw:
        return ([], [])

    text_candidates: List[str] = [raw]
    int_candidates: List[int] = []

    mapped = settings.device_id_map.get(raw)
    if mapped is not None:
        int_candidates.append(int(mapped))
        text_candidates.append(str(int(mapped)))

    reverse_map = {str(v): k for k, v in settings.device_id_map.items()}
    external = reverse_map.get(raw)
    if external:
        text_candidates.append(external)
        try:
            int_candidates.append(int(raw))
        except ValueError:
            pass

    try:
        parsed = int(raw)
        int_candidates.append(parsed)
    except ValueError:
        pass

    text_unique = list(dict.fromkeys([x for x in text_candidates if x]))
    int_unique = list(dict.fromkeys([x for x in int_candidates if x > 0]))
    return (text_unique, int_unique)


def _apply_device_id_filter(query: Dict[str, Any], raw_device_id: Optional[str]) -> None:
    if raw_device_id is None:
        return
    text_ids, int_ids = _resolve_device_filter_candidates(raw_device_id)
    clauses: List[Dict[str, Any]] = []
    if text_ids:
        clauses.append({"device_id": {"$in": text_ids} if len(text_ids) > 1 else text_ids[0]})
    if int_ids:
        clauses.append({"mysql_device_id": {"$in": int_ids} if len(int_ids) > 1 else int_ids[0]})
    if not clauses:
        return
    if len(clauses) == 1:
        query.update(clauses[0])
    else:
        query["$or"] = clauses


def _extract_vitals_from_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    sensors = payload.get("sensors") or {}
    hr, spo2 = extract_hr_spo2_from_sensors(sensors)
    spo2_int = int(round(spo2)) if spo2 is not None else None

    body_temp = sensors.get("body_temperature") or sensors.get("temperature")
    if isinstance(body_temp, dict):
        body_temp = body_temp.get("value") or body_temp.get("celsius")

    return {
        "hr": hr,
        "heart_rate": hr,
        "spo2": spo2_int,
        "body_temperature": body_temp,
        "resp_rate": sensors.get("resp_rate") or sensors.get("respiratory_rate"),
        "hrv": sensors.get("hrv"),
    }


def _to_vitals_item(doc: Dict[str, Any]) -> Dict[str, Any]:
    payload = doc.get("payload") or {}
    return {
        "_id": str(doc.get("_id")) if doc.get("_id") else None,
        "device_id": doc.get("device_id") or payload.get("device_id"),
        "mysql_device_id": doc.get("mysql_device_id") or payload.get("mysql_device_id"),
        "timestamp": doc.get("timestamp") or payload.get("timestamp"),
        "server_received_at": _to_iso_utc(doc.get("server_received_at")),
        "data_type": doc.get("data_type"),
        "sensors": payload.get("sensors") or doc.get("sensors"),
        "vitals": _extract_vitals_from_payload(payload),
        "raw_payload": payload,
    }


def _to_finite_float(value: Any) -> Optional[float]:
    if isinstance(value, (int, float)):
        if value != value:  # NaN
            return None
        return float(value)
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        try:
            parsed = float(text)
            if parsed != parsed:  # NaN
                return None
            return parsed
        except ValueError:
            return None
    return None


def _extract_current_location_from_doc(doc: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    payload = doc.get("payload") or {}
    location = payload.get("location") or doc.get("location") or {}
    if not isinstance(location, dict):
        return None
    current = location.get("current") or {}
    if not isinstance(current, dict):
        return None

    x = _to_finite_float(current.get("x"))
    y = _to_finite_float(current.get("y"))
    if x is None or y is None:
        return None

    name = current.get("name")
    if not isinstance(name, str):
        name = None
    elif not name.strip():
        name = None
    else:
        name = name.strip()

    zone_id = (
        current.get("location_zone_id")
        or current.get("zone_id")
        or current.get("locationZoneId")
    )
    return {
        "x": x,
        "y": y,
        "location_name": name,
        "location_zone_id": zone_id,
    }


@router.get("/status", response_model=Dict[str, Any])
async def mongo_upstream_status():
    out = {
        "connected": False,
        "db_name": settings.MONGO_DB_NAME,
        "collection": COLLECTION_RAW_UPSTREAM,
        "document_count": None,
        "error": None,
    }
    try:
        coll = _get_collection()
        out["document_count"] = await coll.count_documents({})
        out["connected"] = True
    except Exception as exc:
        out["error"] = str(exc)
    return out


@router.post("/seed", response_model=Dict[str, Any])
async def seed_one_document(data: Dict[str, Any]):
    from app.services.mongo_raw_upstream import save_raw_upstream

    await save_raw_upstream(data)
    return {
        "status": "ok",
        "message": "Inserted one raw upstream document. Query it via /latest or /.",
    }


@router.get("/", response_model=Dict[str, Any])
async def list_raw_upstream(
    device_id: Optional[str] = Query(None, description="Filter by external device ID"),
    data_type: Optional[str] = Query(None, description="Filter by data_type"),
    start_ts: Optional[int] = Query(
        None,
        description="Start time, Unix epoch milliseconds; filters server_received_at (UTC)",
    ),
    end_ts: Optional[int] = Query(
        None,
        description="End time, Unix epoch milliseconds; filters server_received_at (UTC)",
    ),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Page size"),
):
    query: Dict[str, Any] = {}
    _apply_device_id_filter(query, device_id)
    if data_type is not None:
        query["data_type"] = data_type
    _apply_time_range_server_received_ms(query, start_ts, end_ts)

    try:
        coll = _get_collection()
        skip = (page - 1) * page_size
        cursor = coll.find(query).sort("server_received_at", -1).skip(skip).limit(page_size)

        items: List[Dict[str, Any]] = []
        async for doc in cursor:
            items.append(_serialize_doc(doc))

        total = await coll.count_documents(query)
    except Exception as exc:
        raise _mongo_unavailable(exc) from exc

    return {"page": page, "page_size": page_size, "total": total, "items": items}


@router.get("/latest", response_model=Dict[str, Any])
async def get_latest_for_position_panel(
    device_id: Optional[str] = Query(
        None,
        description="Filter by external device ID, for example ESP32_00005CFA7AD4DB1C",
    ),
    data_type: Optional[str] = Query(
        None,
        description="Filter by data_type, for example status_update",
    ),
    exclude_data_type: Optional[str] = Query(
        None,
        description="Exclude one data_type, for example flight",
    ),
):
    query: Dict[str, Any] = {}
    if data_type and data_type.strip():
        query["data_type"] = data_type.strip()
    elif exclude_data_type and exclude_data_type.strip():
        query["data_type"] = {"$ne": exclude_data_type.strip()}
    _apply_device_id_filter(query, device_id)

    try:
        doc = await _get_collection().find_one(query, sort=[("server_received_at", -1)])
    except Exception as exc:
        raise _mongo_unavailable(exc) from exc

    if doc is None:
        return {}

    payload = doc.get("payload") or {}
    return {
        "_id": str(doc["_id"]) if doc.get("_id") else None,
        "device_id": doc.get("device_id") or payload.get("device_id"),
        "mysql_device_id": doc.get("mysql_device_id") or payload.get("mysql_device_id"),
        "timestamp": doc.get("timestamp") or payload.get("timestamp"),
        "server_received_at": _to_iso_utc(doc.get("server_received_at")),
        "location": payload.get("location") or doc.get("location"),
        "fall_detection": payload.get("fall_detection") or doc.get("fall_detection"),
        "sos": payload.get("sos") or doc.get("sos"),
        "sensors": payload.get("sensors") or doc.get("sensors"),
        "system": payload.get("system") or doc.get("system"),
    }


@router.get("/vitals/latest", response_model=Dict[str, Any])
async def get_latest_vitals(
    device_id: str = Query(..., description="External device ID"),
):
    query: Dict[str, Any] = {"data_type": {"$in": VITALS_UPSTREAM_DATA_TYPES}}
    _apply_device_id_filter(query, device_id)
    try:
        doc = await _get_collection().find_one(query, sort=[("server_received_at", -1)])
    except Exception as exc:
        raise _mongo_unavailable(exc) from exc

    if doc is None:
        return {
            "found": False,
            "device_id": device_id,
            "message": "No vitals upstream data found for this device",
        }

    return {"found": True, "item": _to_vitals_item(doc)}


@router.get("/location/latest", response_model=Dict[str, Any])
async def get_latest_valid_location(
    device_id: str = Query(..., description="External device ID or MySQL device ID"),
    scan_limit: int = Query(200, ge=1, le=1000, description="Max recent docs to scan"),
):
    query: Dict[str, Any] = {}
    _apply_device_id_filter(query, device_id)
    if not query:
        return {"found": False, "device_id": device_id, "message": "No device filter resolved"}

    try:
        coll = _get_collection()
        cursor = coll.find(query).sort("server_received_at", -1).limit(scan_limit)
        async for doc in cursor:
            location = _extract_current_location_from_doc(doc)
            if not location:
                continue
            payload = doc.get("payload") or {}
            return {
                "found": True,
                "_id": str(doc.get("_id")) if doc.get("_id") else None,
                "device_id": doc.get("device_id") or payload.get("device_id"),
                "mysql_device_id": doc.get("mysql_device_id") or payload.get("mysql_device_id"),
                "server_received_at": _to_iso_utc(doc.get("server_received_at")),
                "x": location["x"],
                "y": location["y"],
                "location_name": location["location_name"],
                "location_zone_id": location["location_zone_id"],
            }
    except Exception as exc:
        raise _mongo_unavailable(exc) from exc

    return {
        "found": False,
        "device_id": device_id,
        "message": "No valid current.x/current.y location found in recent upstream documents",
    }


@router.get("/vitals/history", response_model=Dict[str, Any])
async def get_vitals_history(
    device_id: str = Query(..., description="External device ID"),
    start_ts: Optional[int] = Query(
        None,
        description="Start time, Unix epoch milliseconds; filters server_received_at (UTC)",
    ),
    end_ts: Optional[int] = Query(
        None,
        description="End time, Unix epoch milliseconds; filters server_received_at (UTC)",
    ),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Page size"),
):
    query: Dict[str, Any] = {"data_type": {"$in": VITALS_UPSTREAM_DATA_TYPES}}
    _apply_device_id_filter(query, device_id)
    _apply_time_range_server_received_ms(query, start_ts, end_ts)

    try:
        coll = _get_collection()
        skip = (page - 1) * page_size
        cursor = coll.find(query).sort("server_received_at", -1).skip(skip).limit(page_size)
        items: List[Dict[str, Any]] = []
        async for doc in cursor:
            items.append(_to_vitals_item(doc))
        total = await coll.count_documents(query)
    except Exception as exc:
        raise _mongo_unavailable(exc) from exc

    return {"page": page, "page_size": page_size, "total": total, "items": items}


@router.get("/vitals/user/{user_id}/history", response_model=Dict[str, Any])
async def get_vitals_history_for_user(
    user_id: int,
    start_ts: Optional[int] = Query(
        None,
        description="Start time, Unix epoch milliseconds; filters server_received_at (UTC)",
    ),
    end_ts: Optional[int] = Query(
        None,
        description="End time, Unix epoch milliseconds; filters server_received_at (UTC)",
    ),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Page size"),
    db: Session = Depends(get_db),
):
    """Bridge user_id -> device -> MongoDB vitals history."""
    devices = devices_by_elderly_user_ids(db, [user_id]).get(user_id) or []
    if not devices:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No device bound to user_id={user_id}. "
                "Set device.elderly_user_id or link device via user_status."
            ),
        )

    candidate_ids: List[str] = []
    reverse_map = {value: key for key, value in settings.device_id_map.items()}

    for dev in devices:
        candidate_ids.append(str(dev.device_id))
        if dev.mac_address:
            candidate_ids.append(str(dev.mac_address).strip())
        external_id = reverse_map.get(dev.device_id)
        if external_id:
            candidate_ids.append(str(external_id))

    candidate_ids = list(dict.fromkeys([c for c in candidate_ids if c]))

    query: Dict[str, Any] = {
        "device_id": {"$in": candidate_ids} if len(candidate_ids) > 1 else candidate_ids[0],
        "data_type": {"$in": VITALS_UPSTREAM_DATA_TYPES},
    }
    _apply_time_range_server_received_ms(query, start_ts, end_ts)

    try:
        coll = _get_collection()
        skip = (page - 1) * page_size
        cursor = coll.find(query).sort("server_received_at", -1).skip(skip).limit(page_size)
        items: List[Dict[str, Any]] = []
        async for doc in cursor:
            item = _to_vitals_item(doc)
            item["user_id"] = user_id
            items.append(item)
        total = await coll.count_documents(query)
    except Exception as exc:
        raise _mongo_unavailable(exc) from exc

    return {"page": page, "page_size": page_size, "total": total, "items": items}


@router.get("/flight/latest", response_model=Dict[str, Any])
async def get_latest_flight(
    device_id: Optional[str] = Query(None, description="Filter flight data by external device ID"),
):
    query: Dict[str, Any] = {"data_type": "flight"}
    _apply_device_id_filter(query, device_id)

    try:
        doc = await _get_collection().find_one(query, sort=[("server_received_at", -1)])
    except Exception as exc:
        raise _mongo_unavailable(exc) from exc

    if doc is None:
        return {
            "found": False,
            "message": (
                "No flight upstream data found. Publish to MQTT or POST /data-reception/flight "
                "with an optional device_id."
            ),
        }

    payload = doc.get("payload") or doc
    return {
        "found": True,
        "device_id": doc.get("device_id"),
        "mysql_device_id": doc.get("mysql_device_id"),
        "_id": str(doc["_id"]) if doc.get("_id") else None,
        "server_received_at": _to_iso_utc(doc.get("server_received_at")),
        "passengerName": payload.get("passengerName"),
        "flightNumber": payload.get("flightNumber"),
        "gate": payload.get("gate"),
        "flightTime": payload.get("flightTime"),
        "departureAirport": payload.get("departureAirport"),
        "arrivalAirport": payload.get("arrivalAirport"),
        "seatNumber": payload.get("seatNumber"),
    }


@router.get("/{doc_id}", response_model=Dict[str, Any])
async def get_raw_upstream(doc_id: str):
    try:
        object_id = ObjectId(doc_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid document ID") from exc

    try:
        doc = await _get_collection().find_one({"_id": object_id})
    except Exception as exc:
        raise _mongo_unavailable(exc) from exc

    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return _serialize_doc(doc)
