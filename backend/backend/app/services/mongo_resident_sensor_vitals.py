"""Sync MongoDB lookups for latest sensor vitals per elderly user (for /residents)."""

from collections import defaultdict
from typing import Any, Dict, List, Optional, Set, Tuple

from sqlalchemy.orm import Session

from app.config import settings
from app.db.mongo import COLLECTION_RAW_UPSTREAM
from app.models.device import Device
from app.services.elderly_device_queries import VITALS_UPSTREAM_DATA_TYPES, devices_by_elderly_user_ids
from app.services.mongo_raw_upstream import get_sync_mongo_db
from app.services.sensor_vitals_extract import extract_hr_spo2_from_upstream_doc

# Cap scan depth so a pathological collection cannot block the API thread too long.
_MAX_SCAN_DOCS = 4000


def _reverse_device_map() -> Dict[int, str]:
    return {value: key for key, value in settings.device_id_map.items()}


def _candidate_ids_for_device(dev: Device, reverse_map: Dict[int, str]) -> List[str]:
    out: List[str] = [str(dev.device_id)]
    if dev.mac_address:
        out.append(str(dev.mac_address).strip())
    ext = reverse_map.get(dev.device_id)
    if ext:
        out.append(str(ext))
    return list(dict.fromkeys(out))


def load_mongo_sensor_vitals_for_users(
    db: Session, user_ids: List[int]
) -> Dict[int, Tuple[Optional[int], Optional[float]]]:
    """
    For each elderly user_id with at least one bound device, return the newest
    (server_received_at) document that yields HR and/or SpO2 from sensors.* .
    """
    if not user_ids:
        return {}

    devices_per_user = devices_by_elderly_user_ids(db, user_ids)
    if not any(devices_per_user.values()):
        return {}

    reverse_map = _reverse_device_map()
    candidates_by_user: Dict[int, List[str]] = {}
    device_to_users: Dict[str, List[int]] = defaultdict(list)

    for uid in user_ids:
        for dev in devices_per_user.get(uid) or []:
            cands = _candidate_ids_for_device(dev, reverse_map)
            merged = list(dict.fromkeys((candidates_by_user.get(uid) or []) + cands))
            candidates_by_user[uid] = merged
            for cid in cands:
                device_to_users[cid].append(uid)

    for key, uids in list(device_to_users.items()):
        device_to_users[key] = list(dict.fromkeys(uids))

    all_cands = list(dict.fromkeys(c for ids in candidates_by_user.values() for c in ids))
    if not all_cands:
        return {}

    query: Dict[str, Any] = {
        "device_id": {"$in": all_cands} if len(all_cands) > 1 else all_cands[0],
        "data_type": {"$in": VITALS_UPSTREAM_DATA_TYPES},
    }

    try:
        coll = get_sync_mongo_db()[COLLECTION_RAW_UPSTREAM]
        cursor = coll.find(query).sort("server_received_at", -1)
    except Exception as exc:
        print(f"[mongo_resident_sensor_vitals] Mongo query skipped: {exc}")
        return {}

    users_need: Set[int] = set(candidates_by_user.keys())
    out: Dict[int, Tuple[Optional[int], Optional[float]]] = {}

    for idx, doc in enumerate(cursor):
        if idx >= _MAX_SCAN_DOCS or not users_need:
            break

        did = doc.get("device_id")
        payload = doc.get("payload") or {}
        if did is None:
            did = payload.get("device_id")
        if did is None:
            continue
        did_str = str(did).strip()
        if not did_str:
            continue

        hr, spo2 = extract_hr_spo2_from_upstream_doc(doc)
        if hr is None and spo2 is None:
            continue

        for uid in device_to_users.get(did_str, []):
            if uid not in users_need:
                continue
            out[uid] = (hr, spo2)
            users_need.discard(uid)

    return out
