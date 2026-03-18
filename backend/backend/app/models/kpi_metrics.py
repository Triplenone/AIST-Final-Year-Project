"""
KPI指标模型
"""
from sqlalchemy import Column, Integer, String, Enum, Numeric, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base
import enum


class CalculationCycle(str, enum.Enum):
    """计算周期"""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class KPIMetrics(Base):
    """KPI指标表模型"""
    __tablename__ = "kpi_metrics"
    
    kpi_metric_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    calculation_cycle = Column(
        Enum(
            CalculationCycle,
            native_enum=False,
            values_callable=lambda enum: [item.value for item in enum],
        ),
        nullable=False,
    )
    value = Column(Numeric(5, 2), nullable=False)
    target_threshold = Column(Numeric(5, 2), nullable=False)
    record_timestamp = Column(DateTime, nullable=False, server_default=func.now())
    
    # 唯一约束
    __table_args__ = (
        UniqueConstraint('name', 'calculation_cycle', 'record_timestamp', name='uk_kpi_cycle_timestamp'),
    )
    
    def __repr__(self):
        return f"<KPIMetrics(kpi_metric_id={self.kpi_metric_id}, name='{self.name}', value={self.value})>"

