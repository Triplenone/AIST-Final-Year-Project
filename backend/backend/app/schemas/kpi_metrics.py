"""
KPI指标相关的Pydantic模型
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal
from app.models.kpi_metrics import CalculationCycle


class KPIMetricsBase(BaseModel):
    """KPI指标基础模型"""
    name: str = Field(..., min_length=1, max_length=100, description="指标名称")
    calculation_cycle: CalculationCycle = Field(..., description="计算周期")
    value: Decimal = Field(..., ge=0, description="指标值")
    target_threshold: Decimal = Field(..., ge=0, description="目标阈值")
    record_timestamp: datetime = Field(default_factory=datetime.now, description="记录时间戳")


class KPIMetricsCreate(KPIMetricsBase):
    """创建KPI指标请求模型"""
    pass


class KPIMetricsUpdate(BaseModel):
    """更新KPI指标请求模型"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    calculation_cycle: Optional[CalculationCycle] = None
    value: Optional[Decimal] = Field(None, ge=0)
    target_threshold: Optional[Decimal] = Field(None, ge=0)
    record_timestamp: Optional[datetime] = None


class KPIMetricsResponse(KPIMetricsBase):
    """KPI指标响应模型"""
    kpi_metric_id: int
    
    class Config:
        from_attributes = True

