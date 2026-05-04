"""
local_mqtt_to_mongo_bridge.py

Emergency bridge for demo reliability.

Use this when backend MQTT subscriber is not receiving/writing Mongo.
It subscribes to smartwatch/# and writes MongoDB documents in the same high-level shape:
{
  device_id,
  mysql_device_id,
  timestamp,
  data_type,
  server_received_at,
  payload
}

Install:
  py -m pip install paho-mqtt pymongo

Run:
  py tools/local_mqtt_to_mongo_bridge.py
"""

from __future__ import annotations

import json
import os
import socket
import time
from datetime import datetime, timezone
from typing import Any

from paho.mqtt import client as mqtt
from pymongo import MongoClient

MQTT_HOSTS = [
    "172.20.10.3",
    "192.168.0.203",
    "192.168.137.1",
    "127.0.0.1",
]
MQTT_PORT = 1883
MQTT_TOPIC = "smartwatch/#"

MONGO_URI = "mongodb://localhost:27017"
MONGO_DB_NAME = "smart_elderly_care_system"
MONGO_COLLECTION = "device_raw_upstream"

DEVICE_ID_MAP = {
    "ESP32_0000E03948D4DB1C": 1,
    "ESP32_000040FA7AD4DB1C": 1,
}

SUFFIX_TO_DATA_TYPE = {
    "status": "status_update",
    "location": "location",
    "sos": "sos",
    "fall": "fall",
    "heartbeat": "heartbeat",
}


mongo = MongoClient(MONGO_URI)
collection = mongo[MONGO_DB_NAME][MONGO_COLLECTION]


def data_type_from_topic(topic: str, payload: dict[str, Any]) -> str:
    parts = topic.split("/")
    if len(parts) >= 3:
        suffix = parts[2].strip().lower()
        if suffix in SUFFIX_TO_DATA_TYPE:
            return SUFFIX_TO_DATA_TYPE[suffix]
    return str(payload.get("data_type") or "status_update")


def payload_root(raw: dict[str, Any]) -> dict[str, Any]:
    root = dict(raw)
    for _ in range(3):
        nested = root.get("payload")
        has_payload_fields = any(
            key in root for key in ("location", "sos", "system", "fall_detection", "sensors")
        )
        if not isinstance(nested, dict) or has_payload_fields:
            break
        root = {**root, **nested}
    root.pop("payload", None)
    return root


def make_client() -> mqtt.Client:
    callback_api_version = getattr(mqtt, "CallbackAPIVersion", None)
    client_id = f"campus-watch-bridge-{int(time.time())}"
    if callback_api_version is not None:
        try:
            return mqtt.Client(
                callback_api_version=callback_api_version.VERSION1,
                client_id=client_id,
                protocol=mqtt.MQTTv311,
            )
        except (TypeError, AttributeError, ValueError):
            pass
    return mqtt.Client(client_id=client_id, protocol=mqtt.MQTTv311)


def connect_first_available(client: mqtt.Client) -> str:
    last_error: Exception | None = None
    for host in MQTT_HOSTS:
        try:
            with socket.create_connection((host, MQTT_PORT), timeout=2):
                pass
            client.connect_async(host, MQTT_PORT, keepalive=60)
            print(f"[bridge] connected socket {host}:{MQTT_PORT}", flush=True)
            return host
        except Exception as exc:
            last_error = exc
            print(f"[bridge] connect failed {host}:{MQTT_PORT}: {exc}", flush=True)
    raise RuntimeError(f"No MQTT host connected. Last error: {last_error}")


def on_connect(client: mqtt.Client, userdata: object, flags: dict, rc: int) -> None:
    print(f"[bridge] mqtt connected rc={rc}", flush=True)
    client.subscribe(MQTT_TOPIC)
    print(f"[bridge] subscribed {MQTT_TOPIC}", flush=True)


def on_message(client: mqtt.Client, userdata: object, msg: mqtt.MQTTMessage) -> None:
    try:
        payload = json.loads(msg.payload.decode("utf-8"))
    except Exception as exc:
        print(f"[bridge] invalid json topic={msg.topic}: {exc}", flush=True)
        return

    if not isinstance(payload, dict):
        payload = {"raw": payload}
    else:
        payload = payload_root(payload)

    parts = msg.topic.split("/")
    topic_device_id = parts[1] if len(parts) >= 2 else payload.get("device_id", "UNKNOWN")
    topic_device_id = str(topic_device_id)

    payload["device_id"] = topic_device_id
    payload["data_type"] = data_type_from_topic(msg.topic, payload)

    mysql_device_id = payload.get("mysql_device_id")
    if mysql_device_id is None:
        mysql_device_id = DEVICE_ID_MAP.get(topic_device_id)

    try:
        mysql_device_id = int(mysql_device_id) if mysql_device_id is not None else None
    except Exception:
        mysql_device_id = None

    payload["mysql_device_id"] = mysql_device_id

    doc = {
        "device_id": topic_device_id,
        "mysql_device_id": mysql_device_id,
        "timestamp": payload.get("timestamp", int(time.time())),
        "data_type": payload.get("data_type", "status_update"),
        "server_received_at": datetime.now(timezone.utc),
        "payload": payload,
    }

    result = collection.insert_one(doc)
    print(
        f"[bridge] saved {doc['data_type']} device={topic_device_id} mongo_id={result.inserted_id}",
        flush=True,
    )


def main() -> None:
    print("[bridge] starting", flush=True)
    print(f"[bridge] MQTT hosts={MQTT_HOSTS} port={MQTT_PORT} topic={MQTT_TOPIC}", flush=True)
    print(f"[bridge] Mongo={MONGO_URI}/{MONGO_DB_NAME}.{MONGO_COLLECTION}", flush=True)
    client = make_client()
    client.on_connect = on_connect
    client.on_message = on_message
    host = connect_first_available(client)
    print(f"[bridge] using {host}:{MQTT_PORT}", flush=True)
    run_seconds = int(os.getenv("BRIDGE_RUN_SECONDS", "0") or "0")
    if run_seconds > 0:
        client.loop_start()
        time.sleep(run_seconds)
        client.loop_stop()
        client.disconnect()
        return
    client.loop_forever()


if __name__ == "__main__":
    main()
