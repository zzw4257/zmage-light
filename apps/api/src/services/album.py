"""
相册业务逻辑服务
"""
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, insert, Integer
from sqlalchemy.orm import selectinload

from src.models import Album, Asset, album_assets, AlbumType, AlbumStatus


class AlbumService:
    """相册服务"""

    async def add_assets_to_album(self, db: AsyncSession, album_id: int, asset_ids: list[int]):
        """将资产添加到相册"""
        album = await db.get(Album, album_id)
        if not album:
            raise ValueError("相册不存在")
            
        stmt = select(Asset).where(Asset.id.in_(asset_ids))
        result = await db.execute(stmt)
        assets = result.scalars().all()
        if len(assets) != len(asset_ids):
            raise ValueError("部分资产不存在")
            
        for asset in assets:
            exists = await db.execute(
                select(album_assets).where(
                    album_assets.c.album_id == album_id,
                    album_assets.c.asset_id == asset.id
                )
            )
            if not exists.scalar_one_or_none():
                stmt = insert(album_assets).values(
                    album_id=album_id,
                    asset_id=asset.id
                )
                await db.execute(stmt)
        
        # 自动设置封面
        if not album.cover_asset_id and asset_ids:
            album.cover_asset_id = asset_ids[0]
             
        await db.commit()

    async def auto_select_cover(self, db: AsyncSession, album_id: int, user_id: int) -> Optional[int]:
        """
        自动选择相册封面
        
        策略:
        1. 优先选择最高分辨率的图片
        2. 如果无差异，选择最新添加的资产
        """
        album_result = await db.execute(
            select(Album).where(Album.id == album_id, Album.user_id == user_id)
        )
        album = album_result.scalar_one_or_none()
        if not album:
            return None

        query = (
            select(Asset)
            .join(album_assets, album_assets.c.asset_id == Asset.id)
            .where(
                album_assets.c.album_id == album_id,
                Asset.asset_type == "image",
                Asset.status == "ready",
                Asset.deleted_at.is_(None),
            )
            .order_by(
                desc(Asset.width * Asset.height),
                desc(album_assets.c.created_at),
            )
            .limit(1)
        )
        
        result = await db.execute(query)
        best_asset = result.scalar_one_or_none()
        
        if best_asset:
            album.cover_asset_id = best_asset.id
            await db.commit()
            return best_asset.id
        
        return None

    async def get_album_preview_assets(
        self, db: AsyncSession, album_id: int, user_id: int, limit: int = 4
    ) -> List[Asset]:
        """获取相册预览资产（用于封面未设置时的马赛克展示）"""
        query = (
            select(Asset)
            .join(album_assets, album_assets.c.asset_id == Asset.id)
            .join(Album, Album.id == album_assets.c.album_id)
            .where(
                album_assets.c.album_id == album_id,
                Album.user_id == user_id,
                Asset.status == "ready",
                Asset.deleted_at.is_(None),
            )
            .order_by(desc(album_assets.c.created_at))
            .limit(limit)
        )
        
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_album_stats(self, db: AsyncSession, album_id: int, user_id: int) -> dict:
        """获取相册统计信息"""
        album_result = await db.execute(
            select(Album).where(Album.id == album_id, Album.user_id == user_id)
        )
        album = album_result.scalar_one_or_none()
        if not album:
            return {}

        stats_query = (
            select(
                func.count(Asset.id).label("asset_count"),
                func.sum(Asset.file_size).label("total_size"),
                func.min(Asset.taken_at).label("date_start"),
                func.max(Asset.taken_at).label("date_end"),
            )
            .select_from(Asset)
            .join(album_assets, album_assets.c.asset_id == Asset.id)
            .where(
                album_assets.c.album_id == album_id,
                Asset.status == "ready",
                Asset.deleted_at.is_(None),
            )
        )
        
        result = await db.execute(stats_query)
        row = result.one()
        
        return {
            "asset_count": row.asset_count or 0,
            "total_size": row.total_size or 0,
            "date_range": {
                "start": row.date_start.isoformat() if row.date_start else None,
                "end": row.date_end.isoformat() if row.date_end else None,
            } if row.date_start or row.date_end else None,
        }

    async def evaluate_smart_album(
        self, db: AsyncSession, album_id: int, user_id: int
    ) -> List[Asset]:
        """根据智能相册规则评估匹配的资产"""
        album_result = await db.execute(
            select(Album).where(
                Album.id == album_id,
                Album.user_id == user_id,
                Album.album_type == AlbumType.SMART,
            )
        )
        album = album_result.scalar_one_or_none()
        if not album or not album.smart_rules:
            return []

        rules = album.smart_rules
        query = select(Asset).where(
            Asset.user_id == user_id,
            Asset.status == "ready",
            Asset.deleted_at.is_(None),
        )

        # 标签规则
        if "tags" in rules:
            if rules["tags"].get("include"):
                query = query.where(Asset.tags.overlap(rules["tags"]["include"]))
            if rules["tags"].get("exclude"):
                for tag in rules["tags"]["exclude"]:
                    query = query.where(~Asset.tags.contains([tag]))

        # 日期范围
        if "date_range" in rules:
            from datetime import datetime
            if rules["date_range"].get("start"):
                start = datetime.fromisoformat(rules["date_range"]["start"])
                query = query.where(Asset.taken_at >= start)
            if rules["date_range"].get("end"):
                end = datetime.fromisoformat(rules["date_range"]["end"])
                query = query.where(Asset.taken_at <= end)

        # 相机型号
        if "camera_model" in rules and rules["camera_model"]:
            query = query.where(Asset.camera_model == rules["camera_model"])

        # 资产类型
        if "asset_type" in rules and rules["asset_type"]:
            query = query.where(Asset.asset_type == rules["asset_type"])

        # 地点
        if "location" in rules and rules["location"].get("lat") and rules["location"].get("lon"):
            lat = rules["location"]["lat"]
            lon = rules["location"]["lon"]
            radius = rules["location"].get("radius_km", 10)
            delta = radius / 111.0
            query = query.where(
                Asset.latitude.between(lat - delta, lat + delta),
                Asset.longitude.between(lon - delta, lon + delta),
            )

        query = query.order_by(desc(Asset.taken_at)).limit(500)
        
        result = await db.execute(query)
        return list(result.scalars().all())


album_service = AlbumService()
