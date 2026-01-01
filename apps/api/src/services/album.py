from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, insert
from src.models import Album, Asset, album_assets

class AlbumService:
    async def add_assets_to_album(self, db: AsyncSession, album_id: int, asset_ids: list[int]):
        """将资产添加到相册"""
        # 验证相册是否存在
        album = await db.get(Album, album_id)
        if not album:
            raise ValueError("相册不存在")
            
        # 验证资产是否存在
        stmt = select(Asset).where(Asset.id.in_(asset_ids))
        result = await db.execute(stmt)
        assets = result.scalars().all()
        if len(assets) != len(asset_ids):
            raise ValueError("部分资产不存在")
            
        # 添加关联
        for asset in assets:
            # 检查是否已存在
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
        
        # 更新相册资产计数
        count_stmt = select(func.count(album_assets.c.asset_id)).where(album_assets.c.album_id == album_id)
        count_result = await db.execute(count_stmt)
        count = count_result.scalar()
        
        album.asset_count = count
        
        # 更新封面（如果没有）
        if not album.cover_asset_id and asset_ids:
             album.cover_asset_id = asset_ids[0]
             
        # Recount properly
        # count query
        # ...
        
        await db.commit()

album_service = AlbumService()
