"""
家属页今日总结接口（占位版，可后续替换为护工小结或 Agent 报告）。
"""
from datetime import date, datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.event import Event
from app.models.user import User

router = APIRouter()


@router.get("/today", response_model=Dict[str, Any])
def get_family_summary_today(
    user_id: int = Query(..., description="住民 user_id"),
    db: Session = Depends(get_db),
):
    """
    返回家属页今日总结（占位版本）。
    """
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return {
            "found": False,
            "user_id": user_id,
            "message": "用户不存在",
        }

    start_of_day = datetime.combine(date.today(), datetime.min.time())
    todays_events = (
        db.query(Event)
        .filter(Event.related_user_id == user_id, Event.event_timestamp >= start_of_day)
        .order_by(Event.event_timestamp.desc())
        .all()
    )

    unhandled_count = sum(1 for e in todays_events if str(getattr(e.event_status, "value", e.event_status)) == "unhandled")
    critical_count = sum(
        1
        for e in todays_events
        if str(getattr(e.event_type, "value", e.event_type)) in ["fall", "sos", "vital_signs_abnormal"]
    )
    latest_event_type: Optional[str] = None
    if todays_events:
        latest_event_type = str(getattr(todays_events[0].event_type, "value", todays_events[0].event_type))

    summary_text = (
        f"今日共记录 {len(todays_events)} 条事件，"
        f"其中高关注类型 {critical_count} 条，待处理 {unhandled_count} 条。"
        + (f" 最新事件类型为 {latest_event_type}。" if latest_event_type else "")
    )

    return {
        "found": True,
        "user_id": user_id,
        "user_name": user.name,
        "date": str(date.today()),
        "source": "rule_based_placeholder",
        "generated_at": datetime.now().isoformat(),
        "summary_text": summary_text,
        "stats": {
            "total_events": len(todays_events),
            "critical_events": critical_count,
            "unhandled_events": unhandled_count,
            "latest_event_type": latest_event_type,
        },
    }

