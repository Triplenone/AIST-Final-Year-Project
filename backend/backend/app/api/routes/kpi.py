"""
KPI指标API路由
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app import crud
from app.schemas.kpi_metrics import KPIMetricsCreate, KPIMetricsUpdate, KPIMetricsResponse

router = APIRouter()


@router.get("/", response_model=List[KPIMetricsResponse])
def get_kpi_metrics(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    name: Optional[str] = Query(None, description="指标名称筛选"),
    calculation_cycle: Optional[str] = Query(None, description="计算周期筛选"),
    start_time: Optional[datetime] = Query(None, description="开始时间"),
    end_time: Optional[datetime] = Query(None, description="结束时间"),
    db: Session = Depends(get_db)
):
    """获取KPI指标列表"""
    kpi_metrics = crud.kpi_metrics.get_kpi_metrics(
        db, skip=skip, limit=limit,
        name=name,
        calculation_cycle=calculation_cycle,
        start_time=start_time,
        end_time=end_time
    )
    return kpi_metrics


@router.get("/{kpi_metric_id}", response_model=KPIMetricsResponse)
def get_kpi_metric(kpi_metric_id: int, db: Session = Depends(get_db)):
    """根据ID获取KPI指标"""
    kpi_metric = crud.kpi_metrics.get_kpi_metric(db, kpi_metric_id=kpi_metric_id)
    if not kpi_metric:
        raise HTTPException(status_code=404, detail="KPI指标不存在")
    return kpi_metric


@router.post("/", response_model=KPIMetricsResponse, status_code=201)
def create_kpi_metric(kpi_metric: KPIMetricsCreate, db: Session = Depends(get_db)):
    """创建KPI指标"""
    return crud.kpi_metrics.create_kpi_metric(db=db, kpi_metric=kpi_metric)


@router.put("/{kpi_metric_id}", response_model=KPIMetricsResponse)
def update_kpi_metric(
    kpi_metric_id: int, 
    kpi_metric_update: KPIMetricsUpdate, 
    db: Session = Depends(get_db)
):
    """更新KPI指标"""
    kpi_metric = crud.kpi_metrics.update_kpi_metric(
        db=db, kpi_metric_id=kpi_metric_id, 
        kpi_metric_update=kpi_metric_update
    )
    if not kpi_metric:
        raise HTTPException(status_code=404, detail="KPI指标不存在")
    return kpi_metric


@router.delete("/{kpi_metric_id}", status_code=204)
def delete_kpi_metric(kpi_metric_id: int, db: Session = Depends(get_db)):
    """删除KPI指标"""
    success = crud.kpi_metrics.delete_kpi_metric(db=db, kpi_metric_id=kpi_metric_id)
    if not success:
        raise HTTPException(status_code=404, detail="KPI指标不存在")
    return None

