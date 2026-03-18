"""
Web Push 订阅模型
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class PushSubscription(Base):
    """Web Push 订阅表模型"""
    __tablename__ = "push_subscription"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.user_id", ondelete="SET NULL"), nullable=True)
    endpoint = Column(String(512), nullable=False, unique=True)
    p256dh = Column(String(255), nullable=False)
    auth = Column(String(255), nullable=False)
    user_agent = Column(String(200), nullable=True)
    created_at = Column(DateTime, nullable=True, server_default=func.now())
    updated_at = Column(DateTime, nullable=True, server_default=func.now(), onupdate=func.now())

    user = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        Index("idx_push_subscription_user_id", "user_id"),
    )

    def __repr__(self):
        return f"<PushSubscription(id={self.id}, endpoint='{self.endpoint[:40]}...')>"
