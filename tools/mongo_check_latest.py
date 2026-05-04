"""
mongo_check_latest.py

Print latest Mongo upstream documents for the campus watch.

Install:
  py -m pip install pymongo

Run:
  py tools/mongo_check_latest.py
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from pymongo import MongoClient

MONGO_URI = "mongodb://localhost:27017"
MONGO_DB_NAME = "smart_elderly_care_system"
MONGO_COLLECTION = "device_raw_upstream"

DEVICE_IDS = [
    "ESP32_0000E03948D4DB1C",
    "ESP32_000040FA7AD4DB1C",
]

client = MongoClient(MONGO_URI)
collection = client[MONGO_DB_NAME][MONGO_COLLECTION]


def payload_root(doc: dict[str, Any]) -> dict[str, Any]:
    payload = doc.get("payload")
    if not isinstance(payload, dict):
        return doc
    root = dict(payload)
    for _ in range(2):
        nested = root.get("payload")
        if not isinstance(nested, dict):
            break
        root = {**root, **nested}
    return root


def to_jsonable(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat()
    return value


def print_latest(device_id: str) -> None:
    print("\n==", device_id, "==")
    doc = collection.find_one({"device_id": device_id}, sort=[("server_received_at", -1)])
    if not doc:
        print("No document")
        return

    payload = payload_root(doc)
    location = payload.get("location") if isinstance(payload.get("location"), dict) else {}
    current = location.get("current") if isinstance(location.get("current"), dict) else None
    beacons = location.get("beacons") if isinstance(location.get("beacons"), list) else None
    nearest = location.get("nearest_beacon") if isinstance(location.get("nearest_beacon"), dict) else None
    server_received_at = doc.get("server_received_at")
    age = None
    if isinstance(server_received_at, datetime):
        age = round((datetime.now(timezone.utc) - server_received_at.replace(tzinfo=timezone.utc)).total_seconds())

    summary = {
        "doc_id": str(doc.get("_id")),
        "device_id": doc.get("device_id"),
        "mysql_device_id": doc.get("mysql_device_id"),
        "server_received_at": to_jsonable(server_received_at),
        "age_seconds": age,
        "data_type": doc.get("data_type"),
        "payload_location_current": current,
        "payload_location_beacons": beacons,
        "payload_location_nearest_beacon": nearest,
    }
    print(json.dumps(summary, ensure_ascii=True, indent=2, default=str))


for device_id in DEVICE_IDS:
    print_latest(device_id)
