"""
位置区域相关的Pydantic模型
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.location_zone import LocationCategory


class LocationZoneBase(BaseModel):
    """位置区域基础模型"""
    name: Optional[str] = Field(None, max_length=100, description="位置名称")
    category: LocationCategory = Field(..., description="位置类别")
    related_beacon_ids: Optional[str] = Field(None, max_length=200, description="关联的信标ID")
    geofence_coordinates: Optional[str] = Field(None, description="地理围栏坐标")
    is_safe_zone: bool = Field(True, description="是否为安全区域")


class LocationZoneCreate(LocationZoneBase):
    """创建位置区域请求模型"""
    pass


class LocationZoneUpdate(BaseModel):
    """更新位置区域请求模型"""
    name: Optional[str] = Field(None, max_length=100)
    category: Optional[LocationCategory] = None
    related_beacon_ids: Optional[str] = Field(None, max_length=200)
    geofence_coordinates: Optional[str] = None
    is_safe_zone: Optional[bool] = None


class LocationZoneResponse(LocationZoneBase):
    """位置区域响应模型"""
    location_zone_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

