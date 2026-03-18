"""
Pydantic模型模块（请求/响应验证）
"""
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.schemas.device import DeviceCreate, DeviceUpdate, DeviceResponse
from app.schemas.location_zone import LocationZoneCreate, LocationZoneUpdate, LocationZoneResponse
from app.schemas.event import EventCreate, EventUpdate, EventResponse
from app.schemas.kpi_metrics import KPIMetricsCreate, KPIMetricsUpdate, KPIMetricsResponse
from app.schemas.push_subscription import (
    PushSubscriptionCreate,
    PushSubscriptionUpdate,
    PushSubscriptionResponse
)

__all__ = [
    "UserCreate", "UserUpdate", "UserResponse",
    "DeviceCreate", "DeviceUpdate", "DeviceResponse",
    "LocationZoneCreate", "LocationZoneUpdate", "LocationZoneResponse",
    "EventCreate", "EventUpdate", "EventResponse",
    "KPIMetricsCreate", "KPIMetricsUpdate", "KPIMetricsResponse",
    "PushSubscriptionCreate", "PushSubscriptionUpdate", "PushSubscriptionResponse"
]

