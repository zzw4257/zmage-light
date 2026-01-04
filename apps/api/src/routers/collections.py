"""
集合相关 API 路由
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, insert, delete

from src.models import get_db, Collection, Asset, collection_assets
from src.schemas import (
    CollectionCreate, CollectionUpdate, CollectionResponse, CollectionDetailResponse,
)
from src.services import storage_service
from src.routers.auth import get_current_user
from src.models.user import User

router = APIRouter(prefix="/collections", tags=["集合管理"])


def collection_to_response(collection: Collection, asset_count: int = 0) -> CollectionResponse:
    """转换集合为响应模型"""
    cover_url = None
    if collection.cover_asset_id:
        # 获取封面 URL
        pass  # 需要查询资产
    
    return CollectionResponse(
        id=collection.id,
        name=collection.name,
        description=collection.description,
        notes=collection.notes,
        cover_asset_id=collection.cover_asset_id,
        cover_url=cover_url,
        asset_count=asset_count,
        created_at=collection.created_at,
        updated_at=collection.updated_at,
    )


@router.get("", response_model=List[CollectionResponse], summary="获取集合列表")
async def list_collections(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取所有集合"""
    result = await db.execute(
        select(Collection).where(Collection.user_id == current_user.id).order_by(Collection.updated_at.desc())
    )
    collections = result.scalars().all()
    
    responses = []
    for collection in collections:
        count_result = await db.execute(
            select(func.count(Asset.id)).select_from(Asset).join(collection_assets, Asset.id == collection_assets.c.asset_id).where(
                collection_assets.c.collection_id == collection.id,
                Asset.deleted_at.is_(None),
                Asset.is_private.is_(False)
            )
        )
        asset_count = count_result.scalar()
        responses.append(collection_to_response(collection, asset_count))
    
    return responses


@router.post("", response_model=CollectionResponse, summary="创建集合")
async def create_collection(
    data: CollectionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建新集合"""
    collection = Collection(
        name=data.name,
        description=data.description,
        notes=data.notes,
        user_id=current_user.id,
    )
    db.add(collection)
    await db.commit()
    await db.refresh(collection)
    
    # 添加资产
    if data.asset_ids:
        for asset_id in data.asset_ids:
            await db.execute(
                insert(collection_assets).values(
                    collection_id=collection.id,
                    asset_id=asset_id,
                )
            )
        await db.commit()
    
    return collection_to_response(collection, len(data.asset_ids))


@router.get("/{collection_id}", response_model=CollectionDetailResponse, summary="获取集合详情")
async def get_collection(
    collection_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取集合详情"""
    collection = await db.get(Collection, collection_id)
    if not collection or collection.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="集合不存在")
    
    from src.utils.security import VisibilityHelper
    result = await db.execute(
        select(Asset).join(collection_assets).where(
            collection_assets.c.collection_id == collection_id,
            VisibilityHelper.active_assets()
        ).order_by(collection_assets.c.order)
    )
    assets = result.scalars().all()
    
    from src.routers.assets import asset_to_response
    
    return CollectionDetailResponse(
        id=collection.id,
        name=collection.name,
        description=collection.description,
        notes=collection.notes,
        cover_asset_id=collection.cover_asset_id,
        cover_url=None,
        asset_count=len(assets),
        created_at=collection.created_at,
        updated_at=collection.updated_at,
        assets=[asset_to_response(a) for a in assets],
    )


@router.put("/{collection_id}", response_model=CollectionResponse, summary="更新集合")
async def update_collection(
    collection_id: int,
    data: CollectionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新集合信息"""
    collection = await db.get(Collection, collection_id)
    if not collection or collection.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="集合不存在")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(collection, key, value)
    
    await db.commit()
    await db.refresh(collection)
    
    count_result = await db.execute(
        select(func.count(Asset.id)).select_from(Asset).join(collection_assets, Asset.id == collection_assets.c.asset_id).where(
            collection_assets.c.collection_id == collection_id,
            Asset.deleted_at.is_(None),
            Asset.is_private.is_(False)
        )
    )
    asset_count = count_result.scalar()
    
    return collection_to_response(collection, asset_count)


@router.delete("/{collection_id}", summary="删除集合")
async def delete_collection(
    collection_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除集合"""
    collection = await db.get(Collection, collection_id)
    if not collection or collection.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="集合不存在")
    
    # 删除关联
    await db.execute(
        delete(collection_assets).where(collection_assets.c.collection_id == collection_id)
    )
    
    # 删除集合
    await db.delete(collection)
    await db.commit()
    
    return {"message": "删除成功"}


@router.post("/{collection_id}/assets", summary="添加资产到集合")
async def add_assets_to_collection(
    collection_id: int,
    asset_ids: List[int],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """添加资产到集合"""
    collection = await db.get(Collection, collection_id)
    if not collection or collection.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="集合不存在")
    
    for asset_id in asset_ids:
        existing = await db.execute(
            select(collection_assets).where(
                collection_assets.c.collection_id == collection_id,
                collection_assets.c.asset_id == asset_id,
            )
        )
        if not existing.first():
            await db.execute(
                insert(collection_assets).values(
                    collection_id=collection_id,
                    asset_id=asset_id,
                )
            )
    
    await db.commit()
    return {"message": "添加成功"}


@router.delete("/{collection_id}/assets", summary="从集合移除资产")
async def remove_assets_from_collection(
    collection_id: int,
    asset_ids: List[int],
    db: AsyncSession = Depends(get_db),
):
    """从集合移除资产"""
    collection = await db.get(Collection, collection_id)
    if not collection:
        raise HTTPException(status_code=404, detail="集合不存在")
    
    await db.execute(
        delete(collection_assets).where(
            collection_assets.c.collection_id == collection_id,
            collection_assets.c.asset_id.in_(asset_ids),
        )
    )
    await db.commit()
    
    return {"message": "移除成功"}
