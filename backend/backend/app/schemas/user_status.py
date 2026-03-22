"""
用户状态Schema
"""
from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal


class UserStatusBase(BaseModel):
    """用户状态基础模型"""
    user_id: int = Field(..., description="用户ID")
    device_id: int = Field(..., description="设备ID")
    location_zone_id: Optional[int] = Field(None, description="位置区域ID")
    heart_rate: int = Field(..., description="心率（次/分钟）", ge=0, le=300)
    blood_oxygen: Decimal = Field(..., description="血氧饱和度（%）", ge=0, le=100)
    body_temperature: Decimal = Field(..., description="体温（℃）", ge=30, le=45)
    is_normal: bool = Field(True, description="状态是否正常")
    status_timestamp: datetime = Field(..., description="状态采集时间")


class UserStatusResponse(BaseModel):
    """用户状态响应模型（包含关联信息）"""
    user_status_id: int = Field(..., description="用户状态ID")
    user_id: int = Field(..., description="用户ID")
    user_name: Optional[str] = Field(None, description="用户名")
    device_id: int = Field(..., description="设备ID")
    device_name: Optional[str] = Field(None, description="设备名称")
    location_zone_id: Optional[int] = Field(None, description="位置区域ID")
    location_name: Optional[str] = Field(None, description="位置名称")
    heart_rate: int = Field(..., description="心率（次/分钟）")
    blood_oxygen: float = Field(..., description="血氧饱和度（%）")
    body_temperature: float = Field(..., description="体温（℃）")
    is_normal: bool = Field(..., description="状态是否正常")
    status_timestamp: datetime = Field(..., description="状态采集时间")
    updated_at: Optional[datetime] = Field(None, description="更新时间")
    
    class Config:
        from_attributes = True


class UserStatusCreate(UserStatusBase):
    """创建用户状态模型"""
    pass


class UserStatusUpdate(BaseModel):
    """更新用户状态模型"""
    user_id: Optional[int] = None
    device_id: Optional[int] = None
    location_zone_id: Optional[int] = None
    heart_rate: Optional[int] = Field(None, ge=0, le=300)
    blood_oxygen: Optional[Decimal] = Field(None, ge=0, le=100)
    body_temperature: Optional[Decimal] = Field(None, ge=30, le=45)
    is_normal: Optional[bool] = None
    status_timestamp: Optional[datetime] = None

