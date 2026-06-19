"""FlyCare final demo visible device bindings."""

from sqlalchemy import Boolean, Column, DateTime, Integer, JSON, String, func

from app.database import Base


class FlyCareDemoRegistry(Base):
    """Visible FlyCare demo binding layer without changing legacy user/device ids."""

    __tablename__ = "flycare_demo_registry"

    demo_id = Column(Integer, primary_key=True, index=True)
    mysql_device_id = Column(Integer, nullable=False, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    canonical_device_id = Column(String(64), nullable=False, index=True)
    alias_device_ids = Column(JSON, nullable=True)
    display_name = Column(String(100), nullable=False)
    enabled = Column(Boolean, nullable=False, default=True)
    sort_order = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
