"""
Zmage API 配置
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """应用配置"""
    
    # 应用
    app_name: str = "Zmage"
    app_env: str = "development"
    debug: bool = True
    
    # 数据库
    database_url: str = "postgresql+asyncpg://zmage:zmage_password@img-lib-postgres:5432/zmage"
    
    # Redis
    redis_url: str = "redis://img-lib-redis:6379/0"
    
    # Qdrant
    qdrant_url: str = "http://img-lib-qdrant:6333"
    qdrant_collection: str = "zmage_assets"
    
    # MinIO/S3
    s3_endpoint: str = "http://img-lib-minio:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket: str = "zmage"
    
    # Gemini
    gemini_api_key: str = ""
    
    # JWT
    jwt_secret: str = "your_jwt_secret_key"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 天
    
    # 向量维度
    embedding_dimension: int = 768
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"

    def model_post_init(self, __context):
        if self.database_url.startswith("postgresql://"):
            self.database_url = self.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)


@lru_cache()
def get_settings() -> Settings:
    """获取配置单例"""
    return Settings()


settings = get_settings()
