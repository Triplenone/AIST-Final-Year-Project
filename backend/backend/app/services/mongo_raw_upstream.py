"""Helpers for storing raw upstream device payloads in MongoDB."""

from datetime import datetime, timezone
from typing import Any, Dict, Optional

from pymongo import MongoClient

from app.config import settings
from app.db.mongo import COLLECTION_RAW_UPSTREAM, get_mongo_db

_sync_mongo_client: Optional[MongoClient] = None


def _build_doc(data: Dict[str, Any]) -> Dict[str, Any]:
    device_id = data.get("device_id")
    if device_id is None:
        device_id = "UNKNOWN"
    else:
        device_id = str(device_id)

    return {
        "device_id": device_id,
        "timestamp": data.get("timestamp"),
        "data_type": data.get("data_type", "status_update"),
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
