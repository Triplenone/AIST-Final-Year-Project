"""
Web Push 订阅 CRUD 操作
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.push_subscription import PushSubscription
from app.schemas.push_subscription import PushSubscriptionCreate, PushSubscriptionUpdate


def get_subscription(db: Session, subscription_id: int) -> Optional[PushSubscription]:
    """根据ID获取订阅"""
    return db.query(PushSubscription).filter(PushSubscription.id == subscription_id).first()


def get_by_endpoint(db: Session, endpoint: str) -> Optional[PushSubscription]:
    """根据 endpoint 获取订阅"""
    return db.query(PushSubscription).filter(PushSubscription.endpoint == endpoint).first()


def list_subscriptions(db: Session, skip: int = 0, limit: int = 500) -> List[PushSubscription]:
    """获取订阅列表"""
    return db.query(PushSubscription).offset(skip).limit(limit).all()


def create_subscription(db: Session, payload: PushSubscriptionCreate) -> PushSubscription:
    """创建订阅"""
    db_sub = PushSubscription(
        endpoint=payload.endpoint,
        p256dh=payload.p256dh,
        auth=payload.auth,
        user_id=payload.user_id,
        user_agent=payload.user_agent
    )
    db.add(db_sub)
    db.commit()
    db.refresh(db_sub)
    return db_sub


def update_subscription(db: Session, subscription_id: int, payload: PushSubscriptionUpdate) -> Optional[PushSubscription]:
    """更新订阅"""
    db_sub = get_subscription(db, subscription_id)
    if not db_sub:
        return None
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_sub, field, value)
    db.commit()
    db.refresh(db_sub)
    return db_sub


def upsert_subscription(db: Session, payload: PushSubscriptionCreate) -> PushSubscription:
    """按 endpoint 进行 upsert"""
    existing = get_by_endpoint(db, payload.endpoint)
    if existing:
        existing.p256dh = payload.p256dh
        existing.auth = payload.auth
        existing.user_id = payload.user_id
        existing.user_agent = payload.user_agent
        db.commit()
        db.refresh(existing)
        return existing
    return create_subscription(db, payload)


def delete_subscription(db: Session, subscription_id: int) -> bool:
    """删除订阅"""
    db_sub = get_subscription(db, subscription_id)
    if not db_sub:
        return False
    db.delete(db_sub)
    db.commit()
    return True


def delete_by_endpoint(db: Session, endpoint: str) -> Optional[PushSubscription]:
    """按 endpoint 删除订阅"""
    db_sub = get_by_endpoint(db, endpoint)
    if not db_sub:
        return None
    db.delete(db_sub)
    db.commit()
    return db_sub
