"""
用户状态模型
"""
from sqlalchemy import Column, Integer, ForeignKey, DateTime, DECIMAL, Boolean
from sqlalchemy.dialects.mysql import TINYINT
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class UserStatus(Base):
    """用户状态表模型"""
    __tablename__ = "user_status"
    
    user_status_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.user_id", ondelete="CASCADE"), nullable=False, index=True)
    device_id = Column(Integer, ForeignKey("device.device_id", ondelete="CASCADE"), nullable=False, index=True)
    location_zone_id = Column(Integer, ForeignKey("location_zone.location_zone_id", ondelete="SET NULL"), nullable=True, index=True)
    heart_rate = Column(Integer, nullable=False, comment="心率（正常范围：60-100次/分钟）")
    blood_oxygen = Column(DECIMAL(5, 2), nullable=False, comment="血氧饱和度（正常范围：95.00%-100.00%）")
    body_temperature = Column(DECIMAL(5, 2), nullable=False, comment="体温（正常范围：36.00℃-37.20℃）")
    is_normal = Column(Boolean, default=True, comment="状态是否正常（基于生理指标判断）")
    status_timestamp = Column(DateTime, nullable=False, server_default=func.now(), comment="状态采集时间")
    updated_at = Column(DateTime, nullable=True, server_default=func.now(), onupdate=func.now())
    
    # 关系
    user = relationship("User", foreign_keys=[user_id])
    device = relationship("Device", foreign_keys=[device_id])
    location_zone = relationship("LocationZone", foreign_keys=[location_zone_id])
    
    def __repr__(self):
        return f"<UserStatus(user_status_id={self.user_status_id}, user_id={self.user_id}, heart_rate={self.heart_rate})>"

