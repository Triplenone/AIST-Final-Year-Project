"""Admin APIs for FlyCare/Elderly demo telemetry simulation (MQTT publish + Mongo ingest)."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app import crud
from app.config import settings
from app.database import SessionLocal
from app.models.device import Device
from app.models.event import EventStatus, EventType
from app.models.flycare_demo_registry import FlyCareDemoRegistry
from app.models.user import User
from app.schemas.event import EventCreate
from app.services.mongo_raw_upstream import save_raw_upstream
from app.services.mqtt_publish import (
    build_flycare_alert_topic,
    build_flycare_vitals_topic,
    build_flight_mqtt_downlink,
    build_flycare_flight_topic,
    publish_alert_downlink,
    publish_flight_downlink,
    publish_vitals_upstream,
)
from app.services.mqtt_subscriber import get_mqtt_status

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


class HealthPublishBody(BaseModel):
    device_id: str = Field(..., min_length=1, description="Mongo/MQTT device id, e.g. ESP32_...")
    mysql_device_id: Optional[int] = Field(None, ge=1)
    passengerName: Optional[str] = None
    heart_rate: int = Field(..., ge=0, le=240)
    spo2: int = Field(..., ge=0, le=100)
    battery: Optional[int] = Field(None, ge=0, le=100)
    location_name: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None
    fall_confirmed: bool = False
    sos_active: bool = False
    publish_mqtt: bool = Field(True, description="Publish to MQTT topic smartwatch/{device_id}/vitals")
    save_mongo: bool = Field(
        False,
        description="Also write Mongo directly (use when MQTT loopback is unavailable)",
    )


class AlertPublishBody(BaseModel):
    device_id: str = Field(..., min_length=1, description="Mongo/MQTT device id, e.g. ESP32_...")
    mysql_device_id: Optional[int] = Field(None, ge=1)
    related_user_id: Optional[int] = Field(None, ge=1)
    passengerName: Optional[str] = None
    event_type: str = Field(..., description="sos or fall")
    action: str = Field(..., description="activate or clear")
    title: Optional[str] = None
    message: Optional[str] = None
    severity: Optional[str] = None
    command_id: Optional[str] = None
    publish_mqtt: bool = Field(True, description="Publish to smartwatch/{device_id}/alert")
    create_event: bool = Field(False, description="Create a MySQL event for activate actions")


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


def _build_health_payload(body: HealthPublishBody) -> Dict[str, Any]:
    mapped_mysql = settings.device_id_map.get(body.device_id.strip())
    mysql_device_id = body.mysql_device_id if body.mysql_device_id is not None else mapped_mysql
    sensors = {
        "heart_rate": {"bpm": int(body.heart_rate), "valid": True},
        "spo2": {"percentage": int(body.spo2), "valid": True},
    }
    payload: Dict[str, Any] = {
        "device_id": body.device_id.strip(),
        "mysql_device_id": mysql_device_id,
        "data_type": "vitals",
        "timestamp": datetime.now(timezone.utc).timestamp(),
        "passengerName": (body.passengerName or "").strip() or None,
        "sensors": sensors,
        "vitals": {
            "heart_rate": sensors["heart_rate"],
            "spo2": sensors["spo2"],
            "hr": int(body.heart_rate),
        },
        "fall_detection": {
            "is_fall_confirmed": bool(body.fall_confirmed),
            "state_description": "Confirmed fall" if body.fall_confirmed else "Normal",
        },
        "sos": {"active": bool(body.sos_active)},
    }
    if body.battery is not None:
        payload["system"] = {"battery": {"level": int(body.battery)}}
    if body.x is not None and body.y is not None:
        payload["location"] = {
            "current": {
                "x": float(body.x),
                "y": float(body.y),
                "name": (body.location_name or "").strip() or None,
            }
        }
    elif body.location_name:
        payload["location"] = {"current": {"name": body.location_name.strip()}}
    return payload


def _device_aliases_for_payload(payload: Dict[str, Any]) -> List[str]:
    selected_device_id = str(payload["device_id"]).strip()
    aliases: List[str] = [selected_device_id]
    mysql_device_id = payload.get("mysql_device_id")

    if mysql_device_id is not None:
        try:
            mysql_id = int(mysql_device_id)
        except (TypeError, ValueError):
            mysql_id = None
        if mysql_id is not None:
            aliases.extend(
                mongo_id
                for mongo_id, mapped_mysql_id in settings.device_id_map.items()
                if int(mapped_mysql_id) == mysql_id
            )

    deduped: List[str] = []
    seen: set[str] = set()
    for alias in aliases:
        clean = str(alias or "").strip()
        if clean and clean not in seen:
            deduped.append(clean)
            seen.add(clean)
    return deduped


def _json_aliases(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        raw = value
    elif isinstance(value, str):
        raw = [part.strip() for part in value.strip("[]").replace('"', "").split(",")]
    else:
        raw = []
    aliases: List[str] = []
    for alias in raw:
        clean = str(alias or "").strip()
        if clean:
            aliases.append(clean)
    return aliases


def _registry_presets(db: Session) -> List[Dict[str, Any]]:
    rows = (
        db.query(FlyCareDemoRegistry)
        .filter(FlyCareDemoRegistry.enabled == True)  # noqa: E712
        .order_by(FlyCareDemoRegistry.sort_order.asc(), FlyCareDemoRegistry.demo_id.asc())
        .all()
    )
    presets: List[Dict[str, Any]] = []
    for row in rows:
        device = db.query(Device).filter(Device.device_id == row.mysql_device_id).first()
        user = db.query(User).filter(User.user_id == row.user_id).first()
        aliases = _json_aliases(row.alias_device_ids)
        presets.append(
            {
                "demo_id": int(row.demo_id),
                "device_id": row.canonical_device_id,
                "mysql_device_id": int(row.mysql_device_id),
                "elderly_user_id": int(row.user_id),
                "passengerName": (row.display_name or "").strip()
                or (user.name.strip() if user and user.name else None),
                "deploy_location": device.deploy_location if device else None,
                "alias_device_ids": aliases,
                "mqtt_topic": build_flycare_vitals_topic(row.canonical_device_id),
            }
        )
    return presets


def _publish_flight_downlink_aliases(payload: Dict[str, Any], flight_info: Dict[str, Any]) -> Dict[str, Any]:
    aliases = _device_aliases_for_payload(payload)
    results: List[Dict[str, Any]] = []

    for alias in aliases:
        try:
            results.append(
                {
                    "device_id": alias,
                    **publish_flight_downlink(alias, flight_info),
                }
            )
        except Exception as exc:
            results.append(
                {
                    "ok": False,
                    "device_id": alias,
                    "topic": build_flycare_flight_topic(alias),
                    "qos": 1,
                    "broker": f"{settings.MQTT_BROKER}:{settings.MQTT_PORT}",
                    "error": str(exc),
                }
            )

    ok_results = [result for result in results if result.get("ok")]
    error_results = [result for result in results if not result.get("ok")]
    return {
        "ok": bool(ok_results),
        "topic": build_flycare_flight_topic(payload["device_id"]),
        "topics": [result.get("topic") for result in results],
        "aliases": aliases,
        "alias_results": results,
        "qos": 1,
        "broker": f"{settings.MQTT_BROKER}:{settings.MQTT_PORT}",
        "error": "; ".join(str(result.get("error")) for result in error_results if result.get("error")) or None,
    }


def _publish_health_aliases(payload: Dict[str, Any]) -> Dict[str, Any]:
    aliases = _device_aliases_for_payload(payload)
    results: List[Dict[str, Any]] = []

    for alias in aliases:
        try:
            alias_payload = dict(payload)
            alias_payload["device_id"] = alias
            results.append(
                {
                    "device_id": alias,
                    **publish_vitals_upstream(alias, alias_payload),
                }
            )
        except Exception as exc:
            results.append(
                {
                    "ok": False,
                    "device_id": alias,
                    "topic": build_flycare_vitals_topic(alias),
                    "qos": 1,
                    "retain": False,
                    "broker": f"{settings.MQTT_BROKER}:{settings.MQTT_PORT}",
                    "error": str(exc),
                }
            )

    ok_results = [result for result in results if result.get("ok")]
    error_results = [result for result in results if not result.get("ok")]
    return {
        "ok": bool(ok_results),
        "topic": build_flycare_vitals_topic(payload["device_id"]),
        "topics": [result.get("topic") for result in results],
        "aliases": aliases,
        "alias_results": results,
        "qos": 1,
        "retain": False,
        "broker": f"{settings.MQTT_BROKER}:{settings.MQTT_PORT}",
        "error": "; ".join(str(result.get("error")) for result in error_results if result.get("error")) or None,
    }


def _publish_alert_downlink_aliases(payload: Dict[str, Any], alert_payload: Dict[str, Any]) -> Dict[str, Any]:
    aliases = _device_aliases_for_payload(payload)
    results: List[Dict[str, Any]] = []

    for alias in aliases:
        try:
            results.append(
                {
                    "device_id": alias,
                    **publish_alert_downlink(alias, alert_payload),
                }
            )
        except Exception as exc:
            results.append(
                {
                    "ok": False,
                    "device_id": alias,
                    "topic": build_flycare_alert_topic(alias),
                    "qos": 1,
                    "retain": False,
                    "broker": f"{settings.MQTT_BROKER}:{settings.MQTT_PORT}",
                    "error": str(exc),
                }
            )

    ok_results = [result for result in results if result.get("ok")]
    error_results = [result for result in results if not result.get("ok")]
    return {
        "ok": bool(ok_results),
        "topic": build_flycare_alert_topic(payload["device_id"]),
        "topics": [result.get("topic") for result in results],
        "aliases": aliases,
        "alias_results": results,
        "qos": 1,
        "retain": False,
        "broker": f"{settings.MQTT_BROKER}:{settings.MQTT_PORT}",
        "error": "; ".join(str(result.get("error")) for result in error_results if result.get("error")) or None,
    }


@router.get("/mqtt/status")
def flycare_mqtt_status():
    return get_mqtt_status()


@router.get("/presets")
def list_flight_presets() -> Dict[str, Any]:
    """Visible FlyCare demo devices, falling back to device_id_map when registry is absent."""
    presets: List[Dict[str, Any]] = []
    db: Session = SessionLocal()
    try:
        try:
            presets = _registry_presets(db)
        except Exception as exc:
            db.rollback()
            print(f"[FlyCareAdmin] demo registry unavailable, using device_id_map fallback: {exc}")

        if presets:
            return {
                "items": presets,
                "mqtt_topic": build_flycare_vitals_topic("+"),
                "health_topic_template": build_flycare_vitals_topic("{device_id}"),
                "downlink_topic_template": settings.FLYCARE_FLIGHT_DOWNLINK_TOPIC_TEMPLATE,
            }

        aliases_by_mysql_id: Dict[int, List[str]] = {}
        for mongo_id, mysql_id in settings.device_id_map.items():
            aliases_by_mysql_id.setdefault(mysql_id, []).append(mongo_id)

        for mysql_id in sorted(aliases_by_mysql_id):
            device = db.query(Device).filter(Device.device_id == mysql_id).first()
            aliases = aliases_by_mysql_id[mysql_id]
            mongo_id = aliases[0]
            if device and device.model_desc:
                model_desc = device.model_desc.strip()
                if model_desc in aliases:
                    mongo_id = model_desc
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
                    "alias_device_ids": [alias for alias in aliases if alias != mongo_id],
                    "mqtt_topic": build_flycare_vitals_topic(mongo_id),
                }
            )
    finally:
        db.close()

    return {
        "items": presets,
        "mqtt_topic": build_flycare_vitals_topic("+"),
        "health_topic_template": build_flycare_vitals_topic("{device_id}"),
        "downlink_topic_template": settings.FLYCARE_FLIGHT_DOWNLINK_TOPIC_TEMPLATE,
    }


@router.post("/health/publish")
async def publish_health(body: HealthPublishBody):
    payload = _build_health_payload(body)
    mqtt_result: Dict[str, Any] = {
        "ok": False,
        "topic": build_flycare_vitals_topic(payload["device_id"]),
        "broker": f"{settings.MQTT_BROKER}:{settings.MQTT_PORT}",
        "error": None,
        "skipped": not body.publish_mqtt,
        "payload": payload,
    }
    mongo_result: Dict[str, Any] = {
        "ok": False,
        "error": None,
        "skipped": not body.save_mongo,
        "db_name": settings.MONGO_DB_NAME,
        "collection": "device_raw_upstream",
    }

    if body.publish_mqtt:
        mqtt_result = {
            **mqtt_result,
            **_publish_health_aliases(payload),
            "skipped": False,
            "payload": payload,
        }

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
                "message": "Health publish failed",
                "payload": payload,
                "mqtt": mqtt_result,
                "mongo": mongo_result,
            },
        )

    return {
        "status": "ok",
        "payload": payload,
        "mqtt_payload": payload,
        "mqtt": mqtt_result,
        "mongo": mongo_result,
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
        mqtt_result = {
            **mqtt_result,
            **_publish_flight_downlink_aliases(payload, flight_info),
            "skipped": False,
            "payload": mqtt_payload,
        }

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


@router.post("/alert/publish")
def publish_alert(body: AlertPublishBody):
    event_type = (body.event_type or "").strip().lower()
    action = (body.action or "").strip().lower()
    if event_type not in {"sos", "fall"}:
        raise HTTPException(status_code=400, detail="event_type must be sos or fall")
    if action not in {"activate", "clear"}:
        raise HTTPException(status_code=400, detail="action must be activate or clear")

    mapped_mysql = settings.device_id_map.get(body.device_id.strip())
    mysql_device_id = body.mysql_device_id if body.mysql_device_id is not None else mapped_mysql
    title = (body.title or event_type.upper()).strip()
    message = (body.message or f"{event_type.upper()} alert").strip()
    severity = (body.severity or ("critical" if action == "activate" else "info")).strip()
    command_id = (body.command_id or f"{event_type}-{action}-{uuid.uuid4().hex[:12]}").strip()

    payload: Dict[str, Any] = {
        "device_id": body.device_id.strip(),
        "mysql_device_id": mysql_device_id,
        "related_user_id": body.related_user_id,
    }
    alert_payload: Dict[str, Any] = {
        "command_type": "alert",
        "command_id": command_id,
        "event_type": event_type,
        "action": action,
        "title": title,
        "message": message,
        "severity": severity,
        "mysql_device_id": mysql_device_id,
        "related_user_id": body.related_user_id,
        "passengerName": (body.passengerName or "").strip() or None,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    mqtt_result: Dict[str, Any] = {
        "ok": False,
        "topic": build_flycare_alert_topic(payload["device_id"]),
        "broker": f"{settings.MQTT_BROKER}:{settings.MQTT_PORT}",
        "error": None,
        "skipped": not body.publish_mqtt,
        "payload": alert_payload,
    }
    if body.publish_mqtt:
        mqtt_result = {
            **mqtt_result,
            **_publish_alert_downlink_aliases(payload, alert_payload),
            "skipped": False,
            "payload": alert_payload,
        }

    event_result: Dict[str, Any] = {"ok": False, "skipped": True, "event_id": None, "error": None}
    if body.create_event and action == "activate":
        if mysql_device_id is None or body.related_user_id is None:
            raise HTTPException(
                status_code=400,
                detail="mysql_device_id and related_user_id are required when create_event=true",
            )
        db: Session = SessionLocal()
        try:
            created = crud.event.create_event(
                db,
                EventCreate(
                    event_type=EventType(event_type),
                    related_user_id=int(body.related_user_id),
                    trigger_device_id=int(mysql_device_id),
                    event_params={
                        "source": "flycare_admin_alert_downlink",
                        "command_id": command_id,
                        "action": action,
                        "title": title,
                        "message": message,
                        "passengerName": body.passengerName,
                    },
                    event_status=EventStatus.UNHANDLED,
                ),
            )
            event_result = {
                "ok": True,
                "skipped": False,
                "event_id": int(created.event_id),
                "event_status": str(created.event_status.value if hasattr(created.event_status, "value") else created.event_status),
                "error": None,
            }
        except Exception as exc:
            event_result = {"ok": False, "skipped": False, "event_id": None, "error": str(exc)}
        finally:
            db.close()
    elif body.create_event and action == "clear":
        event_result = {"ok": True, "skipped": True, "event_id": None, "reason": "clear action does not create events"}

    return {
        "status": "ok" if (mqtt_result.get("ok") or mqtt_result.get("skipped")) else "error",
        "payload": payload,
        "alert_payload": alert_payload,
        "mqtt": mqtt_result,
        "event": event_result,
    }
