"""
相册与分享相关 Pydantic 模型
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from src.models.album import AlbumType, AlbumStatus, SharePermission
from src.schemas.asset import AssetResponse


class AlbumBase(BaseModel):
    """相册基础模型"""
    name: str
    description: Optional[str] = None


class AlbumCreate(AlbumBase):
    """创建相册请求"""
    asset_ids: List[int] = Field(default_factory=list)
    cover_asset_id: Optional[int] = None
    album_type: Optional[AlbumType] = None  # 默认为 manual
    smart_rules: Optional[Dict[str, Any]] = None  # 智能相册规则


class AlbumUpdate(BaseModel):
    """更新相册请求"""
    name: Optional[str] = None
    description: Optional[str] = None
    cover_asset_id: Optional[int] = None


class AlbumResponse(BaseModel):
    """相册响应"""
    id: int
    name: str
    description: Optional[str] = None
    cover_asset_id: Optional[int] = None
    cover_url: Optional[str] = None
    
    album_type: AlbumType
    status: AlbumStatus
    
    suggestion_reason: Optional[str] = None
    suggestion_score: Optional[float] = None
    
    asset_count: int = 0
    
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class AlbumDetailResponse(AlbumResponse):
    """相册详情响应"""
    assets: List[AssetResponse] = Field(default_factory=list)


class SuggestedAlbumResponse(AlbumResponse):
    """建议相册响应"""
    preview_assets: List[AssetResponse] = Field(default_factory=list)


class CollectionBase(BaseModel):
    """集合基础模型"""
    name: str
    description: Optional[str] = None
    notes: Optional[str] = None


class CollectionCreate(CollectionBase):
    """创建集合请求"""
    asset_ids: List[int] = Field(default_factory=list)


class CollectionUpdate(BaseModel):
    """更新集合请求"""
    name: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    cover_asset_id: Optional[int] = None


class CollectionResponse(BaseModel):
    """集合响应"""
    id: int
    name: str
    description: Optional[str] = None
    notes: Optional[str] = None
    cover_asset_id: Optional[int] = None
    cover_url: Optional[str] = None
    
    asset_count: int = 0
    
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CollectionDetailResponse(CollectionResponse):
    """集合详情响应"""
    assets: List[AssetResponse] = Field(default_factory=list)


class ShareCreate(BaseModel):
    """创建分享请求"""
    asset_id: Optional[int] = None
    collection_id: Optional[int] = None
    permission: SharePermission = SharePermission.VIEW
    password: Optional[str] = None
    expires_in_days: Optional[int] = None  # 过期天数


class ShareResponse(BaseModel):
    """分享响应"""
    id: int
    share_code: str
    share_url: str
    
    asset_id: Optional[int] = None
    collection_id: Optional[int] = None
    
    permission: SharePermission
    has_password: bool
    expires_at: Optional[datetime] = None
    
    view_count: int
    download_count: int
    is_active: bool
    
    created_at: datetime
    
    class Config:
        from_attributes = True


class ShareAccessRequest(BaseModel):
    """访问分享请求"""
    password: Optional[str] = None


class ShareContentResponse(BaseModel):
    """分享内容响应"""
    share: ShareResponse
    asset: Optional[AssetResponse] = None
    collection: Optional[CollectionDetailResponse] = None


class PortalBase(BaseModel):
    """Portal 基础模型"""
    name: str
    slug: str
    welcome_message: Optional[str] = None
    primary_color: str = "#3B82F6"


class PortalCreate(PortalBase):
    """创建 Portal 请求"""
    collection_id: int
    visible_fields: List[str] = Field(default_factory=list)
    searchable: bool = True
    filterable: bool = True
    allow_download: bool = False
    password: Optional[str] = None


class PortalUpdate(BaseModel):
    """更新 Portal 请求"""
    name: Optional[str] = None
    welcome_message: Optional[str] = None
    primary_color: Optional[str] = None
    visible_fields: Optional[List[str]] = None
    searchable: Optional[bool] = None
    filterable: Optional[bool] = None
    allow_download: Optional[bool] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None


class PortalResponse(BaseModel):
    """Portal 响应"""
    id: int
    name: str
    slug: str
    portal_url: str
    
    welcome_message: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: str
    
    collection_id: Optional[int] = None
    visible_fields: List[str] = Field(default_factory=list)
    searchable: bool
    filterable: bool
    allow_download: bool
    has_password: bool
    
    is_active: bool
    
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class PortalPublicResponse(BaseModel):
    """Portal 公开响应"""
    name: str
    welcome_message: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: str
    searchable: bool
    filterable: bool
    allow_download: bool
    visible_fields: List[str] = Field(default_factory=list)


class DownloadPresetBase(BaseModel):
    """下载预设基础模型"""
    name: str
    description: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    aspect_ratio: Optional[str] = None
    format: str = "original"
    quality: int = 90


class DownloadPresetCreate(DownloadPresetBase):
    """创建下载预设请求"""
    pass


class DownloadPresetResponse(DownloadPresetBase):
    """下载预设响应"""
    id: int
    order: int
    is_default: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
