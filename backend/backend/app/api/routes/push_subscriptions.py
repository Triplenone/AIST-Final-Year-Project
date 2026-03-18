"""
Web Push 订阅 API 路由
"""
from typing import Any, Dict, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app import crud
from app.schemas.push_subscription import PushSubscriptionCreate, PushSubscriptionResponse
from app.services.push_notifications import send_payload_to_subscriptions

router = APIRouter()


class PushTestPayload(BaseModel):
    title: Optional[str] = Field(None, description="通知标题")
    body: Optional[str] = Field(None, description="通知内容")
    url: Optional[str] = Field(None, description="点击通知跳转路径")
    data: Optional[Dict[str, Any]] = Field(None, description="自定义数据")
    endpoint: Optional[str] = Field(None, description="仅发送到指定 endpoint")


@router.get("/vapid-public-key")
def get_vapid_public_key():
    """获取前端订阅所需的 VAPID 公钥"""
    return {"publicKey": settings.VAPID_PUBLIC_KEY or ""}


@router.get("/", response_model=List[PushSubscriptionResponse])
def list_subscriptions(
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=2000),
    db: Session = Depends(get_db)
):
    """订阅列表（调试用途）"""
    return crud.push_subscription.list_subscriptions(db, skip=skip, limit=limit)


@router.post("/", response_model=PushSubscriptionResponse)
def subscribe(
    payload: PushSubscriptionCreate,
    db: Session = Depends(get_db)
):
    """创建或更新订阅"""
    if not payload.endpoint:
        raise HTTPException(status_code=400, detail="endpoint is required")
    return crud.push_subscription.upsert_subscription(db, payload)


@router.delete("/", response_model=PushSubscriptionResponse)
def unsubscribe(
    endpoint: str = Query(..., description="订阅 endpoint"),
    db: Session = Depends(get_db)
):
    """按 endpoint 取消订阅"""
    removed = crud.push_subscription.delete_by_endpoint(db, endpoint)
    if not removed:
        raise HTTPException(status_code=404, detail="subscription not found")
    return removed


@router.post("/test")
def test_push(payload: PushTestPayload, db: Session = Depends(get_db)):
    """发送测试通知"""
    if not (settings.VAPID_PUBLIC_KEY and settings.VAPID_PRIVATE_KEY):
        raise HTTPException(status_code=400, detail="VAPID keys not configured")

    base_payload = {
        "title": payload.title or "SmartCare Demo",
        "body": payload.body or "Test push notification from SmartCare backend.",
        "data": payload.data or {},
        "url": payload.url or "/#operations"
    }

    if payload.endpoint:
        sub = crud.push_subscription.get_by_endpoint(db, payload.endpoint)
        if not sub:
            raise HTTPException(status_code=404, detail="subscription not found")
        sent, _ = send_payload_to_subscriptions(db, [sub], base_payload)
        return {"sent": sent, "target": payload.endpoint}

    subs = crud.push_subscription.list_subscriptions(db, limit=1000)
    sent, stale = send_payload_to_subscriptions(db, subs, base_payload)
    return {"sent": sent, "stale": stale}
