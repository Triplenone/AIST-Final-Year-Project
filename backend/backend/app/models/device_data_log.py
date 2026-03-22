"""
设备数据日志模型
"""
from sqlalchemy import Column, Integer, ForeignKey, DateTime, DECIMAL, Boolean, BigInteger, String
from sqlalchemy.dialects.mysql import TINYINT
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class DeviceDataLog(Base):
    """设备数据日志表模型"""
    __tablename__ = "device_data_log"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    device_id = Column(Integer, ForeignKey("device.device_id", ondelete="CASCADE"), nullable=False, index=True, comment="关联device表的自增主键")
    timestamp = Column(BigInteger, nullable=False, comment="用于排序与显示的服务器接收时间戳")
    relative_time = Column(BigInteger, nullable=False, comment="设备相对时间")
    
    # 加速度计数据
    accel_x = Column(DECIMAL(10, 6), nullable=False, comment="加速度计X轴")
    accel_y = Column(DECIMAL(10, 6), nullable=False, comment="加速度计Y轴")
    accel_z = Column(DECIMAL(10, 6), nullable=False, comment="加速度计Z轴")
    
    # 陀螺仪数据
    gyro_x = Column(DECIMAL(10, 6), nullable=False, comment="陀螺仪X轴")
    gyro_y = Column(DECIMAL(10, 6), nullable=False, comment="陀螺仪Y轴")
    gyro_z = Column(DECIMAL(10, 6), nullable=False, comment="陀螺仪Z轴")
    
    # 位置数据
    loc_x = Column(DECIMAL(10, 6), nullable=False, comment="位置X坐标")
    loc_y = Column(DECIMAL(10, 6), nullable=False, comment="位置Y坐标")
    loc_z = Column(DECIMAL(10, 6), nullable=False, comment="位置Z坐标")
    loc_accuracy = Column(DECIMAL(10, 6), nullable=False, comment="位置精度")
    position_quality = Column(String(20), nullable=False, comment="位置质量（high/medium/low）")
    
    # 跌倒检测数据
    fall_state = Column(Integer, nullable=False, comment="跌倒状态编码")
    fall_state_description = Column(String(50), nullable=False, comment="跌倒状态描述")
    fall_confidence = Column(DECIMAL(5, 2), nullable=False, comment="跌倒置信度")
    is_fall_confirmed = Column(Boolean, nullable=False, comment="是否确认跌倒（0=否，1=是）")
    impact_force = Column(DECIMAL(10, 2), nullable=False, comment="冲击力度")
    fall_direction = Column(String(20), nullable=False, comment="跌倒方向")
    fall_time = Column(BigInteger, nullable=False, comment="跌倒时间戳")
    
    # 连接状态
    wifi_connected = Column(Boolean, nullable=False, comment="WiFi连接状态（0=断开，1=连接）")
    server_connected = Column(Boolean, nullable=False, comment="服务器连接状态（0=断开，1=连接）")
    battery_level = Column(TINYINT, nullable=False, comment="电池电量（0-100）")
    
    # 时间戳
    server_receive_time = Column(DateTime, nullable=False, comment="服务器接收时间")
    created_at = Column(DateTime, nullable=True, server_default=func.now(), comment="数据入库时间")
    
    # 关系
    device = relationship("Device", foreign_keys=[device_id])
    
    def __repr__(self):
        return f"<DeviceDataLog(id={self.id}, device_id={self.device_id}, timestamp={self.timestamp})>"


