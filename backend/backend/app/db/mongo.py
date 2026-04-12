"""MongoDB helpers for raw upstream storage."""

from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient

from app.config import settings

_mongo_client: Optional[AsyncIOMotorClient] = None

COLLECTION_RAW_UPSTREAM = "device_raw_upstream"


def get_mongo_client() -> AsyncIOMotorClient:
    global _mongo_client
    if _mongo_client is None:
        _mongo_client = AsyncIOMotorClient(settings.MONGO_URI)
    return _mongo_client


def get_mongo_db():
    return get_mongo_client()[settings.MONGO_DB_NAME]


async def close_mongo_client():
    """Close the shared MongoDB client."""
    global _mongo_client
    if _mongo_client is not None:
        _mongo_client.close()
        _mongo_client = None


async def ensure_indexes():
    """Ensure indexes used by raw upstream queries."""
    coll = get_mongo_db()[COLLECTION_RAW_UPSTREAM]
    await coll.create_index([("device_id", 1), ("server_received_at", -1)])
    await coll.create_index([("data_type", 1)])
    await coll.create_index([("server_received_at", -1)])
    await coll.create_index([("device_id", 1), ("timestamp", -1)])
    await coll.create_index([("data_type", 1), ("timestamp", -1)])
