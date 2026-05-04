"""
mongo_check_latest.py

Print latest Mongo upstream documents for the campus watch.

Install:
  py -m pip install pymongo

Run:
  py tools/mongo_check_latest.py
"""

from __future__ import annotations

from pprint import pprint
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

for device_id in DEVICE_IDS:
    print("\n==", device_id, "==")
    doc = collection.find_one({"device_id": device_id}, sort=[("server_received_at", -1)])
    pprint(doc)
