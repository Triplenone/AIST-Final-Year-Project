#!/usr/bin/env python3
"""Sync MySQL device rows for ESP32 entries in device_id_map.json."""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = REPO_ROOT / "backend" / "backend"
MAP_PATH = BACKEND_ROOT / "config" / "device_id_map.json"

# mysql_device_id -> (mongodb_device_id, preferred_user_id)
TARGET_DEVICES: dict[int, tuple[str, int]] = {
    6: ("ESP32_00008C292A04A7AC", 6),
    7: ("ESP32_00009022A443CA48", 7),
}


def load_map() -> dict[str, int]:
    raw = json.loads(MAP_PATH.read_text(encoding="utf-8"))
    out: dict[str, int] = {}
    for row in raw.get("mongo_to_mysql", []):
        out[str(row["mongodb_device_id"]).strip()] = int(row["mysql_device_id"])
    return out


def pick_user_id(preferred: int, bound_users: set[int]) -> int:
    user_id = preferred
    while user_id in bound_users:
        user_id += 1
    return user_id


def main() -> int:
    sys.path.insert(0, str(BACKEND_ROOT))
    from app.config import settings  # noqa: WPS433
    from app.database import SessionLocal
    from app.models.device import Device, DeviceStatus
    from app.schemas.device import DeviceUpdate
    from app.crud import device as device_crud

    device_map = load_map()
    for mongo_id, (expected_mongo, _) in TARGET_DEVICES.items():
        mapped = device_map.get(expected_mongo)
        if mapped != mongo_id:
            print(f"ERROR: device_id_map missing or mismatched for {expected_mongo} -> {mongo_id}")
            return 1

    db = SessionLocal()
    try:
        tracked_ids = sorted(mid for mid in device_map.values() if mid not in TARGET_DEVICES)
        bound_users: set[int] = set()
        for device_id in tracked_ids:
            row = device_crud.get_device(db, device_id)
            if row and row.elderly_user_id:
                bound_users.add(int(row.elderly_user_id))

        for mysql_id, (mongo_id, preferred_user) in sorted(TARGET_DEVICES.items()):
            user_id = pick_user_id(preferred_user, bound_users)
            bound_users.add(user_id)

            payload = {
                "device_type": "IMU_Safety_Sensor",
                "model_desc": mongo_id,
                "elderly_user_id": user_id,
                "mac_address": f"AA:BB:CC:DD:EE:{mysql_id:02d}",
                "current_status": DeviceStatus.OFFLINE,
                "deploy_location": f"test-room{mysql_id:02d}",
            }

            existing = device_crud.get_device(db, mysql_id)
            if existing:
                device_crud.update_device(db, mysql_id, DeviceUpdate(**payload))
                action = "updated"
            else:
                row = Device(device_id=mysql_id, **payload)
                db.query(Device).filter(Device.elderly_user_id == user_id).update(
                    {"elderly_user_id": None}, synchronize_session=False
                )
                db.add(row)
                db.commit()
                db.refresh(row)
                action = "created"

            print(f"{action} device_id={mysql_id} mongo={mongo_id} elderly_user_id={user_id}")

        print("\nCurrent bindings:")
        for device_id in sorted(set(tracked_ids) | set(TARGET_DEVICES.keys())):
            row = device_crud.get_device(db, device_id)
            if not row:
                continue
            mongo_ids = [k for k, v in device_map.items() if v == device_id]
            print(
                f"  device {device_id}: user={row.elderly_user_id} "
                f"model={row.model_desc} mongo={','.join(mongo_ids) or '-'}"
            )
    finally:
        db.close()

    print(f"\nMap file: {MAP_PATH}")
    print(f"DB: {settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
