"""
用户数据模型
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Boolean, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column

from src.models.database import Base


class User(Base):
    """用户表"""
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, unique=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, unique=True)
    mobile: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, unique=True)
    hashed_password: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    full_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    mobile_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # 社交登录绑定
    wechat_openid: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, unique=True)
    google_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, unique=True)
    
    # 私密保险库 PIN
    vault_pin_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # 时间戳
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
