"""
用户API路由
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app import crud
from app.schemas.user import UserCreate, UserUpdate, UserResponse

router = APIRouter()


@router.get("/", response_model=List[UserResponse])
def get_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    role_type: Optional[str] = Query(None, description="角色类型筛选"),
    db: Session = Depends(get_db)
):
    """获取用户列表"""
    users = crud.user.get_users(db, skip=skip, limit=limit, role_type=role_type)
    return users


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """根据ID获取用户"""
    user = crud.user.get_user(db, user_id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return user


@router.post("/", response_model=UserResponse, status_code=201)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """创建用户"""
    return crud.user.create_user(db=db, user=user)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user_update: UserUpdate, db: Session = Depends(get_db)):
    """更新用户"""
    user = crud.user.update_user(db=db, user_id=user_id, user_update=user_update)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return user


@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """删除用户"""
    success = crud.user.delete_user(db=db, user_id=user_id)
    if not success:
        raise HTTPException(status_code=404, detail="用户不存在")
    return None

