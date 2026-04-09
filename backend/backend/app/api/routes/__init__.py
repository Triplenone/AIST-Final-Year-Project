"""
API路由
"""
from fastapi import APIRouter
from app.api.routes import (
    users,
    devices,
    locations,
    events,
    kpi,
    residents,
    user_status,
    device_data_log,
    data_reception,
    mongo_upstream,
)

# 创建API路由器
api_router = APIRouter()

# 注册各个模块的路由
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(devices.router, prefix="/devices", tags=["devices"])
api_router.include_router(locations.router, prefix="/locations", tags=["locations"])
api_router.include_router(events.router, prefix="/events", tags=["events"])
api_router.include_router(kpi.router, prefix="/kpi", tags=["kpi"])
api_router.include_router(residents.router, prefix="/residents", tags=["residents"])
api_router.include_router(user_status.router, prefix="/user-status", tags=["user-status"])
api_router.include_router(device_data_log.router, prefix="/device-data-log", tags=["device-data-log"])
api_router.include_router(data_reception.router, prefix="/data-reception", tags=["data-reception"])
api_router.include_router(mongo_upstream.router, prefix="/mongo-upstream", tags=["mongo-upstream"])

