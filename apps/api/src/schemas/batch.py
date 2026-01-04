"""
批量操作相关 Pydantic 模型
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class BatchDeleteRequest(BaseModel):
    """批量删除请求"""
    asset_ids: List[int] = Field(..., min_items=1, description="要删除的资产ID列表")


class BatchUpdateRequest(BaseModel):
    """批量更新请求"""
    asset_ids: List[int] = Field(..., min_items=1, description="要更新的资产ID列表")
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    add_tags: Optional[List[str]] = None  # 追加标签
    remove_tags: Optional[List[str]] = None  # 移除标签
    folder_id: Optional[int] = None
    custom_fields: Optional[Dict[str, Any]] = None


class BatchMoveRequest(BaseModel):
    """批量移动到文件夹请求"""
    asset_ids: List[int] = Field(..., min_items=1, description="要移动的资产ID列表")
    folder_id: Optional[int] = Field(None, description="目标文件夹ID，null表示移到根目录")


class BatchOperationResult(BaseModel):
    """批量操作结果"""
    total: int
    success: int
    failed: int
    failed_ids: List[int] = Field(default_factory=list)
    message: str
