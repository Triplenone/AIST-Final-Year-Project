"""Admin APIs for FlyCare flight simulation (MQTT publish + Mongo ingest)."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models.device import Device
from app.models.user import User
from app.services.mongo_raw_upstream import save_raw_upstream
from app.services.mqtt_publish import publish_flight_payload
from app.services.mqtt_subscriber import FLIGHT_TOPIC, get_mqtt_status

router = APIRouter()


class FlightPublishBody(BaseModel):
    device_id: str = Field(..., min_length=1, description="Mongo/MQTT device id, e.g. ESP32_...")
    mysql_device_id: Optional[int] = Field(None, ge=1)
    passengerName: str = Field(..., min_length=1)
    flightNumber: str = Field(..., min_length=1)
    gate: Optional[str] = None
    flightTime: Optional[str] = None
    departureAirport: Optional[str] = None
    arrivalAirport: Optional[str] = None
    seatNumber: Optional[str] = None
    publish_mqtt: bool = Field(True, description="Publish to MQTT topic flycare/flight")
    save_mongo: bool = Field(
        False,
        description="Also write Mongo directly (use when MQTT loopback is unavailable)",
    )


def _build_flight_payload(body: FlightPublishBody) -> Dict[str, Any]:
    mapped_mysql = settings.device_id_map.get(body.device_id.strip())
    mysql_device_id = body.mysql_device_id if body.mysql_device_id is not None else mapped_mysql
    return {
        "device_id": body.device_id.strip(),
        "mysql_device_id": mysql_device_id,
        "data_type": "flight",
        "timestamp": datetime.now(timezone.utc).timestamp(),
        "passengerName": body.passengerName.strip(),
        "flightNumber": body.flightNumber.strip(),
        "gate": (body.gate or "").strip() or None,
        "flightTime": (body.flightTime or "").strip() or None,
        "departureAirport": (body.departureAirport or "").strip() or None,
        "arrivalAirport": (body.arrivalAirport or "").strip() or None,
        "seatNumber": (body.seatNumber or "").strip() or None,
    }


@router.get("/mqtt/status")
def flycare_mqtt_status():
    return get_mqtt_status()


@router.get("/presets")
def list_flight_presets() -> Dict[str, Any]:
    """Tracked devices from device_id_map with MySQL user names when available."""
    presets: List[Dict[str, Any]] = []
    db: Session = SessionLocal()
    try:
        for mongo_id, mysql_id in sorted(settings.device_id_map.items(), key=lambda item: item[1]):
            device = db.query(Device).filter(Device.device_id == mysql_id).first()
            passenger_name: Optional[str] = None
            elderly_user_id: Optional[int] = None
            if device and device.elderly_user_id:
                elderly_user_id = int(device.elderly_user_id)
                user = db.query(User).filter(User.user_id == elderly_user_id).first()
                if user and user.name:
                    passenger_name = user.name.strip()
            presets.append(
                {
                    "device_id": mongo_id,
                    "mysql_device_id": mysql_id,
                    "elderly_user_id": elderly_user_id,
                    "passengerName": passenger_name,
                    "deploy_location": device.deploy_location if device else None,
                }
            )
    finally:
        db.close()

    return {"items": presets, "mqtt_topic": FLIGHT_TOPIC}


@router.post("/flight/publish")
async def publish_flight(body: FlightPublishBody):
    payload = _build_flight_payload(body)
    mqtt_result: Optional[Dict[str, Any]] = None
    mongo_result: Optional[Dict[str, Any]] = None

    if body.publish_mqtt:
        try:
            publish_flight_payload(payload)
            mqtt_result = {
                "ok": True,
                "topic": FLIGHT_TOPIC,
                "broker": f"{settings.MQTT_BROKER}:{settings.MQTT_PORT}",
            }
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail={
                    "message": "MQTT publish failed",
                    "error": str(exc),
                    "broker": f"{settings.MQTT_BROKER}:{settings.MQTT_PORT}",
                    "topic": FLIGHT_TOPIC,
                    "hint": "Check broker settings or enable save_mongo to ingest without MQTT.",
                },
            ) from exc

    if body.save_mongo:
        try:
            await save_raw_upstream(payload)
            mongo_result = {
                "ok": True,
                "db_name": settings.MONGO_DB_NAME,
                "collection": "device_raw_upstream",
            }
        except Exception as exc:
            raise HTTPException(
                status_code=503,
                detail={"message": "Mongo ingest failed", "error": str(exc)},
            ) from exc

    if not body.publish_mqtt and not body.save_mongo:
        raise HTTPException(
            status_code=400,
            detail="Enable publish_mqtt and/or save_mongo.",
        )

    return {
        "status": "ok",
        "payload": payload,
        "mqtt": mqtt_result,
        "mongo": mongo_result,
    }
