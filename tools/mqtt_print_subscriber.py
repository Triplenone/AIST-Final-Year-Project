"""
mqtt_print_subscriber.py

Use this instead of mosquitto_sub on Windows if mosquitto_sub.exe is not in PATH.

Install:
  py -m pip install paho-mqtt

Run:
  py tools/mqtt_print_subscriber.py
"""

from __future__ import annotations

import os
import socket
import time
from paho.mqtt import client as mqtt

MQTT_HOSTS = [
    "172.20.10.3",
    "192.168.0.203",
    "192.168.137.1",
    "127.0.0.1",
]
MQTT_PORT = 1883
MQTT_TOPIC = "smartwatch/#"


def on_connect(client: mqtt.Client, userdata: object, flags: dict, rc: int) -> None:
    print(f"[mqtt-print] connected rc={rc}", flush=True)
    client.subscribe(MQTT_TOPIC)
    print(f"[mqtt-print] subscribed {MQTT_TOPIC}", flush=True)


def on_message(client: mqtt.Client, userdata: object, msg: mqtt.MQTTMessage) -> None:
    print(f"{msg.topic} {msg.payload.decode('utf-8', errors='replace')}", flush=True)


def make_client() -> mqtt.Client:
    callback_api_version = getattr(mqtt, "CallbackAPIVersion", None)
    client_id = f"mqtt-print-{int(time.time())}"
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
            print(f"[mqtt-print] connected socket {host}:{MQTT_PORT}", flush=True)
            return host
        except Exception as exc:
            last_error = exc
            print(f"[mqtt-print] connect failed {host}:{MQTT_PORT}: {exc}", flush=True)
    raise RuntimeError(f"No MQTT host connected. Last error: {last_error}")


def main() -> None:
    client = make_client()
    client.on_connect = on_connect
    client.on_message = on_message
    host = connect_first_available(client)
    print(f"[mqtt-print] using {host}:{MQTT_PORT}", flush=True)
    run_seconds = int(os.getenv("MQTT_PRINT_SECONDS", "0") or "0")
    if run_seconds > 0:
        client.loop_start()
        time.sleep(run_seconds)
        client.loop_stop()
        client.disconnect()
        return
    client.loop_forever()


if __name__ == "__main__":
    main()
