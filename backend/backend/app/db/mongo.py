"""
MongoDB 连接（Motor 异步驱动），用于上行 JSON 原始数据缓存。
"""
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional

from app.config import settings

_mongo_client: Optional[AsyncIOMotorClient] = None

COLLECTION_RAW_UPSTREAM = "device_raw_upstream"


def get_mongo_client() -> AsyncIOMotorClient:
    global _mongo_client
    if _mongo_client is None:
        _mongo_client = AsyncIOMotorClient(settings.MONGO_URI)
    return _mongo_client


def get_mongo_db():
    client = get_mongo_client()
    return client[settings.MONGO_DB_NAME]


async def close_mongo_client():
    """关闭 MongoDB 连接（在应用 shutdown 时调用）"""
    global _mongo_client
    if _mongo_client is not None:
        _mongo_client.close()
        _mongo_client = None


async def ensure_indexes():
    """创建上行集合的索引（启动时调用一次）"""
    db = get_mongo_db()
    coll = db[COLLECTION_RAW_UPSTREAM]
    await coll.create_index([("device_id", 1), ("server_received_at", -1)])
    await coll.create_index([("data_type", 1)])
    await coll.create_index([("server_received_at", -1)])
    # 可选：TTL 索引，仅保留最近 30 天，按需取消注释
    # await coll.create_index("server_received_at", expireAfterSeconds=30 * 24 * 3600)