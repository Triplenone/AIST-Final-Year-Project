"""Small MQTT publish helper for backend command routes."""

from __future__ import annotations

import json
import uuid
from typing import Any, Dict

from app.config import settings


def _new_mqtt_client():
    import paho.mqtt.client as mqtt

    client_id = f"aist-backend-pub-{uuid.uuid4().hex[:8]}"
    return mqtt.Client(client_id=client_id, protocol=mqtt.MQTTv311)


def publish_json(
    topic: str,
    payload: Dict[str, Any],
    *,
    qos: int = 1,
    retain: bool = False,
    timeout_seconds: float = 5.0,
) -> Dict[str, Any]:
    """Publish one JSON payload to the configured MQTT broker."""
    result: Dict[str, Any] = {
        "ok": False,
        "broker": settings.MQTT_BROKER,
        "port": settings.MQTT_PORT,
    }
    try:
        client = _new_mqtt_client()
        if settings.MQTT_USER and settings.MQTT_PASSWORD:
            client.username_pw_set(settings.MQTT_USER, settings.MQTT_PASSWORD)

        client.connect(settings.MQTT_BROKER, settings.MQTT_PORT, keepalive=30)
        client.loop_start()
        try:
            info = client.publish(
                topic,
                json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
                qos=qos,
                retain=retain,
            )
            try:
                info.wait_for_publish(timeout=timeout_seconds)
            except TypeError:
                info.wait_for_publish()
            result.update({"ok": info.is_published(), "rc": info.rc})
            if not result["ok"]:
                result["error"] = f"MQTT publish not confirmed (rc={info.rc})"
        finally:
            client.loop_stop()
            client.disconnect()
    except ImportError as exc:
        result["error"] = f"paho-mqtt not installed: {exc}"
    except Exception as exc:
        result["error"] = str(exc)
    return result
