"""
事件CRUD操作
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.models.event import Event
from app.schemas.event import EventCreate, EventUpdate


def get_event(db: Session, event_id: int) -> Optional[Event]:
    """根据ID获取事件"""
    return db.query(Event).filter(Event.event_id == event_id).first()


def get_events(db: Session, skip: int = 0, limit: int = 100,
               related_user_id: Optional[int] = None,
               event_type: Optional[str] = None,
               event_status: Optional[str] = None,
               start_time: Optional[datetime] = None,
               end_time: Optional[datetime] = None) -> List[Event]:
    """获取事件列表"""
    query = db.query(Event)
    
    if related_user_id:
        query = query.filter(Event.related_user_id == related_user_id)
    if event_type:
        query = query.filter(Event.event_type == event_type)
    if event_status:
        query = query.filter(Event.event_status == event_status)
    if start_time:
        query = query.filter(Event.event_timestamp >= start_time)
    if end_time:
        query = query.filter(Event.event_timestamp <= end_time)
    
    return query.order_by(Event.event_timestamp.desc()).offset(skip).limit(limit).all()


def create_event(db: Session, event: EventCreate) -> Event:
    """创建事件"""
    db_event = Event(**event.model_dump())
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    try:
        from app.services.push_notifications import notify_event
        notify_event(db, db_event)
    except Exception:
        pass
    return db_event


def update_event(db: Session, event_id: int, event_update: EventUpdate) -> Optional[Event]:
    """更新事件"""
    db_event = get_event(db, event_id)
    if not db_event:
        return None
    
    update_data = event_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_event, field, value)
    
    db.commit()
    db.refresh(db_event)
    return db_event


def delete_event(db: Session, event_id: int) -> bool:
    """删除事件"""
    db_event = get_event(db, event_id)
    if not db_event:
        return False
    
    db.delete(db_event)
    db.commit()
    return True

