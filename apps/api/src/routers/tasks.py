"""
后台任务相关 API 路由
"""
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from src.models import get_db, Task, TaskType, TaskStatus, Asset, Album, Collection, Share, SystemConfig
from src.schemas import TaskResponse, TaskListResponse, TaskStatusResponse, TriggerScanRequest, SystemStatsResponse

router = APIRouter(prefix="/tasks", tags=["后台任务"])


@router.get("/status", response_model=TaskStatusResponse, summary="获取任务状态")
async def get_task_status(
    db: AsyncSession = Depends(get_db),
):
    """获取后台任务状态概览"""
    # 获取上次扫描时间
    last_scan_result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == "last_album_scan")
    )
    last_scan_config = last_scan_result.scalar_one_or_none()
    last_scan_time = None
    if last_scan_config:
        try:
            last_scan_time = datetime.fromisoformat(last_scan_config.value)
        except ValueError:
            pass
    
    # 统计任务数量
    pending_result = await db.execute(
        select(func.count(Task.id)).where(Task.status == TaskStatus.PENDING)
    )
    pending_tasks = pending_result.scalar()
    
    running_result = await db.execute(
        select(func.count(Task.id)).where(Task.status == TaskStatus.RUNNING)
    )
    running_tasks = running_result.scalar()
    
    failed_result = await db.execute(
        select(func.count(Task.id)).where(Task.status == TaskStatus.FAILED)
    )
    failed_tasks = failed_result.scalar()
    
    # 获取最近任务
    recent_result = await db.execute(
        select(Task).order_by(Task.created_at.desc()).limit(10)
    )
    recent_tasks = recent_result.scalars().all()
    
    return TaskStatusResponse(
        last_scan_time=last_scan_time,
        queue_length=pending_tasks + running_tasks,
        pending_tasks=pending_tasks,
        running_tasks=running_tasks,
        failed_tasks=failed_tasks,
        recent_tasks=[TaskResponse.model_validate(t) for t in recent_tasks],
    )


@router.post("/trigger", response_model=TaskResponse, summary="触发后台任务")
async def trigger_task(
    data: TriggerScanRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """手动触发后台任务"""
    task_type_map = {
        "album_suggestion": TaskType.GENERATE_ALBUM,
        "reindex": TaskType.REINDEX_VECTORS,
    }
    
    task_type = task_type_map.get(data.scan_type)
    if not task_type:
        raise HTTPException(status_code=400, detail="不支持的任务类型")
    
    # 创建任务
    task = Task(
        task_type=task_type,
        status=TaskStatus.PENDING,
        # params={"triggered_by": "manual"},
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    
    # 后台执行
    background_tasks.add_task(execute_task_background, task.id)
    
    return TaskResponse.model_validate(task)


async def execute_task_background(task_id: int):
    """后台执行任务"""
    from src.models.database import async_session_maker
    
    async with async_session_maker() as db:
        task = await db.get(Task, task_id)
        if not task:
            return
        
        try:
            task.status = TaskStatus.RUNNING
            task.started_at = datetime.utcnow()
            await db.commit()
            
            if task.task_type == TaskType.GENERATE_ALBUM:
                await generate_album_suggestions(db, task)
            elif task.task_type == TaskType.REINDEX_VECTORS:
                await reindex_vectors(db, task)
            
            task.status = TaskStatus.COMPLETED
            task.completed_at = datetime.utcnow()
            task.progress = 100
            await db.commit()
            
        except Exception as e:
            task.status = TaskStatus.FAILED
            task.error_message = str(e)
            task.completed_at = datetime.utcnow()
            await db.commit()


async def generate_album_suggestions(db: AsyncSession, task: Task):
    """生成相册建议"""
    from src.models import Asset, AssetStatus, Album, AlbumType, AlbumStatus, album_assets
    from src.services import gemini_service
    from sqlalchemy import insert
    
    # 获取最近 30 天的资产
    cutoff_date = datetime.utcnow() - timedelta(days=30)
    from src.utils.security import VisibilityHelper
    result = await db.execute(
        select(Asset).where(
            Asset.status == AssetStatus.READY,
            Asset.created_at >= cutoff_date,
            VisibilityHelper.active_assets()
        ).order_by(Asset.created_at.desc()).limit(100)
    )
    assets = result.scalars().all()
    
    if len(assets) < 3:
        task.result = {"message": "资产数量不足，无法生成建议"}
        return
    
    # 获取已有相册名称
    albums_result = await db.execute(
        select(Album.name).where(Album.status == AlbumStatus.ACCEPTED)
    )
    existing_albums = [r[0] for r in albums_result.all()]
    
    # 准备资产信息
    assets_info = [
        {
            "id": a.id,
            "title": a.title,
            "description": a.description,
            "tags": a.tags,
            "created_at": a.created_at.isoformat(),
            "location": a.location,
        }
        for a in assets
    ]
    
    # 调用 Gemini 生成建议
    suggestions = await gemini_service.suggest_albums(assets_info, existing_albums)
    
    # 创建建议相册
    created_count = 0
    for suggestion in suggestions:
        if len(suggestion.get("asset_ids", [])) < 3:
            continue
        
        album = Album(
            name=suggestion["name"],
            description=suggestion.get("description"),
            cover_asset_id=suggestion.get("cover_asset_id"),
            album_type=AlbumType.SUGGESTED,
            status=AlbumStatus.PENDING,
            suggestion_reason=suggestion.get("reason"),
            suggestion_score=suggestion.get("confidence", 0.5),
        )
        db.add(album)
        await db.commit()
        await db.refresh(album)
        
        # 添加资产
        for asset_id in suggestion["asset_ids"]:
            await db.execute(
                insert(album_assets).values(
                    album_id=album.id,
                    asset_id=asset_id,
                )
            )
        await db.commit()
        created_count += 1
    
    # 更新上次扫描时间
    config = await db.execute(
        select(SystemConfig).where(SystemConfig.key == "last_album_scan")
    )
    config_record = config.scalar_one_or_none()
    if config_record:
        config_record.value = datetime.utcnow().isoformat()
    else:
        db.add(SystemConfig(
            key="last_album_scan",
            value=datetime.utcnow().isoformat(),
            description="上次相册建议扫描时间",
        ))
    await db.commit()
    
    task.result = {"created_albums": created_count}


async def reindex_vectors(db: AsyncSession, task: Task):
    """重建向量索引"""
    from src.models import Asset, AssetStatus
    from src.services import gemini_service, vector_service
    
    # 获取所有就绪资产
    from src.utils.security import VisibilityHelper
    result = await db.execute(
        select(Asset).where(Asset.status == AssetStatus.READY, VisibilityHelper.active_assets())
    )
    assets = result.scalars().all()
    
    task.total_items = len(assets)
    await db.commit()
    
    for i, asset in enumerate(assets):
        # 生成向量
        text_for_embedding = " ".join([
            asset.title or "",
            asset.description or "",
            " ".join(asset.tags or []),
            asset.ocr_text or "",
            asset.original_filename,
        ])
        
        if text_for_embedding.strip():
            vector = await gemini_service.generate_embedding(text_for_embedding)
            
            vector_id = await vector_service.upsert_vector(
                asset_id=asset.id,
                vector=vector,
                payload={
                    "title": asset.title,
                    "tags": asset.tags,
                    "asset_type": asset.asset_type.value,
                    "folder_id": asset.folder_id,
                },
            )
            asset.vector_id = vector_id
        
        # task.processed_items = i + 1
        task.progress = int((i + 1) / len(assets) * 100)
        await db.commit()
    
    task.result = {"reindexed_assets": len(assets)}


@router.get("/stats", response_model=SystemStatsResponse, summary="获取系统统计")
async def get_system_stats(
    db: AsyncSession = Depends(get_db),
):
    """获取系统统计信息"""
    from src.models import AssetType
    
    from src.utils.security import VisibilityHelper
    total_assets_result = await db.execute(select(func.count(Asset.id)).where(VisibilityHelper.active_assets()))
    total_assets = total_assets_result.scalar()
    
    # 相册总数
    total_albums_result = await db.execute(select(func.count(Album.id)))
    total_albums = total_albums_result.scalar()
    
    # 集合总数
    total_collections_result = await db.execute(select(func.count(Collection.id)))
    total_collections = total_collections_result.scalar()
    
    # 分享总数
    total_shares_result = await db.execute(select(func.count(Share.id)))
    total_shares = total_shares_result.scalar()
    
    # 待审核建议
    from src.models import AlbumStatus
    pending_result = await db.execute(
        select(func.count(Album.id)).where(Album.status == AlbumStatus.PENDING)
    )
    pending_suggestions = pending_result.scalar()
    
    # 存储使用量
    storage_result = await db.execute(select(func.sum(Asset.file_size)))
    storage_used = storage_result.scalar() or 0
    
    # 按类型统计
    asset_by_type = {}
    for asset_type in AssetType:
        type_result = await db.execute(
            select(func.count(Asset.id)).where(
                Asset.asset_type == asset_type,
                VisibilityHelper.active_assets()
            )
        )
        asset_by_type[asset_type.value] = type_result.scalar()
    
    # 最近 7 天上传
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_result = await db.execute(
        select(func.count(Asset.id)).where(
            Asset.created_at >= week_ago,
            VisibilityHelper.active_assets()
        )
    )
    recent_uploads = recent_result.scalar()
    
    return SystemStatsResponse(
        total_assets=total_assets,
        total_albums=total_albums,
        total_collections=total_collections,
        total_shares=total_shares,
        pending_suggestions=pending_suggestions,
        storage_used=storage_used,
        asset_by_type=asset_by_type,
        recent_uploads=recent_uploads,
    )


@router.get("/{task_id}", response_model=TaskResponse, summary="获取任务详情")
async def get_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取任务详情"""
    task = await db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    return TaskResponse.model_validate(task)


@router.post("/{task_id}/retry", response_model=TaskResponse, summary="重试失败任务")
async def retry_task(
    task_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """重试失败的任务"""
    task = await db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    if task.status != TaskStatus.FAILED:
        raise HTTPException(status_code=400, detail="只能重试失败的任务")
    
    # 重置状态
    task.status = TaskStatus.PENDING
    task.progress = 0
    # task.processed_items = 0
    task.error_message = None
    task.started_at = None
    task.completed_at = None
    await db.commit()
    await db.refresh(task)
    
    # 后台执行
    background_tasks.add_task(execute_task_background, task.id)
    
    return TaskResponse.model_validate(task)
