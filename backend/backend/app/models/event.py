"""
事件模型
"""
from sqlalchemy import Column, BigInteger, Integer, Enum, DateTime, Text, String, ForeignKey, JSON, Index, TypeDecorator
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class EventType(str, enum.Enum):
    """事件类型"""
    FALL = "fall"
    BED_EXIT = "bed_exit"
    BATHROOM_RETENTION = "bathroom_retention"
    GEOFENCE_BREACH = "geofence_breach"
    SOS = "sos"
    VITAL_SIGNS_ABNORMAL = "vital_signs_abnormal"


class EventStatus(str, enum.Enum):
    """事件状态"""
    UNHANDLED = "unhandled"
    CONFIRMED = "confirmed"
    FALSE_ALARM = "false_alarm"
    RESOLVED = "resolved"


class EventTypeType(TypeDecorator):
    """自定义事件类型枚举类型，兼容字符串和枚举值"""
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
        if isinstance(value, str):
            value_lower = value.lower()
            for enum_item in self.enum_class:
                if enum_item.value.lower() == value_lower:
                    return enum_item.value
            return value
        return value
    
    def process_result_value(self, value, dialect):
        if value is None:
            return None
        try:
            if isinstance(value, str):
                value_lower = value.lower()
                for enum_item in self.enum_class:
                    if enum_item.value.lower() == value_lower:
                        return enum_item
                return value
            return value
        except (ValueError, AttributeError):
            return value


class EventStatusType(TypeDecorator):
    """自定义事件状态枚举类型，兼容字符串和枚举值"""
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
        if isinstance(value, str):
            value_lower = value.lower()
            for enum_item in self.enum_class:
                if enum_item.value.lower() == value_lower:
                    return enum_item.value
            return value
        return value
    
    def process_result_value(self, value, dialect):
        if value is None:
            return None
        try:
            if isinstance(value, str):
                value_lower = value.lower()
                for enum_item in self.enum_class:
                    if enum_item.value.lower() == value_lower:
                        return enum_item
                return value
            return value
        except (ValueError, AttributeError):
            return value


class Event(Base):
    """事件表模型"""
    __tablename__ = "event"
    
    event_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    event_type = Column(EventTypeType(EventType, length=30), nullable=False)
    related_user_id = Column(Integer, ForeignKey("user.user_id", ondelete="CASCADE"), nullable=False)
    trigger_device_id = Column(Integer, ForeignKey("device.device_id", ondelete="CASCADE"), nullable=False)
    location_zone_id = Column(Integer, ForeignKey("location_zone.location_zone_id", ondelete="SET NULL"), nullable=True)
    event_timestamp = Column(DateTime, nullable=False, server_default=func.now())
    event_params = Column(JSON, nullable=True)
    event_status = Column(EventStatusType(EventStatus, length=20), default=EventStatus.UNHANDLED)
    handled_by = Column(Integer, ForeignKey("user.user_id", ondelete="SET NULL"), nullable=True)
    handled_at = Column(DateTime, nullable=True)
    remark = Column(String(200), nullable=True)
    
    # 关系
    related_user = relationship("User", foreign_keys=[related_user_id])
    trigger_device = relationship("Device", foreign_keys=[trigger_device_id])
    location_zone = relationship("LocationZone", foreign_keys=[location_zone_id])
    handler = relationship("User", foreign_keys=[handled_by])
    
    # 索引
    __table_args__ = (
        Index('idx_event_timestamp', 'event_timestamp'),
        Index('idx_event_status', 'event_status'),
    )
    
    def __repr__(self):
        return f"<Event(event_id={self.event_id}, event_type='{self.event_type}', status='{self.event_status}')>"

