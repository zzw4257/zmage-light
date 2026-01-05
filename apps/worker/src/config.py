"""
Worker 配置
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Worker 配置"""
    
    # 数据库
    database_url: str = "postgresql+asyncpg://zmage:zmage_password@postgres:5432/zmage"
    
    # Redis
    redis_url: str = "redis://redis:6379/0"
    
    # Qdrant
    qdrant_url: str = "http://qdrant:6333"
    qdrant_collection: str = "zmage_assets"
    
    # MinIO/S3
    s3_endpoint: str = "http://minio:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket: str = "zmage"
    
    # Gemini
    gemini_api_key: str = ""
    
    # 向量维度
    embedding_dimension: int = 768
    
    # 定时任务配置
    album_scan_interval_hours: int = 6  # 相册建议扫描间隔
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
