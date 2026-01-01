"""
资产相关数据模型
"""
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Text, Integer, Float, Boolean, DateTime, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import ARRAY
import enum

from src.models.database import Base


class AssetType(str, enum.Enum):
    """资产类型"""
    IMAGE = "image"
    VIDEO = "video"
    DOCUMENT = "document"
    OTHER = "other"


class AssetStatus(str, enum.Enum):
    """资产状态"""
    PENDING = "pending"      # 待处理
    PROCESSING = "processing"  # 处理中
    READY = "ready"          # 就绪
    FAILED = "failed"        # 处理失败


class Asset(Base):
    """资产表"""
    __tablename__ = "assets"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # 基本信息
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)  # MinIO 路径
    thumbnail_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    
    # 文件属性
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)  # 字节
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    asset_type: Mapped[AssetType] = mapped_column(SQLEnum(AssetType, native_enum=False), default=AssetType.OTHER)
    file_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)  # SHA256
    
    # 媒体属性
    width: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    height: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    duration: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # 视频时长(秒)
    
    # AI 生成的内容
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), default=list)
    ocr_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # EXIF 元数据
    exif_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    taken_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    camera_model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # 自定义字段值
    custom_fields: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    
    # 状态
    status: Mapped[AssetStatus] = mapped_column(SQLEnum(AssetStatus, native_enum=False), default=AssetStatus.PENDING)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # 组织
    folder_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("folders.id"), nullable=True)
    
    # 向量 ID (Qdrant)
    vector_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    
    # 时间戳
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True) # Soft delete
    
    # 安全
    is_private: Mapped[bool] = mapped_column(Boolean, default=False) # Vault
    
    # 关系
    folder: Mapped[Optional["Folder"]] = relationship("Folder", back_populates="assets")
    versions: Mapped[List["AssetVersion"]] = relationship("AssetVersion", back_populates="asset", cascade="all, delete-orphan")


class AssetVersion(Base):
    """资产版本表"""
    __tablename__ = "asset_versions"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    asset_id: Mapped[int] = mapped_column(Integer, ForeignKey("assets.id"), nullable=False)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    file_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # 关系
    asset: Mapped["Asset"] = relationship("Asset", back_populates="versions")


class Folder(Base):
    """文件夹表"""
    __tablename__ = "folders"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    parent_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("folders.id"), nullable=True)
    path: Mapped[str] = mapped_column(String(1024), nullable=False)  # 完整路径
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    assets: Mapped[List["Asset"]] = relationship("Asset", back_populates="folder")
    children: Mapped[List["Folder"]] = relationship("Folder", back_populates="parent", cascade="all, delete-orphan")
    parent: Mapped[Optional["Folder"]] = relationship("Folder", back_populates="children", remote_side=[id])


class CustomField(Base):
    """自定义字段定义表"""
    __tablename__ = "custom_fields"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    label: Mapped[str] = mapped_column(String(100), nullable=False)  # 显示名称
    field_type: Mapped[str] = mapped_column(String(50), nullable=False)  # text, select, multi_select, date, number
    options: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)  # 选项列表
    required: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
