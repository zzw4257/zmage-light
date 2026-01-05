"""
资产相关 API 路由
"""
from typing import List, Optional
import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete, insert

from datetime import datetime
from src.models import get_db, Asset, AssetVersion, AssetStatus, AssetType, Folder, CustomField
from src.services.storage import calculate_file_hash
from src.schemas import (
    AssetResponse, AssetListResponse, AssetUpdate, AssetSearchRequest,
    SimilarAssetResponse, FolderResponse, FolderTreeResponse, FolderCreate,
    CustomFieldResponse, CustomFieldCreate, UploadResponse, BatchUploadResponse,
    AssetEdit, AssetAIEdit, AssetVersionResponse,
)
from src.services import asset_service, storage_service, album_service
from src.models.album import album_assets

from src.routers.auth import get_current_user
from src.models.user import User
router = APIRouter(prefix="/assets", tags=["资产管理"])


def asset_to_response(asset: Asset) -> AssetResponse:
    """转换资产为响应模型"""
    response = AssetResponse.model_validate(asset)
    response.url = storage_service.get_public_url(asset.file_path)
    if asset.thumbnail_path:
        response.thumbnail_url = storage_service.get_public_url(asset.thumbnail_path)
    return response


@router.post("/upload", response_model=UploadResponse, summary="上传单个资产")
async def upload_asset(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    folder_path: Optional[str] = Form(None),
    album_id: Optional[int] = Form(None),
    current_user: User = Depends(get_current_user),  # 新增认证
    db: AsyncSession = Depends(get_db),
):
    """
    上传单个资产文件
    
    - 支持 png/jpg/mp4 等格式
    - 自动检测重复文件
    - 后台自动进行 AI 分析和向量化
    """
    try:
        file_data = await file.read()
        
        asset = await asset_service.create_asset(
            db=db,
            file_data=file_data,
            filename=file.filename,
            user_id=current_user.id,  # 新增
            folder_path=folder_path,
        )
        
        if album_id:
            await album_service.add_assets_to_album(db, album_id, [asset.id])

        # 后台处理
        background_tasks.add_task(
            process_asset_background,
            asset.id,
        )
        
        return UploadResponse(
            asset_id=asset.id,
            filename=asset.original_filename,
            status="pending",
            message="上传成功，正在后台处理",
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"上传失败：{str(e)}")


@router.post("/upload/batch", response_model=BatchUploadResponse, summary="批量上传资产")
async def upload_assets_batch(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    folder_path: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    批量上传资产文件
    
    - 保留文件夹结构
    - 自动检测重复文件
    """
    results = []
    success = 0
    failed = 0
    
    for file in files:
        try:
            file_data = await file.read()
            
            # 处理文件夹路径
            actual_folder = folder_path
            if "/" in file.filename:
                # 文件名包含路径
                parts = file.filename.rsplit("/", 1)
                if folder_path:
                    actual_folder = f"{folder_path}/{parts[0]}"
                else:
                    actual_folder = parts[0]
                filename = parts[1]
            else:
                filename = file.filename
            
            asset = await asset_service.create_asset(
                db=db,
                file_data=file_data,
                filename=filename,
                user_id=current_user.id,
                folder_path=actual_folder,
            )
            
            background_tasks.add_task(process_asset_background, asset.id)
            
            results.append(UploadResponse(
                asset_id=asset.id,
                filename=asset.original_filename,
                status="pending",
                message="上传成功",
            ))
            success += 1
            
        except ValueError as e:
            results.append(UploadResponse(
                asset_id=0,
                filename=file.filename,
                status="failed",
                message=str(e),
            ))
            failed += 1
        except Exception as e:
            results.append(UploadResponse(
                asset_id=0,
                filename=file.filename,
                status="failed",
                message=f"上传失败：{str(e)}",
            ))
            failed += 1
    
    return BatchUploadResponse(
        total=len(files),
        success=success,
        failed=failed,
        results=results,
    )


async def process_asset_background(asset_id: int):
    """后台处理资产"""
    from src.models.database import async_session_maker
    
    async with async_session_maker() as db:
        try:
            await asset_service.process_asset(db, asset_id)
        except Exception as e:
            print(f"资产处理失败 {asset_id}: {e}")


@router.post("/search", response_model=AssetListResponse, summary="搜索资产")
async def search_assets(
    request: AssetSearchRequest,
    current_user: User = Depends(get_current_user),  # 新增认证
    db: AsyncSession = Depends(get_db),
):
    """
    搜索资产
    
    - 支持关键词搜索和 AI 语义搜索
    - 支持多种过滤条件
    """
    assets, total = await asset_service.search_assets(
        db, 
        request,
        current_user.id,  # 新增
    )
    
    return AssetListResponse(
        items=[asset_to_response(a) for a in assets],
        total=total,
        page=request.page,
        page_size=request.page_size,
        has_more=(request.page * request.page_size) < total,
    )


@router.get("/processing", summary="获取正在处理的资产列表")
async def list_processing_assets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户正在处理中的资产，用于显示实时进度"""
    query = select(Asset).where(
        Asset.user_id == current_user.id,
        Asset.status.in_([AssetStatus.PENDING, AssetStatus.PROCESSING]),
        Asset.deleted_at.is_(None),
    ).order_by(Asset.created_at.desc()).limit(20)
    
    result = await db.execute(query)
    assets = result.scalars().all()
    
    return [
        {
            "id": a.id,
            "filename": a.original_filename,
            "status": a.status.value,
            "processing_step": a.processing_step,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in assets
    ]


@router.get("", response_model=AssetListResponse, summary="获取资产列表")
async def list_assets(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    asset_type: Optional[AssetType] = None,
    folder_id: Optional[int] = None,
    status: Optional[AssetStatus] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取资产列表"""
    from src.utils.security import VisibilityHelper
    query = select(Asset).where(
        Asset.user_id == current_user.id,
        VisibilityHelper.active_assets()
    )
    count_query = select(func.count(Asset.id)).where(
        Asset.user_id == current_user.id,
        VisibilityHelper.active_assets()
    )
    
    if asset_type:
        query = query.where(Asset.asset_type == asset_type)
        count_query = count_query.where(Asset.asset_type == asset_type)
    
    if folder_id:
        query = query.where(Asset.folder_id == folder_id)
        count_query = count_query.where(Asset.folder_id == folder_id)
    
    if status:
        query = query.where(Asset.status == status)
        count_query = count_query.where(Asset.status == status)
    
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    offset = (page - 1) * page_size
    query = query.order_by(Asset.created_at.desc()).offset(offset).limit(page_size)
    
    result = await db.execute(query)
    assets = result.scalars().all()
    
    return AssetListResponse(
        items=[asset_to_response(a) for a in assets],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.get("/map", response_model=List[AssetResponse], summary="获取有位置信息的资产列表")
async def list_map_assets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取所有具有经纬度信息的资产，用于地图展示"""
    from src.utils.security import VisibilityHelper
    query = select(Asset).where(
        Asset.user_id == current_user.id,
        Asset.latitude.isnot(None),
        Asset.longitude.isnot(None),
        Asset.status == AssetStatus.READY,
        VisibilityHelper.active_assets()
    )
    result = await db.execute(query)
    assets = result.scalars().all()
    
    return [asset_to_response(a) for a in assets]


@router.get("/{asset_id}", response_model=AssetResponse, summary="获取资产详情")
async def get_asset(
    asset_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取单个资产详情"""
    asset = await db.get(Asset, asset_id)
    if not asset or asset.deleted_at is not None or asset.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="资产不存在")
    
    # 私密资产检查 (由调用者决定是否需要 Vault Token，但在这里我们简单过滤)
    if asset.is_private:
        # TODO: 这里理想情况应该校验 X-Vault-Token
        # 为了 MVP 安全，非 Vault 路径下直接拒绝访问私密资产
        raise HTTPException(status_code=403, detail="该资产已加密，请在保险库中查看")

    return asset_to_response(asset)


@router.put("/{asset_id}", response_model=AssetResponse, summary="更新资产")
async def update_asset(
    asset_id: int,
    data: AssetUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新资产信息"""
    asset = await db.get(Asset, asset_id)
    if not asset or asset.deleted_at is not None or asset.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="资产不存在")
    
    if asset.is_private:
        raise HTTPException(status_code=403, detail="私密资产不可在此直接修改")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(asset, key, value)
    
    await db.commit()
    await db.refresh(asset)
    
    return asset_to_response(asset)


@router.post("/{asset_id}/edit", response_model=AssetResponse, summary="编辑图片")
async def edit_asset(
    asset_id: int,
    data: AssetEdit,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    编辑图片（裁剪、调整色调等）
    
    - 处理后的图片将作为新版本保存
    - 自动更新缩略图和 AI 分析
    """
    from src.services.image_editor import image_editor_service
    
    asset = await db.get(Asset, asset_id)
    if not asset or asset.asset_type != AssetType.IMAGE or asset.user_id != current_user.id:
        raise HTTPException(status_code=400, detail="资产不存在或不是图片")
    
    # 构造操作参数
    ops = data.history or []
    if not ops:
        if data.crop:
            ops.append({"type": "crop", "params": data.crop})
        
        adjust_params = {}
        if data.brightness != 1.0: adjust_params["brightness"] = data.brightness
        if data.contrast != 1.0: adjust_params["contrast"] = data.contrast
        if data.saturation != 1.0: adjust_params["saturation"] = data.saturation
        if data.sharpness != 1.0: adjust_params["sharpness"] = data.sharpness
        
        if adjust_params:
            ops.append({"type": "adjust", "params": adjust_params})

    # 逻辑分叉：另存为新资产 vs 版本控制
    if data.save_as_new:
        # === 模式 A: 另存为新资产 (Save as Copy) ===
        image_data = await storage_service.download_file(asset.file_path)
        edited_data = image_editor_service.process_history(image_data, ops)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        new_filename = f"edited_{timestamp}_{asset.original_filename}"
        new_path = f"assets/{new_filename}"
        
        await storage_service.upload_bytes(edited_data, new_path, "image/jpeg")
        
        # 缩略图
        thumbnail_data = await storage_service.generate_thumbnail(edited_data)
        thumbnail_path = f"thumbnails/{new_filename}"
        await storage_service.upload_bytes(thumbnail_data, thumbnail_path, "image/jpeg")
        
        # 获取图片尺寸
        from PIL import Image
        img = Image.open(io.BytesIO(edited_data))
        new_width, new_height = img.size
        
        new_asset = Asset(
            filename=new_filename,
            original_filename=asset.original_filename,
            file_path=new_path,
            thumbnail_path=thumbnail_path,
            file_size=len(edited_data),
            mime_type="image/jpeg",
            asset_type=AssetType.IMAGE,
            file_hash=calculate_file_hash(edited_data),
            width=new_width,
            height=new_height,
            title=f"{asset.title or asset.filename} (副本)",
            folder_id=asset.folder_id,
            user_id=current_user.id,
            is_private=asset.is_private,
            tags=asset.tags.copy() if asset.tags else [],
            camera_model=asset.camera_model,
            location=asset.location,
            latitude=asset.latitude,
            longitude=asset.longitude,
            taken_at=asset.taken_at.replace(tzinfo=None) if asset.taken_at else None,
            exif_data=asset.exif_data.copy() if asset.exif_data else None,
            status=AssetStatus.READY, # 设置为 READY 以便立即看到，后台再补充 AI 分析
        )
        db.add(new_asset)
        await db.commit()
        await db.refresh(new_asset)
        
        # 将副本加入同样的相册
        stmt = select(album_assets.c.album_id).where(album_assets.c.asset_id == asset.id)
        result = await db.execute(stmt)
        album_ids = result.scalars().all()
        for aid in album_ids:
            await db.execute(insert(album_assets).values(album_id=aid, asset_id=new_asset.id))
        await db.commit()
        
        background_tasks.add_task(process_asset_background, new_asset.id)
        return asset_to_response(new_asset)
    
    else:
        # === 模式 B: 版本控制 (Professional Write-back) ===
        # 1. 确保原始版本 (V1) 存在
        stmt = select(AssetVersion).where(AssetVersion.asset_id == asset.id).order_by(AssetVersion.version_number)
        result = await db.execute(stmt)
        versions = result.scalars().all()
        
        if not versions:
            # 首次编辑，将当前文件归档为 V1 (Original)
            v1 = AssetVersion(
                asset_id=asset.id,
                version_number=1,
                file_path=asset.file_path,
                file_size=asset.file_size,
                file_hash=asset.file_hash,
                parameters=None, # V1 是原图
                note="Original"
            )
            db.add(v1)
            await db.commit()
            versions = [v1]
            
        # 2. 获取原图数据 (始终基于 V1 编辑以实现无损)
        original_version = versions[0]
        image_data = await storage_service.download_file(original_version.file_path)
        
        # 3. 处理图片
        edited_data = image_editor_service.process_history(image_data, ops)
        
        # 4. 保存新版本文件
        next_ver = versions[-1].version_number + 1
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        ext = asset.original_filename.split('.')[-1] if '.' in asset.original_filename else "jpg"
        new_filename = f"{asset.id}_v{next_ver}_{timestamp}.{ext}"
        new_path = f"assets/{new_filename}"
        
        await storage_service.upload_bytes(edited_data, new_path, "image/jpeg")
        
        # 5. 更新 Asset 指向新文件
        asset.file_path = new_path
        asset.file_size = len(edited_data)
        asset.file_hash = calculate_file_hash(edited_data)
        # 重新生成缩略图
        thumbnail_data = await storage_service.generate_thumbnail(edited_data)
        thumbnail_path = f"thumbnails/{new_filename}"
        await storage_service.upload_bytes(thumbnail_data, thumbnail_path, "image/jpeg")
        asset.thumbnail_path = thumbnail_path
        
        # 更新尺寸
        from PIL import Image
        img = Image.open(io.BytesIO(edited_data))
        asset.width, asset.height = img.size
        
        # 6. 创建新的 Version 记录 (保存编辑参数)
        new_version = AssetVersion(
            asset_id=asset.id,
            version_number=next_ver,
            file_path=new_path,
            file_size=len(edited_data),
            file_hash=asset.file_hash,
            parameters=ops, # 保存编辑参数历史
            note=f"Edited v{next_ver}"
        )
        db.add(new_version)
        
        await db.commit()
        await db.refresh(asset)
        
        # 7. 触发重新分析 (Vector, OCR etc)
        # TODO: 也许不需要全量重新分析，但向量需要更新
        background_tasks.add_task(process_asset_background, asset.id)
        
        return asset_to_response(asset)


@router.get("/{asset_id}/versions", response_model=List[AssetVersionResponse], summary="获取资产版本历史")
async def get_asset_versions(
    asset_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取资产的所有版本记录"""
    asset = await db.get(Asset, asset_id)
    if not asset or asset.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="资产不存在")
    
    stmt = select(AssetVersion).where(AssetVersion.asset_id == asset_id).order_by(AssetVersion.version_number.desc())
    result = await db.execute(stmt)
    versions = result.scalars().all()
    
    responses = []
    for v in versions:
        res = AssetVersionResponse.model_validate(v)
        res.url = storage_service.get_public_url(v.file_path)
        responses.append(res)
    
    return responses


@router.post("/{asset_id}/versions/{version_id}/restore", response_model=AssetResponse, summary="恢复到指定版本")
async def restore_asset_version(
    asset_id: int,
    version_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """将资产恢复到指定的历史版本"""
    asset = await db.get(Asset, asset_id)
    if not asset or asset.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="资产不存在")
    
    version = await db.get(AssetVersion, version_id)
    if not version or version.asset_id != asset_id:
        raise HTTPException(status_code=404, detail="版本记录不存在")
    
    # 执行恢复
    asset.file_path = version.file_path
    asset.file_size = version.file_size
    asset.file_hash = version.file_hash
    
    # 重新生成缩略图
    image_data = await storage_service.download_file(version.file_path)
    thumbnail_data = await storage_service.generate_thumbnail(image_data)
    ext = version.file_path.split('.')[-1]
    thumbnail_path = f"thumbnails/{asset.id}_restored_{version.id}.{ext}"
    await storage_service.upload_bytes(thumbnail_data, thumbnail_path, "image/jpeg")
    
    asset.thumbnail_path = thumbnail_path
    await db.commit()
    await db.refresh(asset)
    
    background_tasks.add_task(process_asset_background, asset.id)
    return asset_to_response(asset)


@router.post("/{asset_id}/ai-edit", response_model=AssetResponse, summary="AI 智能编辑")
async def ai_edit_asset(
    asset_id: int,
    data: AssetAIEdit,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    使用 AI (Gemini) 进行智能编辑
    
    - 支持风格转换、智能改图
    - 生成结果保存为新版本或新资产
    """
    from src.services.gemini_image import gemini_image_service, ImageAspectRatio, GeminiImageModel, ImageSize
    
    asset = await db.get(Asset, asset_id)
    if not asset or asset.asset_type != AssetType.IMAGE or asset.user_id != current_user.id:
        raise HTTPException(status_code=400, detail="资产不存在或不是图片")
    
    try:
        # 1. 下载底图
        image_data = await storage_service.download_file(asset.file_path)
        
        # 2. 构造 AI 提示词
        final_prompt = data.prompt or "Enhance and improve this image professionally"
        if data.style == "anime":
            final_prompt += ", in high quality anime style, vibrant colors, clean lines"
        elif data.style == "oil":
            final_prompt += ", as a professional oil painting, visible brushstrokes, classic art style"
        elif data.style == "cinema":
            final_prompt += ", cinematic lighting, 8k resolution, photorealistic, dramatic atmosphere"
        elif data.style == "sketch":
            final_prompt += ", as a detailed pencil sketch, artistic hatching"
        elif data.style == "pixel":
            final_prompt += ", in high quality pixel art style, game boy aesthetic"
            
        # 3. 调用 Gemini Image API
        # 智能推断最佳宽高比：从原图尺寸自动计算
        from src.services.gemini_image import find_closest_aspect_ratio
        
        # 如果用户明确指定了比例，则尊重用户选择；否则自动匹配
        if data.aspect_ratio and data.aspect_ratio in ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"]:
            # 用户直接传入标准比例字符串
            ar = ImageAspectRatio(data.aspect_ratio)
        elif data.aspect_ratio == "PORTRAIT":
            ar = ImageAspectRatio.RATIO_3_4
        elif data.aspect_ratio == "LANDSCAPE":
            ar = ImageAspectRatio.RATIO_16_9
        elif data.aspect_ratio == "SQUARE":
            ar = ImageAspectRatio.RATIO_1_1
        else:
            # 自动从原图尺寸推断最接近的标准比例
            ar = find_closest_aspect_ratio(asset.width or 1, asset.height or 1)
        
        # 确定尺寸
        img_size = None
        if data.image_size == "2K": img_size = ImageSize.SIZE_2K
        elif data.image_size == "4K": img_size = ImageSize.SIZE_4K

        images = await gemini_image_service.generate_image(
            prompt=final_prompt,
            model=GeminiImageModel.NANO_BANANA_PRO, # 编辑默认使用 Pro
            negative_prompt=data.negative_prompt,
            reference_images=[image_data],
            reference_mime_types=[asset.mime_type],
            aspect_ratio=ar,
            image_size=img_size
        )
        
        if not images:
            raise HTTPException(status_code=500, detail="AI 生成失败，请稍后重试")
            
        edited_data = images[0]
        
        # 4. 保存逻辑 (复用部分 edit_asset 逻辑或简单实现)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        new_filename = f"ai_{timestamp}_{asset.original_filename}"
        if not new_filename.endswith(".jpg"):
            new_filename += ".jpg"
            
        if data.save_as_new:
            new_path = f"assets/{new_filename}"
            await storage_service.upload_bytes(edited_data, new_path, "image/jpeg")
            
            thumbnail_data = await storage_service.generate_thumbnail(edited_data)
            thumbnail_path = f"thumbnails/{new_filename}"
            await storage_service.upload_bytes(thumbnail_data, thumbnail_path, "image/jpeg")
            
            # 获取图片尺寸
            from PIL import Image
            img = Image.open(io.BytesIO(edited_data))
            new_width, new_height = img.size

            new_asset = Asset(
                filename=new_filename,
                original_filename=asset.original_filename,
                file_path=new_path,
                thumbnail_path=thumbnail_path,
                file_size=len(edited_data),
                mime_type="image/jpeg",
                asset_type=AssetType.IMAGE,
                file_hash=calculate_file_hash(edited_data),
                width=new_width,
                height=new_height,
                title=f"{asset.title or asset.filename} (AI 增强)",
                folder_id=asset.folder_id,
                user_id=current_user.id,
                is_private=asset.is_private,
                tags=asset.tags.copy() if asset.tags else [],
                camera_model=asset.camera_model,
                location=asset.location,
                latitude=asset.latitude,
                longitude=asset.longitude,
                taken_at=asset.taken_at.replace(tzinfo=None) if asset.taken_at else None,
                exif_data=asset.exif_data.copy() if asset.exif_data else None,
                status=AssetStatus.READY,
            )
            db.add(new_asset)
            await db.commit()
            await db.refresh(new_asset)
            
            # 将副本加入同样的相册
            stmt = select(album_assets.c.album_id).where(album_assets.c.asset_id == asset.id)
            result = await db.execute(stmt)
            album_ids = result.scalars().all()
            for aid in album_ids:
                await db.execute(insert(album_assets).values(album_id=aid, asset_id=new_asset.id))
            await db.commit()
            
            background_tasks.add_task(process_asset_background, new_asset.id)
            return asset_to_response(new_asset)
        else:
            # 版本控制模式
            # 1. 确保原始版本存在 (如果是首次编辑)
            stmt = select(AssetVersion).where(AssetVersion.asset_id == asset.id).order_by(AssetVersion.version_number)
            result = await db.execute(stmt)
            versions = result.scalars().all()
            
            if not versions:
                v1 = AssetVersion(
                    asset_id=asset.id,
                    version_number=1,
                    file_path=asset.file_path,
                    file_size=asset.file_size,
                    file_hash=asset.file_hash,
                    note="Original"
                )
                db.add(v1)
                await db.commit()
                versions = [v1]

            new_path = f"assets/{new_filename}"
            await storage_service.upload_bytes(edited_data, new_path, "image/jpeg")
            
            # 更新当前 asset
            asset.file_path = new_path
            asset.file_size = len(edited_data)
            asset.file_hash = calculate_file_hash(edited_data)
            
            # 重新生成缩略图
            thumbnail_data = await storage_service.generate_thumbnail(edited_data)
            thumbnail_path = f"thumbnails/{new_filename}"
            await storage_service.upload_bytes(thumbnail_data, thumbnail_path, "image/jpeg")
            asset.thumbnail_path = thumbnail_path
            
            # 更新尺寸
            from PIL import Image
            img = Image.open(io.BytesIO(edited_data))
            asset.width, asset.height = img.size
            asset.mime_type = "image/jpeg"
            
            # 2. 创建新版本记录 (保存 AI 参数)
            next_ver = versions[-1].version_number + 1
            new_version = AssetVersion(
                asset_id=asset.id,
                version_number=next_ver,
                file_path=new_path,
                file_size=len(edited_data),
                file_hash=asset.file_hash,
                parameters={"ai_prompt": final_prompt, "style": data.style},
                note=f"AI Edit: {data.style or 'Enhanced'}"
            )
            db.add(new_version)
            
            await db.commit()
            await db.refresh(asset)
            background_tasks.add_task(process_asset_background, asset.id)
            return asset_to_response(asset)
            
    except Exception as e:
        print(f"AI Edit failed: {e}")
        raise HTTPException(status_code=500, detail=f"AI 处理失败: {str(e)}")


@router.delete("/{asset_id}", summary="删除资产 (移至回收站)")
async def delete_asset(
    asset_id: int,
    permanent: bool = Query(False, description="是否永久删除"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    删除资产
    - 默认：软删除（移至回收站），设置 deleted_at
    - permanent=True：永久删除（不可恢复），同时删除文件
    """
    asset = await db.get(Asset, asset_id)
    if not asset or asset.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="资产不存在")
    
    if permanent:
        # 永久删除
        await asset_service.delete_asset(db, asset)
        return {"message": "资产已永久删除"}
    else:
        # 软删除
        asset.deleted_at = datetime.utcnow()
        await db.commit()
        return {"message": "资产已移至回收站"}


@router.post("/{asset_id}/restore", summary="从回收站恢复")
async def restore_asset(
    asset_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """恢复已删除的资产"""
    # 需查出即使已删除的资产
    query = select(Asset).where(Asset.id == asset_id, Asset.user_id == current_user.id)
    result = await db.execute(query)
    asset = result.scalars().first()
    
    if not asset:
        raise HTTPException(status_code=404, detail="资产不存在")
    
    if not asset.deleted_at:
        return {"message": "资产未被删除"}
        
    asset.deleted_at = None
    await db.commit()
    return {"message": "资产已恢复"}


@router.get("/{asset_id}/similar", response_model=List[SimilarAssetResponse], summary="获取相似资产")
async def get_similar_assets(
    asset_id: int,
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取相似资产推荐"""
    asset = await db.get(Asset, asset_id)
    if not asset or asset.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="资产不存在")
    
    similar = await asset_service.get_similar_assets(db, asset_id, user_id=current_user.id, limit=limit)
    
    return [
        SimilarAssetResponse(
            asset=asset_to_response(a),
            similarity=score,
        )
        for a, score in similar
    ]


# 文件夹相关路由
@router.get("/folders/tree", response_model=List[FolderTreeResponse], summary="获取文件夹树")
async def get_folder_tree(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取文件夹树结构"""
    result = await db.execute(
        select(Folder).where(Folder.parent_id.is_(None), Folder.user_id == current_user.id).order_by(Folder.name)
    )
    root_folders = result.scalars().all()
    
    async def build_tree(folder: Folder) -> FolderTreeResponse:
        from src.utils.security import VisibilityHelper
        count_result = await db.execute(
            select(func.count(Asset.id)).where(
                Asset.folder_id == folder.id,
                VisibilityHelper.active_assets()
            )
        )
        asset_count = count_result.scalar()
        
        # 获取子文件夹
        children_result = await db.execute(
            select(Folder).where(Folder.parent_id == folder.id, Folder.user_id == current_user.id).order_by(Folder.name)
        )
        children = children_result.scalars().all()
        
        return FolderTreeResponse(
            id=folder.id,
            name=folder.name,
            parent_id=folder.parent_id,
            path=folder.path,
            asset_count=asset_count,
            created_at=folder.created_at,
            children=[await build_tree(c) for c in children],
        )
    
    return [await build_tree(f) for f in root_folders]


@router.post("/folders", response_model=FolderResponse, summary="创建文件夹")
async def create_folder(
    data: FolderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建新文件夹"""
    # 计算路径
    if data.parent_id:
        parent = await db.get(Folder, data.parent_id)
        if not parent or parent.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="父文件夹不存在")
        path = f"{parent.path}/{data.name}"
    else:
        path = data.name
    
    # 检查重复
    existing = await db.execute(
        select(Folder).where(Folder.path == path, Folder.user_id == current_user.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="文件夹已存在")
    
    folder = Folder(
        name=data.name,
        parent_id=data.parent_id,
        path=path,
        user_id=current_user.id,
    )
    db.add(folder)
    await db.commit()
    await db.refresh(folder)
    
    return FolderResponse(
        id=folder.id,
        name=folder.name,
        parent_id=folder.parent_id,
        path=folder.path,
        asset_count=0,
        created_at=folder.created_at,
    )


# 自定义字段相关路由
@router.get("/fields/list", response_model=List[CustomFieldResponse], summary="获取自定义字段列表")
async def list_custom_fields(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取所有自定义字段"""
    result = await db.execute(
        select(CustomField).where(CustomField.user_id == current_user.id).order_by(CustomField.order)
    )
    fields = result.scalars().all()
    return [CustomFieldResponse.model_validate(f) for f in fields]


@router.post("/fields", response_model=CustomFieldResponse, summary="创建自定义字段")
async def create_custom_field(
    data: CustomFieldCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建自定义字段"""
    # 检查重复
    existing = await db.execute(
        select(CustomField).where(CustomField.name == data.name, CustomField.user_id == current_user.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="字段名已存在")
    
    # 获取最大排序值
    max_order = await db.execute(
        select(func.max(CustomField.order)).where(CustomField.user_id == current_user.id)
    )
    order = (max_order.scalar() or 0) + 1
    
    field = CustomField(
        name=data.name,
        label=data.label,
        field_type=data.field_type,
        options=data.options,
        required=data.required,
        order=order,
        user_id=current_user.id,
    )
    db.add(field)
    await db.commit()
    await db.refresh(field)
    
    return CustomFieldResponse.model_validate(field)
