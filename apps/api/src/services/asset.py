"""
资产处理服务
"""
import io
import os
import hashlib
from datetime import datetime
from typing import Optional, Dict, Any, List, BinaryIO
import mimetypes

from PIL import Image
import exifread
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import selectinload

from src.models import Asset, AssetType, AssetStatus, Folder, CustomField
from src.services.storage import storage_service, calculate_file_hash
from src.services.gemini import gemini_service
from src.services.vector import vector_service
from src.schemas.asset import AssetSearchRequest


class AssetService:
    """资产服务"""
    
    @staticmethod
    def detect_asset_type(mime_type: str) -> AssetType:
        """根据 MIME 类型检测资产类型"""
        if mime_type.startswith("image/"):
            return AssetType.IMAGE
        elif mime_type.startswith("video/"):
            return AssetType.VIDEO
        elif mime_type.startswith("application/pdf") or mime_type.startswith("text/"):
            return AssetType.DOCUMENT
        return AssetType.OTHER
    
    @staticmethod
    def extract_exif(image_data: bytes) -> Dict[str, Any]:
        """提取 EXIF 信息"""
        try:
            tags = exifread.process_file(io.BytesIO(image_data), details=False)
            
            exif_data = {}
            
            # 拍摄时间
            if "EXIF DateTimeOriginal" in tags:
                date_str = str(tags["EXIF DateTimeOriginal"])
                try:
                    exif_data["taken_at"] = datetime.strptime(date_str, "%Y:%m:%d %H:%M:%S")
                except ValueError:
                    pass
            
            # 相机型号
            if "Image Model" in tags:
                exif_data["camera_model"] = str(tags["Image Model"])
            
            # GPS 信息
            if "GPS GPSLatitude" in tags and "GPS GPSLongitude" in tags:
                try:
                    lat = tags["GPS GPSLatitude"].values
                    lon = tags["GPS GPSLongitude"].values
                    lat_ref = str(tags.get("GPS GPSLatitudeRef", "N"))
                    lon_ref = str(tags.get("GPS GPSLongitudeRef", "E"))
                    
                    lat_deg = float(lat[0]) + float(lat[1]) / 60 + float(lat[2]) / 3600
                    lon_deg = float(lon[0]) + float(lon[1]) / 60 + float(lon[2]) / 3600
                    
                    if lat_ref == "S":
                        lat_deg = -lat_deg
                    if lon_ref == "W":
                        lon_deg = -lon_deg
                    
                    exif_data["location"] = f"{lat_deg:.6f}, {lon_deg:.6f}"
                    exif_data["latitude"] = lat_deg
                    exif_data["longitude"] = lon_deg
                except Exception:
                    pass
            
            # 其他信息
            for key in ["Image Make", "EXIF ISOSpeedRatings", "EXIF FocalLength", "EXIF ExposureTime"]:
                if key in tags:
                    exif_data[key.replace(" ", "_").lower()] = str(tags[key])
            
            return exif_data
            
        except Exception as e:
            print(f"EXIF 提取失败: {e}")
            return {}
    
    @staticmethod
    def get_image_dimensions(image_data: bytes) -> tuple:
        """获取图片尺寸"""
        try:
            img = Image.open(io.BytesIO(image_data))
            return img.size
        except Exception:
            return (0, 0)
    
    async def create_asset(
        self,
        db: AsyncSession,
        file_data: bytes,
        filename: str,
        folder_path: Optional[str] = None,
        custom_fields: Optional[Dict[str, Any]] = None,
    ) -> Asset:
        """
        创建资产
        
        Args:
            db: 数据库会话
            file_data: 文件数据
            filename: 文件名
            folder_path: 文件夹路径
            custom_fields: 自定义字段
            
        Returns:
            创建的资产
        """
        # 计算文件哈希
        from fastapi.concurrency import run_in_threadpool
        file_hash = await run_in_threadpool(calculate_file_hash, file_data)
        
        # 检查重复
        existing = await db.execute(
            select(Asset).where(Asset.file_hash == file_hash)
        )
        if existing.scalar_one_or_none():
            raise ValueError("文件已存在（重复上传）")
        
        # 检测文件类型
        mime_type, _ = mimetypes.guess_type(filename)
        if not mime_type:
            mime_type = "application/octet-stream"
        
        asset_type = self.detect_asset_type(mime_type)
        
        # 生成存储路径
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = f"{timestamp}_{file_hash[:8]}_{filename}"
        file_path = f"assets/{safe_filename}"
        
        # 上传原文件
        await storage_service.upload_bytes(file_data, file_path, mime_type)
        
        # 处理图片
        width, height = 0, 0
        thumbnail_path = None
        exif_data = {}
        taken_at = None
        camera_model = None
        location = None
        latitude = None
        longitude = None
        
        if asset_type == AssetType.IMAGE:
            width, height = self.get_image_dimensions(file_data)
            exif_data = self.extract_exif(file_data)
            taken_at = exif_data.pop("taken_at", None)
            camera_model = exif_data.pop("camera_model", None)
            location = exif_data.pop("location", None)
            latitude = exif_data.pop("latitude", None)
            longitude = exif_data.pop("longitude", None)
            
            # 自动生成 EXIF 标签
            exif_tags = []
            if taken_at:
                exif_tags.append(taken_at.strftime("%Y年"))
                exif_tags.append(taken_at.strftime("%m月"))
            if camera_model:
                exif_tags.append(camera_model)
            if width and height:
                exif_tags.append(f"{width}x{height}")
            if location:
                exif_tags.append("有地理信息")
            
            # 生成缩略图
            try:
                thumbnail_data = await storage_service.generate_thumbnail(file_data)
                thumbnail_path = f"thumbnails/{safe_filename}"
                await storage_service.upload_bytes(thumbnail_data, thumbnail_path, "image/jpeg")
            except Exception as e:
                print(f"缩略图生成失败: {e}")
        else:
            exif_tags = []
        
        # 处理文件夹
        folder_id = None
        if folder_path:
            folder = await self.get_or_create_folder(db, folder_path)
            folder_id = folder.id
        
        # 创建资产记录
        asset = Asset(
            filename=safe_filename,
            original_filename=filename,
            file_path=file_path,
            thumbnail_path=thumbnail_path,
            file_size=len(file_data),
            mime_type=mime_type,
            asset_type=asset_type,
            file_hash=file_hash,
            width=width,
            height=height,
            exif_data=exif_data if exif_data else None,
            taken_at=taken_at,
            camera_model=camera_model,
            location=location,
            latitude=latitude,
            longitude=longitude,
            custom_fields=custom_fields or {},
            folder_id=folder_id,
            tags=exif_tags,
            status=AssetStatus.PENDING,
        )
        
        db.add(asset)
        await db.commit()
        await db.refresh(asset)
        
        return asset
    
    async def process_asset(self, db: AsyncSession, asset_id: int):
        """
        处理资产（AI 分析 + 向量化）
        
        Args:
            db: 数据库会话
            asset_id: 资产 ID
        """
        asset = await db.get(Asset, asset_id)
        if not asset:
            return
        
        try:
            asset.status = AssetStatus.PROCESSING
            await db.commit()
            
            # 下载文件
            file_data = await storage_service.download_file(asset.file_path)
            
            # AI 分析
            if asset.asset_type == AssetType.IMAGE:
                analysis = await gemini_service.analyze_image(file_data, asset.mime_type)
                
                asset.title = analysis.get("title", "")
                asset.description = analysis.get("description", "")
                asset.tags = analysis.get("tags", [])
                asset.ocr_text = analysis.get("ocr_text", "")
            
            # 生成向量嵌入
            text_for_embedding = " ".join([
                asset.title or "",
                asset.description or "",
                " ".join(asset.tags or []),
                asset.ocr_text or "",
                asset.original_filename,
            ])
            
            if text_for_embedding.strip():
                vector = await gemini_service.generate_embedding(text_for_embedding)
                
                # 存储向量
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
            
            asset.status = AssetStatus.READY
            await db.commit()
            
        except Exception as e:
            asset.status = AssetStatus.FAILED
            asset.error_message = str(e)
            await db.commit()
            raise
    
    async def get_or_create_folder(self, db: AsyncSession, path: str) -> Folder:
        """获取或创建文件夹"""
        # 规范化路径
        path = path.strip("/")
        parts = path.split("/")
        
        current_path = ""
        parent_id = None
        folder = None
        
        for part in parts:
            current_path = f"{current_path}/{part}" if current_path else part
            
            result = await db.execute(
                select(Folder).where(Folder.path == current_path)
            )
            folder = result.scalar_one_or_none()
            
            if not folder:
                folder = Folder(
                    name=part,
                    parent_id=parent_id,
                    path=current_path,
                )
                db.add(folder)
                await db.commit()
                await db.refresh(folder)
            
            parent_id = folder.id
        
        return folder
    
    async def search_assets(
        self,
        db: AsyncSession,
        request: AssetSearchRequest,
    ) -> tuple:
        """
        搜索资产
        
        Args:
            db: 数据库会话
            request: 搜索请求
            
        Returns:
            (资产列表, 总数)
        """
        from src.utils.security import VisibilityHelper
        query = select(Asset).where(Asset.status == AssetStatus.READY, VisibilityHelper.active_assets())
        count_query = select(func.count(Asset.id)).where(Asset.status == AssetStatus.READY, VisibilityHelper.active_assets())
        
        # 文本搜索
        if request.query and not request.ai_search:
            search_term = f"%{request.query}%"
            text_filter = or_(
                Asset.title.ilike(search_term),
                Asset.description.ilike(search_term),
                Asset.original_filename.ilike(search_term),
                Asset.ocr_text.ilike(search_term),
                Asset.tags.any(request.query),
            )
            query = query.where(text_filter)
            count_query = count_query.where(text_filter)
        
        # 类型过滤
        if request.asset_types:
            query = query.where(Asset.asset_type.in_(request.asset_types))
            count_query = count_query.where(Asset.asset_type.in_(request.asset_types))
        
        # 文件夹过滤
        if request.folder_id:
            query = query.where(Asset.folder_id == request.folder_id)
            count_query = count_query.where(Asset.folder_id == request.folder_id)
        
        # 标签过滤
        if request.tags:
            for tag in request.tags:
                query = query.where(Asset.tags.any(tag))
                count_query = count_query.where(Asset.tags.any(tag))
        
        # 日期过滤
        if request.date_from:
            query = query.where(Asset.created_at >= request.date_from)
            count_query = count_query.where(Asset.created_at >= request.date_from)
        if request.date_to:
            query = query.where(Asset.created_at <= request.date_to)
            count_query = count_query.where(Asset.created_at <= request.date_to)
        
        # 获取总数
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # AI 搜索逻辑
        if request.query and request.ai_search:
            # 1. 生成查询向量
            query_vector = await gemini_service.generate_query_embedding(request.query)
            
            # 2. 从向量库检索候选 ID (检索范围可以稍微大一些以便后续过滤)
            vector_results = await vector_service.search_similar(
                vector=query_vector,
                limit=request.page_size * 5, # 扩大候选集以应对后续过滤
            )
            
            if not vector_results:
                return [], 0
            
            asset_ids = [r["asset_id"] for r in vector_results]
            id_to_score = {r["asset_id"]: r["score"] for r in vector_results}
            
            # 3. 在已有过滤条件的基础上增加 ID 过滤
            query = query.where(Asset.id.in_(asset_ids))
            
            # 4. 执行查询
            result = await db.execute(query)
            assets = result.scalars().all()
            
            # 5. 按向量相似度重新排序 (DB 的 in_ 不保证顺序)
            assets = sorted(assets, key=lambda a: id_to_score.get(a.id, 0), reverse=True)
            
            # 6. 更新总数 (向量搜索时的总数受限于候选集)
            total = len(assets)
        else:
            # 常规搜索：增加排序与分页
            order_column = getattr(Asset, request.sort_by, Asset.created_at)
            if request.sort_order == "desc":
                query = query.order_by(order_column.desc())
            else:
                query = query.order_by(order_column.asc())
            
            # 分页
            offset = (request.page - 1) * request.page_size
            query = query.offset(offset).limit(request.page_size)
            
            result = await db.execute(query)
            assets = result.scalars().all()
        
        return assets, total
    
    async def get_similar_assets(
        self,
        db: AsyncSession,
        asset_id: int,
        limit: int = 10,
    ) -> List[tuple]:
        """
        获取相似资产
        
        Args:
            db: 数据库会话
            asset_id: 资产 ID
            limit: 返回数量
            
        Returns:
            [(资产, 相似度), ...]
        """
        vector_results = await vector_service.search_by_asset_id(asset_id, limit)
        
        if not vector_results:
            return []
        
        asset_ids = [r["asset_id"] for r in vector_results]
        result = await db.execute(
            select(Asset).where(Asset.id.in_(asset_ids), Asset.deleted_at.is_(None), Asset.is_private.is_(False))
        )
        assets = {a.id: a for a in result.scalars().all()}
        
        return [
            (assets[r["asset_id"]], r["score"])
            for r in vector_results
            if r["asset_id"] in assets
        ]


    async def delete_asset(self, db: AsyncSession, asset: Asset):
        """
        永久删除资产
        
        Args:
            db: 数据库会话
            asset: 资产对象
        """
        # 1. 删除文件
        if asset.file_path:
            await storage_service.delete_file(asset.file_path)
        if asset.thumbnail_path:
            await storage_service.delete_file(asset.thumbnail_path)
            
        # 2. 删除向量
        if asset.vector_id:
            try:
                await vector_service.delete_vector(asset.vector_id)
            except Exception as e:
                print(f"向量删除失败: {e}")
                
        # 3. 删除数据库记录
        await db.delete(asset)
        await db.commit()


# 单例
asset_service = AssetService()
