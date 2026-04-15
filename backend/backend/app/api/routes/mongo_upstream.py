"""MongoDB raw upstream query routes."""

from typing import Any, Dict, List, Optional

from bson.objectid import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.db.mongo import COLLECTION_RAW_UPSTREAM, get_mongo_db
from app.models.device import Device

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


def _serialize_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    if doc and "_id" in doc:
        doc = dict(doc)
        doc["_id"] = str(doc["_id"])
    return doc


def _extract_vitals_from_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    sensors = payload.get("sensors") or {}
    return {
        "heart_rate": sensors.get("heart_rate"),
        "spo2": sensors.get("spo2"),
        "body_temperature": sensors.get("body_temperature") or sensors.get("temperature"),
        "resp_rate": sensors.get("resp_rate") or sensors.get("respiratory_rate"),
        "hrv": sensors.get("hrv"),
    }


def _to_vitals_item(doc: Dict[str, Any]) -> Dict[str, Any]:
    payload = doc.get("payload") or {}
    return {
        "_id": str(doc.get("_id")) if doc.get("_id") else None,
        "device_id": doc.get("device_id") or payload.get("device_id"),
        "timestamp": doc.get("timestamp") or payload.get("timestamp"),
        "server_received_at": doc.get("server_received_at"),
        "data_type": doc.get("data_type"),
        "vitals": _extract_vitals_from_payload(payload),
        "raw_payload": payload,
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
    start_ts: Optional[int] = Query(None, description="Start timestamp (inclusive)"),
    end_ts: Optional[int] = Query(None, description="End timestamp (inclusive)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Page size"),
):
    query: Dict[str, Any] = {}
    if device_id is not None:
        query["device_id"] = device_id
    if data_type is not None:
        query["data_type"] = data_type
    if start_ts is not None or end_ts is not None:
        query["timestamp"] = {}
        if start_ts is not None:
            query["timestamp"]["$gte"] = start_ts
        if end_ts is not None:
            query["timestamp"]["$lte"] = end_ts

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
    if device_id and device_id.strip():
        query["device_id"] = device_id.strip()

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
        "timestamp": doc.get("timestamp") or payload.get("timestamp"),
        "server_received_at": doc.get("server_received_at"),
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
    query = {
        "device_id": device_id.strip(),
        "data_type": {"$in": ["vitals", "status_update"]},
    }
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


@router.get("/vitals/history", response_model=Dict[str, Any])
async def get_vitals_history(
    device_id: str = Query(..., description="External device ID"),
    start_ts: Optional[int] = Query(None, description="Start timestamp (inclusive)"),
    end_ts: Optional[int] = Query(None, description="End timestamp (inclusive)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Page size"),
):
    query: Dict[str, Any] = {
        "device_id": device_id.strip(),
        "data_type": {"$in": ["vitals", "status_update"]},
    }
    if start_ts is not None or end_ts is not None:
        query["timestamp"] = {}
        if start_ts is not None:
            query["timestamp"]["$gte"] = start_ts
        if end_ts is not None:
            query["timestamp"]["$lte"] = end_ts

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
    start_ts: Optional[int] = Query(None, description="Start timestamp (inclusive)"),
    end_ts: Optional[int] = Query(None, description="End timestamp (inclusive)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Page size"),
    db: Session = Depends(get_db),
):
    """Bridge user_id -> device -> MongoDB vitals history."""
    devices = db.query(Device).filter(Device.elderly_user_id == user_id).all()
    if not devices:
        raise HTTPException(
            status_code=404,
            detail=f"No device bound to user_id={user_id}",
        )

    candidate_ids: List[str] = []
    reverse_map = {value: key for key, value in settings.device_id_map.items()}

    for dev in devices:
        candidate_ids.append(str(dev.device_id))
        if dev.mac_address:
            candidate_ids.append(dev.mac_address)
        external_id = reverse_map.get(dev.device_id)
        if external_id:
            candidate_ids.append(external_id)

    candidate_ids = list(dict.fromkeys(candidate_ids))

    query: Dict[str, Any] = {
        "device_id": {"$in": candidate_ids} if len(candidate_ids) > 1 else candidate_ids[0],
        "data_type": {"$in": ["vitals", "status_update"]},
    }
    if start_ts is not None or end_ts is not None:
        query["timestamp"] = {}
        if start_ts is not None:
            query["timestamp"]["$gte"] = start_ts
        if end_ts is not None:
            query["timestamp"]["$lte"] = end_ts

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
    if device_id and device_id.strip():
        query["device_id"] = device_id.strip()

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
