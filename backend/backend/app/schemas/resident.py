"""Resident response schemas."""

from typing import Optional

from pydantic import BaseModel, Field


class ResidentVitals(BaseModel):
    """Resident vital-sign snapshot."""

    hr: Optional[int] = Field(None, description="Heart rate")
    bp_systolic: Optional[int] = Field(None, description="Systolic blood pressure")
    bp_diastolic: Optional[int] = Field(None, description="Diastolic blood pressure")
    spo2: Optional[int] = Field(None, description="Blood oxygen saturation")
    temperature: Optional[float] = Field(None, description="Body temperature")


class ResidentResponse(BaseModel):
    """Resident response model used by the frontend."""

    id: str = Field(..., description="Resident ID")
    name: str = Field(..., description="Resident name")
    avatar_url: Optional[str] = Field(None, description="Avatar URL")
    room: str = Field(..., description="Room name")
    status: str = Field(..., description="Resident status")
    last_seen_at: Optional[str] = Field(None, description="Last seen timestamp")
    last_seen_location: Optional[str] = Field(None, description="Last seen location")
    vitals: Optional[ResidentVitals] = Field(None, description="Resident vitals")
    checked_out: bool = Field(False, description="Checkout status")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Update timestamp")

    user_status_id: Optional[int] = Field(None, description="User status ID")
    heart_rate: Optional[int] = Field(None, description="Heart rate")
    blood_oxygen: Optional[float] = Field(None, description="Blood oxygen")
    body_temperature: Optional[float] = Field(None, description="Body temperature")
    is_normal: Optional[bool] = Field(None, description="Normal-state flag")
    status_timestamp: Optional[str] = Field(None, description="Status timestamp")

    device_id: Optional[int] = Field(None, description="Device ID")
    device_current_status: Optional[str] = Field(None, description="Device status")
    device_battery_level: Optional[int] = Field(None, description="Device battery level")
    device_deploy_location: Optional[str] = Field(None, description="Device deploy location")

    class Config:
        from_attributes = True
