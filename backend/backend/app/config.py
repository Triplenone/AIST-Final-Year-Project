"""Application settings."""

import json
from pathlib import Path
from typing import Dict

from pydantic_settings import BaseSettings


def _default_device_id_map_path() -> Path:
    """Repo-tracked file: backend/backend/config/device_id_map.json"""
    return Path(__file__).resolve().parent.parent / "config" / "device_id_map.json"


def _load_device_id_map_file(path: Path) -> Dict[str, int]:
    """
    Load MongoDB/MQTT string device_id -> MySQL device.device_id from JSON.

    Expected shape (see config/device_id_map.json):
    { "version": 1, "mongo_to_mysql": [ { "mongodb_device_id": "...", "mysql_device_id": 1 }, ... ] }
    """
    if not path.is_file():
        return {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"Warning: device_id map file unreadable ({path}): {exc}")
        return {}

    out: Dict[str, int] = {}
    rows = raw.get("mongo_to_mysql")
    if not isinstance(rows, list):
        return out

    for row in rows:
        if not isinstance(row, dict):
            continue
        ext = row.get("mongodb_device_id") or row.get("mongo_device_id")
        mid = row.get("mysql_device_id")
        if ext is None or mid is None:
            continue
        key = str(ext).strip()
        if not key:
            continue
        try:
            out[key] = int(mid)
        except (TypeError, ValueError):
            continue
    return out


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # MySQL
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = "root"
    DB_NAME: str = "smart_elderly_care_system"

    # App
    APP_NAME: str = "智能养老系统API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # MongoDB raw upstream storage
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "smart_elderly_care_system"

    # MQTT subscriber
    MQTT_BROKER: str = "broker.emqx.io"
    MQTT_PORT: int = 1883
    MQTT_USER: str = ""
    MQTT_PASSWORD: str = ""

    # MQTT / MongoDB string device_id -> MySQL device.device_id (optional override, merged after file)
    # Format: "ESP32_001:1,ESP32_002:2"
    DEVICE_ID_MAP: str = ""
    # Path to JSON map (default: backend/backend/config/device_id_map.json). Empty = use default path.
    DEVICE_ID_MAP_FILE: str = ""

    @property
    def device_id_map(self) -> Dict[str, int]:
        path = (
            Path(self.DEVICE_ID_MAP_FILE).expanduser().resolve()
            if (self.DEVICE_ID_MAP_FILE or "").strip()
            else _default_device_id_map_path()
        )
        mapping = _load_device_id_map_file(path)
        if not self.DEVICE_ID_MAP:
            return mapping
        for pair in self.DEVICE_ID_MAP.split(","):
            pair = pair.strip()
            if ":" not in pair:
                continue
            key, val = pair.split(":", 1)
            mapping[key.strip()] = int(val.strip())
        return mapping

    @property
    def database_url(self) -> str:
        """Build the SQLAlchemy MySQL URL."""
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"
        )

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
