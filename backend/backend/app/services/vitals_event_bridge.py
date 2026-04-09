"""
将 MQTT 上行生命体征与现有 events 告警逻辑打通。
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from app.config import settings
from app.database import SessionLocal
from app.models.device import Device
from app.models.event import Event, EventStatus, EventType


def _extract_vitals(payload: Dict[str, Any]) -> Dict[str, Optional[float]]:
    sensors = payload.get("sensors") or {}
    heart_rate = sensors.get("heart_rate") or {}
    spo2 = sensors.get("spo2") or {}
    body_temp = sensors.get("body_temperature") or sensors.get("temperature") or {}
    resp_rate = sensors.get("resp_rate") or sensors.get("respiratory_rate") or {}
    hrv = sensors.get("hrv") or {}

    def _num(obj: Any, keys: List[str]) -> Optional[float]:
        if isinstance(obj, (int, float)):
            return float(obj)
        if isinstance(obj, dict):
            for k in keys:
                v = obj.get(k)
                if isinstance(v, (int, float)):
                    return float(v)
        return None

    return {
        "hr": _num(heart_rate, ["bpm", "value"]),
        "spo2": _num(spo2, ["percentage", "value"]),
        "temperature": _num(body_temp, ["celsius", "value", "temperature"]),
        "resp_rate": _num(resp_rate, ["rpm", "value"]),
        "hrv": _num(hrv, ["ms", "value"]),
    }


def _evaluate_vitals(vitals: Dict[str, Optional[float]]) -> List[str]:
    reasons: List[str] = []
    hr = vitals.get("hr")
    if hr is not None and (hr < settings.VITAL_HEART_RATE_LOW or hr > settings.VITAL_HEART_RATE_HIGH):
        reasons.append(f"heart_rate_out_of_range:{hr}")
    spo2 = vitals.get("spo2")
    if spo2 is not None and spo2 < settings.VITAL_SPO2_LOW:
        reasons.append(f"spo2_low:{spo2}")
    temperature = vitals.get("temperature")
    if temperature is not None and temperature > settings.VITAL_BODY_TEMP_HIGH:
        reasons.append(f"temperature_high:{temperature}")
    resp_rate = vitals.get("resp_rate")
    if resp_rate is not None and resp_rate > settings.VITAL_RESP_RATE_HIGH:
        reasons.append(f"resp_rate_high:{resp_rate}")
    hrv = vitals.get("hrv")
    if hrv is not None and hrv < settings.VITAL_HRV_LOW:
        reasons.append(f"hrv_low:{hrv}")
    return reasons


def _resolve_device_binding(db, external_device_id: str, payload: Dict[str, Any]) -> Tuple[Optional[int], Optional[int]]:
    numeric_device_id = payload.get("trigger_device_id")
    if isinstance(numeric_device_id, int):
        device = db.query(Device).filter(Device.device_id == numeric_device_id).first()
        if device:
            return device.device_id, device.elderly_user_id

    device = db.query(Device).filter(Device.mac_address == external_device_id).first()
    if device:
        return device.device_id, device.elderly_user_id
    return None, None


def maybe_create_vitals_event(external_device_id: str, payload: Dict[str, Any], mqtt_topic: str) -> Dict[str, Any]:
    """
    解析 vitals 并按阈值创建 event(vital_signs_abnormal)。
    若缺少设备绑定、未异常或命中去重窗口则跳过。
    """
    vitals = _extract_vitals(payload)
    reasons = _evaluate_vitals(vitals)
    if not reasons:
        return {"created": False, "reason": "vitals_normal"}

    db = SessionLocal()
    try:
        trigger_device_id, related_user_id = _resolve_device_binding(db, external_device_id, payload)
        if trigger_device_id is None or related_user_id is None:
            return {"created": False, "reason": "device_or_user_not_bound"}

        dedup_since = datetime.now() - timedelta(seconds=settings.VITAL_ALERT_DEDUP_SECONDS)
        duplicate = (
            db.query(Event)
            .filter(
                Event.event_type == EventType.VITAL_SIGNS_ABNORMAL,
                Event.related_user_id == related_user_id,
                Event.trigger_device_id == trigger_device_id,
                Event.event_status == EventStatus.UNHANDLED,
                Event.event_timestamp >= dedup_since,
            )
            .order_by(Event.event_timestamp.desc())
            .first()
        )
        if duplicate:
            return {"created": False, "reason": "deduplicated"}

        event = Event(
            event_type=EventType.VITAL_SIGNS_ABNORMAL,
            related_user_id=related_user_id,
            trigger_device_id=trigger_device_id,
            event_timestamp=datetime.now(),
            event_status=EventStatus.UNHANDLED,
            event_params={
                "source": "mqtt_vitals",
                "mqtt_topic": mqtt_topic,
                "external_device_id": external_device_id,
                "abnormal_reasons": reasons,
                "hr": vitals.get("hr"),
                "spo2": vitals.get("spo2"),
                "temperature": vitals.get("temperature"),
                "resp_rate": vitals.get("resp_rate"),
                "hrv": vitals.get("hrv"),
                "timestamp": payload.get("timestamp"),
            },
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return {"created": True, "event_id": event.event_id}
    except Exception as e:
        db.rollback()
        return {"created": False, "reason": f"error:{e}"}
    finally:
        db.close()

