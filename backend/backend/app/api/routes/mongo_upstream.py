"""
MongoDB 上行原始数据查询接口，供前端分页/筛选与详情查看。
"""
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Query, HTTPException
from bson.objectid import ObjectId

from app.db.mongo import get_mongo_db, COLLECTION_RAW_UPSTREAM

router = APIRouter()


@router.get("/status", response_model=Dict[str, Any])
async def mongo_upstream_status():
    """
    诊断接口：检查是否连上 MongoDB 以及集合内文档数量。
    """
    from app.config import settings
    out = {
        "connected": False,
        "db_name": settings.MONGO_DB_NAME,
        "collection": COLLECTION_RAW_UPSTREAM,
        "document_count": None,
        "error": None,
    }
    try:
        db = get_mongo_db()
        coll = db[COLLECTION_RAW_UPSTREAM]
        out["document_count"] = await coll.count_documents({})
        out["connected"] = True
    except Exception as e:
        out["error"] = str(e)
    return out


@router.post("/seed", response_model=Dict[str, Any])
async def seed_one_document(data: Dict[str, Any]):
    """
    往 MongoDB 插入一条上行数据（仅用于测试/造数）。
    """
    from app.services.mongo_raw_upstream import save_raw_upstream
    await save_raw_upstream(data)
    return {"status": "ok", "message": "已插入 1 条文档，请刷新 Position 页面或访问 /latest 查看"}


def _serialize_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    """将 _id 转为字符串便于 JSON 返回"""
    if doc and "_id" in doc:
        doc = dict(doc)
        doc["_id"] = str(doc["_id"])
    return doc


@router.get("/", response_model=Dict[str, Any])
async def list_raw_upstream(
    device_id: Optional[str] = Query(None, description="设备 ID 筛选"),
    data_type: Optional[str] = Query(None, description="data_type 筛选"),
    start_ts: Optional[int] = Query(None, description="起始时间戳（含）"),
    end_ts: Optional[int] = Query(None, description="结束时间戳（含）"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(50, ge=1, le=200, description="每页条数"),
):
    """分页查询上行原始数据。"""
    db = get_mongo_db()
    coll = db[COLLECTION_RAW_UPSTREAM]

    q: Dict[str, Any] = {}
    if device_id is not None:
        q["device_id"] = device_id
    if data_type is not None:
        q["data_type"] = data_type
    if start_ts is not None or end_ts is not None:
        q["timestamp"] = {}
        if start_ts is not None:
            q["timestamp"]["$gte"] = start_ts
        if end_ts is not None:
            q["timestamp"]["$lte"] = end_ts

    skip = (page - 1) * page_size
    cursor = coll.find(q).sort("server_received_at", -1).skip(skip).limit(page_size)

    items: List[Dict[str, Any]] = []
    async for doc in cursor:
        items.append(_serialize_doc(doc))

    total = await coll.count_documents(q)
    return {"page": page, "page_size": page_size, "total": total, "items": items}


@router.get("/latest", response_model=Dict[str, Any])
async def get_latest_for_position_panel(
    device_id: Optional[str] = Query(
        None,
        description="按设备 ID 筛选，例如 'ESP32_00005CFA7AD4DB1C'",
    ),
    data_type: Optional[str] = Query(
        None,
        description="只返回该 data_type 的最新一条，例如 'status_update'（供 Position 页用户信息用）",
    ),
    exclude_data_type: Optional[str] = Query(
        None,
        description="排除的 data_type，例如 'flight' 时只返回设备上行（供 FlyCare 用户信息用）",
    ),
):
    """
    返回最新一条上行数据，供 Position/FlyCare 页右面板展示。
    传入 data_type 时只返回该类型最新一条；传入 exclude_data_type 时排除该类型。
    """
    db = get_mongo_db()
    coll = db[COLLECTION_RAW_UPSTREAM]
    q: Dict[str, Any] = {}
    if data_type and data_type.strip():
        q["data_type"] = data_type.strip()
    elif exclude_data_type and exclude_data_type.strip():
        q["data_type"] = {"$ne": exclude_data_type.strip()}
    if device_id and device_id.strip():
        q["device_id"] = device_id.strip()
    doc = await coll.find_one(q, sort=[("server_received_at", -1)])
    if doc is None:
        return {}
    payload = doc.get("payload") or {}
    out = {
        "_id": str(doc["_id"]) if doc.get("_id") else None,
        "device_id": doc.get("device_id") or payload.get("device_id"),
        "timestamp": doc.get("timestamp") or payload.get("timestamp"),
        "server_received_at": doc.get("server_received_at"),
        "location": payload.get("location") or doc.get("location"),
        "fall_detection": payload.get("fall_detection") or doc.get("fall_detection"),
        "sos": payload.get("sos") or doc.get("sos"),
        "sensors": payload.get("sensors") or doc.get("sensors"),
        "system": payload.get("system") or doc.get("system"),
    }
    return out


@router.get("/flight/latest", response_model=Dict[str, Any])
async def get_latest_flight(
    device_id: Optional[str] = Query(
        None,
        description="按设备 ID 筛选，与用户绑定一致则只返回该用户的航班",
    ),
):
    """
    返回最新一条航班信息（data_type=flight）。传入 device_id 时只返回该设备绑定的航班。
    """
    db = get_mongo_db()
    coll = db[COLLECTION_RAW_UPSTREAM]
    q: Dict[str, Any] = {"data_type": "flight"}
    if device_id and device_id.strip():
        q["device_id"] = device_id.strip()
    doc = await coll.find_one(q, sort=[("server_received_at", -1)])
    if doc is None:
        return {
            "found": False,
            "message": "暂无航班信息，请先通过 MQTT 或 POST /data-reception/flight 发送，且 JSON 中可带 device_id 绑定用户",
        }
    payload = doc.get("payload") or doc
    out = {
        "found": True,
        "device_id": doc.get("device_id"),
        "_id": str(doc["_id"]) if doc.get("_id") else None,
        "server_received_at": doc.get("server_received_at"),
        "passengerName": payload.get("passengerName"),
        "flightNumber": payload.get("flightNumber"),
        "gate": payload.get("gate"),
        "flightTime": payload.get("flightTime"),
        "departureAirport": payload.get("departureAirport"),
        "arrivalAirport": payload.get("arrivalAirport"),
        "seatNumber": payload.get("seatNumber"),
    }
    return out


@router.get("/{doc_id}", response_model=Dict[str, Any])
async def get_raw_upstream(doc_id: str):
    """按 MongoDB _id 查询单条上行原始数据详情"""
    db = get_mongo_db()
    coll = db[COLLECTION_RAW_UPSTREAM]
    try:
        oid = ObjectId(doc_id)
    except Exception:
        raise HTTPException(status_code=400, detail="无效的 doc_id")
    doc = await coll.find_one({"_id": oid})
    if doc is None:
        raise HTTPException(status_code=404, detail="未找到该记录")
    return _serialize_doc(doc)
