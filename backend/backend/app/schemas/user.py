"""
用户相关的Pydantic模型
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.user import RoleType, Gender


class UserBase(BaseModel):
    """用户基础模型"""
    name: str = Field(..., min_length=1, max_length=50, description="用户姓名")
    role_type: RoleType = Field(..., description="用户角色类型")
    gender: Optional[Gender] = Field(None, description="性别")
    age: Optional[int] = Field(None, ge=0, le=150, description="年龄")
    contact_info: Optional[str] = Field(None, max_length=100, description="联系方式")
    medical_conditions: Optional[str] = Field(None, description="医疗状况")


class UserCreate(UserBase):
    """创建用户请求模型"""
    pass


class UserUpdate(BaseModel):
    """更新用户请求模型"""
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    role_type: Optional[RoleType] = None
    gender: Optional[Gender] = None
    age: Optional[int] = Field(None, ge=0, le=150)
    contact_info: Optional[str] = Field(None, max_length=100)
    medical_conditions: Optional[str] = None


class UserResponse(UserBase):
    """用户响应模型"""
    user_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True  # 允许从ORM对象创建

