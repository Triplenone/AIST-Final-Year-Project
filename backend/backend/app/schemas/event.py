"""
事件相关的Pydantic模型
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from app.models.event import EventType, EventStatus


class EventBase(BaseModel):
    """事件基础模型"""
    event_type: EventType = Field(..., description="事件类型")
    related_user_id: int = Field(..., description="关联用户ID")
    trigger_device_id: int = Field(..., description="触发设备ID")
    location_zone_id: Optional[int] = Field(None, description="位置区域ID")
    event_timestamp: datetime = Field(default_factory=datetime.now, description="事件时间戳")
    event_params: Optional[Dict[str, Any]] = Field(None, description="事件参数（JSON）")
    event_status: EventStatus = Field(EventStatus.UNHANDLED, description="事件状态")
    handled_by: Optional[int] = Field(None, description="处理人ID")
    handled_at: Optional[datetime] = Field(None, description="处理时间")
    remark: Optional[str] = Field(None, max_length=200, description="备注")


class EventCreate(EventBase):
    """创建事件请求模型"""
    pass


class EventUpdate(BaseModel):
    """更新事件请求模型"""
    event_type: Optional[EventType] = None
    related_user_id: Optional[int] = None
    trigger_device_id: Optional[int] = None
    location_zone_id: Optional[int] = None
    event_timestamp: Optional[datetime] = None
    event_params: Optional[Dict[str, Any]] = None
    event_status: Optional[EventStatus] = None
    handled_by: Optional[int] = None
    handled_at: Optional[datetime] = None
    remark: Optional[str] = Field(None, max_length=200)


class EventResponse(EventBase):
    """事件响应模型"""
    event_id: int
    
    class Config:
        from_attributes = True

