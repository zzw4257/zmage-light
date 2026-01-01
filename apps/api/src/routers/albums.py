"""
相册相关 API 路由
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, insert, delete

from src.models import get_db, Album, Asset, AlbumType, AlbumStatus, album_assets
from src.schemas import (
    AlbumCreate, AlbumUpdate, AlbumResponse, AlbumDetailResponse, SuggestedAlbumResponse,
)
from src.services import storage_service

router = APIRouter(prefix="/albums", tags=["相册管理"])


def album_to_response(album: Album, asset_count: int = 0) -> AlbumResponse:
    """转换相册为响应模型"""
    cover_url = None
    if album.cover_asset and album.cover_asset.thumbnail_path:
        cover_url = storage_service.get_public_url(album.cover_asset.thumbnail_path)
    
    return AlbumResponse(
        id=album.id,
        name=album.name,
        description=album.description,
        cover_asset_id=album.cover_asset_id,
        cover_url=cover_url,
        album_type=album.album_type,
        status=album.status,
        suggestion_reason=album.suggestion_reason,
        suggestion_score=album.suggestion_score,
        asset_count=asset_count,
        created_at=album.created_at,
        updated_at=album.updated_at,
    )


@router.get("", response_model=List[AlbumResponse], summary="获取相册列表")
async def list_albums(
    album_type: Optional[AlbumType] = None,
    status: Optional[AlbumStatus] = None,
    db: AsyncSession = Depends(get_db),
):
    """获取相册列表"""
    query = select(Album)
    
    if album_type:
        query = query.where(Album.album_type == album_type)
    
    if status:
        query = query.where(Album.status == status)
    else:
        # 默认只显示已接受的相册
        query = query.where(Album.status == AlbumStatus.ACCEPTED)
    
    query = query.order_by(Album.updated_at.desc())
    
    result = await db.execute(query)
    albums = result.scalars().all()
    
    # 获取每个相册的资产数量
    responses = []
    for album in albums:
        count_result = await db.execute(
            select(func.count()).select_from(album_assets).where(
                album_assets.c.album_id == album.id
            )
        )
        asset_count = count_result.scalar()
        responses.append(album_to_response(album, asset_count))
    
    return responses


@router.get("/suggestions", response_model=List[SuggestedAlbumResponse], summary="获取相册建议")
async def list_album_suggestions(
    db: AsyncSession = Depends(get_db),
):
    """获取 AI 生成的相册建议"""
    query = select(Album).where(
        Album.album_type == AlbumType.SUGGESTED,
        Album.status == AlbumStatus.PENDING,
    ).order_by(Album.suggestion_score.desc())
    
    result = await db.execute(query)
    albums = result.scalars().all()
    
    responses = []
    for album in albums:
        # 获取预览资产
        preview_result = await db.execute(
            select(Asset).join(album_assets).where(
                album_assets.c.album_id == album.id,
                Asset.deleted_at.is_(None),
                Asset.is_private.is_(False)
            ).limit(6)
        )
        preview_assets = preview_result.scalars().all()
        
        count_result = await db.execute(
            select(func.count()).select_from(album_assets).where(
                album_assets.c.album_id == album.id
            )
        )
        asset_count = count_result.scalar()
        
        response = SuggestedAlbumResponse(
            id=album.id,
            name=album.name,
            description=album.description,
            cover_asset_id=album.cover_asset_id,
            cover_url=None,
            album_type=album.album_type,
            status=album.status,
            suggestion_reason=album.suggestion_reason,
            suggestion_score=album.suggestion_score,
            asset_count=asset_count,
            created_at=album.created_at,
            updated_at=album.updated_at,
            preview_assets=[],
        )
        
        # 添加预览资产
        from src.routers.assets import asset_to_response
        response.preview_assets = [asset_to_response(a) for a in preview_assets]
        
        if album.cover_asset and album.cover_asset.thumbnail_path:
            response.cover_url = storage_service.get_public_url(album.cover_asset.thumbnail_path)
        
        responses.append(response)
    
    return responses


@router.post("", response_model=AlbumResponse, summary="创建相册")
async def create_album(
    data: AlbumCreate,
    db: AsyncSession = Depends(get_db),
):
    """创建新相册"""
    album = Album(
        name=data.name,
        description=data.description,
        cover_asset_id=data.cover_asset_id,
        album_type=AlbumType.MANUAL,
        status=AlbumStatus.ACCEPTED,
    )
    db.add(album)
    await db.commit()
    await db.refresh(album)
    
    # 添加资产
    if data.asset_ids:
        for asset_id in data.asset_ids:
            await db.execute(
                insert(album_assets).values(
                    album_id=album.id,
                    asset_id=asset_id,
                )
            )
        await db.commit()
    
    return album_to_response(album, len(data.asset_ids))


@router.get("/{album_id}", response_model=AlbumDetailResponse, summary="获取相册详情")
async def get_album(
    album_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取相册详情"""
    album = await db.get(Album, album_id)
    if not album:
        raise HTTPException(status_code=404, detail="相册不存在")
    
    from src.utils.security import VisibilityHelper
    result = await db.execute(
        select(Asset).join(album_assets).where(
            album_assets.c.album_id == album_id,
            VisibilityHelper.active_assets()
        ).order_by(album_assets.c.order)
    )
    assets = result.scalars().all()
    
    from src.routers.assets import asset_to_response
    
    cover_url = None
    if album.cover_asset and album.cover_asset.thumbnail_path:
        cover_url = storage_service.get_public_url(album.cover_asset.thumbnail_path)
    
    return AlbumDetailResponse(
        id=album.id,
        name=album.name,
        description=album.description,
        cover_asset_id=album.cover_asset_id,
        cover_url=cover_url,
        album_type=album.album_type,
        status=album.status,
        suggestion_reason=album.suggestion_reason,
        suggestion_score=album.suggestion_score,
        asset_count=len(assets),
        created_at=album.created_at,
        updated_at=album.updated_at,
        assets=[asset_to_response(a) for a in assets],
    )


@router.put("/{album_id}", response_model=AlbumResponse, summary="更新相册")
async def update_album(
    album_id: int,
    data: AlbumUpdate,
    db: AsyncSession = Depends(get_db),
):
    """更新相册信息"""
    album = await db.get(Album, album_id)
    if not album:
        raise HTTPException(status_code=404, detail="相册不存在")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(album, key, value)
    
    await db.commit()
    await db.refresh(album)
    
    count_result = await db.execute(
        select(func.count()).select_from(album_assets).where(
            album_assets.c.album_id == album_id
        )
    )
    asset_count = count_result.scalar()
    
    return album_to_response(album, asset_count)


@router.delete("/{album_id}", summary="删除相册")
async def delete_album(
    album_id: int,
    db: AsyncSession = Depends(get_db),
):
    """删除相册"""
    album = await db.get(Album, album_id)
    if not album:
        raise HTTPException(status_code=404, detail="相册不存在")
    
    # 删除关联
    await db.execute(
        delete(album_assets).where(album_assets.c.album_id == album_id)
    )
    
    # 删除相册
    await db.delete(album)
    await db.commit()
    
    return {"message": "删除成功"}


@router.post("/{album_id}/assets", summary="添加资产到相册")
async def add_assets_to_album(
    album_id: int,
    asset_ids: List[int],
    db: AsyncSession = Depends(get_db),
):
    """添加资产到相册"""
    album = await db.get(Album, album_id)
    if not album:
        raise HTTPException(status_code=404, detail="相册不存在")
    
    for asset_id in asset_ids:
        # 检查是否已存在
        existing = await db.execute(
            select(album_assets).where(
                album_assets.c.album_id == album_id,
                album_assets.c.asset_id == asset_id,
            )
        )
        if not existing.first():
            await db.execute(
                insert(album_assets).values(
                    album_id=album_id,
                    asset_id=asset_id,
                )
            )
    
    await db.commit()
    return {"message": "添加成功"}


@router.delete("/{album_id}/assets", summary="从相册移除资产")
async def remove_assets_from_album(
    album_id: int,
    asset_ids: List[int],
    db: AsyncSession = Depends(get_db),
):
    """从相册移除资产"""
    album = await db.get(Album, album_id)
    if not album:
        raise HTTPException(status_code=404, detail="相册不存在")
    
    await db.execute(
        delete(album_assets).where(
            album_assets.c.album_id == album_id,
            album_assets.c.asset_id.in_(asset_ids),
        )
    )
    await db.commit()
    
    return {"message": "移除成功"}


@router.post("/{album_id}/accept", response_model=AlbumResponse, summary="接受相册建议")
async def accept_album_suggestion(
    album_id: int,
    db: AsyncSession = Depends(get_db),
):
    """接受 AI 相册建议"""
    album = await db.get(Album, album_id)
    if not album:
        raise HTTPException(status_code=404, detail="相册不存在")
    
    if album.status != AlbumStatus.PENDING:
        raise HTTPException(status_code=400, detail="该相册不是待审核状态")
    
    album.status = AlbumStatus.ACCEPTED
    await db.commit()
    await db.refresh(album)
    
    count_result = await db.execute(
        select(func.count()).select_from(album_assets).where(
            album_assets.c.album_id == album_id
        )
    )
    asset_count = count_result.scalar()
    
    return album_to_response(album, asset_count)


@router.post("/{album_id}/ignore", response_model=AlbumResponse, summary="忽略相册建议")
async def ignore_album_suggestion(
    album_id: int,
    db: AsyncSession = Depends(get_db),
):
    """忽略 AI 相册建议"""
    album = await db.get(Album, album_id)
    if not album:
        raise HTTPException(status_code=404, detail="相册不存在")
    
    if album.status != AlbumStatus.PENDING:
        raise HTTPException(status_code=400, detail="该相册不是待审核状态")
    
    album.status = AlbumStatus.IGNORED
    await db.commit()
    await db.refresh(album)
    
    count_result = await db.execute(
        select(func.count()).select_from(album_assets).where(
            album_assets.c.album_id == album_id
        )
    )
    asset_count = count_result.scalar()
    
    return album_to_response(album, asset_count)
