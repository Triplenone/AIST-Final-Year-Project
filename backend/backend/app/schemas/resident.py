"""
住民相关的Pydantic模型（聚合User/Event/Device数据）
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ResidentVitals(BaseModel):
    """生命体征"""
    hr: Optional[int] = Field(None, description="心率")
    bp_systolic: Optional[int] = Field(None, description="收缩压")
    bp_diastolic: Optional[int] = Field(None, description="舒张压")
    spo2: Optional[int] = Field(None, description="血氧饱和度")
    temperature: Optional[float] = Field(None, description="体温")


class ResidentResponse(BaseModel):
    """住民响应模型（前端Resident格式）"""
    id: str = Field(..., description="住民ID（user_id转为字符串）")
    name: str = Field(..., description="姓名")
    avatar_url: Optional[str] = Field(None, description="头像URL")
    room: str = Field(..., description="房间号")
    status: str = Field(..., description="状态: stable, followUp, high, checked_out")
    last_seen_at: Optional[str] = Field(None, description="最后出现时间")
    last_seen_location: Optional[str] = Field(None, description="最后出现位置")
    vitals: Optional[ResidentVitals] = Field(None, description="生命体征")
    checked_out: bool = Field(False, description="是否已退房")
    created_at: str = Field(..., description="创建时间")
    updated_at: str = Field(..., description="更新时间")
    
    # 用户状态相关字段
    user_status_id: Optional[int] = Field(None, description="用户状态ID")
    heart_rate: Optional[int] = Field(None, description="心率")
    blood_oxygen: Optional[float] = Field(None, description="血氧饱和度")
    body_temperature: Optional[float] = Field(None, description="体温")
    is_normal: Optional[bool] = Field(None, description="状态是否正常")
    status_timestamp: Optional[str] = Field(None, description="状态采集时间")
    
    # 设备相关字段
    device_id: Optional[int] = Field(None, description="设备ID")
    device_current_status: Optional[str] = Field(None, description="设备当前状态")
    device_battery_level: Optional[int] = Field(None, description="设备电池电量")
    device_deploy_location: Optional[str] = Field(None, description="设备部署位置")
    
    class Config:
        from_attributes = True

