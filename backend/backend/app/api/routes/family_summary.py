"""Placeholder family summary route for the family page."""

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
    user_id: int = Query(..., description="Resident user_id"),
    db: Session = Depends(get_db),
):
    """Return a placeholder family summary for the given resident."""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return {
            "found": False,
            "user_id": user_id,
            "message": "User not found",
            "placeholder": True,
        }

    start_of_day = datetime.combine(date.today(), datetime.min.time())
    todays_events = (
        db.query(Event)
        .filter(Event.related_user_id == user_id, Event.event_timestamp >= start_of_day)
        .order_by(Event.event_timestamp.desc())
        .all()
    )

    unhandled_count = sum(
        1
        for event in todays_events
        if str(getattr(event.event_status, "value", event.event_status)) == "unhandled"
    )
    critical_count = sum(
        1
        for event in todays_events
        if str(getattr(event.event_type, "value", event.event_type))
        in ["fall", "sos", "vital_signs_abnormal"]
    )

    latest_event_type: Optional[str] = None
    if todays_events:
        latest_event_type = str(
            getattr(todays_events[0].event_type, "value", todays_events[0].event_type)
        )

    summary_text = (
        f"Placeholder summary: {len(todays_events)} event(s) recorded today, "
        f"{critical_count} high-priority, {unhandled_count} still unhandled."
    )
    if latest_event_type:
        summary_text += f" Latest event type: {latest_event_type}."

    return {
        "found": True,
        "placeholder": True,
        "user_id": user_id,
        "user_name": user.name,
        "date": str(date.today()),
        "source": "placeholder",
        "generated_at": datetime.now().isoformat(),
        "summary_text": summary_text,
        "stats": {
            "total_events": len(todays_events),
            "critical_events": critical_count,
            "unhandled_events": unhandled_count,
            "latest_event_type": latest_event_type,
        },
    }
