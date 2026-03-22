"""
上行原始 JSON 写入 MongoDB 缓存（与「完整 JSON 数据格式」一致）。
支持异步写入（HTTP 路径）与同步封装（TCP 线程中调用）。
"""
from datetime import datetime, timezone
from typing import Any, Dict

from app.db.mongo import get_mongo_db, COLLECTION_RAW_UPSTREAM


async def save_raw_upstream(data: Dict[str, Any]) -> None:
    """
    将上行 JSON 写入 MongoDB device_raw_upstream 集合。
    data 为完整上行结构（device_id, timestamp, data_type, location, motion, fall_detection 等）。
    """
    db = get_mongo_db()
    coll = db[COLLECTION_RAW_UPSTREAM]

    device_id = data.get("device_id")
    if device_id is None:
        device_id = "UNKNOWN"
    else:
        device_id = str(device_id)

    doc = {
        "device_id": device_id,
        "timestamp": data.get("timestamp"),
        "data_type": data.get("data_type", "status_update"),
        "server_received_at": datetime.now(timezone.utc),
        "payload": data,
    }

    await coll.insert_one(doc)


def run_sync_save_raw_upstream(data: Dict[str, Any]) -> None:
    """
    在同步上下文（如 TCP 处理线程）中调用，将上行 JSON 写入 MongoDB。
    内部在新事件循环中执行 save_raw_upstream；Mongo 不可用时仅打日志不抛错。
    """
    import asyncio

    try:
        asyncio.run(save_raw_upstream(data))
    except Exception as e:
        print(f"⚠️ MongoDB 写入上行缓存失败（不影响主流程）: {e}")
