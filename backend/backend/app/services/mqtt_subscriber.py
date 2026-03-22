"""
MQTT 订阅服务：订阅 ESP32 上行主题（与 MQTT-topic.txt 一致），将 JSON 写入 MongoDB。
同时订阅航班信息主题 flycare/flight，用于模拟机场航班信息更新。
"""
import json
import re
import threading
import time
import uuid

from app.config import settings
from app.services.mongo_raw_upstream import run_sync_save_raw_upstream

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
]

# 航班信息主题：Postman 等客户端向此 topic 发布 JSON 即可模拟航班信息更新
FLIGHT_TOPIC = "flycare/flight"

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


def _on_connect(client, userdata, flags, rc):
    if rc != 0:
        print(f"⚠️ MQTT 连接失败 rc={rc}")
        return
    print("✅ MQTT 已连接")
    for topic in UPLINK_TOPICS:
        client.subscribe(topic)
    client.subscribe(FLIGHT_TOPIC)
    print(f"  已订阅 {len(UPLINK_TOPICS)} 个设备上行主题 + {FLIGHT_TOPIC}")


def _on_message(client, userdata, msg):
    try:
        payload_str = msg.payload.decode("utf-8")
    except Exception as e:
        print(f"⚠️ MQTT payload 解码失败: {e}")
        return
    try:
        data = json.loads(payload_str)
    except json.JSONDecodeError as e:
        # 临时容错：尝试修复 trailing comma
        cleaned = _sanitize_json_trailing_commas(payload_str)
        if cleaned != payload_str:
            try:
                data = json.loads(cleaned)
                print(f"⚠️ MQTT payload 非标准 JSON（已尝试清洗 trailing comma）: {e}")
            except json.JSONDecodeError:
                print(f"⚠️ MQTT payload 非 JSON: {e}")
                return
        else:
            print(f"⚠️ MQTT payload 非 JSON: {e}")
            return
    except Exception as e:
        print(f"⚠️ MQTT payload JSON 解析异常: {e}")
        return
    if not isinstance(data, dict):
        data = {"payload": data}

    # 航班信息主题：直接写入 Mongo，带 data_type=flight 与 timestamp
    if msg.topic == FLIGHT_TOPIC:
        data["data_type"] = "flight"
        data.setdefault("timestamp", time.time())
        try:
            run_sync_save_raw_upstream(data)
            print(f"  [flycare] 已写入航班信息: {data.get('flightNumber', 'N/A')}")
        except Exception as e:
            print(f"⚠️ 航班信息写入 Mongo 失败: {e}")
        return

    # 设备上行主题：smartwatch/<device_id>/<suffix>
    parts = msg.topic.split("/")
    if len(parts) >= 3:
        device_id_from_topic = parts[1]
        suffix = parts[2].lower()
        if data.get("device_id") is None:
            data["device_id"] = device_id_from_topic
        data_type = SUFFIX_TO_DATA_TYPE.get(suffix, "status_update")
        data["data_type"] = data.get("data_type") or data_type
    else:
        data.setdefault("device_id", "UNKNOWN")
        data.setdefault("data_type", "status_update")
    try:
        run_sync_save_raw_upstream(data)
    except Exception as e:
        print(f"⚠️ MQTT 写入 Mongo 失败: {e}")


def start_mqtt():
    """启动 MQTT 订阅（在 FastAPI startup 中调用）"""
    global _client, _started
    with _lock:
        if _started:
            return
        try:
            import paho.mqtt.client as mqtt
        except ImportError:
            print("⚠️ 未安装 paho-mqtt，MQTT 订阅已跳过。执行: pip install paho-mqtt")
            return
        client_id = f"aist-backend-{uuid.uuid4().hex[:8]}"
        try:
            client = mqtt.Client(
                callback_api_version=mqtt.CallbackAPIVersion.VERSION1,
                client_id=client_id,
                protocol=mqtt.MQTTv311,
            )
        except TypeError:
            client = mqtt.Client(client_id=client_id, protocol=mqtt.MQTTv311)
        client.on_connect = _on_connect
        client.on_message = _on_message
        if settings.MQTT_USER and settings.MQTT_PASSWORD:
            client.username_pw_set(settings.MQTT_USER, settings.MQTT_PASSWORD)
        try:
            client.connect(settings.MQTT_BROKER, settings.MQTT_PORT, keepalive=60)
        except Exception as e:
            print(f"⚠️ MQTT 连接失败（Broker 可能不可达）: {e}")
            return
        client.loop_start()
        _client = client
        _started = True
        print(f"   MQTT 已启动 -> {settings.MQTT_BROKER}:{settings.MQTT_PORT}")


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
        print("   MQTT 已断开")


def get_mqtt_status():
    """返回 MQTT 状态，供 GET /data-reception/mqtt/status 使用"""
    with _lock:
        connected = _client is not None and _client.is_connected() if _client else False
    return {
        "enabled": _started,
        "connected": connected,
        "broker": settings.MQTT_BROKER,
        "port": settings.MQTT_PORT,
        "subscribed_topics": UPLINK_TOPICS.copy() + [FLIGHT_TOPIC],
    }
