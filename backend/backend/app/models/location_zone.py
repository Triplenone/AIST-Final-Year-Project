"""
位置区域模型
"""
from sqlalchemy import Column, Integer, String, Enum, Boolean, Text, DateTime, TypeDecorator
from sqlalchemy.sql import func
from app.database import Base
import enum


class LocationCategory(str, enum.Enum):
    """位置类别"""
    ROOM = "room"
    CORRIDOR = "corridor"
    BATHROOM = "bathroom"
    COMMON_AREA = "common_area"
    OUTDOOR_AREA = "outdoor_area"


class LocationCategoryType(TypeDecorator):
    """自定义位置类别枚举类型，兼容字符串和枚举值"""
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


class LocationZone(Base):
    """位置区域表模型"""
    __tablename__ = "location_zone"
    
    location_zone_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=True, unique=True)
    category = Column(LocationCategoryType(LocationCategory, length=20), nullable=False)
    related_beacon_ids = Column(String(200), nullable=True)
    geofence_coordinates = Column(Text, nullable=True)
    is_safe_zone = Column(Boolean, default=True)
    created_at = Column(DateTime, nullable=True, server_default=func.now())
    updated_at = Column(DateTime, nullable=True, server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<LocationZone(location_zone_id={self.location_zone_id}, name='{self.name}', category='{self.category}')>"

