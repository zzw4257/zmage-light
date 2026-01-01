"""
API 路由模块
"""
from src.routers.assets import router as assets_router
from src.routers.albums import router as albums_router
from src.routers.collections import router as collections_router
from src.routers.shares import router as shares_router
from src.routers.tasks import router as tasks_router
from src.routers.downloads import router as downloads_router
from src.routers.auth import router as auth_router
from src.routers.mcp import router as mcp_router
from src.routers.ai import router as ai_router
from src.routers.trash import router as trash_router
from src.routers.vault import router as vault_router

__all__ = [
    "assets_router",
    "albums_router",
    "collections_router",
    "shares_router",
    "tasks_router",
    "downloads_router",
    "auth_router",
    "mcp_router",
    "ai_router",
    "trash_router",
    "vault_router",
]
