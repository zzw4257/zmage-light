"""
相册与分享相关数据模型
"""
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Text, Integer, Boolean, DateTime, ForeignKey, JSON, Enum as SQLEnum, Table, Column, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import ARRAY
import enum
import secrets

from src.models.database import Base


class AlbumType(str, enum.Enum):
    """相册类型"""
    MANUAL = "manual"        # 手动创建
    SMART = "smart"          # 智能相册
    SUGGESTED = "suggested"  # AI 建议


class AlbumStatus(str, enum.Enum):
    """建议相册状态"""
    PENDING = "pending"      # 待审核
    ACCEPTED = "accepted"    # 已接受
    IGNORED = "ignored"      # 已忽略


# 相册-资产关联表
album_assets = Table(
    "album_assets",
    Base.metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("album_id", Integer, ForeignKey("albums.id"), nullable=False),
    Column("asset_id", Integer, ForeignKey("assets.id"), nullable=False),
    Column("position", Integer, server_default="0"),
    Column("created_at", DateTime, server_default=text("CURRENT_TIMESTAMP")),
)


class Album(Base):
    """相册表"""
    __tablename__ = "albums"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # 基本信息
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cover_asset_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("assets.id"), nullable=True)
    
    # 类型与状态
    album_type: Mapped[AlbumType] = mapped_column(SQLEnum(AlbumType, native_enum=False), default=AlbumType.MANUAL)
    status: Mapped[AlbumStatus] = mapped_column(SQLEnum(AlbumStatus, native_enum=False), default=AlbumStatus.ACCEPTED)
    
    # AI 建议相关
    suggestion_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # AI 建议理由
    suggestion_score: Mapped[Optional[float]] = mapped_column(nullable=True)  # 建议置信度
    
    # 智能相册规则 (JSON 格式)
    smart_rules: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # 时间戳
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True) # Soft delete
    
    # 关系
    assets: Mapped[List["Asset"]] = relationship("Asset", secondary=album_assets, backref="albums")
    cover_asset: Mapped[Optional["Asset"]] = relationship("Asset", foreign_keys=[cover_asset_id])


# 集合-资产关联表
collection_assets = Table(
    "collection_assets",
    Base.metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("collection_id", Integer, ForeignKey("collections.id"), nullable=False),
    Column("asset_id", Integer, ForeignKey("assets.id"), nullable=False),
    Column("position", Integer, server_default="0"),
    Column("created_at", DateTime, server_default=text("CURRENT_TIMESTAMP")),
)


class Collection(Base):
    """集合表 (用于协作)"""
    __tablename__ = "collections"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cover_asset_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("assets.id"), nullable=True)
    
    # 协作备注
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    assets: Mapped[List["Asset"]] = relationship("Asset", secondary=collection_assets, backref="collections")
    shares: Mapped[List["Share"]] = relationship("Share", back_populates="collection", cascade="all, delete-orphan")


class SharePermission(str, enum.Enum):
    """分享权限"""
    VIEW = "view"            # 仅查看
    DOWNLOAD = "download"    # 可下载


class Share(Base):
    """分享链接表"""
    __tablename__ = "shares"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # 分享码 (URL 友好)
    share_code: Mapped[str] = mapped_column(String(32), nullable=False, unique=True, default=lambda: secrets.token_urlsafe(16))
    
    # 分享目标 (资产或集合)
    asset_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("assets.id"), nullable=True)
    collection_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("collections.id"), nullable=True)
    
    # 权限设置
    permission: Mapped[SharePermission] = mapped_column(SQLEnum(SharePermission, native_enum=False), default=SharePermission.VIEW)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # 加密后的密码
    
    # 有效期
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # 统计
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    download_count: Mapped[int] = mapped_column(Integer, default=0)
    
    # 状态
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # 关系
    asset: Mapped[Optional["Asset"]] = relationship("Asset", foreign_keys=[asset_id])
    collection: Mapped[Optional["Collection"]] = relationship("Collection", back_populates="shares")


class Portal(Base):
    """品牌化 Portal"""
    __tablename__ = "portals"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # 基本信息
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)  # URL 路径
    
    # 品牌化
    welcome_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    logo_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    primary_color: Mapped[str] = mapped_column(String(32), default="#3B82F6")
    
    # 内容设置
    collection_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("collections.id"), nullable=True)
    visible_fields: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), default=list)  # 可见字段
    searchable: Mapped[bool] = mapped_column(Boolean, default=True)
    filterable: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # 权限
    allow_download: Mapped[bool] = mapped_column(Boolean, default=False)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # 状态
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    collection: Mapped[Optional["Collection"]] = relationship("Collection")


class DownloadPreset(Base):
    """下载预设表"""
    __tablename__ = "download_presets"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # 尺寸设置
    width: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    height: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    aspect_ratio: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # 如 "16:9", "1:1"
    
    # 格式
    format: Mapped[str] = mapped_column(String(20), default="original")  # original, jpg, png, webp
    quality: Mapped[int] = mapped_column(Integer, default=90)
    
    # 排序
    order: Mapped[int] = mapped_column(Integer, default=0)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
