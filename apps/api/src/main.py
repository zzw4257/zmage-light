"""
Zmage API 主入口
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi import Request

from src.config import settings
from src.models import init_db, get_db
from sqlalchemy.ext.asyncio import AsyncSession
from src.services.vector import vector_service
from src.routers import (
    assets_router,
    albums_router,
    collections_router,
    shares_router,
    tasks_router,
    downloads_router,
    auth_router,
    mcp_router,
    ai_router,
    trash_router,
    vault_router,
    batch_router,  # 新增批量操作
    stats_router,  # 新增统计接口
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时
    print("正在初始化数据库...")
    await init_db()
    print("数据库初始化完成")
    
    print("正在初始化向量数据库...")
    await vector_service.init_collection()
    print("向量数据库初始化完成")
    
    print("正在初始化存储桶...")
    from src.services.storage import storage_service
    await storage_service.init_bucket()
    print("存储桶初始化完成")
    
    # 初始化默认下载预设
    await init_default_presets()
    
    yield
    
    # 关闭时
    print("应用关闭")


async def init_default_presets():
    """初始化默认下载预设"""
    from src.models.database import async_session_maker
    from src.models import DownloadPreset
    from sqlalchemy import select
    
    async with async_session_maker() as db:
        # 检查是否已有预设
        result = await db.execute(select(DownloadPreset).limit(1))
        if result.scalar_one_or_none():
            return
        
        # 创建默认预设
        presets = [
            DownloadPreset(name="原图", description="下载原始文件", format="original", order=1, is_default=True),
            DownloadPreset(name="1:1 方形", description="正方形裁剪", aspect_ratio="1:1", format="jpg", quality=90, order=2),
            DownloadPreset(name="16:9 横版", description="横版裁剪", aspect_ratio="16:9", format="jpg", quality=90, order=3),
            DownloadPreset(name="4:5 竖版", description="竖版裁剪（适合社交媒体）", aspect_ratio="4:5", format="jpg", quality=90, order=4),
            DownloadPreset(name="缩略图", description="400px 宽度缩略图", width=400, format="jpg", quality=85, order=5),
            DownloadPreset(name="中等尺寸", description="1200px 宽度", width=1200, format="jpg", quality=90, order=6),
            DownloadPreset(name="WebP 优化", description="WebP 格式，体积更小", format="webp", quality=85, order=7),
        ]
        
        for preset in presets:
            db.add(preset)
        
        await db.commit()
        print("默认下载预设初始化完成")


# 创建应用
app = FastAPI(
    title="Zmage API",
    description="""
Zmage 数字资产管理系统 API

## 功能

- **资产管理**：上传、搜索、编辑、删除数字资产
- **智能分析**：AI 自动标签、语义搜索、相似推荐
- **相册管理**：手动相册、智能相册、AI 相册建议
- **集合协作**：跨文件夹聚合、协作备注
- **分享功能**：链接分享、Portal、权限控制
- **下载管理**：预设尺寸、裁剪、格式转换

## 技术栈

- FastAPI + PostgreSQL + Qdrant + MinIO
- Gemini AI (标签、嵌入、建议)
""",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 这里的 "*" 在本地开发环境可行，生产环境建议在 settings 中配置
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 压缩中间件
app.add_middleware(GZipMiddleware, minimum_size=1000)

# 请求请求日志与耗时统计
@app.middleware("http")
async def log_requests(request: Request, call_next):
    import time
    from src.utils.security import logger
    
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    
    logger.info(
        f"Method: {request.method} Path: {request.url.path} "
        f"Status: {response.status_code} Time: {process_time:.2f}ms"
    )
    response.headers["X-Process-Time"] = str(process_time)
    return response

# 信任域名中间件 (防止 Host 注入)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"]) # 这里的 "*" 可根据实际部署环境修改

# 全局异常处理，防止泄露栈信息
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    if settings.debug:
        print(f"Global Error: {exc}")
        traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": "内部服务器错误，请稍后重试", "error_type": type(exc).__name__},
    )

from src.utils.security import get_current_user

# 注册路由
# 开放路由 (不需要登录)
app.include_router(auth_router, prefix="/api")

# 受保护路由 (需要登录)
# 注意：shares_router 内部有公开和私有部分，我们需要更精细的控制
# 为了遵循用户“强制登录”的要求，我们将核心管理路由全部加密
app.include_router(assets_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(albums_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(collections_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(tasks_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(downloads_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(mcp_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(ai_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(trash_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(vault_router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(batch_router, prefix="/api/assets", dependencies=[Depends(get_current_user)])
app.include_router(stats_router, prefix="/api", dependencies=[Depends(get_current_user)])

# Shares router 特殊处理：内部管理接口在 router 定义处或此处加权感校验
app.include_router(shares_router, prefix="/api")



@app.get("/", tags=["健康检查"])
async def root():
    """API 根路径"""
    return {
        "name": "Zmage API",
        "version": "1.0.0",
        "status": "运行中",
        "docs": "/docs",
    }


@app.get("/health", tags=["健康检查"])
async def health_check():
    """健康检查"""
    return {"status": "healthy"}


@app.get("/api/storage/{path:path}", tags=["存储"])
async def proxy_storage(path: str, db: AsyncSession = Depends(get_db)):
    """代理存储文件访问"""
    from src.routers.downloads import get_storage_file
    return await get_storage_file(path, db)
