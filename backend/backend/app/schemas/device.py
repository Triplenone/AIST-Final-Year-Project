"""
设备相关的Pydantic模型
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.device import DeviceStatus


class DeviceBase(BaseModel):
    """设备基础模型"""
    device_type: Optional[str] = Field(None, max_length=50, description="设备类型")
    model_desc: Optional[str] = Field(None, max_length=100, description="型号描述")
    elderly_user_id: Optional[int] = Field(None, description="关联的老人用户ID")
    mac_address: Optional[str] = Field(None, max_length=20, description="MAC地址")
    current_status: DeviceStatus = Field(DeviceStatus.OFFLINE, description="当前状态")
    battery_level: Optional[int] = Field(None, ge=0, le=100, description="电池电量")
    deploy_location: Optional[str] = Field(None, max_length=100, description="部署位置")
    
    class Config:
        protected_namespaces = ()  # 允许使用model_开头的字段名


class DeviceCreate(DeviceBase):
    """创建设备请求模型"""
    pass


class DeviceUpdate(BaseModel):
    """更新设备请求模型"""
    device_type: Optional[str] = Field(None, max_length=50)
    model_desc: Optional[str] = Field(None, max_length=100)
    elderly_user_id: Optional[int] = None
    mac_address: Optional[str] = Field(None, max_length=20)
    current_status: Optional[DeviceStatus] = None
    battery_level: Optional[int] = Field(None, ge=0, le=100)
    deploy_location: Optional[str] = Field(None, max_length=100)


class DeviceResponse(DeviceBase):
    """设备响应模型"""
    device_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
        protected_namespaces = ()  # 允许使用model_开头的字段名

