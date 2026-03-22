"""
应用配置模块
"""
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Optional


class Settings(BaseSettings):
    """应用配置"""
    
    # 数据库配置
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = "root"
    DB_NAME: str = "smart_elderly_care_system"
    
    # MongoDB 配置（上行 JSON 缓存）
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "smart_elderly_mongo"
    
    # MQTT 配置（ESP32 上行，与 MQTT-topic.txt 一致）
    MQTT_BROKER: str = "broker.emqx.io"
    MQTT_PORT: int = 1883
    MQTT_USER: Optional[str] = None
    MQTT_PASSWORD: Optional[str] = None
    
    # 应用配置
    APP_NAME: str = "智能养老系统API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    @field_validator('DEBUG', mode='before')
    @classmethod
    def parse_debug(cls, v):
        """解析 DEBUG 环境变量，处理各种字符串值（包括日志级别）"""
        if isinstance(v, bool):
            return v
        if isinstance(v, str):
            v_lower = v.lower().strip()
            # 如果是日志级别字符串，转换为 False
            if v_lower in ('warn', 'warning', 'error', 'critical', 'info'):
                return False
            # 标准布尔值转换
            if v_lower in ('true', '1', 'yes', 'on'):
                return True
            if v_lower in ('false', '0', 'no', 'off'):
                return False
        return bool(v) if v is not None else True
    
    # API配置
    API_V1_PREFIX: str = "/api/v1"
    
    @property
    def database_url(self) -> str:
        """构建数据库连接URL"""
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# 创建全局配置实例
settings = Settings()

