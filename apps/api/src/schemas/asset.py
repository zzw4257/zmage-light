"""
资产相关 Pydantic 模型
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from src.models.asset import AssetType, AssetStatus


class AssetBase(BaseModel):
    """资产基础模型"""
    filename: str
    title: Optional[str] = None
    description: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


class AssetCreate(BaseModel):
    """创建资产请求"""
    folder_path: Optional[str] = None
    custom_fields: Dict[str, Any] = Field(default_factory=dict)


class AssetUpdate(BaseModel):
    """更新资产请求"""
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    custom_fields: Optional[Dict[str, Any]] = None
    folder_id: Optional[int] = None


class AssetEdit(BaseModel):
    """资产编辑请求"""
    crop: Optional[Dict[str, int]] = None  # x, y, width, height
    brightness: float = 1.0
    contrast: float = 1.0
    saturation: float = 1.0
    sharpness: float = 1.0
    
    # 高级编辑
    history: Optional[List[Dict[str, Any]]] = None  # 操作历史: [{type: 'rotate', params: {degree: 90}}, ...]
    save_as_new: bool = False  # 是否保存为新资产 (False则创建新版本覆盖)


class AssetAIEdit(BaseModel):
    """AI 资产编辑请求"""
    prompt: Optional[str] = None
    negative_prompt: Optional[str] = None
    style: Optional[str] = None  # 预设风格: "anime", "oil", "cinema", "sketch", "pixel"
    aspect_ratio: str = "SQUARE" # SQUARE, PORTRAIT, LANDSCAPE
    image_size: Optional[str] = None  # 仅 Pro 支持 2K / 4K
    save_as_new: bool = True  # AI 生成通常倾向于另存为


class AssetResponse(BaseModel):
    """资产响应模型"""
    id: int
    filename: str
    original_filename: str
    file_path: str
    thumbnail_path: Optional[str] = None
    
    file_size: int
    mime_type: str
    asset_type: AssetType
    
    width: Optional[int] = None
    height: Optional[int] = None
    duration: Optional[float] = None
    
    title: Optional[str] = None
    description: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    ocr_text: Optional[str] = None
    
    exif_data: Optional[Dict[str, Any]] = None
    taken_at: Optional[datetime] = None
    camera_model: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
    custom_fields: Dict[str, Any] = Field(default_factory=dict)
    
    status: AssetStatus
    folder_id: Optional[int] = None
    
    created_at: datetime
    updated_at: datetime
    
    # URL 字段 (运行时生成)
    url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    
    class Config:
        from_attributes = True


class AssetListResponse(BaseModel):
    """资产列表响应"""
    items: List[AssetResponse]
    total: int
    page: int
    page_size: int
    has_more: bool


class AssetSearchRequest(BaseModel):
    """资产搜索请求"""
    query: Optional[str] = None
    ai_search: bool = False  # 是否使用 AI 语义搜索
    
    # 过滤条件
    asset_types: Optional[List[AssetType]] = None
    folder_id: Optional[int] = None
    tags: Optional[List[str]] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    custom_fields: Optional[Dict[str, Any]] = None
    
    # 分页
    page: int = 1
    page_size: int = 50
    
    # 排序
    sort_by: str = "created_at"
    sort_order: str = "desc"


class SimilarAssetResponse(BaseModel):
    """相似资产响应"""
    asset: AssetResponse
    similarity: float


class AssetVersionResponse(BaseModel):
    """资产版本响应模型"""
    id: int
    asset_id: int
    version_number: int
    file_path: str
    file_size: int
    file_hash: str
    parameters: Optional[Dict[str, Any]] = None
    note: Optional[str] = None
    created_at: datetime
    url: Optional[str] = None

    class Config:
        from_attributes = True


class FolderBase(BaseModel):
    """文件夹基础模型"""
    name: str
    parent_id: Optional[int] = None


class FolderCreate(FolderBase):
    """创建文件夹请求"""
    pass


class FolderResponse(BaseModel):
    """文件夹响应"""
    id: int
    name: str
    parent_id: Optional[int] = None
    path: str
    asset_count: int = 0
    created_at: datetime
    
    class Config:
        from_attributes = True


class FolderTreeResponse(FolderResponse):
    """文件夹树响应"""
    children: List["FolderTreeResponse"] = Field(default_factory=list)


class CustomFieldBase(BaseModel):
    """自定义字段基础模型"""
    name: str
    label: str
    field_type: str  # text, select, multi_select, date, number
    options: Optional[List[str]] = None
    required: bool = False


class CustomFieldCreate(CustomFieldBase):
    """创建自定义字段请求"""
    pass


class CustomFieldResponse(CustomFieldBase):
    """自定义字段响应"""
    id: int
    order: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class UploadResponse(BaseModel):
    """上传响应"""
    asset_id: int
    filename: str
    status: str
    message: str


class BatchUploadResponse(BaseModel):
    """批量上传响应"""
    total: int
    success: int
    failed: int
    results: List[UploadResponse]
