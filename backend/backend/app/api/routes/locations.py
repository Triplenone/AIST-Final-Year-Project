"""
位置区域API路由
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app import crud
from app.schemas.location_zone import LocationZoneCreate, LocationZoneUpdate, LocationZoneResponse

router = APIRouter()


@router.get("/", response_model=List[LocationZoneResponse])
def get_location_zones(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    category: Optional[str] = Query(None, description="位置类别筛选"),
    db: Session = Depends(get_db)
):
    """获取位置区域列表"""
    locations = crud.location_zone.get_location_zones(
        db, skip=skip, limit=limit, category=category
    )
    return locations


@router.get("/{location_zone_id}", response_model=LocationZoneResponse)
def get_location_zone(location_zone_id: int, db: Session = Depends(get_db)):
    """根据ID获取位置区域"""
    location = crud.location_zone.get_location_zone(db, location_zone_id=location_zone_id)
    if not location:
        raise HTTPException(status_code=404, detail="位置区域不存在")
    return location


@router.post("/", response_model=LocationZoneResponse, status_code=201)
def create_location_zone(location_zone: LocationZoneCreate, db: Session = Depends(get_db)):
    """创建位置区域"""
    return crud.location_zone.create_location_zone(db=db, location_zone=location_zone)


@router.put("/{location_zone_id}", response_model=LocationZoneResponse)
def update_location_zone(
    location_zone_id: int, 
    location_zone_update: LocationZoneUpdate, 
    db: Session = Depends(get_db)
):
    """更新位置区域"""
    location = crud.location_zone.update_location_zone(
        db=db, location_zone_id=location_zone_id, 
        location_zone_update=location_zone_update
    )
    if not location:
        raise HTTPException(status_code=404, detail="位置区域不存在")
    return location


@router.delete("/{location_zone_id}", status_code=204)
def delete_location_zone(location_zone_id: int, db: Session = Depends(get_db)):
    """删除位置区域"""
    success = crud.location_zone.delete_location_zone(db=db, location_zone_id=location_zone_id)
    if not success:
        raise HTTPException(status_code=404, detail="位置区域不存在")
    return None

