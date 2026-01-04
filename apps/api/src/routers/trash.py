"""
回收站相关 API 路由
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from src.models import get_db, Asset, AssetStatus
from src.schemas import AssetListResponse, AssetResponse
from src.routers.assets import asset_to_response
from src.services import asset_service
from src.routers.auth import get_current_user
from src.models.user import User

router = APIRouter(prefix="/trash", tags=["回收站"])


@router.get("", response_model=AssetListResponse, summary="获取回收站资产列表")
async def list_trash_assets(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from src.utils.security import VisibilityHelper
    """获取所有已删除的资产 (默认排除私密资产)"""
    query = select(Asset).where(
        Asset.user_id == current_user.id,
        VisibilityHelper.trashed_assets(), 
        Asset.is_private.is_(False)
    )
    count_query = select(func.count(Asset.id)).where(
        Asset.user_id == current_user.id,
        VisibilityHelper.trashed_assets(), 
        Asset.is_private.is_(False)
    )
    
    # 获取总数
    total = await db.scalar(count_query)
    
    # 分页查询
    query = query.order_by(Asset.deleted_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    assets = result.scalars().all()
    
    return AssetListResponse(
        items=[asset_to_response(a) for a in assets],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.delete("/empty", summary="清空回收站")
async def empty_trash(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """清空回收站（永久删除所有已删除资产）"""
    from src.utils.security import VisibilityHelper
    query = select(Asset).where(
        Asset.user_id == current_user.id,
        VisibilityHelper.trashed_assets()
    )
    result = await db.execute(query)
    assets = result.scalars().all()
    
    deleted_count = 0
    for asset in assets:
        await asset_service.delete_asset(db, asset)
        deleted_count += 1
        
    return {"message": f"回收站已清空，永久删除了 {deleted_count} 个项目"}
