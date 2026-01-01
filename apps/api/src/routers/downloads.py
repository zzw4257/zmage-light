"""
下载相关 API 路由
"""
import io
import zipfile
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.models import get_db, Asset, DownloadPreset
from src.schemas import DownloadPresetCreate, DownloadPresetResponse
from src.services import storage_service

router = APIRouter(prefix="/downloads", tags=["下载管理"])


@router.get("/presets", response_model=List[DownloadPresetResponse], summary="获取下载预设列表")
async def list_download_presets(
    db: AsyncSession = Depends(get_db),
):
    """获取所有下载预设"""
    result = await db.execute(
        select(DownloadPreset).order_by(DownloadPreset.order)
    )
    presets = result.scalars().all()
    return [DownloadPresetResponse.model_validate(p) for p in presets]


@router.post("/presets", response_model=DownloadPresetResponse, summary="创建下载预设")
async def create_download_preset(
    data: DownloadPresetCreate,
    db: AsyncSession = Depends(get_db),
):
    """创建下载预设"""
    from sqlalchemy import func
    
    # 获取最大排序值
    max_order_result = await db.execute(select(func.max(DownloadPreset.order)))
    max_order = max_order_result.scalar() or 0
    
    preset = DownloadPreset(
        name=data.name,
        description=data.description,
        width=data.width,
        height=data.height,
        aspect_ratio=data.aspect_ratio,
        format=data.format,
        quality=data.quality,
        order=max_order + 1,
    )
    db.add(preset)
    await db.commit()
    await db.refresh(preset)
    
    return DownloadPresetResponse.model_validate(preset)


@router.delete("/presets/{preset_id}", summary="删除下载预设")
async def delete_download_preset(
    preset_id: int,
    db: AsyncSession = Depends(get_db),
):
    """删除下载预设"""
    preset = await db.get(DownloadPreset, preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail="预设不存在")
    
    await db.delete(preset)
    await db.commit()
    
    return {"message": "删除成功"}


@router.get("/asset/{asset_id}", summary="下载单个资产")
async def download_asset(
    asset_id: int,
    preset_id: Optional[int] = Query(None, description="下载预设 ID"),
    width: Optional[int] = Query(None, description="自定义宽度"),
    height: Optional[int] = Query(None, description="自定义高度"),
    aspect_ratio: Optional[str] = Query(None, description="裁剪比例，如 16:9"),
    format: Optional[str] = Query(None, description="输出格式：original, jpg, png, webp"),
    db: AsyncSession = Depends(get_db),
):
    """
    下载单个资产
    
    支持：
    - 原图下载
    - 按预设下载
    - 自定义尺寸/裁剪/格式
    """
    from src.utils.security import VisibilityHelper
    asset = await db.get(Asset, asset_id)
    if not asset or asset.deleted_at is not None:
        raise HTTPException(status_code=404, detail="资产不存在")
    if asset.is_private:
        # 抛出 403，后续可增加 Vault Token 校验支持
        raise HTTPException(status_code=403, detail="私密资产不可在此直接下载")
    
    # 下载原文件
    file_data = await storage_service.download_file(asset.file_path)
    
    # 应用预设
    if preset_id:
        preset = await db.get(DownloadPreset, preset_id)
        if preset:
            width = preset.width
            height = preset.height
            aspect_ratio = preset.aspect_ratio
            format = preset.format
    
    # 处理图片
    output_format = format or "original"
    content_type = asset.mime_type
    filename = asset.original_filename
    
    if asset.asset_type.value == "image" and output_format != "original":
        # 调整尺寸/裁剪
        if width or height or aspect_ratio:
            file_data = await storage_service.resize_image(
                file_data,
                width=width,
                height=height,
                aspect_ratio=aspect_ratio,
                format=output_format.upper() if output_format != "original" else "JPEG",
                quality=90,
            )
        
        # 转换格式
        if output_format in ["jpg", "jpeg"]:
            content_type = "image/jpeg"
            filename = filename.rsplit(".", 1)[0] + ".jpg"
        elif output_format == "png":
            content_type = "image/png"
            filename = filename.rsplit(".", 1)[0] + ".png"
        elif output_format == "webp":
            content_type = "image/webp"
            filename = filename.rsplit(".", 1)[0] + ".webp"
    
    return StreamingResponse(
        io.BytesIO(file_data),
        media_type=content_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(file_data)),
        },
    )


@router.post("/batch", summary="批量下载资产")
async def download_batch(
    asset_ids: List[int],
    preset_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    批量下载资产（打包为 ZIP）
    """
    if not asset_ids:
        raise HTTPException(status_code=400, detail="请选择要下载的资产")
    
    if len(asset_ids) > 100:
        raise HTTPException(status_code=400, detail="单次最多下载 100 个资产")
    
    # 获取预设
    preset = None
    if preset_id:
        preset = await db.get(DownloadPreset, preset_id)
    
    # 创建 ZIP
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for asset_id in asset_ids:
            from src.utils.security import VisibilityHelper
            asset = await db.get(Asset, asset_id)
            if not asset or asset.deleted_at is not None or asset.is_private:
                continue
            
            try:
                file_data = await storage_service.download_file(asset.file_path)
                
                # 应用预设处理图片
                filename = asset.original_filename
                if preset and asset.asset_type.value == "image":
                    if preset.width or preset.height or preset.aspect_ratio:
                        file_data = await storage_service.resize_image(
                            file_data,
                            width=preset.width,
                            height=preset.height,
                            aspect_ratio=preset.aspect_ratio,
                            format=preset.format.upper() if preset.format != "original" else "JPEG",
                            quality=preset.quality,
                        )
                    
                    if preset.format and preset.format != "original":
                        filename = filename.rsplit(".", 1)[0] + f".{preset.format}"
                
                zip_file.writestr(filename, file_data)
                
            except Exception as e:
                print(f"下载资产 {asset_id} 失败: {e}")
                continue
    
    zip_buffer.seek(0)
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": 'attachment; filename="zmage_download.zip"',
        },
    )


@router.get("/storage/{path:path}", summary="获取存储文件")
async def get_storage_file(
    path: str,
    db: AsyncSession = Depends(get_db)
):
    """
    代理访问 MinIO 存储文件 (带权限效验)
    """
    from sqlalchemy import or_
    from src.utils.security import VisibilityHelper
    
    # 效验路径权限
    # 查找该路径对应的资产，并检查可见性
    asset_result = await db.execute(
        select(Asset).where(
            or_(Asset.file_path == path, Asset.thumbnail_path == path)
        )
    )
    asset = asset_result.scalar_one_or_none()
    
    # 如果资产存在，检查其可见性
    if asset:
        if asset.deleted_at is not None or asset.is_private:
            # 此处应配合 Vault Token 逻辑。目前简单起见，拒绝非公开访问
            raise HTTPException(status_code=403, detail="无权访问受限或已删除的资产文件")
    
    try:
        file_data = await storage_service.download_file(path)
        
        # 根据路径猜测 MIME 类型
        import mimetypes
        content_type, _ = mimetypes.guess_type(path)
        if not content_type:
            content_type = "application/octet-stream"
        
        return StreamingResponse(
            io.BytesIO(file_data),
            media_type=content_type,
        )
        
    except Exception as e:
        raise HTTPException(status_code=404, detail="文件不存在")
