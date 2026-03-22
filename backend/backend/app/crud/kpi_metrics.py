"""
KPI指标CRUD操作
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.models.kpi_metrics import KPIMetrics
from app.schemas.kpi_metrics import KPIMetricsCreate, KPIMetricsUpdate


def get_kpi_metric(db: Session, kpi_metric_id: int) -> Optional[KPIMetrics]:
    """根据ID获取KPI指标"""
    return db.query(KPIMetrics).filter(KPIMetrics.kpi_metric_id == kpi_metric_id).first()


def get_kpi_metrics(db: Session, skip: int = 0, limit: int = 100,
                    name: Optional[str] = None,
                    calculation_cycle: Optional[str] = None,
                    start_time: Optional[datetime] = None,
                    end_time: Optional[datetime] = None) -> List[KPIMetrics]:
    """获取KPI指标列表"""
    query = db.query(KPIMetrics)
    
    if name:
        query = query.filter(KPIMetrics.name == name)
    if calculation_cycle:
        query = query.filter(KPIMetrics.calculation_cycle == calculation_cycle)
    if start_time:
        query = query.filter(KPIMetrics.record_timestamp >= start_time)
    if end_time:
        query = query.filter(KPIMetrics.record_timestamp <= end_time)
    
    return query.order_by(KPIMetrics.record_timestamp.desc()).offset(skip).limit(limit).all()


def create_kpi_metric(db: Session, kpi_metric: KPIMetricsCreate) -> KPIMetrics:
    """创建KPI指标"""
    db_kpi = KPIMetrics(**kpi_metric.model_dump())
    db.add(db_kpi)
    db.commit()
    db.refresh(db_kpi)
    return db_kpi


def update_kpi_metric(db: Session, kpi_metric_id: int, 
                     kpi_metric_update: KPIMetricsUpdate) -> Optional[KPIMetrics]:
    """更新KPI指标"""
    db_kpi = get_kpi_metric(db, kpi_metric_id)
    if not db_kpi:
        return None
    
    update_data = kpi_metric_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_kpi, field, value)
    
    db.commit()
    db.refresh(db_kpi)
    return db_kpi


def delete_kpi_metric(db: Session, kpi_metric_id: int) -> bool:
    """删除KPI指标"""
    db_kpi = get_kpi_metric(db, kpi_metric_id)
    if not db_kpi:
        return False
    
    db.delete(db_kpi)
    db.commit()
    return True

