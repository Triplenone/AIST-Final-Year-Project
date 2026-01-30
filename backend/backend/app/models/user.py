"""
用户模型
"""
from sqlalchemy import Column, Integer, String, Enum, Text, DateTime, TypeDecorator
from sqlalchemy.sql import func
from app.database import Base
import enum


class RoleType(str, enum.Enum):
    """用户角色类型"""
    ELDERLY = "elderly"
    CAREGIVER = "caregiver"
    ADMINISTRATOR = "administrator"


class Gender(str, enum.Enum):
    """性别"""
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class EnumType(TypeDecorator):
    """自定义枚举类型，使用枚举值而不是名称"""
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
        return value
    
    def process_result_value(self, value, dialect):
        if value is None:
            return None
        try:
            return self.enum_class(value)
        except ValueError:
            # 如果值不匹配，返回原始值
            return value


class User(Base):
    """用户表模型"""
    __tablename__ = "user"
    
    user_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(50), nullable=False)
    role_type = Column(EnumType(RoleType, length=20), nullable=False)
    gender = Column(EnumType(Gender, length=10), nullable=True)
    age = Column(Integer, nullable=True)
    contact_info = Column(String(100), nullable=True)
    medical_conditions = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=True, server_default=func.now())
    updated_at = Column(DateTime, nullable=True, server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<User(user_id={self.user_id}, name='{self.name}', role_type='{self.role_type}')>"

