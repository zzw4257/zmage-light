"""
数据模型模块
"""
from src.models.database import Base, engine, async_session_maker, get_db, init_db
from src.models.asset import Asset, AssetVersion, Folder, CustomField, AssetType, AssetStatus
from src.models.album import Album, Collection, Share, Portal, DownloadPreset, AlbumType, AlbumStatus, SharePermission, album_assets, collection_assets
from src.models.task import Task, SystemConfig, TaskType, TaskStatus
from src.models.user import User

__all__ = [
    # Database
    "Base",
    "engine",
    "async_session_maker",
    "get_db",
    "init_db",
    # User
    "User",
    # Asset
    "Asset",
    "AssetVersion",
    "Folder",
    "CustomField",
    "AssetType",
    "AssetStatus",
    # Album
    "Album",
    "Collection",
    "Share",
    "Portal",
    "DownloadPreset",
    "AlbumType",
    "AlbumStatus",
    "SharePermission",
    "album_assets",
    "collection_assets",
    # Task
    "Task",
    "SystemConfig",
    "TaskType",
    "TaskStatus",
]
