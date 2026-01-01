"""
Pydantic 模型模块
"""
from src.schemas.asset import (
    AssetBase, AssetCreate, AssetUpdate, AssetResponse, AssetListResponse,
    AssetSearchRequest, SimilarAssetResponse, AssetEdit,
    FolderBase, FolderCreate, FolderResponse, FolderTreeResponse,
    CustomFieldBase, CustomFieldCreate, CustomFieldResponse,
    UploadResponse, BatchUploadResponse,
)
from src.schemas.album import (
    AlbumBase, AlbumCreate, AlbumUpdate, AlbumResponse, AlbumDetailResponse, SuggestedAlbumResponse,
    CollectionBase, CollectionCreate, CollectionUpdate, CollectionResponse, CollectionDetailResponse,
    ShareCreate, ShareResponse, ShareAccessRequest, ShareContentResponse,
    PortalBase, PortalCreate, PortalUpdate, PortalResponse, PortalPublicResponse,
    DownloadPresetBase, DownloadPresetCreate, DownloadPresetResponse,
)
from src.schemas.task import (
    TaskResponse, TaskListResponse, TaskStatusResponse, TriggerScanRequest, SystemStatsResponse,
)
from src.schemas.user import (
    UserBase, UserCreate, UserUpdate, UserResponse, Token, TokenData,
)

__all__ = [
    # Asset
    "AssetBase", "AssetCreate", "AssetUpdate", "AssetResponse", "AssetListResponse",
    "AssetSearchRequest", "SimilarAssetResponse",
    "FolderBase", "FolderCreate", "FolderResponse", "FolderTreeResponse",
    "CustomFieldBase", "CustomFieldCreate", "CustomFieldResponse",
    "UploadResponse", "BatchUploadResponse",
    # Album
    "AlbumBase", "AlbumCreate", "AlbumUpdate", "AlbumResponse", "AlbumDetailResponse", "SuggestedAlbumResponse",
    "CollectionBase", "CollectionCreate", "CollectionUpdate", "CollectionResponse", "CollectionDetailResponse",
    "ShareCreate", "ShareResponse", "ShareAccessRequest", "ShareContentResponse",
    "PortalBase", "PortalCreate", "PortalUpdate", "PortalResponse", "PortalPublicResponse",
    "DownloadPresetBase", "DownloadPresetCreate", "DownloadPresetResponse",
    # Task
    "TaskResponse", "TaskListResponse", "TaskStatusResponse", "TriggerScanRequest", "SystemStatsResponse",
    # User
    "UserBase", "UserCreate", "UserUpdate", "UserResponse", "Token", "TokenData",
    # Other
    "AssetEdit",
]
