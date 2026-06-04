"""Publish test payloads to MQTT (e.g. FlyCare flight updates)."""

import json
import uuid
from typing import Any, Dict

from app.config import settings

_PUBLISH_TIMEOUT_SEC = 8


def publish_json(topic: str, payload: Dict[str, Any], *, qos: int = 1) -> Dict[str, Any]:
    try:
        import paho.mqtt.client as mqtt
    except ImportError as exc:
        raise RuntimeError("paho-mqtt is not installed") from exc

    body = json.dumps(payload, ensure_ascii=False)
    client_id = f"aist-pub-{uuid.uuid4().hex[:8]}"
    callback_api_version = getattr(mqtt, "CallbackAPIVersion", None)
    if callback_api_version is not None:
        try:
            client = mqtt.Client(
                callback_api_version=callback_api_version.VERSION1,
                client_id=client_id,
                protocol=mqtt.MQTTv311,
            )
        except (TypeError, AttributeError, ValueError):
            client = mqtt.Client(client_id=client_id, protocol=mqtt.MQTTv311)
    else:
        client = mqtt.Client(client_id=client_id, protocol=mqtt.MQTTv311)

    if settings.MQTT_USER and settings.MQTT_PASSWORD:
        client.username_pw_set(settings.MQTT_USER, settings.MQTT_PASSWORD)

    info = None
    try:
        client.connect(settings.MQTT_BROKER, settings.MQTT_PORT, keepalive=30)
        client.loop_start()
        info = client.publish(topic, body, qos=qos)
        info.wait_for_publish(timeout=_PUBLISH_TIMEOUT_SEC)
    finally:
        try:
            client.loop_stop()
            client.disconnect()
        except Exception:
            pass

    if info is None or info.rc != mqtt.MQTT_ERR_SUCCESS:
        rc = info.rc if info is not None else "unknown"
        raise RuntimeError(f"MQTT publish failed rc={rc}")
    return {
        "ok": True,
        "topic": topic,
        "qos": qos,
        "broker": f"{settings.MQTT_BROKER}:{settings.MQTT_PORT}",
        "error": None,
    }


def build_flycare_flight_topic(device_id: str) -> str:
    return settings.FLYCARE_FLIGHT_DOWNLINK_TOPIC_TEMPLATE.format(device_id=str(device_id).strip())


def build_flight_mqtt_downlink(flight_info: Dict[str, Any]) -> Dict[str, Any]:
    """Build smartwatch flight downlink body for topic smartwatch/{device_id}/flight."""
    return {
        "command_type": "flight_info",
        "flight_info": dict(flight_info),
    }


def publish_flight_downlink(
    device_id: str,
    flight_info: Dict[str, Any],
    *,
    qos: int = 1,
) -> Dict[str, Any]:
    device_id = str(device_id or "").strip()
    if not device_id:
        raise ValueError("device_id is required for FlyCare flight downlink")
    mqtt_payload = build_flight_mqtt_downlink(flight_info)
    return publish_json(build_flycare_flight_topic(device_id), mqtt_payload, qos=qos)


def publish_flight_payload(payload: Dict[str, Any], *, qos: int = 1) -> Dict[str, Any]:
    """Backward-compatible wrapper when payload already contains flight_info."""
    device_id = str(payload.get("device_id") or "").strip()
    if not device_id:
        raise ValueError("payload.device_id is required for FlyCare flight downlink")
    flight_info = payload.get("flight_info")
    if isinstance(flight_info, dict):
        return publish_flight_downlink(device_id, flight_info, qos=qos)
    raise ValueError("payload.flight_info is required for FlyCare flight downlink")
