"""
MQTT 订阅服务：订阅 ESP32 上行主题（与 MQTT-topic.txt 一致），将 JSON 写入 MongoDB。
同时保留 legacy 航班 loopback 主题 flycare/flight；primary 下行为 smartwatch/{device_id}/flight。
"""
import json
import re
import threading
import time
import uuid
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models.device import Device
from app.models.event import Event, EventStatus, EventType
from app.services.mongo_raw_upstream import enrich_flight_downlink_payload, run_sync_save_raw_upstream

# MQTT-topic：设备上行主题
UPLINK_TOPICS = [
    "smartwatch/+/status",
    "smartwatch/+/location",
    "smartwatch/+/sos",
    "smartwatch/+/fall",
    "smartwatch/+/door",
    "smartwatch/+/light",
    "smartwatch/+/log",
    "smartwatch/+/heartbeat",
    "smartwatch/+/vitals",
]

# Legacy 航班 loopback 主题；primary per-device 下行由 mqtt_publish.py 发布。
FLIGHT_TOPIC = "flycare/flight"
FLIGHT_DOWNLINK_TOPIC = "smartwatch/+/flight"

# topic 第三段后缀 -> 写入 Mongo 的 data_type
SUFFIX_TO_DATA_TYPE = {
    "status": "status_update",
    "location": "location",
    "sos": "sos",
    "fall": "fall",
    "door": "door",
    "light": "light",
    "log": "log",
    "heartbeat": "heartbeat",
    "vitals": "vitals",
}

_client = None
_started = False
_lock = threading.Lock()

_TRAILING_COMMA_RE = re.compile(r",\s*([}\]])")


def _sanitize_json_trailing_commas(s: str) -> str:
    """
    临时容错：去掉紧跟着 } 或 ] 的多余逗号（非标准 JSON 常见错误）。
    例如：{"a":1,} -> {"a":1}， [{"a":1,},{"a":2,}] -> [{"a":1},{"a":2}]
    """
    return _TRAILING_COMMA_RE.sub(r"\1", s)


def _is_sos_active(data: dict) -> bool:
    sos = data.get("sos")
    if isinstance(sos, dict):
        active = sos.get("active")
        pressed = sos.get("pressed")
        return active is True or str(active).lower() == "true" or pressed is True or str(pressed).lower() == "true"
    return sos is True or str(sos).lower() == "true"


def _is_fall_confirmed(data: dict) -> bool:
    fall_detection = data.get("fall_detection")
    if not isinstance(fall_detection, dict):
        return False
    confirmed = fall_detection.get("is_fall_confirmed")
    if confirmed is True or str(confirmed).lower() == "true":
        return True
    desc = fall_detection.get("state_description")
    if isinstance(desc, str):
        normalized = desc.strip().lower()
        return normalized in {"确认跌倒", "confirmed fall"}
    return False


def _create_unhandled_event_if_needed(data: dict) -> dict:
    data_type = str(data.get("data_type", "")).strip().lower()
    target_event_type: EventType | None = None

    if data_type == "sos" and _is_sos_active(data):
        target_event_type = EventType.SOS
    elif data_type == "fall" and _is_fall_confirmed(data):
        target_event_type = EventType.FALL
    else:
        return {"ok": True, "created": False, "reason": "not_alert"}

    mysql_device_id = data.get("mysql_device_id")
    if mysql_device_id is None:
        return {"ok": True, "created": False, "reason": "missing_mysql_device_id"}
    try:
        device_id = int(mysql_device_id)
    except (TypeError, ValueError):
        return {"ok": True, "created": False, "reason": "invalid_mysql_device_id"}

    db: Session = SessionLocal()
    try:
        device = db.query(Device).filter(Device.device_id == device_id).first()
        if not device or not device.elderly_user_id:
            return {"ok": True, "created": False, "reason": "device_or_user_missing"}

        dedupe_since = datetime.now() - timedelta(minutes=1)
        existing = (
            db.query(Event)
            .filter(
                Event.trigger_device_id == device_id,
                Event.event_type == target_event_type,
                Event.event_status == EventStatus.UNHANDLED,
                Event.event_timestamp >= dedupe_since,
            )
            .first()
        )
        if existing:
            return {"ok": True, "created": False, "reason": "deduped", "event_id": existing.event_id}

        event = Event(
            event_type=target_event_type,
            related_user_id=device.elderly_user_id,
            trigger_device_id=device_id,
            location_zone_id=None,
            event_timestamp=datetime.now(),
            event_params={
                "source": "mqtt_upstream",
                "data_type": data_type,
                "payload": data,
            },
            event_status=EventStatus.UNHANDLED,
            handled_by=None,
            handled_at=None,
            remark=None,
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return {"ok": True, "created": True, "event_id": event.event_id}
    except Exception as exc:
        db.rollback()
        print(f"[mqtt] event create failed: {exc}")
        return {"ok": False, "created": False, "error": str(exc)}
    finally:
        db.close()


def _on_connect(client, userdata, flags, rc):
    if rc != 0:
        print(f"[mqtt] connect failed rc={rc}")
        return
    print("[mqtt] connected")
    for topic in UPLINK_TOPICS:
        client.subscribe(topic)
    client.subscribe(FLIGHT_TOPIC)
    client.subscribe(FLIGHT_DOWNLINK_TOPIC)
    print(
        f"[mqtt] subscribed topics={len(UPLINK_TOPICS)}+2 "
        f"flight={FLIGHT_TOPIC} downlink={FLIGHT_DOWNLINK_TOPIC}"
    )


def _on_message(client, userdata, msg):
    try:
        payload_str = msg.payload.decode("utf-8")
    except Exception as e:
        print(f"[mqtt] payload decode failed: {e}")
        return
    try:
        data = json.loads(payload_str)
    except json.JSONDecodeError as e:
        # 临时容错：尝试修复 trailing comma
        cleaned = _sanitize_json_trailing_commas(payload_str)
        if cleaned != payload_str:
            try:
                data = json.loads(cleaned)
                print(f"[mqtt] payload sanitized after trailing comma parse error: {e}")
            except json.JSONDecodeError:
                print(f"[mqtt] payload is not valid json: {e}")
                return
        else:
            print(f"[mqtt] payload is not valid json: {e}")
            return
    except Exception as e:
        print(f"[mqtt] payload json parse error: {e}")
        return
    if not isinstance(data, dict):
        data = {"payload": data}

    parts = msg.topic.split("/")
    if len(parts) >= 3 and parts[0] == "smartwatch" and parts[2].lower() == "flight":
        device_id_from_topic = parts[1]
        flight_doc = enrich_flight_downlink_payload(data, device_id_from_topic)
        mongo_result = run_sync_save_raw_upstream(flight_doc)
        print(
            f"[mqtt] flight downlink topic={msg.topic} device_id={device_id_from_topic} "
            f"flight_number={flight_doc.get('flightNumber')} mongo={mongo_result}"
        )
        return

    # 航班信息主题：直接写入 Mongo，带 data_type=flight 与 timestamp
    if msg.topic == FLIGHT_TOPIC:
        data["data_type"] = "flight"
        data.setdefault("timestamp", time.time())
        mongo_result = run_sync_save_raw_upstream(data)
        print(
            f"[mqtt] legacy flight topic={msg.topic} device_id={data.get('device_id', 'MISSING')} "
            f"data_type=flight mongo={mongo_result}"
        )
        return

    # 设备上行主题：smartwatch/<device_id>/<suffix>
    if len(parts) >= 3:
        device_id_from_topic = parts[1]
        suffix = parts[2].lower()
        mapped = settings.device_id_map.get(device_id_from_topic)
        # 双写策略：保留外部设备 ID 到 `device_id`，并额外写入 `mysql_device_id`。
        data["device_id"] = device_id_from_topic
        if mapped is not None:
            data["mysql_device_id"] = int(mapped)
        data_type = SUFFIX_TO_DATA_TYPE.get(suffix, suffix)
        incoming_data_type = data.get("data_type")
        if incoming_data_type and str(incoming_data_type).strip().lower() != data_type:
            print(
                f"[mqtt] data_type mismatch topic={msg.topic}: "
                f"payload={incoming_data_type} -> forced={data_type}"
            )
        # 以 topic 为准，避免设备端 payload 保留旧值导致误写为 status_update。
        data["data_type"] = data_type
    else:
        data.setdefault("device_id", "UNKNOWN")
        data.setdefault("data_type", "status_update")
    mongo_result = run_sync_save_raw_upstream(data)
    try:
        event_result = _create_unhandled_event_if_needed(data)
    except Exception as e:
        event_result = {"ok": False, "error": str(e)}
        print(f"[mqtt] event bridge failed: {e}")
    print(
        f"[mqtt] upstream topic={msg.topic} device_id={data.get('device_id')} "
        f"mysql_device_id={data.get('mysql_device_id')} data_type={data.get('data_type')} "
        f"mongo={mongo_result} event={event_result}"
    )


def start_mqtt():
    """启动 MQTT 订阅（在 FastAPI startup 中调用）"""
    global _client, _started
    with _lock:
        if _started:
            return
        try:
            import paho.mqtt.client as mqtt
        except ImportError:
            print("[mqtt] paho-mqtt not installed; subscriber skipped (pip install paho-mqtt)")
            return
        client_id = f"aist-backend-{uuid.uuid4().hex[:8]}"
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
        client.on_connect = _on_connect
        client.on_message = _on_message
        if settings.MQTT_USER and settings.MQTT_PASSWORD:
            client.username_pw_set(settings.MQTT_USER, settings.MQTT_PASSWORD)
        try:
            client.connect(settings.MQTT_BROKER, settings.MQTT_PORT, keepalive=60)
        except Exception as e:
            print(
                f"[mqtt] broker connect failed: {settings.MQTT_BROKER}:{settings.MQTT_PORT} — {e}. "
                "Flight MQTT will not be saved until connected."
            )
            return
        client.loop_start()
        _client = client
        _started = True
        print(
            f"[mqtt] started -> {settings.MQTT_BROKER}:{settings.MQTT_PORT} "
            f"(flight topic: {FLIGHT_TOPIC})"
        )


def stop_mqtt():
    """停止 MQTT 订阅（在 FastAPI shutdown 中调用）"""
    global _client, _started
    with _lock:
        if not _client:
            return
        try:
            _client.loop_stop()
            _client.disconnect()
        except Exception:
            pass
        _client = None
        _started = False
        print("[mqtt] disconnected")


def get_mqtt_status():
    """返回 MQTT 状态，供 GET /data-reception/mqtt/status 使用"""
    with _lock:
        connected = _client is not None and _client.is_connected() if _client else False
    return {
        "enabled": _started,
        "connected": connected,
        "broker": settings.MQTT_BROKER,
        "port": settings.MQTT_PORT,
        "subscribed_topics": UPLINK_TOPICS.copy() + [FLIGHT_TOPIC, FLIGHT_DOWNLINK_TOPIC],
    }
