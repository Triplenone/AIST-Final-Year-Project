"""
Web Push 订阅相关的 Pydantic 模型
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class PushSubscriptionBase(BaseModel):
    """订阅基础模型"""
    endpoint: str = Field(..., description="Push endpoint")
    p256dh: str = Field(..., description="浏览器公钥")
    auth: str = Field(..., description="浏览器 auth key")
    user_id: Optional[int] = Field(None, description="关联用户ID")
    user_agent: Optional[str] = Field(None, description="User agent")


class PushSubscriptionCreate(PushSubscriptionBase):
    """创建订阅请求模型"""
    pass


class PushSubscriptionUpdate(BaseModel):
    """更新订阅请求模型"""
    p256dh: Optional[str] = None
    auth: Optional[str] = None
    user_id: Optional[int] = None
    user_agent: Optional[str] = None


class PushSubscriptionResponse(PushSubscriptionBase):
    """订阅响应模型"""
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
