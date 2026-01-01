"""
后台任务相关数据模型
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, Integer, DateTime, JSON, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
import enum

from src.models.database import Base


class TaskType(str, enum.Enum):
    """任务类型"""
    PROCESS_ASSET = "process_asset"      # 处理单个资产
    BATCH_PROCESS = "batch_process"      # 批量处理
    GENERATE_ALBUM = "generate_album"    # 生成相册建议
    REINDEX_VECTORS = "reindex_vectors"  # 重建向量索引
    SCAN_FOLDER = "scan_folder"          # 扫描文件夹


class TaskStatus(str, enum.Enum):
    """任务状态"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Task(Base):
    """后台任务表"""
    __tablename__ = "tasks"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # 任务信息
    task_type: Mapped[TaskType] = mapped_column(SQLEnum(TaskType, native_enum=False), nullable=False)
    status: Mapped[TaskStatus] = mapped_column(SQLEnum(TaskStatus, native_enum=False), default=TaskStatus.PENDING)
    
    # 进度
    # 进度
    progress: Mapped[int] = mapped_column(Integer, default=0)  # 0-100
    total_items: Mapped[int] = mapped_column("total", Integer, default=0)
    # processed_items: Mapped[int] = mapped_column(Integer, default=0) -> 数据库无此字段
    
    # 参数与结果
    # params: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True) -> 数据库无此字段
    result: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    @property
    def processed_items(self) -> int:
        if self.total_items > 0:
             return int(self.total_items * self.progress / 100)
        return 0
        
    @property
    def params(self) -> dict:
        return {}
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # 时间
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class SystemConfig(Base):
    """系统配置表"""
    __tablename__ = "system_config"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
