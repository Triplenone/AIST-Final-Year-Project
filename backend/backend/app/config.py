"""
应用配置模块
"""
import json
from typing import Dict

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用配置"""
    
    # 数据库配置
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = "root"
    DB_NAME: str = "smart_elderly_care_system"
    
    # 应用配置
    APP_NAME: str = "智能养老系统API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # API配置
    API_V1_PREFIX: str = "/api/v1"

    # MongoDB 配置（用于 MQTT 上行缓存）
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "smart_elderly_care_system"

    # MQTT 配置（用于接收手表上行）
    MQTT_BROKER: str = "127.0.0.1"
    MQTT_PORT: int = 1883
    MQTT_USER: str = ""
    MQTT_PASSWORD: str = ""
    # 临时方案 C：外部设备ID -> MySQL device_id 映射（JSON 字符串）
    # 例如：{"ESP32_00005CFA7AD4DB1C": 1}
    DEVICE_ID_MAP_JSON: str = '{"ESP32_00005CFA7AD4DB1C": 1}'

    # 生命体征异常阈值（用于复用 events 告警）
    VITAL_HEART_RATE_LOW: int = 50
    VITAL_HEART_RATE_HIGH: int = 120
    VITAL_SPO2_LOW: int = 93
    VITAL_BODY_TEMP_HIGH: float = 37.8
    VITAL_RESP_RATE_HIGH: int = 24
    VITAL_HRV_LOW: float = 20.0
    VITAL_ALERT_DEDUP_SECONDS: int = 300
    
    @property
    def database_url(self) -> str:
        """构建数据库连接URL"""
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"

    @property
    def device_id_map(self) -> Dict[str, int]:
        """解析外部设备ID映射表（方案 C）。"""
        try:
            raw = json.loads(self.DEVICE_ID_MAP_JSON or "{}")
            out: Dict[str, int] = {}
            if isinstance(raw, dict):
                for k, v in raw.items():
                    if k is None:
                        continue
                    out[str(k)] = int(v)
            return out
        except Exception:
            return {}
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


# 创建全局配置实例
settings = Settings()

