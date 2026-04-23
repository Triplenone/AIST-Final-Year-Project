"""
设备CRUD操作
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.device import Device
from app.schemas.device import DeviceCreate, DeviceUpdate


def get_device(db: Session, device_id: int) -> Optional[Device]:
    """根据ID获取设备"""
    return db.query(Device).filter(Device.device_id == device_id).first()


def get_devices(db: Session, skip: int = 0, limit: int = 100, 
                elderly_user_id: Optional[int] = None,
                status: Optional[str] = None) -> List[Device]:
    """获取设备列表"""
    query = db.query(Device)
    if elderly_user_id:
        query = query.filter(Device.elderly_user_id == elderly_user_id)
    if status:
        query = query.filter(Device.current_status == status)
    return query.offset(skip).limit(limit).all()


def create_device(db: Session, device: DeviceCreate) -> Device:
    """创建设备"""
    # 约束：同一 elderly_user_id 同时只允许绑定一台设备。
    if device.elderly_user_id is not None:
        db.query(Device).filter(
            Device.elderly_user_id == device.elderly_user_id
        ).update({"elderly_user_id": None}, synchronize_session=False)

    db_device = Device(**device.model_dump())
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device


def update_device(db: Session, device_id: int, device_update: DeviceUpdate) -> Optional[Device]:
    """更新设备"""
    db_device = get_device(db, device_id)
    if not db_device:
        return None
    
    update_data = device_update.model_dump(exclude_unset=True)

    # 约束：当把设备绑定到某 elderly_user_id 时，自动解绑该用户其他设备。
    next_elderly_user_id = update_data.get("elderly_user_id")
    if next_elderly_user_id is not None:
        db.query(Device).filter(
            Device.elderly_user_id == next_elderly_user_id,
            Device.device_id != device_id
        ).update({"elderly_user_id": None}, synchronize_session=False)

    for field, value in update_data.items():
        setattr(db_device, field, value)
    
    db.commit()
    db.refresh(db_device)
    return db_device


def delete_device(db: Session, device_id: int) -> bool:
    """删除设备"""
    db_device = get_device(db, device_id)
    if not db_device:
        return False
    
    db.delete(db_device)
    db.commit()
    return True

