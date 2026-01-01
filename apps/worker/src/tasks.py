"""
定时任务
"""
import json
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any

import numpy as np
from sqlalchemy import create_engine, select, insert, func
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, Boolean, Enum as SQLEnum, JSON
from sqlalchemy.dialects.postgresql import ARRAY
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue

from src.config import settings

# 同步数据库引擎 (Worker 使用同步方式)
print(f"DEBUG: settings.database_url = {settings.database_url}")
sync_database_url = settings.database_url.replace("+asyncpg", "+psycopg2")
print(f"DEBUG: sync_database_url = {sync_database_url}")
engine = create_engine(sync_database_url)
SessionLocal = sessionmaker(bind=engine)

Base = declarative_base()


# 简化的模型定义 (与 API 保持一致)
import enum

class AssetStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"

class AlbumType(str, enum.Enum):
    MANUAL = "manual"
    SMART = "smart"
    SUGGESTED = "suggested"

class AlbumStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    IGNORED = "ignored"


class Asset(Base):
    __tablename__ = "assets"
    
    id = Column(Integer, primary_key=True)
    filename = Column(String(255))
    original_filename = Column(String(255))
    title = Column(String(255))
    description = Column(Text)
    tags = Column(ARRAY(String))
    status = Column(SQLEnum(AssetStatus, native_enum=False))
    folder_id = Column(Integer)
    location = Column(String(255))
    created_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True))
    deleted_at = Column(DateTime(timezone=True))
    is_private = Column(Boolean, default=False)
    file_path = Column(String(255))
    thumbnail_path = Column(String(255))
    vector_id = Column(String(64))


class Album(Base):
    __tablename__ = "albums"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255))
    description = Column(Text)
    cover_asset_id = Column(Integer)
    album_type = Column(SQLEnum(AlbumType, native_enum=False))
    status = Column(SQLEnum(AlbumStatus, native_enum=False))
    suggestion_reason = Column(Text)
    suggestion_score = Column(Float)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    deleted_at = Column(DateTime(timezone=True))


class SystemConfig(Base):
    __tablename__ = "system_config"
    
    id = Column(Integer, primary_key=True)
    key = Column(String(100), unique=True)
    value = Column(Text)
    description = Column(String(255))
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow)


# 相册资产关联表
from sqlalchemy import Table, ForeignKey
album_assets = Table(
    "album_assets",
    Base.metadata,
    Column("album_id", Integer, ForeignKey("albums.id"), primary_key=True),
    Column("asset_id", Integer, ForeignKey("assets.id"), primary_key=True),
    Column("order", Integer, default=0),
    Column("added_at", DateTime(timezone=True), default=datetime.utcnow),
)

# 集合资产关联表
collection_assets = Table(
    "collection_assets",
    Base.metadata,
    Column("collection_id", Integer, ForeignKey("collections.id"), primary_key=True),
    Column("asset_id", Integer, ForeignKey("assets.id"), primary_key=True),
    Column("added_at", DateTime(timezone=True), default=datetime.utcnow),
)

class Collection(Base):
    __tablename__ = "collections"
    id = Column(Integer, primary_key=True)
    name = Column(String(255))
    deleted_at = Column(DateTime(timezone=True))


def get_gemini_client():
    """获取 Gemini 客户端"""
    from google import genai
    return genai.Client(api_key=settings.gemini_api_key)


def get_qdrant_client():
    """获取 Qdrant 客户端"""
    return QdrantClient(url=settings.qdrant_url)


def delete_from_storage(file_path: str):
    """从 MinIO 删除文件"""
    import boto3
    from botocore.config import Config
    client = boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        config=Config(signature_version="s3v4"),
    )
    try:
        client.delete_object(Bucket=settings.s3_bucket, Key=file_path)
    except Exception as e:
        print(f"文件删除失败 ({file_path}): {e}")


def delete_from_qdrant(vector_id: str):
    """从 Qdrant 删除向量"""
    client = get_qdrant_client()
    try:
        client.delete(
            collection_name=settings.qdrant_collection,
            points_selector=[vector_id],
        )
    except Exception as e:
        print(f"向量删除失败 ({vector_id}): {e}")


async def album_suggestion_task():
    """相册建议生成任务"""
    print(f"\n[{datetime.now().isoformat()}] 开始执行相册建议任务...")
    
    db = SessionLocal()
    
    try:
        # 获取最近 30 天的就绪资产
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=30)
        assets = db.query(Asset).filter(
            Asset.status == AssetStatus.READY,
            Asset.deleted_at.is_(None),
            Asset.is_private.is_(False),
            Asset.created_at >= cutoff_date,
        ).order_by(Asset.created_at.desc()).limit(100).all()
        
        if len(assets) < 5:
            print(f"资产数量不足 ({len(assets)})，跳过相册建议生成")
            return
        
        print(f"找到 {len(assets)} 个资产，开始分析...")
        
        # 获取已有相册名称
        existing_albums = db.query(Album.name).filter(
            Album.status == AlbumStatus.ACCEPTED
        ).all()
        existing_album_names = [a[0] for a in existing_albums]
        
        # 准备资产信息
        assets_info = []
        for a in assets:
            assets_info.append({
                "id": a.id,
                "title": a.title or a.original_filename,
                "description": a.description,
                "tags": a.tags or [],
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "location": a.location,
            })
        
        # 调用 Gemini 生成建议
        suggestions = await generate_album_suggestions(assets_info, existing_album_names)
        
        if not suggestions:
            print("未生成任何相册建议")
            return
        
        # 创建建议相册
        created_count = 0
        for suggestion in suggestions:
            asset_ids = suggestion.get("asset_ids", [])
            if len(asset_ids) < 3:
                continue
            
            # 验证资产 ID 存在
            valid_ids = [a.id for a in assets if a.id in asset_ids]
            if len(valid_ids) < 3:
                continue
            
            # 创建相册
            album = Album(
                name=suggestion["name"],
                description=suggestion.get("description"),
                cover_asset_id=valid_ids[0] if valid_ids else None,
                album_type=AlbumType.SUGGESTED,
                status=AlbumStatus.PENDING,
                suggestion_reason=suggestion.get("reason"),
                suggestion_score=suggestion.get("confidence", 0.5),
            )
            db.add(album)
            db.flush()
            
            # 添加资产关联
            for asset_id in valid_ids:
                db.execute(
                    album_assets.insert().values(
                        album_id=album.id,
                        asset_id=asset_id,
                    )
                )
            
            created_count += 1
        
        # 更新上次扫描时间
        config = db.query(SystemConfig).filter(
            SystemConfig.key == "last_album_scan"
        ).first()
        
        if config:
            config.value = datetime.utcnow().isoformat()
            config.updated_at = datetime.utcnow()
        else:
            config = SystemConfig(
                key="last_album_scan",
                value=datetime.utcnow().isoformat(),
                description="上次相册建议扫描时间",
            )
            db.add(config)
        
        db.commit()
        print(f"相册建议任务完成，创建了 {created_count} 个建议相册")
        
    except Exception as e:
        print(f"相册建议任务失败: {e}")
        db.rollback()
        raise
    finally:
        db.close()


async def generate_album_suggestions(
    assets_info: List[Dict[str, Any]],
    existing_albums: List[str],
) -> List[Dict[str, Any]]:
    """调用 Gemini 生成相册建议"""
    from google.genai import types
    
    if not settings.gemini_api_key:
        print("警告: GEMINI_API_KEY 未设置，跳过 AI 建议生成")
        return []
    
    client = get_gemini_client()
    
    prompt = f"""根据以下资产信息，建议创建新的相册。

已有相册：{', '.join(existing_albums) if existing_albums else '无'}

资产信息：
{json.dumps(assets_info[:50], ensure_ascii=False, indent=2)}

请分析这些资产，找出可以归类的主题、事件、时间段或场景，建议创建相册。

以 JSON 格式返回建议：
{{
    "suggestions": [
        {{
            "name": "相册名称（中文）",
            "description": "相册描述（中文）",
            "reason": "建议理由（中文，解释为什么这些资产应该归为一个相册）",
            "asset_ids": [1, 2, 3],
            "confidence": 0.85
        }}
    ]
}}

要求：
1. 相册名称要有意义、易于理解，使用中文
2. 每个相册至少包含 3 个资产
3. 不要与已有相册重复
4. confidence 表示建议的置信度 (0-1)
5. 最多返回 5 个建议
6. 只返回 JSON，不要其他内容"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-preview-05-20",
            contents=prompt
        )
        
        text = response.text.strip()
        
        # 移除 markdown 代码块标记
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        
        result = json.loads(text.strip())
        return result.get("suggestions", [])
        
    except Exception as e:
        print(f"Gemini 相册建议生成失败: {e}")
        return []


async def cleanup_task():
    """清理任务"""
    print(f"\n[{datetime.now().isoformat()}] 开始执行清理任务...")
    
    db = SessionLocal()
    
    try:
        # 1. 清理已忽略的建议相册 (超过 30 天)
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=30)
        
        ignored_albums = db.query(Album).filter(
            Album.status == AlbumStatus.IGNORED,
            Album.updated_at < cutoff_date,
        ).all()
        
        for album in ignored_albums:
            # 删除关联
            db.execute(
                album_assets.delete().where(album_assets.c.album_id == album.id)
            )
            db.delete(album)
        print(f"清理了 {len(ignored_albums)} 个已忽略的建议相册")

        # 2. 清理回收站 (超过 30 天)
        # 寻找 deleted_at 有值且超过 30 天的资产
        trash_assets = db.query(Asset).filter(
            Asset.deleted_at.isnot(None),
            Asset.deleted_at < cutoff_date
        ).all()
        
        for asset in trash_assets:
            # 删除物理文件
            if asset.file_path:
                delete_from_storage(asset.file_path)
            if asset.thumbnail_path:
                delete_from_storage(asset.thumbnail_path)
            
            # 删除向量
            if asset.vector_id:
                delete_from_qdrant(asset.vector_id)
            
            # 删除数据库记录
            db.delete(asset)
        
        print(f"清空了 {len(trash_assets)} 个超过 30 天的回收站资产")

        # 3. 清理已标记删除的相册
        deleted_albums = db.query(Album).filter(
            # 假设我们以后也会给相册加 deleted_at，这里先支持
            # 但目前 Album 模型还没有在 worker 里完全一致，我们在 api 里加了
            # 所以这里也要加上
            # 实际上，目前 api 里的 Album 模型已经有 deleted_at 了
            # 我们在 worker 的 Album 模型里也加上吧
            # 暂时检查 deleted_at 属性是否存在
            Album.deleted_at.isnot(None),
            Album.deleted_at < cutoff_date
        ).all() if hasattr(Album, 'deleted_at') else []

        for album in deleted_albums:
             db.execute(
                album_assets.delete().where(album_assets.c.album_id == album.id)
            )
             db.delete(album)
        
        if deleted_albums:
            print(f"清理了 {len(deleted_albums)} 个超过 30 天的已删除相册")
        
        # 4. 清理孤立的关联记录 (防止数据库残留)
        # 删除 asset_id 不在 assets 表中的记录
        from sqlalchemy import select
        db.execute(
            album_assets.delete().where(~album_assets.c.asset_id.in_(select(Asset.id)))
        )
        db.execute(
            collection_assets.delete().where(~collection_assets.c.asset_id.in_(select(Asset.id)))
        )
        
        db.commit()
    except Exception as e:
        print(f"清理任务失败: {e}")
        db.rollback()
    finally:
        db.close()
