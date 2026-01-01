"""
任务相关 Pydantic 模型
"""
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel

from src.models.task import TaskType, TaskStatus


class TaskResponse(BaseModel):
    """任务响应"""
    id: int
    task_type: TaskType
    status: TaskStatus
    
    progress: int
    total_items: int
    processed_items: int
    
    params: Optional[Dict[str, Any]] = None
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class TaskListResponse(BaseModel):
    """任务列表响应"""
    items: List[TaskResponse]
    total: int


class TaskStatusResponse(BaseModel):
    """后台任务状态响应"""
    last_scan_time: Optional[datetime] = None
    queue_length: int = 0
    pending_tasks: int = 0
    running_tasks: int = 0
    failed_tasks: int = 0
    
    recent_tasks: List[TaskResponse] = []


class TriggerScanRequest(BaseModel):
    """触发扫描请求"""
    scan_type: str = "album_suggestion"  # album_suggestion, reindex


class SystemStatsResponse(BaseModel):
    """系统统计响应"""
    total_assets: int = 0
    total_albums: int = 0
    total_collections: int = 0
    total_shares: int = 0
    
    pending_suggestions: int = 0
    
    storage_used: int = 0  # 字节
    
    asset_by_type: Dict[str, int] = {}
    recent_uploads: int = 0  # 最近 7 天
