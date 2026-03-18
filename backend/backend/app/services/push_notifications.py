"""
Web Push 发送服务（用于演示与告警通知）
"""
from __future__ import annotations

import json
from typing import Any, Dict, Iterable, List, Optional, Tuple

from pywebpush import webpush, WebPushException
from sqlalchemy.orm import Session

from app.config import settings
from app.models.event import Event, EventType
from app.models.push_subscription import PushSubscription
from app import crud


def _enum_value(value: Any) -> str:
    if hasattr(value, "value"):
        return str(value.value)
    return str(value)


def _build_vapid_claims() -> Dict[str, str]:
    subject = settings.VAPID_SUBJECT or "mailto:admin@example.com"
    return {"sub": subject}


def _is_vapid_ready() -> bool:
    return bool(settings.VAPID_PUBLIC_KEY and settings.VAPID_PRIVATE_KEY)


def _build_subscription_info(subscription: PushSubscription) -> Dict[str, Any]:
    return {
        "endpoint": subscription.endpoint,
        "keys": {
            "p256dh": subscription.p256dh,
            "auth": subscription.auth
        }
    }


def _build_event_payload(event: Event) -> Dict[str, Any]:
    event_type = _enum_value(event.event_type)
    title = "SmartCare Alert"
    body = f"{event_type.replace('_', ' ').title()} reported."

    if event_type == "fall":
        body = "Fall detected. Immediate assistance required."
    elif event_type == "sos":
        body = "SOS pressed. Caregiver response needed."
    elif event_type == "vital_signs_abnormal":
        body = "Vitals abnormal. Please review resident status."
    elif event_type == "geofence_breach":
        body = "Geofence breach detected. Check resident location."

    return {
        "title": title,
        "body": body,
        "data": {
            "eventId": event.event_id,
            "eventType": event_type,
            "userId": event.related_user_id,
            "locationZoneId": event.location_zone_id,
            "status": _enum_value(event.event_status)
        },
        "url": "/#operations"
    }


def send_payload_to_subscriptions(
    db: Session,
    subscriptions: Iterable[PushSubscription],
    payload: Dict[str, Any]
) -> Tuple[int, List[str]]:
    """发送 Web Push，返回成功数与需要删除的 endpoint 列表。"""
    if not _is_vapid_ready():
        return 0, []

    sent = 0
    stale_endpoints: List[str] = []
    for subscription in subscriptions:
        info = _build_subscription_info(subscription)
        try:
            webpush(
                subscription_info=info,
                data=json.dumps(payload),
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims=_build_vapid_claims()
            )
            sent += 1
        except WebPushException as exc:
            status_code = getattr(getattr(exc, "response", None), "status_code", None)
            if status_code in (404, 410):
                stale_endpoints.append(subscription.endpoint)
            continue
        except Exception:
            continue

    if stale_endpoints:
        for endpoint in stale_endpoints:
            crud.push_subscription.delete_by_endpoint(db, endpoint)

    return sent, stale_endpoints


def notify_event(db: Session, event: Event) -> int:
    """根据事件发送推送通知（最佳努力）。"""
    if not _is_vapid_ready():
        return 0
    payload = _build_event_payload(event)
    subscriptions = crud.push_subscription.list_subscriptions(db, limit=1000)
    sent, _ = send_payload_to_subscriptions(db, subscriptions, payload)
    return sent
