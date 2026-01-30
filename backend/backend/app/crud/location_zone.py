"""
位置区域CRUD操作
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.location_zone import LocationZone
from app.schemas.location_zone import LocationZoneCreate, LocationZoneUpdate


def get_location_zone(db: Session, location_zone_id: int) -> Optional[LocationZone]:
    """根据ID获取位置区域"""
    return db.query(LocationZone).filter(LocationZone.location_zone_id == location_zone_id).first()


def get_location_zones(db: Session, skip: int = 0, limit: int = 100,
                       category: Optional[str] = None) -> List[LocationZone]:
    """获取位置区域列表"""
    query = db.query(LocationZone)
    if category:
        query = query.filter(LocationZone.category == category)
    return query.offset(skip).limit(limit).all()


def create_location_zone(db: Session, location_zone: LocationZoneCreate) -> LocationZone:
    """创建位置区域"""
    db_location = LocationZone(**location_zone.model_dump())
    db.add(db_location)
    db.commit()
    db.refresh(db_location)
    return db_location


def update_location_zone(db: Session, location_zone_id: int, 
                        location_zone_update: LocationZoneUpdate) -> Optional[LocationZone]:
    """更新位置区域"""
    db_location = get_location_zone(db, location_zone_id)
    if not db_location:
        return None
    
    update_data = location_zone_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_location, field, value)
    
    db.commit()
    db.refresh(db_location)
    return db_location


def delete_location_zone(db: Session, location_zone_id: int) -> bool:
    """删除位置区域"""
    db_location = get_location_zone(db, location_zone_id)
    if not db_location:
        return False
    
    db.delete(db_location)
    db.commit()
    return True

