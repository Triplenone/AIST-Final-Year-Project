"""Resolve devices linked to an elderly user for MongoDB / vitals bridging."""

from collections import defaultdict
from typing import Dict, List

from sqlalchemy.orm import Session

from app.models.device import Device
from app.models.user_status import UserStatus

# MQTT `smartwatch/<id>/heartbeat` persists as data_type "heartbeat" (see mqtt_subscriber).
# Vitals-style payloads may also appear on status_update / vitals.
VITALS_UPSTREAM_DATA_TYPES = ["vitals", "status_update", "heartbeat"]


def devices_by_elderly_user_ids(db: Session, user_ids: List[int]) -> Dict[int, List[Device]]:
    """
    For each elderly user_id, return distinct Device rows linked by either:
    - device.elderly_user_id == user, or
    - user_status.user_id == user (uses user_status.device_id so binding still works
      when elderly_user_id was not set on the device row).
    """
    if not user_ids:
        return {}

    acc: Dict[int, Dict[int, Device]] = {uid: {} for uid in user_ids}

    for dev in db.query(Device).filter(Device.elderly_user_id.in_(user_ids)).all():
        uid = dev.elderly_user_id
        if uid is not None and uid in acc:
            acc[uid][dev.device_id] = dev

    rows = (
        db.query(UserStatus.user_id, UserStatus.device_id)
        .filter(UserStatus.user_id.in_(user_ids))
        .distinct()
        .all()
    )

    missing_by_user: Dict[int, List[int]] = defaultdict(list)
    for uid, did in rows:
        if uid not in acc or not did:
            continue
        if did not in acc[uid]:
            missing_by_user[uid].append(did)

    all_missing = list(dict.fromkeys(did for dids in missing_by_user.values() for did in dids))
    if all_missing:
        extra = {d.device_id: d for d in db.query(Device).filter(Device.device_id.in_(all_missing)).all()}
        for uid, dids in missing_by_user.items():
            for did in dids:
                d = extra.get(did)
                if d:
                    acc[uid][d.device_id] = d

    return {uid: list(devmap.values()) for uid, devmap in acc.items()}
