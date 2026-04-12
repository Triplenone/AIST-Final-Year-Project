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
    MQTT_BROKER: str = "localhost"
    MQTT_PORT: int = 1883
    MQTT_USER: str = ""
    MQTT_PASSWORD: str = ""

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
