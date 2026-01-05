"""
系统统计业务逻辑服务
"""
from datetime import datetime, timedelta
from typing import Dict, List, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, text
from src.models import Asset, Album, User, AssetType, AssetStatus

class StatsService:
    """系统统计服务"""

    async def get_dashboard_stats(self, db: AsyncSession, user_id: int) -> Dict[str, Any]:
        """获取仪表盘全局统计数据"""
        
        # 1. 基础计
        total_assets = await db.scalar(
            select(func.count(Asset.id))
            .where(Asset.user_id == user_id, Asset.deleted_at.is_(None))
        ) or 0
        
        total_albums = await db.scalar(
            select(func.count(Album.id))
            .where(Album.user_id == user_id)
        ) or 0
        
        total_size = await db.scalar(
            select(func.sum(Asset.file_size))
            .where(Asset.user_id == user_id, Asset.deleted_at.is_(None))
        ) or 0

        # 2. 类型分布
        type_dist_result = await db.execute(
            select(Asset.asset_type, func.count(Asset.id))
            .where(Asset.user_id == user_id, Asset.deleted_at.is_(None))
            .group_by(Asset.asset_type)
        )
        type_distribution = {row[0].value if hasattr(row[0], 'value') else str(row[0]): row[1] for row in type_dist_result.all()}

        # 3. 状态分布
        status_dist_result = await db.execute(
            select(Asset.status, func.count(Asset.id))
            .where(Asset.user_id == user_id, Asset.deleted_at.is_(None))
            .group_by(Asset.status)
        )
        status_distribution = {row[0].value if hasattr(row[0], 'value') else str(row[0]): row[1] for row in status_dist_result.all()}

        # 4. 最近 7 天上传趋势
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        trend_result = await db.execute(
            select(func.date(Asset.created_at).label("date"), func.count(Asset.id))
            .where(Asset.user_id == user_id, Asset.created_at >= seven_days_ago)
            .group_by(func.date(Asset.created_at))
            .order_by(func.date(Asset.created_at))
        )
        trend = [{"date": str(row[0]), "count": row[1]} for row in trend_result.all()]

        # 5. 存储占用前 5 的标签 (估略)
        tag_stats = await self.get_top_tags(db, user_id, limit=5)

        return {
            "summary": {
                "total_assets": total_assets,
                "total_albums": total_albums,
                "total_size": int(total_size),
                "usage_gb": float(round(total_size / (1024**3), 2))
            },
            "distributions": {
                "asset_types": type_distribution,
                "status": status_distribution
            },
            "trends": {
                "last_7_days": trend
            },
            "top_tags": tag_stats
        }

    async def get_top_tags(self, db: AsyncSession, user_id: int, limit: int = 10) -> List[Dict[str, Any]]:
        """获取使用频率最高的标签"""
        # PostgreSQL 特有的 unnest 函数用于展开数组字段进行聚合
        query = text("""
            SELECT tag, count(*) as count
            FROM (
                SELECT unnest(tags) as tag
                FROM assets
                WHERE user_id = :user_id AND deleted_at IS NULL
            ) sub
            GROUP BY tag
            ORDER BY count DESC
            LIMIT :limit
        """)
        
        result = await db.execute(query, {"user_id": user_id, "limit": limit})
        return [{"tag": row[0], "count": row[1]} for row in result.all()]

stats_service = StatsService()
