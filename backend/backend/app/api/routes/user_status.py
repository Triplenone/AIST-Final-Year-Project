"""
用户状态API路由
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models.user_status import UserStatus
from app.models.user import User
from app.models.device import Device
from app.models.location_zone import LocationZone
from app.schemas.user_status import UserStatusResponse, UserStatusCreate, UserStatusUpdate

router = APIRouter()


@router.get("/", response_model=List[UserStatusResponse])
def get_user_statuses(
    skip: int = Query(0, ge=0, description="跳过记录数"),
    limit: int = Query(100, ge=1, le=1000, description="返回记录数"),
    user_id: Optional[int] = Query(None, description="筛选用户ID"),
    device_id: Optional[int] = Query(None, description="筛选设备ID"),
    location_zone_id: Optional[int] = Query(None, description="筛选位置区域ID"),
    is_normal: Optional[bool] = Query(None, description="筛选是否正常"),
    db: Session = Depends(get_db)
):
    """
    获取用户状态列表（包含用户名、设备名、位置名）
    
    - **skip**: 跳过记录数（分页）
    - **limit**: 返回记录数（分页）
    - **user_id**: 可选，筛选特定用户
    - **device_id**: 可选，筛选特定设备
    - **location_zone_id**: 可选，筛选特定位置
    - **is_normal**: 可选，筛选正常/异常状态
    """
    try:
        # 构建查询
        query = db.query(UserStatus).options(
            joinedload(UserStatus.user),
            joinedload(UserStatus.device),
            joinedload(UserStatus.location_zone)
        )
        
        # 应用筛选条件
        if user_id is not None:
            query = query.filter(UserStatus.user_id == user_id)
        if device_id is not None:
            query = query.filter(UserStatus.device_id == device_id)
        if location_zone_id is not None:
            query = query.filter(UserStatus.location_zone_id == location_zone_id)
        if is_normal is not None:
            query = query.filter(UserStatus.is_normal == is_normal)
        
        # 按时间倒序排列（最新的在前）
        query = query.order_by(UserStatus.status_timestamp.desc())
        
        # 分页
        user_statuses = query.offset(skip).limit(limit).all()
        
        # 构建响应
        result = []
        for status in user_statuses:
            # 安全处理Decimal类型转换
            blood_oxygen = float(status.blood_oxygen) if status.blood_oxygen is not None else 0.0
            body_temperature = float(status.body_temperature) if status.body_temperature is not None else 0.0
            
            # 安全处理位置区域名称（避免枚举值错误）
            location_name = None
            if status.location_zone:
                try:
                    location_name = status.location_zone.name
                except (AttributeError, ValueError):
                    # 如果枚举值有问题，尝试直接访问
                    try:
                        location_name = str(status.location_zone.name) if hasattr(status.location_zone, 'name') else None
                    except:
                        location_name = None
            
            result.append(UserStatusResponse(
                user_status_id=status.user_status_id,
                user_id=status.user_id,
                user_name=status.user.name if status.user else None,
                device_id=status.device_id,
                device_name=status.device.model_desc or status.device.device_type if status.device else None,
                location_zone_id=status.location_zone_id,
                location_name=location_name,
                heart_rate=status.heart_rate,
                blood_oxygen=blood_oxygen,
                body_temperature=body_temperature,
                is_normal=status.is_normal,
                status_timestamp=status.status_timestamp,
                updated_at=status.updated_at
            ))
        
        return result
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"Error in get_user_statuses: {error_detail}")
        raise HTTPException(status_code=500, detail=f"服务器内部错误: {str(e)}")


@router.get("/{user_status_id}", response_model=UserStatusResponse)
def get_user_status(user_status_id: int, db: Session = Depends(get_db)):
    """
    根据ID获取用户状态详情
    """
    try:
        status = db.query(UserStatus).options(
            joinedload(UserStatus.user),
            joinedload(UserStatus.device),
            joinedload(UserStatus.location_zone)
        ).filter(UserStatus.user_status_id == user_status_id).first()
        
        if not status:
            raise HTTPException(status_code=404, detail="用户状态不存在")
        
        # 安全处理Decimal类型转换
        blood_oxygen = float(status.blood_oxygen) if status.blood_oxygen is not None else 0.0
        body_temperature = float(status.body_temperature) if status.body_temperature is not None else 0.0
        
        return UserStatusResponse(
            user_status_id=status.user_status_id,
            user_id=status.user_id,
            user_name=status.user.name if status.user else None,
            device_id=status.device_id,
            device_name=status.device.model_desc or status.device.device_type if status.device else None,
            location_zone_id=status.location_zone_id,
            location_name=status.location_zone.name if status.location_zone else None,
            heart_rate=status.heart_rate,
            blood_oxygen=blood_oxygen,
            body_temperature=body_temperature,
            is_normal=status.is_normal,
            status_timestamp=status.status_timestamp,
            updated_at=status.updated_at
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"Error in get_user_status: {error_detail}")
        raise HTTPException(status_code=500, detail=f"服务器内部错误: {str(e)}")


@router.get("/user/{user_id}/latest", response_model=UserStatusResponse)
def get_latest_user_status(user_id: int, db: Session = Depends(get_db)):
    """
    获取指定用户的最新状态
    """
    try:
        status = db.query(UserStatus).options(
            joinedload(UserStatus.user),
            joinedload(UserStatus.device),
            joinedload(UserStatus.location_zone)
        ).filter(
            UserStatus.user_id == user_id
        ).order_by(UserStatus.status_timestamp.desc()).first()
        
        if not status:
            raise HTTPException(status_code=404, detail="该用户暂无状态记录")
        
        # 安全处理Decimal类型转换
        blood_oxygen = float(status.blood_oxygen) if status.blood_oxygen is not None else 0.0
        body_temperature = float(status.body_temperature) if status.body_temperature is not None else 0.0
        
        # 安全处理位置区域名称
        location_name = None
        if status.location_zone:
            try:
                location_name = status.location_zone.name
            except (AttributeError, ValueError):
                try:
                    location_name = str(status.location_zone.name) if hasattr(status.location_zone, 'name') else None
                except:
                    location_name = None
        
        return UserStatusResponse(
            user_status_id=status.user_status_id,
            user_id=status.user_id,
            user_name=status.user.name if status.user else None,
            device_id=status.device_id,
            device_name=status.device.model_desc or status.device.device_type if status.device else None,
            location_zone_id=status.location_zone_id,
            location_name=location_name,
            heart_rate=status.heart_rate,
            blood_oxygen=blood_oxygen,
            body_temperature=body_temperature,
            is_normal=status.is_normal,
            status_timestamp=status.status_timestamp,
            updated_at=status.updated_at
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"Error in get_latest_user_status: {error_detail}")
        raise HTTPException(status_code=500, detail=f"服务器内部错误: {str(e)}")


@router.post("/", response_model=UserStatusResponse)
def create_user_status(user_status: UserStatusCreate, db: Session = Depends(get_db)):
    """
    创建新的用户状态记录
    """
    # 验证用户是否存在
    user = db.query(User).filter(User.user_id == user_status.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    # 验证设备是否存在
    device = db.query(Device).filter(Device.device_id == user_status.device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    
    # 验证位置是否存在（如果提供）
    if user_status.location_zone_id:
        location = db.query(LocationZone).filter(LocationZone.location_zone_id == user_status.location_zone_id).first()
        if not location:
            raise HTTPException(status_code=404, detail="位置区域不存在")
    
    # 创建新记录
    new_status = UserStatus(
        user_id=user_status.user_id,
        device_id=user_status.device_id,
        location_zone_id=user_status.location_zone_id,
        heart_rate=user_status.heart_rate,
        blood_oxygen=user_status.blood_oxygen,
        body_temperature=user_status.body_temperature,
        is_normal=user_status.is_normal,
        status_timestamp=user_status.status_timestamp or datetime.now()
    )
    
    db.add(new_status)
    db.commit()
    db.refresh(new_status)
    
    # 重新加载关联数据
    db.refresh(new_status, ["user", "device", "location_zone"])
    
    # 安全处理Decimal类型转换
    blood_oxygen = float(new_status.blood_oxygen) if new_status.blood_oxygen is not None else 0.0
    body_temperature = float(new_status.body_temperature) if new_status.body_temperature is not None else 0.0
    
    # 安全处理位置区域名称
    location_name = None
    if new_status.location_zone:
        try:
            location_name = new_status.location_zone.name
        except (AttributeError, ValueError):
            try:
                location_name = str(new_status.location_zone.name) if hasattr(new_status.location_zone, 'name') else None
            except:
                location_name = None
    
    return UserStatusResponse(
        user_status_id=new_status.user_status_id,
        user_id=new_status.user_id,
        user_name=new_status.user.name if new_status.user else None,
        device_id=new_status.device_id,
        device_name=new_status.device.model_desc or new_status.device.device_type if new_status.device else None,
        location_zone_id=new_status.location_zone_id,
        location_name=location_name,
        heart_rate=new_status.heart_rate,
        blood_oxygen=blood_oxygen,
        body_temperature=body_temperature,
        is_normal=new_status.is_normal,
        status_timestamp=new_status.status_timestamp,
        updated_at=new_status.updated_at
    )


@router.put("/{user_status_id}", response_model=UserStatusResponse)
def update_user_status(
    user_status_id: int,
    user_status: UserStatusUpdate,
    db: Session = Depends(get_db)
):
    """
    更新用户状态记录
    """
    status = db.query(UserStatus).filter(UserStatus.user_status_id == user_status_id).first()
    if not status:
        raise HTTPException(status_code=404, detail="用户状态不存在")
    
    # 更新字段
    update_data = user_status.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(status, field, value)
    
    db.commit()
    db.refresh(status)
    
    # 重新加载关联数据
    db.refresh(status, ["user", "device", "location_zone"])
    
    # 安全处理Decimal类型转换
    blood_oxygen = float(status.blood_oxygen) if status.blood_oxygen is not None else 0.0
    body_temperature = float(status.body_temperature) if status.body_temperature is not None else 0.0
    
    # 安全处理位置区域名称
    location_name = None
    if status.location_zone:
        try:
            location_name = status.location_zone.name
        except (AttributeError, ValueError):
            try:
                location_name = str(status.location_zone.name) if hasattr(status.location_zone, 'name') else None
            except:
                location_name = None
    
    return UserStatusResponse(
        user_status_id=status.user_status_id,
        user_id=status.user_id,
        user_name=status.user.name if status.user else None,
        device_id=status.device_id,
        device_name=status.device.model_desc or status.device.device_type if status.device else None,
        location_zone_id=status.location_zone_id,
        location_name=location_name,
        heart_rate=status.heart_rate,
        blood_oxygen=blood_oxygen,
        body_temperature=body_temperature,
        is_normal=status.is_normal,
        status_timestamp=status.status_timestamp,
        updated_at=status.updated_at
    )


@router.delete("/{user_status_id}")
def delete_user_status(user_status_id: int, db: Session = Depends(get_db)):
    """
    删除用户状态记录
    """
    status = db.query(UserStatus).filter(UserStatus.user_status_id == user_status_id).first()
    if not status:
        raise HTTPException(status_code=404, detail="用户状态不存在")
    
    db.delete(status)
    db.commit()
    
    return {"message": "用户状态已删除", "user_status_id": user_status_id}

