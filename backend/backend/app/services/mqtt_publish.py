"""Publish test payloads to MQTT (e.g. FlyCare flight updates)."""

import json
import uuid
from typing import Any, Dict

from app.config import settings
from app.services.mqtt_subscriber import FLIGHT_TOPIC

_PUBLISH_TIMEOUT_SEC = 8


def publish_json(topic: str, payload: Dict[str, Any], *, qos: int = 1) -> None:
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


def publish_flight_payload(payload: Dict[str, Any], *, qos: int = 1) -> None:
    publish_json(FLIGHT_TOPIC, payload, qos=qos)
