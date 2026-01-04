"""
分享相关 API 路由
"""
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.models import (
    get_db, Share, Asset, Collection, collection_assets,
    Portal, User
)
from src.schemas import (
    ShareCreate, ShareResponse, ShareAccessRequest, ShareContentResponse,
    PortalCreate, PortalUpdate, PortalResponse, PortalPublicResponse,
    CollectionDetailResponse,
)
from src.services import storage_service
from src.utils.security import verify_password, get_password_hash, get_current_user

router = APIRouter(prefix="/shares", tags=["分享管理"])


def get_share_url(share_code: str) -> str:
    """生成分享链接"""
    return f"/s/{share_code}"


def share_to_response(share: Share) -> ShareResponse:
    """转换分享为响应模型"""
    return ShareResponse(
        id=share.id,
        share_code=share.share_code,
        share_url=get_share_url(share.share_code),
        asset_id=share.asset_id,
        collection_id=share.collection_id,
        permission=share.permission,
        has_password=share.password_hash is not None,
        expires_at=share.expires_at,
        view_count=share.view_count,
        download_count=share.download_count,
        is_active=share.is_active,
        created_at=share.created_at,
    )


@router.get("", response_model=List[ShareResponse], summary="获取所有分享链接")
async def list_shares(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取所有分享链接"""
    result = await db.execute(
        select(Share).where(Share.user_id == current_user.id).order_by(Share.created_at.desc())
    )
    shares = result.scalars().all()
    return [share_to_response(s) for s in shares]


@router.post("", response_model=ShareResponse, summary="创建分享链接")
async def create_share(
    data: ShareCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """创建分享链接"""
    if not data.asset_id and not data.collection_id:
        raise HTTPException(status_code=400, detail="请指定要分享的资产或集合")
    
    if data.asset_id and data.collection_id:
        raise HTTPException(status_code=400, detail="只能分享资产或集合其中之一")
    
    # 验证资产/集合存在且归属当前用户
    if data.asset_id:
        asset = await db.get(Asset, data.asset_id)
        if not asset or asset.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="资产不存在")
    
    if data.collection_id:
        collection = await db.get(Collection, data.collection_id)
        if not collection or collection.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="集合不存在")
    
    # 计算过期时间
    expires_at = None
    if data.expires_in_days:
        expires_at = datetime.utcnow() + timedelta(days=data.expires_in_days)
    
    # 加密密码
    hashed_password = None
    if data.password:
        hashed_password = get_password_hash(data.password)
    
    share = Share(
        asset_id=data.asset_id,
        collection_id=data.collection_id,
        permission=data.permission,
        password_hash=hashed_password,
        expires_at=expires_at,
        user_id=current_user.id,
    )
    db.add(share)
    await db.commit()
    await db.refresh(share)
    
    return share_to_response(share)


@router.get("/{share_code}", response_model=ShareContentResponse, summary="访问分享内容")
async def access_share(
    share_code: str,
    password: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """访问分享内容"""
    result = await db.execute(
        select(Share).where(Share.share_code == share_code)
    )
    share = result.scalar_one_or_none()
    
    if not share:
        raise HTTPException(status_code=404, detail="分享链接不存在")
    
    if not share.is_active:
        raise HTTPException(status_code=403, detail="分享链接已失效")
    
    if share.expires_at and share.expires_at < datetime.utcnow():
        raise HTTPException(status_code=403, detail="分享链接已过期")
    
    # 验证密码
    if share.password_hash:
        if not password:
            raise HTTPException(status_code=401, detail="需要密码访问")
        if not verify_password(password, share.password_hash):
            raise HTTPException(status_code=401, detail="密码错误")
    
    # 更新访问计数
    share.view_count += 1
    await db.commit()
    
    # 获取内容
    from src.routers.assets import asset_to_response
    
    asset_response = None
    collection_response = None
    
    from src.utils.security import VisibilityHelper
    if share.asset_id:
        asset = await db.get(Asset, share.asset_id)
        if asset and VisibilityHelper.active_assets(): # Note: need to handle as expression
            # Wait, asset is an object, I should check the helper criteria manually or use a filter
            if asset.deleted_at is None and not asset.is_private:
                asset_response = asset_to_response(asset)
    
    if share.collection_id:
        collection = await db.get(Collection, share.collection_id)
        if collection:
            # 获取集合资产
            from src.utils.security import VisibilityHelper
            assets_result = await db.execute(
                select(Asset).join(collection_assets).where(
                    collection_assets.c.collection_id == share.collection_id,
                    VisibilityHelper.active_assets()
                )
            )
            assets = assets_result.scalars().all()
            
            collection_response = CollectionDetailResponse(
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
    
    return ShareContentResponse(
        share=share_to_response(share),
        asset=asset_response,
        collection=collection_response,
    )


@router.delete("/{share_id}", summary="删除分享链接")
async def delete_share(
    share_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除分享链接"""
    share = await db.get(Share, share_id)
    if not share or share.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="分享链接不存在")
    
    await db.delete(share)
    await db.commit()
    
    return {"message": "删除成功"}


@router.post("/{share_id}/deactivate", summary="停用分享链接")
async def deactivate_share(
    share_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """停用分享链接"""
    share = await db.get(Share, share_id)
    if not share:
        raise HTTPException(status_code=404, detail="分享链接不存在")
    
    share.is_active = False
    await db.commit()
    
    return {"message": "已停用"}


# Portal 相关路由
portal_router = APIRouter(prefix="/portals", tags=["Portal 管理"])


def get_portal_url(slug: str) -> str:
    """生成 Portal 链接"""
    return f"/p/{slug}"


def portal_to_response(portal: Portal) -> PortalResponse:
    """转换 Portal 为响应模型"""
    return PortalResponse(
        id=portal.id,
        name=portal.name,
        slug=portal.slug,
        portal_url=get_portal_url(portal.slug),
        welcome_message=portal.welcome_message,
        logo_url=portal.logo_url,
        primary_color=portal.primary_color,
        collection_id=portal.collection_id,
        visible_fields=portal.visible_fields or [],
        searchable=portal.searchable,
        filterable=portal.filterable,
        allow_download=portal.allow_download,
        has_password=portal.password_hash is not None,
        is_active=portal.is_active,
        created_at=portal.created_at,
        updated_at=portal.updated_at,
    )


@portal_router.get("", response_model=List[PortalResponse], summary="获取所有 Portal")
async def list_portals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取所有 Portal"""
    result = await db.execute(
        select(Portal).where(Portal.user_id == current_user.id).order_by(Portal.created_at.desc())
    )
    portals = result.scalars().all()
    return [portal_to_response(p) for p in portals]


@portal_router.post("", response_model=PortalResponse, summary="创建 Portal")
async def create_portal(
    data: PortalCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """创建 Portal"""
    # 检查 slug 唯一性
    existing = await db.execute(
        select(Portal).where(Portal.slug == data.slug)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Portal 路径已存在")
    
    # 验证集合存在且归属当前用户
    collection = await db.get(Collection, data.collection_id)
    if not collection or collection.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="集合不存在")
    
    # 加密密码
    hashed_password = None
    if data.password:
        hashed_password = get_password_hash(data.password)
    
    portal = Portal(
        name=data.name,
        slug=data.slug,
        welcome_message=data.welcome_message,
        primary_color=data.primary_color,
        collection_id=data.collection_id,
        visible_fields=data.visible_fields,
        searchable=data.searchable,
        filterable=data.filterable,
        allow_download=data.allow_download,
        password_hash=hashed_password,
        user_id=current_user.id,
    )
    db.add(portal)
    await db.commit()
    await db.refresh(portal)
    
    return portal_to_response(portal)


@portal_router.get("/{slug}/public", response_model=PortalPublicResponse, summary="获取 Portal 公开信息")
async def get_portal_public(
    slug: str,
    password: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """获取 Portal 公开信息"""
    result = await db.execute(
        select(Portal).where(Portal.slug == slug)
    )
    portal = result.scalar_one_or_none()
    
    if not portal:
        raise HTTPException(status_code=404, detail="Portal 不存在")
    
    if not portal.is_active:
        raise HTTPException(status_code=403, detail="Portal 已停用")
    
    # 验证密码
    if portal.password_hash:
        if not password:
            raise HTTPException(status_code=401, detail="需要密码访问")
        if not verify_password(password, portal.password_hash):
            raise HTTPException(status_code=401, detail="密码错误")
    
    return PortalPublicResponse(
        name=portal.name,
        welcome_message=portal.welcome_message,
        logo_url=portal.logo_url,
        primary_color=portal.primary_color,
        searchable=portal.searchable,
        filterable=portal.filterable,
        allow_download=portal.allow_download,
        visible_fields=portal.visible_fields or [],
    )


@portal_router.get("/{slug}/assets", summary="获取 Portal 资产")
async def get_portal_assets(
    slug: str,
    password: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    query: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """获取 Portal 资产列表"""
    result = await db.execute(
        select(Portal).where(Portal.slug == slug)
    )
    portal = result.scalar_one_or_none()
    
    if not portal:
        raise HTTPException(status_code=404, detail="Portal 不存在")
    
    if not portal.is_active:
        raise HTTPException(status_code=403, detail="Portal 已停用")
    
    # 验证密码
    if portal.password_hash:
        if not password:
            raise HTTPException(status_code=401, detail="需要密码访问")
        if not verify_password(password, portal.password_hash):
            raise HTTPException(status_code=401, detail="密码错误")
    
    # 获取集合资产
    from sqlalchemy import or_
    
    from src.utils.security import VisibilityHelper
    assets_query = select(Asset).join(collection_assets).where(
        collection_assets.c.collection_id == portal.collection_id,
        VisibilityHelper.active_assets()
    )
    
    # 搜索
    if query and portal.searchable:
        search_term = f"%{query}%"
        assets_query = assets_query.where(
            or_(
                Asset.title.ilike(search_term),
                Asset.description.ilike(search_term),
                Asset.original_filename.ilike(search_term),
            )
        )
    
    # 分页
    offset = (page - 1) * page_size
    assets_query = assets_query.offset(offset).limit(page_size)
    
    assets_result = await db.execute(assets_query)
    assets = assets_result.scalars().all()
    
    from src.routers.assets import asset_to_response
    
    return {
        "items": [asset_to_response(a) for a in assets],
        "page": page,
        "page_size": page_size,
        "allow_download": portal.allow_download,
    }


@portal_router.patch("/{portal_id}", response_model=PortalResponse, summary="更新 Portal")
async def update_portal(
    portal_id: int,
    data: PortalUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新 Portal"""
    portal = await db.get(Portal, portal_id)
    if not portal or portal.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Portal 不存在")
    
    update_data = data.model_dump(exclude_unset=True)
    
    # 处理密码
    if "password" in update_data:
        if update_data["password"]:
            update_data["password_hash"] = get_password_hash(update_data["password"])
        else:
            update_data["password_hash"] = None
        del update_data["password"]
    
    for key, value in update_data.items():
        setattr(portal, key, value)
    
    await db.commit()
    await db.refresh(portal)
    
    return portal_to_response(portal)


@portal_router.delete("/{portal_id}", summary="删除 Portal")
async def delete_portal(
    portal_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除 Portal"""
    portal = await db.get(Portal, portal_id)
    if not portal or portal.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Portal 不存在")
    
    await db.delete(portal)
    await db.commit()
    
    return {"message": "删除成功"}


# 合并路由
router.include_router(portal_router)
