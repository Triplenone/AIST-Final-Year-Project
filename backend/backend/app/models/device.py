"""
设备模型
"""
from sqlalchemy import Column, Integer, String, Enum, ForeignKey, DateTime, TypeDecorator
from sqlalchemy.dialects.mysql import TINYINT
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class DeviceStatus(str, enum.Enum):
    """设备状态"""
    ONLINE = "online"
    OFFLINE = "offline"
    ABNORMAL = "abnormal"


class DeviceStatusType(TypeDecorator):
    """自定义设备状态枚举类型，兼容字符串和枚举值"""
    impl = String
    cache_ok = True
    
    def __init__(self, enum_class, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.enum_class = enum_class
    
    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, self.enum_class):
            return value.value
        # 如果是字符串，尝试匹配枚举值（不区分大小写）
        if isinstance(value, str):
            value_lower = value.lower()
            for enum_item in self.enum_class:
                if enum_item.value.lower() == value_lower:
                    return enum_item.value
            # 如果找不到匹配的，返回原始值
            return value
        return value
    
    def process_result_value(self, value, dialect):
        if value is None:
            return None
        try:
            # 尝试匹配枚举值（不区分大小写）
            if isinstance(value, str):
                value_lower = value.lower()
                for enum_item in self.enum_class:
                    if enum_item.value.lower() == value_lower:
                        return enum_item
                # 如果找不到匹配的，返回字符串值
                return value
            return value
        except (ValueError, AttributeError):
            # 如果无法转换，返回原始值
            return value


class Device(Base):
    """设备表模型"""
    __tablename__ = "device"
    
    device_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    device_type = Column(String(50), nullable=True)
    model_desc = Column(String(100), nullable=True)
    elderly_user_id = Column(Integer, ForeignKey("user.user_id", ondelete="SET NULL"), nullable=True)
    mac_address = Column(String(20), nullable=True, unique=True)
    current_status = Column(DeviceStatusType(DeviceStatus, length=20), default=DeviceStatus.OFFLINE)
    battery_level = Column(TINYINT, nullable=True)
    deploy_location = Column(String(100), nullable=True)
    created_at = Column(DateTime, nullable=True, server_default=func.now())
    updated_at = Column(DateTime, nullable=True, server_default=func.now(), onupdate=func.now())
    
    # 关系
    elderly_user = relationship("User", foreign_keys=[elderly_user_id])
    
    def __repr__(self):
        return f"<Device(device_id={self.device_id}, device_type='{self.device_type}', status='{self.current_status}')>"

