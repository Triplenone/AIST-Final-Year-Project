"""Neutral smartwatch command routes for the elderly-care demo."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Literal, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field, field_validator

from app.services.mqtt_publish import publish_json
from app.services.mqtt_subscriber import get_mqtt_status

router = APIRouter()


class WatchAlertPublishRequest(BaseModel):
    device_id: str = Field(..., min_length=1)
    event_type: Literal["sos", "fall"]
    action: Literal["activate", "clear"]
    command_id: Optional[str] = None
    mysql_device_id: Optional[int] = None
    related_user_id: Optional[int] = None
    title: Optional[str] = None
    message: Optional[str] = None
    severity: Literal["info", "warning", "critical"] = "critical"

    @field_validator("device_id", "command_id", mode="before")
    @classmethod
    def _strip_text(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("device_id")
    @classmethod
    def _validate_topic_segment(cls, value: str) -> str:
        if "/" in value or "#" in value or "+" in value:
            raise ValueError("device_id must be one MQTT topic segment")
        return value


class WatchAlertPublishResponse(BaseModel):
    status: Literal["ok", "error"]
    topic: str
    payload: Dict[str, Any]
    mqtt: Dict[str, Any]


def _default_title(event_type: str, action: str) -> str:
    event_name = "SOS" if event_type == "sos" else "Fall"
    return f"{event_name} {'activated' if action == 'activate' else 'cleared'}"


def _default_message(event_type: str, action: str) -> str:
    event_name = "SOS alert" if event_type == "sos" else "Fall alert"
    if action == "activate":
        return f"{event_name} was triggered by the care team demo console."
    return f"{event_name} was cleared by the care team demo console."


@router.get("/mqtt/status", response_model=Dict[str, Any])
def read_watch_command_mqtt_status() -> Dict[str, Any]:
    return get_mqtt_status()


@router.post("/alert/publish", response_model=WatchAlertPublishResponse)
def publish_watch_alert_command(request: WatchAlertPublishRequest) -> WatchAlertPublishResponse:
    issued_at = datetime.now(timezone.utc)
    command_id = request.command_id or (
        f"{request.event_type}-{request.action}-{issued_at.strftime('%Y%m%d%H%M%S%f')}"
    )
    topic = f"smartwatch/{request.device_id}/alert"
    payload: Dict[str, Any] = {
        "command_type": "alert",
        "command_id": command_id,
        "event_type": request.event_type,
        "action": request.action,
        "active": request.action == "activate",
        "title": request.title or _default_title(request.event_type, request.action),
        "message": request.message or _default_message(request.event_type, request.action),
        "severity": request.severity,
        "source": "elderly_care_demo",
        "issued_at": issued_at.isoformat(),
    }
    if request.mysql_device_id is not None:
        payload["mysql_device_id"] = request.mysql_device_id
    if request.related_user_id is not None:
        payload["related_user_id"] = request.related_user_id

    mqtt_result = publish_json(topic, payload, qos=1, retain=False)
    return WatchAlertPublishResponse(
        status="ok" if mqtt_result.get("ok") else "error",
        topic=topic,
        payload=payload,
        mqtt=mqtt_result,
    )
