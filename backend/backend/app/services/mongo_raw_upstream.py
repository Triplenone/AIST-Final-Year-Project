"""Helpers for storing raw upstream device payloads in MongoDB."""

from datetime import datetime, timezone
from typing import Any, Dict, Optional

from pymongo import MongoClient

from app.config import settings
from app.db.mongo import COLLECTION_RAW_UPSTREAM, get_mongo_db

_sync_mongo_client: Optional[MongoClient] = None
_DATA_TYPE_ALIASES = {
    "status": "status_update",
    "status_update": "status_update",
    "location": "location",
    "sos": "sos",
    "fall": "fall",
    "door": "door",
    "light": "light",
    "log": "log",
    "heartbeat": "heartbeat",
    "flight": "flight",
}


def _resolve_mysql_device_id(data: Dict[str, Any], device_id_text: str) -> Optional[int]:
    explicit = data.get("mysql_device_id")
    if explicit is not None:
        try:
            return int(explicit)
        except (TypeError, ValueError):
            pass

    mapped = settings.device_id_map.get(device_id_text)
    if mapped is not None:
        return int(mapped)

    try:
        parsed = int(device_id_text)
        return parsed if parsed > 0 else None
    except (TypeError, ValueError):
        return None


def _normalize_data_type(data: Dict[str, Any]) -> str:
    # Prefer explicit normalized keys first.
    for key in ("data_type", "type", "event_type", "message_type"):
        raw = data.get(key)
        if raw is None:
            continue
        normalized = _DATA_TYPE_ALIASES.get(str(raw).strip().lower())
        if normalized:
            return normalized

    # Fallback inference for common smartwatch payload structures.
    fall_detection = data.get("fall_detection") or {}
    if isinstance(fall_detection, dict) and fall_detection.get("is_fall_confirmed") is True:
        return "fall"

    sos = data.get("sos")
    if isinstance(sos, dict):
        if sos.get("active") is True or sos.get("pressed") is True:
            return "sos"
    elif sos is True:
        return "sos"

    return "status_update"


def _build_doc(data: Dict[str, Any]) -> Dict[str, Any]:
    device_id = data.get("device_id")
    if device_id is None:
        device_id = "UNKNOWN"
    else:
        device_id = str(device_id)
    mysql_device_id = _resolve_mysql_device_id(data, device_id)

    return {
        "device_id": device_id,
        "mysql_device_id": mysql_device_id,
        "timestamp": data.get("timestamp"),
        "data_type": _normalize_data_type(data),
        "server_received_at": datetime.now(timezone.utc),
        "payload": data,
    }


def get_sync_mongo_db():
    global _sync_mongo_client
    if _sync_mongo_client is None:
        _sync_mongo_client = MongoClient(settings.MONGO_URI)
    return _sync_mongo_client[settings.MONGO_DB_NAME]


async def save_raw_upstream(data: Dict[str, Any]) -> None:
    """Persist a raw upstream payload to the shared Mongo collection."""
    coll = get_mongo_db()[COLLECTION_RAW_UPSTREAM]
    await coll.insert_one(_build_doc(data))


def run_sync_save_raw_upstream(data: Dict[str, Any]) -> None:
    """Allow sync MQTT callbacks to persist raw payloads without crashing."""
    try:
        coll = get_sync_mongo_db()[COLLECTION_RAW_UPSTREAM]
        coll.insert_one(_build_doc(data))
    except Exception as exc:
        print(f"[mongo_raw_upstream] write failed but skipped: {exc}")
