"""
mqtt_print_subscriber.py

Use this instead of mosquitto_sub on Windows if mosquitto_sub.exe is not in PATH.

Install:
  py -m pip install paho-mqtt

Run:
  py tools/mqtt_print_subscriber.py
"""

from __future__ import annotations

import time
from paho.mqtt import client as mqtt

MQTT_HOST = "192.168.0.203"
MQTT_PORT = 1883
MQTT_TOPIC = "smartwatch/#"


def on_connect(client: mqtt.Client, userdata: object, flags: dict, rc: int) -> None:
    print(f"[mqtt-print] connected rc={rc}")
    client.subscribe(MQTT_TOPIC)
    print(f"[mqtt-print] subscribed {MQTT_TOPIC}")


def on_message(client: mqtt.Client, userdata: object, msg: mqtt.MQTTMessage) -> None:
    print(f"{msg.topic} {msg.payload.decode('utf-8', errors='replace')}")


def main() -> None:
    client = mqtt.Client(client_id=f"mqtt-print-{int(time.time())}", protocol=mqtt.MQTTv311)
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
    client.loop_forever()


if __name__ == "__main__":
    main()
