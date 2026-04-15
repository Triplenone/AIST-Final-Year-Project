"""Application settings."""

from pydantic_settings import BaseSettings


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

    # MQTT string device-id -> MySQL integer device_id
    # Format: "ESP32_001:1,ESP32_002:2"
    DEVICE_ID_MAP: str = ""

    @property
    def device_id_map(self) -> dict[str, int]:
        if not self.DEVICE_ID_MAP:
            return {}
        mapping: dict[str, int] = {}
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
