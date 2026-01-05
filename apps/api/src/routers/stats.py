"""
系统统计相关 API 路由
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

from src.models import get_db
from src.services.stats import stats_service
from src.routers.auth import get_current_user
from src.models.user import User

router = APIRouter(prefix="/stats", tags=["系统统计"])

@router.get("/dashboard", summary="获取仪表盘统计数据")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    获取当前用户的系统全局统计信息，包括：
    - 资源与相册总数
    - 存储总容量与已用空间
    - 资产类型与颗粒度状态分布
    - 过去 7 天的上传趋势
    - 热门标签排行榜
    """
    try:
        stats = await stats_service.get_dashboard_stats(db, current_user.id)
        return stats
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
