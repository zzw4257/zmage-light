"""
批量资产操作路由
批量删除、批量更新、批量移动等功能
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.models import get_db, Asset, User
from src.schemas.batch import (
    BatchDeleteRequest,
    BatchUpdateRequest,
    BatchMoveRequest,
    BatchOperationResult,
)
from src.routers.auth import get_current_user
from src.services.storage import storage_service
from src.services.vector import vector_service


router = APIRouter(prefix="/batch", tags=["批量操作"])


@router.post("/delete", response_model=BatchOperationResult, summary="批量删除资产")
async def batch_delete_assets(
    request: BatchDeleteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    批量删除资产
    
    - 只能删除属于当前用户的资产
    - 执行软删除（标记 deleted_at）
    """
    # 查询当前用户拥有的资产
    result = await db.execute(
        select(Asset).where(
            Asset.id.in_(request.asset_ids),
            Asset.user_id == current_user.id,
            Asset.deleted_at.is_(None)
        )
    )
    assets = result.scalars().all()
    
    success_count = 0
    failed_ids = []
    
    from datetime import datetime
    for asset in assets:
        try:
            # 软删除
            asset.deleted_at = datetime.utcnow()
            success_count += 1
        except Exception as e:
            print(f"删除资产 {asset.id} 失败: {e}")
            failed_ids.append(asset.id)
    
    await db.commit()
    
    # 找出不属于用户的ID
    found_ids = {a.id for a in assets}
    not_found_ids = set(request.asset_ids) - found_ids
    failed_ids.extend(list(not_found_ids))
    
    return BatchOperationResult(
        total=len(request.asset_ids),
        success=success_count,
        failed=len(failed_ids),
        failed_ids=failed_ids,
        message=f"成功删除 {success_count} 个资产"
    )


@router.post("/update", response_model=BatchOperationResult, summary="批量更新资产")
async def batch_update_assets(
    request: BatchUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    批量更新资产元数据
    
    - 只能更新属于当前用户的资产
    - 支持批量修改标题、描述、标签、文件夹等
    """
    # 查询当前用户拥有的资产
    result = await db.execute(
        select(Asset).where(
            Asset.id.in_(request.asset_ids),
            Asset.user_id == current_user.id,
            Asset.deleted_at.is_(None)
        )
    )
    assets = result.scalars().all()
    
    success_count = 0
    failed_ids = []
    
    for asset in assets:
        try:
            # 更新字段
            if request.title is not None:
                asset.title = request.title
            if request.description is not None:
                asset.description = request.description
            if request.folder_id is not None:
                # 校验文件夹所有权
                folder = await db.get(Folder, request.folder_id)
                if folder and folder.user_id == current_user.id:
                    asset.folder_id = request.folder_id
                elif request.folder_id is None:
                    asset.folder_id = None
            if request.custom_fields is not None:
                asset.custom_fields.update(request.custom_fields)
            
            # 标签处理
            if request.tags is not None:
                # 完全替换
                asset.tags = request.tags
            else:
                # 追加或移除
                current_tags = set(asset.tags or [])
                if request.add_tags:
                    current_tags.update(request.add_tags)
                if request.remove_tags:
                    current_tags.difference_update(request.remove_tags)
                asset.tags = list(current_tags)
            
            success_count += 1
        except Exception as e:
            print(f"更新资产 {asset.id} 失败: {e}")
            failed_ids.append(asset.id)
    
    await db.commit()
    
    # 找出不属于用户的ID
    found_ids = {a.id for a in assets}
    not_found_ids = set(request.asset_ids) - found_ids
    failed_ids.extend(list(not_found_ids))
    
    return BatchOperationResult(
        total=len(request.asset_ids),
        success=success_count,
        failed=len(failed_ids),
        failed_ids=failed_ids,
        message=f"成功更新 {success_count} 个资产"
    )


@router.post("/move", response_model=BatchOperationResult, summary="批量移动资产")
async def batch_move_assets(
    request: BatchMoveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    批量移动资产到指定文件夹
    
    - 只能移动属于当前用户的资产
    - folder_id 为 null 时移动到根目录
    """
    # 查询当前用户拥有的资产
    result = await db.execute(
        select(Asset).where(
            Asset.id.in_(request.asset_ids),
            Asset.user_id == current_user.id,
            Asset.deleted_at.is_(None)
        )
    )
    assets = result.scalars().all()
    
    success_count = 0
    failed_ids = []
    
    for asset in assets:
        try:
            if request.folder_id:
                # 校验文件夹所有权
                folder = await db.get(Folder, request.folder_id)
                if folder and folder.user_id == current_user.id:
                    asset.folder_id = request.folder_id
                else:
                    failed_ids.append(asset.id)
                    continue
            else:
                asset.folder_id = None
            success_count += 1
        except Exception as e:
            print(f"移动资产 {asset.id} 失败: {e}")
            failed_ids.append(asset.id)
    
    await db.commit()
    
    # 找出不属于用户的ID
    found_ids = {a.id for a in assets}
    not_found_ids = set(request.asset_ids) - found_ids
    failed_ids.extend(list(not_found_ids))
    
    target = f"文件夹 {request.folder_id}" if request.folder_id else "根目录"
    
    return BatchOperationResult(
        total=len(request.asset_ids),
        success=success_count,
        failed=len(failed_ids),
        failed_ids=failed_ids,
        message=f"成功将 {success_count} 个资产移动到{target}"
    )


@router.post("/restore", response_model=BatchOperationResult, summary="批量恢复资产")
async def batch_restore_assets(
    request: BatchDeleteRequest,  # 复用相同的请求结构
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    批量恢复已删除的资产
    
    - 只能恢复属于当前用户的资产
    """
    # 查询当前用户已删除的资产
    result = await db.execute(
        select(Asset).where(
            Asset.id.in_(request.asset_ids),
            Asset.user_id == current_user.id,
            Asset.deleted_at.is_not(None)
        )
    )
    assets = result.scalars().all()
    
    success_count = 0
    failed_ids = []
    
    for asset in assets:
        try:
            asset.deleted_at = None
            success_count += 1
        except Exception as e:
            print(f"恢复资产 {asset.id} 失败: {e}")
            failed_ids.append(asset.id)
    
    await db.commit()
    
    found_ids = {a.id for a in assets}
    not_found_ids = set(request.asset_ids) - found_ids
    failed_ids.extend(list(not_found_ids))
    
    return BatchOperationResult(
        total=len(request.asset_ids),
        success=success_count,
        failed=len(failed_ids),
        failed_ids=failed_ids,
        message=f"成功恢复 {success_count} 个资产"
    )
