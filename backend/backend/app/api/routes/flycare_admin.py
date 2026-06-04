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
from app.services.mqtt_publish import (
    build_flight_mqtt_downlink,
    build_flycare_flight_topic,
    publish_flight_downlink,
)
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
    airline: Optional[str] = None
    destination: Optional[str] = None
    scheduled_departure: Optional[str] = None
    estimated_departure: Optional[str] = None
    boarding_time: Optional[str] = None
    boarding_gate: Optional[str] = None
    status: Optional[str] = "scheduled"
    delay_minutes: Optional[int] = 0
    delay_reason: Optional[str] = None
    gate_changed: Optional[bool] = False
    terminal: Optional[str] = None
    checkin_counter: Optional[str] = None
    publish_mqtt: bool = Field(True, description="Publish to MQTT topic smartwatch/{device_id}/flight")
    save_mongo: bool = Field(
        False,
        description="Also write Mongo directly (use when MQTT loopback is unavailable)",
    )


def _normalize_hhmm(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    if "T" in text:
        text = text.split("T", 1)[1]
    if " " in text:
        text = text.split(" ", 1)[1]
    return text[:5] if len(text) >= 5 and text[2] == ":" else text


def _flight_info_from_body(body: FlightPublishBody) -> Dict[str, Any]:
    scheduled = _normalize_hhmm(body.scheduled_departure or body.flightTime)
    estimated = _normalize_hhmm(body.estimated_departure) or scheduled
    boarding = _normalize_hhmm(body.boarding_time)
    gate = (body.boarding_gate or body.gate or "").strip() or None
    return {
        "flight_number": body.flightNumber.strip(),
        "airline": (body.airline or "").strip() or None,
        "departure_airport": (body.departureAirport or "").strip() or None,
        "destination": (body.destination or body.arrivalAirport or "").strip() or None,
        "seat_number": (body.seatNumber or "").strip() or None,
        "scheduled_departure": scheduled,
        "estimated_departure": estimated,
        "boarding_time": boarding,
        "boarding_gate": gate,
        "status": (body.status or "scheduled").strip(),
        "delay_minutes": 0 if body.delay_minutes is None else int(body.delay_minutes),
        "delay_reason": (body.delay_reason or "").strip() or None,
        "gate_changed": False if body.gate_changed is None else bool(body.gate_changed),
        "terminal": (body.terminal or "").strip() or None,
        "checkin_counter": (body.checkin_counter or "").strip() or None,
    }


def _build_flight_payload(body: FlightPublishBody) -> Dict[str, Any]:
    mapped_mysql = settings.device_id_map.get(body.device_id.strip())
    mysql_device_id = body.mysql_device_id if body.mysql_device_id is not None else mapped_mysql
    flight_info = _flight_info_from_body(body)
    return {
        "device_id": body.device_id.strip(),
        "mysql_device_id": mysql_device_id,
        "data_type": "flight",
        "timestamp": datetime.now(timezone.utc).timestamp(),
        "command_type": "flight_info",
        "flight_info": flight_info,
        "passengerName": body.passengerName.strip(),
        "flightNumber": body.flightNumber.strip(),
        "gate": flight_info.get("boarding_gate"),
        "flightTime": flight_info.get("scheduled_departure"),
        "departureAirport": flight_info.get("departure_airport"),
        "arrivalAirport": flight_info.get("destination"),
        "seatNumber": flight_info.get("seat_number"),
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
                    "mqtt_topic": build_flycare_flight_topic(mongo_id),
                }
            )
    finally:
        db.close()

    return {
        "items": presets,
        "mqtt_topic": FLIGHT_TOPIC,
        "downlink_topic_template": settings.FLYCARE_FLIGHT_DOWNLINK_TOPIC_TEMPLATE,
    }


@router.post("/flight/publish")
async def publish_flight(body: FlightPublishBody):
    payload = _build_flight_payload(body)
    flight_info = payload["flight_info"]
    mqtt_payload = build_flight_mqtt_downlink(flight_info)
    mqtt_result: Dict[str, Any] = {
        "ok": False,
        "topic": build_flycare_flight_topic(payload["device_id"]),
        "broker": f"{settings.MQTT_BROKER}:{settings.MQTT_PORT}",
        "error": None,
        "skipped": not body.publish_mqtt,
        "payload": mqtt_payload,
    }
    mongo_result: Dict[str, Any] = {
        "ok": False,
        "error": None,
        "skipped": not body.save_mongo,
        "db_name": settings.MONGO_DB_NAME,
        "collection": "device_raw_upstream",
    }

    if body.publish_mqtt:
        try:
            mqtt_result = {
                **mqtt_result,
                **publish_flight_downlink(payload["device_id"], flight_info),
                "skipped": False,
                "payload": mqtt_payload,
            }
        except Exception as exc:
            mqtt_result.update({"ok": False, "error": str(exc), "skipped": False})

    if body.save_mongo:
        try:
            saved = await save_raw_upstream(payload)
            mongo_result = {
                "ok": True,
                "error": None,
                "skipped": False,
                "db_name": settings.MONGO_DB_NAME,
                "collection": "device_raw_upstream",
                "inserted_id": saved.get("inserted_id"),
            }
        except Exception as exc:
            mongo_result.update({"ok": False, "error": str(exc), "skipped": False})

    if not body.publish_mqtt and not body.save_mongo:
        raise HTTPException(
            status_code=400,
            detail="Enable publish_mqtt and/or save_mongo.",
        )
    if not mqtt_result["ok"] and not mongo_result["ok"]:
        raise HTTPException(
            status_code=502 if body.publish_mqtt else 503,
            detail={
                "message": "Flight publish failed",
                "payload": payload,
                "mqtt": mqtt_result,
                "mongo": mongo_result,
            },
        )

    return {
        "status": "ok",
        "payload": payload,
        "mqtt_payload": mqtt_payload,
        "mqtt": mqtt_result,
        "mongo": mongo_result,
    }
