"""
设备API路由
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app import crud
from app.schemas.device import DeviceCreate, DeviceUpdate, DeviceResponse

router = APIRouter()


@router.get("/", response_model=List[DeviceResponse])
def get_devices(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    elderly_user_id: Optional[int] = Query(None, description="老人用户ID筛选"),
    status: Optional[str] = Query(None, description="设备状态筛选"),
    db: Session = Depends(get_db)
):
    """获取设备列表"""
    devices = crud.device.get_devices(
        db, skip=skip, limit=limit, 
        elderly_user_id=elderly_user_id, 
        status=status
    )
    return devices


@router.get("/{device_id}", response_model=DeviceResponse)
def get_device(device_id: int, db: Session = Depends(get_db)):
    """根据ID获取设备"""
    device = crud.device.get_device(db, device_id=device_id)
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    return device


@router.post("/", response_model=DeviceResponse, status_code=201)
def create_device(device: DeviceCreate, db: Session = Depends(get_db)):
    """创建设备"""
    return crud.device.create_device(db=db, device=device)


@router.put("/{device_id}", response_model=DeviceResponse)
def update_device(device_id: int, device_update: DeviceUpdate, db: Session = Depends(get_db)):
    """更新设备"""
    device = crud.device.update_device(db=db, device_id=device_id, device_update=device_update)
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    return device


@router.delete("/{device_id}", status_code=204)
def delete_device(device_id: int, db: Session = Depends(get_db)):
    """删除设备"""
    success = crud.device.delete_device(db=db, device_id=device_id)
    if not success:
        raise HTTPException(status_code=404, detail="设备不存在")
    return None

