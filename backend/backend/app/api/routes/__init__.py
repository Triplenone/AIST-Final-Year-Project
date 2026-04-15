"""API router registration."""

from fastapi import APIRouter

from app.api.routes import (
    data_reception,
    device_data_log,
    devices,
    events,
    family_summary,
    kpi,
    locations,
    mongo_upstream,
    residents,
    user_status,
    users,
)

api_router = APIRouter()

api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(devices.router, prefix="/devices", tags=["devices"])
api_router.include_router(locations.router, prefix="/locations", tags=["locations"])
api_router.include_router(events.router, prefix="/events", tags=["events"])
api_router.include_router(kpi.router, prefix="/kpi", tags=["kpi"])
api_router.include_router(residents.router, prefix="/residents", tags=["residents"])
api_router.include_router(user_status.router, prefix="/user-status", tags=["user-status"])
api_router.include_router(
    device_data_log.router,
    prefix="/device-data-log",
    tags=["device-data-log"],
)
api_router.include_router(
    data_reception.router,
    prefix="/data-reception",
    tags=["data-reception"],
)
api_router.include_router(
    mongo_upstream.router,
    prefix="/mongo-upstream",
    tags=["mongo-upstream"],
)
api_router.include_router(
    family_summary.router,
    prefix="/family-summary",
    tags=["family-summary"],
)
