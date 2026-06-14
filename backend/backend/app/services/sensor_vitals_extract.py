"""Parse HR / SpO2 from MongoDB upstream `sensors` objects (nested or flat)."""

from typing import Any, Dict, Optional, Tuple


def _coerce_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        if not value == value:  # NaN
            return None
        return int(round(value))
    if isinstance(value, str) and value.strip():
        try:
            return int(round(float(value.strip())))
        except ValueError:
            return None
    return None


def _coerce_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        f = float(value)
        return f if f == f else None
    if isinstance(value, str) and value.strip():
        try:
            return float(value.strip())
        except ValueError:
            return None
    return None


def _is_explicitly_invalid(block: Dict[str, Any]) -> bool:
    valid = block.get("valid")
    if isinstance(valid, bool):
        return not valid
    if isinstance(valid, str):
        return valid.strip().lower() in {"false", "0", "no"}
    return False


def _valid_hr(value: Optional[int]) -> Optional[int]:
    if value is None:
        return None
    return value if 30 < value < 220 else None


def _valid_spo2(value: Optional[float]) -> Optional[float]:
    if value is None:
        return None
    return value if 70 <= value <= 100 else None


def extract_hr_spo2_from_sensors(sensors: Any) -> Tuple[Optional[int], Optional[float]]:
    """
    Read sensors.heart_rate.bpm and sensors.spo2.percentage when present;
    fall back to numeric heart_rate / spo2 at the sensors root.
    """
    if not isinstance(sensors, dict):
        return None, None

    hr_val: Optional[int] = None
    spo2_val: Optional[float] = None

    hr_raw = sensors.get("heart_rate")
    if isinstance(hr_raw, dict):
        if not _is_explicitly_invalid(hr_raw):
            hr_val = _valid_hr(_coerce_int(hr_raw.get("bpm")))
    else:
        hr_val = _valid_hr(_coerce_int(hr_raw))

    spo2_raw = sensors.get("spo2")
    if isinstance(spo2_raw, dict):
        if not _is_explicitly_invalid(spo2_raw):
            spo2_val = _valid_spo2(_coerce_float(spo2_raw.get("percentage")))
    else:
        spo2_val = _valid_spo2(_coerce_float(spo2_raw))

    return hr_val, spo2_val


def extract_hr_spo2_from_upstream_doc(doc: Dict[str, Any]) -> Tuple[Optional[int], Optional[float]]:
    """Resolve sensors from raw upstream document (payload preferred)."""
    payload = doc.get("payload") or {}
    sensors = payload.get("sensors")
    if sensors is None:
        sensors = doc.get("sensors")
    return extract_hr_spo2_from_sensors(sensors)
