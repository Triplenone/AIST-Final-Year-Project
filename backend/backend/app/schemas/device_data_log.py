"""
设备数据日志Schema
"""
from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime


class DeviceDataLogBase(BaseModel):
    """设备数据日志基础模型"""
    device_id: int = Field(..., description="设备ID")
    timestamp: int = Field(..., description="设备端时间戳")
    relative_time: int = Field(..., description="设备相对时间")
    
    # 加速度计数据
    accel_x: float = Field(..., description="加速度计X轴")
    accel_y: float = Field(..., description="加速度计Y轴")
    accel_z: float = Field(..., description="加速度计Z轴")
    
    # 陀螺仪数据
    gyro_x: float = Field(..., description="陀螺仪X轴")
    gyro_y: float = Field(..., description="陀螺仪Y轴")
    gyro_z: float = Field(..., description="陀螺仪Z轴")
    
    # 位置数据
    loc_x: float = Field(..., description="位置X坐标")
    loc_y: float = Field(..., description="位置Y坐标")
    loc_z: float = Field(..., description="位置Z坐标")
    loc_accuracy: float = Field(..., description="位置精度")
    position_quality: str = Field(..., description="位置质量（high/medium/low）")
    
    # 跌倒检测数据
    fall_state: int = Field(..., description="跌倒状态编码")
    fall_state_description: str = Field(..., description="跌倒状态描述")
    fall_confidence: float = Field(..., description="跌倒置信度", ge=0, le=1)
    is_fall_confirmed: bool = Field(..., description="是否确认跌倒")
    impact_force: float = Field(..., description="冲击力度")
    fall_direction: str = Field(..., description="跌倒方向")
    fall_time: int = Field(..., description="跌倒时间戳")
    
    # 连接状态
    wifi_connected: bool = Field(..., description="WiFi连接状态")
    server_connected: bool = Field(..., description="服务器连接状态")
    battery_level: int = Field(..., description="电池电量（0-100）", ge=0, le=100)
    
    # 时间戳
    server_receive_time: datetime = Field(..., description="服务器接收时间")


class DeviceDataLogResponse(BaseModel):
    """设备数据日志响应模型（包含设备信息）"""
    id: int = Field(..., description="日志ID")
    device_id: int = Field(..., description="设备ID")
    device_name: Optional[str] = Field(None, description="设备名称")
    device_type: Optional[str] = Field(None, description="设备类型")
    timestamp: int = Field(..., description="设备端时间戳")
    relative_time: int = Field(..., description="设备相对时间")
    
    # 加速度计数据
    accel_x: float = Field(..., description="加速度计X轴")
    accel_y: float = Field(..., description="加速度计Y轴")
    accel_z: float = Field(..., description="加速度计Z轴")
    
    # 陀螺仪数据
    gyro_x: float = Field(..., description="陀螺仪X轴")
    gyro_y: float = Field(..., description="陀螺仪Y轴")
    gyro_z: float = Field(..., description="陀螺仪Z轴")
    
    # 位置数据
    loc_x: float = Field(..., description="位置X坐标")
    loc_y: float = Field(..., description="位置Y坐标")
    loc_z: float = Field(..., description="位置Z坐标")
    loc_accuracy: float = Field(..., description="位置精度")
    position_quality: str = Field(..., description="位置质量")
    
    # 跌倒检测数据
    fall_state: int = Field(..., description="跌倒状态编码")
    fall_state_description: str = Field(..., description="跌倒状态描述")
    fall_confidence: float = Field(..., description="跌倒置信度")
    is_fall_confirmed: bool = Field(..., description="是否确认跌倒")
    impact_force: float = Field(..., description="冲击力度")
    fall_direction: str = Field(..., description="跌倒方向")
    fall_time: int = Field(..., description="跌倒时间戳")
    
    # 连接状态
    wifi_connected: bool = Field(..., description="WiFi连接状态")
    server_connected: bool = Field(..., description="服务器连接状态")
    battery_level: int = Field(..., description="电池电量（0-100）")
    
    # 时间戳
    server_receive_time: datetime = Field(..., description="服务器接收时间")
    created_at: Optional[datetime] = Field(None, description="数据入库时间")
    
    class Config:
        from_attributes = True


class DeviceDataLogCreate(DeviceDataLogBase):
    """创建设备数据日志模型"""
    pass


class DeviceDataLogUpdate(BaseModel):
    """更新设备数据日志模型"""
    device_id: Optional[int] = None
    timestamp: Optional[int] = None
    relative_time: Optional[int] = None
    accel_x: Optional[float] = None
    accel_y: Optional[float] = None
    accel_z: Optional[float] = None
    gyro_x: Optional[float] = None
    gyro_y: Optional[float] = None
    gyro_z: Optional[float] = None
    loc_x: Optional[float] = None
    loc_y: Optional[float] = None
    loc_z: Optional[float] = None
    loc_accuracy: Optional[float] = None
    position_quality: Optional[str] = None
    fall_state: Optional[int] = None
    fall_state_description: Optional[str] = None
    fall_confidence: Optional[float] = Field(None, ge=0, le=1)
    is_fall_confirmed: Optional[bool] = None
    impact_force: Optional[float] = None
    fall_direction: Optional[str] = None
    fall_time: Optional[int] = None
    wifi_connected: Optional[bool] = None
    server_connected: Optional[bool] = None
    battery_level: Optional[int] = Field(None, ge=0, le=100)
    server_receive_time: Optional[datetime] = None


class ElderDetailResponse(BaseModel):
    """老者详情响应模型（包含设备数据日志、设备信息和老者信息）"""
    # 数据日志基本信息
    id: int = Field(..., description="日志ID")
    device_id: int = Field(..., description="设备ID")
    timestamp: int = Field(..., description="设备端时间戳")
    relative_time: int = Field(..., description="设备相对时间")
    
    # 设备信息
    device_name: Optional[str] = Field(None, description="设备名称")
    device_type: Optional[str] = Field(None, description="设备类型")
    device_status: Optional[str] = Field(None, description="设备状态")
    mac_address: Optional[str] = Field(None, description="MAC地址")
    deploy_location: Optional[str] = Field(None, description="部署位置")
    
    # 老者信息
    elderly_user_id: Optional[int] = Field(None, description="老者用户ID")
    elderly_name: Optional[str] = Field(None, description="老者姓名")
    elderly_age: Optional[int] = Field(None, description="老者年龄")
    elderly_gender: Optional[str] = Field(None, description="老者性别")
    
    # 加速度计数据
    accel_x: float = Field(..., description="加速度计X轴")
    accel_y: float = Field(..., description="加速度计Y轴")
    accel_z: float = Field(..., description="加速度计Z轴")
    
    # 陀螺仪数据
    gyro_x: float = Field(..., description="陀螺仪X轴")
    gyro_y: float = Field(..., description="陀螺仪Y轴")
    gyro_z: float = Field(..., description="陀螺仪Z轴")
    
    # 位置数据
    loc_x: float = Field(..., description="位置X坐标")
    loc_y: float = Field(..., description="位置Y坐标")
    loc_z: float = Field(..., description="位置Z坐标")
    loc_accuracy: float = Field(..., description="位置精度")
    position_quality: str = Field(..., description="位置质量")
    
    # 跌倒检测数据
    fall_state: int = Field(..., description="跌倒状态编码")
    fall_state_description: str = Field(..., description="跌倒状态描述")
    fall_confidence: float = Field(..., description="跌倒置信度")
    is_fall_confirmed: bool = Field(..., description="是否确认跌倒")
    impact_force: float = Field(..., description="冲击力度")
    fall_direction: str = Field(..., description="跌倒方向")
    fall_time: int = Field(..., description="跌倒时间戳")
    
    # 连接状态
    wifi_connected: bool = Field(..., description="WiFi连接状态")
    server_connected: bool = Field(..., description="服务器连接状态")
    battery_level: int = Field(..., description="电池电量（0-100）")
    
    # 时间戳
    server_receive_time: datetime = Field(..., description="服务器接收时间")
    created_at: Optional[datetime] = Field(None, description="数据入库时间")
    
    class Config:
        from_attributes = True


