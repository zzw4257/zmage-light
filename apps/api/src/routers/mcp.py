"""
MCP (Model Context Protocol) 兼容接口
实现专业级工具集成与原子操作
"""
import json
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from src.models import get_db, Asset, Album, Folder, Share, Collection
from src.schemas.mcp import MCPTool, MCPToolsResponse, MCPCallRequest, MCPCallResponse
from src.schemas.asset import AssetSearchRequest
from src.services.asset import asset_service
from src.services.storage import storage_service
from src.routers.assets import asset_to_response
from src.services.stats import stats_service
from src.utils.security import get_current_user

router = APIRouter(prefix="/mcp", tags=["MCP 接口"])

# --- 工具定义 ---

TOOLS = [
    # === 资产管理 ===
    MCPTool(
        name="search_assets",
        description="使用自然语言搜索图片和视频，支持按标题、描述、标签、位置和视觉特征检索。",
        input_schema={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "搜索查询词"},
                "limit": {"type": "integer", "description": "返回结果数量", "default": 10},
                "folder_id": {"type": "integer", "description": "限制在特定文件夹内"},
                "tags": {"type": "array", "items": {"type": "string"}, "description": "限制特定标签"}
            },
            "required": ["query"]
        }
    ),
    MCPTool(
        name="list_assets",
        description="列出所有资产，支持按类型、文件夹、状态筛选。",
        input_schema={
            "type": "object",
            "properties": {
                "asset_type": {"type": "string", "enum": ["image", "video", "document"], "description": "资产类型"},
                "folder_id": {"type": "integer", "description": "文件夹 ID"},
                "limit": {"type": "integer", "description": "返回数量", "default": 20}
            }
        }
    ),
    MCPTool(
        name="get_asset_details",
        description="获取单个资产的详细元数据，包括标题、描述、标签、拍摄时间、地点、相机参数等。",
        input_schema={
            "type": "object",
            "properties": {
                "asset_id": {"type": "integer", "description": "资产唯一标识 ID"}
            },
            "required": ["asset_id"]
        }
    ),
    MCPTool(
        name="update_asset",
        description="更新资产的元数据，如修改标题、增加描述、修改标签等。",
        input_schema={
            "type": "object",
            "properties": {
                "asset_id": {"type": "integer", "description": "资产 ID"},
                "title": {"type": "string", "description": "新标题"},
                "description": {"type": "string", "description": "新描述"},
                "tags": {"type": "array", "items": {"type": "string"}, "description": "全量覆盖标签列表"}
            },
            "required": ["asset_id"]
        }
    ),
    MCPTool(
        name="delete_asset",
        description="将资产移至回收站（或永久删除）。",
        input_schema={
            "type": "object",
            "properties": {
                "asset_id": {"type": "integer", "description": "资产 ID"},
                "permanent": {"type": "boolean", "description": "是否永久删除", "default": False}
            },
            "required": ["asset_id"]
        }
    ),
    MCPTool(
        name="find_similar_assets",
        description="根据指定资产查找相似的图片或视频。",
        input_schema={
            "type": "object",
            "properties": {
                "asset_id": {"type": "integer", "description": "参考资产 ID"},
                "limit": {"type": "integer", "description": "返回数量", "default": 10}
            },
            "required": ["asset_id"]
        }
    ),
    
    # === 相册管理 ===
    MCPTool(
        name="list_albums",
        description="列出所有相册，可按类型筛选（手动、智能、AI建议）。",
        input_schema={
            "type": "object",
            "properties": {
                "album_type": {"type": "string", "enum": ["manual", "smart", "suggested"], "description": "相册类型"}
            }
        }
    ),
    MCPTool(
        name="get_album_details",
        description="获取相册详情及其包含的资产列表。",
        input_schema={
            "type": "object",
            "properties": {
                "album_id": {"type": "integer", "description": "相册 ID"}
            },
            "required": ["album_id"]
        }
    ),
    MCPTool(
        name="create_album",
        description="创建新相册并可选地添加资产。",
        input_schema={
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "相册名称"},
                "description": {"type": "string", "description": "相册描述"},
                "asset_ids": {"type": "array", "items": {"type": "integer"}, "description": "初始资产ID列表"}
            },
            "required": ["name"]
        }
    ),
    MCPTool(
        name="add_to_album",
        description="将资产添加到相册。",
        input_schema={
            "type": "object",
            "properties": {
                "album_id": {"type": "integer", "description": "相册 ID"},
                "asset_ids": {"type": "array", "items": {"type": "integer"}, "description": "资产 ID 列表"}
            },
            "required": ["album_id", "asset_ids"]
        }
    ),
    MCPTool(
        name="remove_from_album",
        description="从相册中移除资产。",
        input_schema={
            "type": "object",
            "properties": {
                "album_id": {"type": "integer", "description": "相册 ID"},
                "asset_ids": {"type": "array", "items": {"type": "integer"}, "description": "资产 ID 列表"}
            },
            "required": ["album_id", "asset_ids"]
        }
    ),
    MCPTool(
        name="delete_album",
        description="删除相册（不影响资产本身）。",
        input_schema={
            "type": "object",
            "properties": {
                "album_id": {"type": "integer", "description": "相册 ID"}
            },
            "required": ["album_id"]
        }
    ),
    
    # === 集合管理 ===
    MCPTool(
        name="list_collections",
        description="列出所有集合。",
        input_schema={"type": "object", "properties": {}}
    ),
    MCPTool(
        name="create_collection",
        description="创建新集合并可选地添加资产。",
        input_schema={
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "集合名称"},
                "description": {"type": "string", "description": "集合描述"},
                "asset_ids": {"type": "array", "items": {"type": "integer"}, "description": "初始资产ID列表"}
            },
            "required": ["name"]
        }
    ),
    MCPTool(
        name="add_to_collection",
        description="将资产添加到集合。",
        input_schema={
            "type": "object",
            "properties": {
                "collection_id": {"type": "integer", "description": "集合 ID"},
                "asset_ids": {"type": "array", "items": {"type": "integer"}, "description": "资产 ID 列表"}
            },
            "required": ["collection_id", "asset_ids"]
        }
    ),
    
    # === 文件夹管理 ===
    MCPTool(
        name="list_folders",
        description="获取文件夹树结构。",
        input_schema={"type": "object", "properties": {}}
    ),
    MCPTool(
        name="create_folder",
        description="创建新文件夹。",
        input_schema={
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "文件夹名称"},
                "parent_id": {"type": "integer", "description": "父文件夹 ID（可选）"}
            },
            "required": ["name"]
        }
    ),
    
    # === 回收站 ===
    MCPTool(
        name="list_trash",
        description="列出回收站中的资产。",
        input_schema={
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": "返回数量", "default": 20}
            }
        }
    ),
    MCPTool(
        name="restore_asset",
        description="从回收站恢复资产。",
        input_schema={
            "type": "object",
            "properties": {
                "asset_id": {"type": "integer", "description": "资产 ID"}
            },
            "required": ["asset_id"]
        }
    ),
    MCPTool(
        name="empty_trash",
        description="清空回收站（永久删除所有资产）。",
        input_schema={"type": "object", "properties": {}}
    ),
    
    # === 私密保险库 ===
    MCPTool(
        name="move_to_vault",
        description="将资产移入私密保险库。",
        input_schema={
            "type": "object",
            "properties": {
                "asset_id": {"type": "integer", "description": "资产 ID"}
            },
            "required": ["asset_id"]
        }
    ),
    
    # === 分享 ===
    MCPTool(
        name="create_share",
        description="创建资产或集合的分享链接。",
        input_schema={
            "type": "object",
            "properties": {
                "asset_id": {"type": "integer", "description": "资产 ID（与 collection_id 二选一）"},
                "collection_id": {"type": "integer", "description": "集合 ID（与 asset_id 二选一）"},
                "password": {"type": "string", "description": "访问密码（可选）"},
                "expires_in_days": {"type": "integer", "description": "过期天数（可选）"}
            }
        }
    ),
    MCPTool(
        name="list_shares",
        description="列出所有分享链接。",
        input_schema={"type": "object", "properties": {}}
    ),
    
    # === 系统信息 ===
    MCPTool(
        name="get_system_stats",
        description="获取系统统计信息（总资产数、相册数、存储使用量等）。",
        input_schema={"type": "object", "properties": {}}
    ),
    MCPTool(
        name="get_task_status",
        description="获取后台任务状态（AI 分析、相册建议等）。",
        input_schema={"type": "object", "properties": {}}
    ),
]

@router.get("/tools", response_model=MCPToolsResponse, summary="获取工具列表")
async def list_tools():
    """返回所有可用的 MCP 工具定义"""
    return MCPToolsResponse(tools=TOOLS)

@router.post("/call", response_model=MCPCallResponse, summary="调用工具")
async def call_tool(
    request: MCPCallRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """执行指定的 MCP 工具"""
    name = request.name
    args = request.arguments

    try:
        # === 资产管理 ===
        if name == "search_assets":
            query = args.get("query")
            limit = args.get("limit", 10)
            search_req = AssetSearchRequest(
                query=query,
                ai_search=True,
                page=1,
                page_size=limit,
                folder_id=args.get("folder_id"),
                tags=args.get("tags")
            )
            assets, total = await asset_service.search_assets(db, search_req, current_user_id=current_user.id)
            items = [asset_to_response(a) for a in assets]
            return MCPCallResponse(content=[{"type": "text", "text": f"找到 {total} 个匹配项"}, {"type": "json", "data": items}])

        elif name == "list_assets":
            from src.schemas.asset import AssetListResponse
            params = {}
            if args.get("asset_type"):
                params["asset_type"] = args["asset_type"]
            if args.get("folder_id"):
                params["folder_id"] = args["folder_id"]
            page_size = args.get("limit", 20)
            
            result = await db.execute(
                select(Asset)
                .filter(Asset.user_id == current_user.id)
                .filter(Asset.deleted_at.is_(None), Asset.is_private.is_(False))
                .limit(page_size)
            )
            assets = result.scalars().all()
            items = [asset_to_response(a) for a in assets]
            return MCPCallResponse(content=[{"type": "text", "text": f"返回 {len(items)} 个资产"}, {"type": "json", "data": items}])

        elif name == "get_asset_details":
            asset_id = args.get("asset_id")
            asset = await db.get(Asset, asset_id)
            if not asset or asset.user_id != current_user.id:
                return MCPCallResponse(content=[{"type": "text", "text": "资产不存在"}], is_error=True)
            return MCPCallResponse(content=[{"type": "json", "data": asset_to_response(asset)}])

        elif name == "update_asset":
            asset_id = args.get("asset_id")
            asset = await db.get(Asset, asset_id)
            if not asset or asset.user_id != current_user.id:
                return MCPCallResponse(content=[{"type": "text", "text": "资产不存在"}], is_error=True)
            
            from src.schemas.asset import AssetUpdate
            update_data = AssetUpdate(
                title=args.get("title"),
                description=args.get("description"),
                tags=args.get("tags")
            )
            asset = await asset_service.update_asset(db, asset_id, update_data)
            return MCPCallResponse(content=[{"type": "text", "text": "更新成功"}, {"type": "json", "data": asset_to_response(asset)}])

        elif name == "delete_asset":
            asset_id = args.get("asset_id")
            asset = await db.get(Asset, asset_id)
            if not asset or asset.user_id != current_user.id:
                return MCPCallResponse(content=[{"type": "text", "text": "资产不存在"}], is_error=True)
                
            permanent = args.get("permanent", False)
            await asset_service.delete_asset(db, asset, permanent=permanent)
            return MCPCallResponse(content=[{"type": "text", "text": "已移至回收站" if not permanent else "已永久删除"}])

        elif name == "find_similar_assets":
            asset_id = args.get("asset_id")
            asset = await db.get(Asset, asset_id)
            if not asset or asset.user_id != current_user.id:
                return MCPCallResponse(content=[{"type": "text", "text": "资产不存在"}], is_error=True)
                
            limit = args.get("limit", 10)
            similar = await asset_service.get_similar_assets(db, asset_id, user_id=current_user.id, limit=limit)
            items = [{"asset": asset_to_response(s[0]), "similarity": s[1]} for s in similar if s[0].user_id == current_user.id]
            return MCPCallResponse(content=[{"type": "text", "text": f"找到 {len(items)} 个相似资产"}, {"type": "json", "data": items}])

        # === 相册管理 ===
        elif name == "list_albums":
            from src.models import album_assets
            from src.schemas.album import AlbumType, AlbumStatus
            
            query = select(Album).where(Album.user_id == current_user.id)
            album_type_arg = args.get("album_type")
            if album_type_arg:
                query = query.where(Album.album_type == album_type_arg)
            
            query = query.where(Album.status == "accepted").order_by(Album.updated_at.desc())
            result = await db.execute(query)
            albums = result.scalars().all()
            
            album_list = []
            for album in albums:
                count_result = await db.execute(
                    select(func.count()).select_from(album_assets).where(album_assets.c.album_id == album.id)
                )
                asset_count = count_result.scalar()
                album_list.append({
                    "id": album.id,
                    "name": album.name,
                    "description": album.description,
                    "asset_count": asset_count,
                    "created_at": str(album.created_at)
                })
            
            return MCPCallResponse(content=[{"type": "text", "text": f"找到 {len(album_list)} 个相册"}, {"type": "json", "data": album_list}])

        elif name == "get_album_details":
            from src.models import album_assets
            album_id = args.get("album_id")
            album = await db.get(Album, album_id)
            if not album or album.user_id != current_user.id:
                return MCPCallResponse(content=[{"type": "text", "text": "相册不存在"}], is_error=True)
            
            # 获取相册中的资产
            assets_result = await db.execute(
                select(Asset).join(album_assets).where(album_assets.c.album_id == album_id)
            )
            assets = assets_result.scalars().all()
            
            album_data = {
                "id": album.id,
                "name": album.name,
                "description": album.description,
                "assets": [asset_to_response(a) for a in assets]
            }
            return MCPCallResponse(content=[{"type": "json", "data": album_data}])

        elif name == "create_album":
            from src.models import album_assets
            from sqlalchemy import insert
            
            name_val = args.get("name")
            description = args.get("description")
            asset_ids = args.get("asset_ids", [])
            
            album = Album(
                name=name_val,
                description=description,
                album_type="manual",
                status="accepted",
                user_id=current_user.id
            )
            db.add(album)
            await db.commit()
            await db.refresh(album)
            
            # 添加资产
            if asset_ids:
                for asset_id in asset_ids:
                    stmt = insert(album_assets).values(album_id=album.id, asset_id=asset_id)
                    await db.execute(stmt)
                await db.commit()
            
            return MCPCallResponse(content=[{"type": "text", "text": f"相册 '{name_val}' 创建成功"}])

        elif name == "add_to_album":
            from src.services.album import album_service
            album_id = args.get("album_id")
            album = await db.get(Album, album_id)
            if not album or album.user_id != current_user.id:
                return MCPCallResponse(content=[{"type": "text", "text": "相册不存在"}], is_error=True)
            
            asset_ids = args.get("asset_ids", [])
            # 校验资产所有权
            for aid in asset_ids:
                asset = await db.get(Asset, aid)
                if not asset or asset.user_id != current_user.id:
                    return MCPCallResponse(content=[{"type": "text", "text": f"资产 {aid} 不存在或无权限"}], is_error=True)

            await album_service.add_assets_to_album(db, album_id, asset_ids)
            return MCPCallResponse(content=[{"type": "text", "text": f"已将 {len(asset_ids)} 个资产添加到相册"}])

        elif name == "remove_from_album":
            from src.models import album_assets
            from sqlalchemy import delete
            
            album_id = args.get("album_id")
            album = await db.get(Album, album_id)
            if not album or album.user_id != current_user.id:
                return MCPCallResponse(content=[{"type": "text", "text": "相册不存在"}], is_error=True)
            
            asset_ids = args.get("asset_ids", [])
            for asset_id in asset_ids:
                await db.execute(
                    delete(album_assets).where(
                        album_assets.c.album_id == album_id,
                        album_assets.c.asset_id == asset_id
                    )
                )
            await db.commit()
            return MCPCallResponse(content=[{"type": "text", "text": f"已从相册移除 {len(asset_ids)} 个资产"}])

        elif name == "delete_album":
            from src.models import album_assets
            from sqlalchemy import delete
            
            album_id = args.get("album_id")
            album = await db.get(Album, album_id)
            if not album:
                return MCPCallResponse(content=[{"type": "text", "text": "相册不存在"}], is_error=True)
            
            # 删除关联
            await db.execute(delete(album_assets).where(album_assets.c.album_id == album_id))
            await db.delete(album)
            await db.commit()
            return MCPCallResponse(content=[{"type": "text", "text": "相册已删除"}])

        # === 集合管理 ===
        elif name == "list_collections":
            from src.models import Collection
            result = await db.execute(select(Collection).where(Collection.user_id == current_user.id))
            collections = result.scalars().all()
            collection_list = [{"id": c.id, "name": c.name, "description": c.description} for c in collections]
            return MCPCallResponse(content=[{"type": "text", "text": f"找到 {len(collection_list)} 个集合"}, {"type": "json", "data": collection_list}])

        elif name == "create_collection":
            from src.models import Collection, collection_assets
            from sqlalchemy import insert
            
            name_val = args.get("name")
            description = args.get("description")
            asset_ids = args.get("asset_ids", [])
            
            collection = Collection(name=name_val, description=description, user_id=current_user.id)
            db.add(collection)
            await db.commit()
            await db.refresh(collection)
            
            if asset_ids:
                for asset_id in asset_ids:
                    await db.execute(
                        insert(collection_assets).values(collection_id=collection.id, asset_id=asset_id)
                    )
                await db.commit()
            
            return MCPCallResponse(content=[{"type": "text", "text": f"集合 '{name_val}' 创建成功"}])

        elif name == "add_to_collection":
            from src.models import collection_assets
            from sqlalchemy import insert
            
            collection_id = args.get("collection_id")
            collection = await db.get(Collection, collection_id)
            if not collection or collection.user_id != current_user.id:
                return MCPCallResponse(content=[{"type": "text", "text": "集合不存在"}], is_error=True)
                
            asset_ids = args.get("asset_ids", [])
            for asset_id in asset_ids:
                # 校验资产
                asset = await db.get(Asset, asset_id)
                if not asset or asset.user_id != current_user.id:
                    continue
                await db.execute(
                    insert(collection_assets).values(collection_id=collection_id, asset_id=asset_id)
                )
            await db.commit()
            return MCPCallResponse(content=[{"type": "text", "text": f"已将 {len(asset_ids)} 个资产添加到集合"}])

        # === 文件夹管理 ===
        elif name == "list_folders":
            result = await db.execute(select(Folder).where(Folder.user_id == current_user.id))
            folders = result.scalars().all()
            folder_data = [{"id": f.id, "name": f.name, "path": f.path, "asset_count": f.asset_count} for f in folders]
            return MCPCallResponse(content=[{"type": "json", "data": folder_data}])

        elif name == "create_folder":
            name_val = args.get("name")
            parent_id = args.get("parent_id")
            folder = Folder(name=name_val, parent_id=parent_id, path=f"/{name_val}", user_id=current_user.id)
            db.add(folder)
            await db.commit()
            return MCPCallResponse(content=[{"type": "text", "text": f"文件夹 '{name_val}' 创建成功"}])

        # === 回收站 ===
        elif name == "list_trash":
            from src.schemas.asset import AssetListResponse
            limit = args.get("limit", 20)
            result = await db.execute(
                select(Asset)
                .filter(Asset.user_id == current_user.id)
                .filter(Asset.deleted_at.isnot(None))
                .limit(limit)
            )
            assets = result.scalars().all()
            items = [asset_to_response(a) for a in assets]
            return MCPCallResponse(content=[{"type": "text", "text": f"回收站中有 {len(items)} 个资产"}, {"type": "json", "data": items}])

        elif name == "restore_asset":
            asset_id = args.get("asset_id")
            asset = await db.get(Asset, asset_id)
            if asset and asset.user_id == current_user.id:
                asset.deleted_at = None
                await db.commit()
                return MCPCallResponse(content=[{"type": "text", "text": "资产已恢复"}])
            return MCPCallResponse(content=[{"type": "text", "text": "资产不存在"}], is_error=True)

        elif name == "empty_trash":
            result = await db.execute(select(Asset).filter(Asset.user_id == current_user.id, Asset.deleted_at.isnot(None)))
            deleted_assets = result.scalars().all()
            for asset in deleted_assets:
                await db.delete(asset)
            await db.commit()
            return MCPCallResponse(content=[{"type": "text", "text": f"已清空回收站（删除 {len(deleted_assets)} 个资产）"}])

        # === 私密保险库 ===
        elif name == "move_to_vault":
            asset_id = args.get("asset_id")
            asset = await db.get(Asset, asset_id)
            if asset and asset.user_id == current_user.id:
                asset.is_private = True
                await db.commit()
                return MCPCallResponse(content=[{"type": "text", "text": "资产已移入保险库"}])
            return MCPCallResponse(content=[{"type": "text", "text": "资产不存在"}], is_error=True)

        # === 分享 ===
        elif name == "create_share":
            from src.services.share import share_service
            from src.schemas.share import ShareCreate
            share_data = ShareCreate(
                asset_id=args.get("asset_id"),
                collection_id=args.get("collection_id"),
                password=args.get("password"),
                expires_in_days=args.get("expires_in_days")
            )
            # 校验所有权
            if share_data.asset_id:
                asset = await db.get(Asset, share_data.asset_id)
                if not asset or asset.user_id != current_user.id:
                    return MCPCallResponse(content=[{"type": "text", "text": "资产不存在"}], is_error=True)
            if share_data.collection_id:
                coll = await db.get(Collection, share_data.collection_id)
                if not coll or coll.user_id != current_user.id:
                    return MCPCallResponse(content=[{"type": "text", "text": "集合不存在"}], is_error=True)

            share = await share_service.create_share(db, share_data, user_id=current_user.id)
            return MCPCallResponse(content=[{"type": "text", "text": f"分享链接已创建: {share.share_url}"}])

        elif name == "list_shares":
            result = await db.execute(select(Share).where(Share.user_id == current_user.id))
            shares = result.scalars().all()
            share_data = [{"id": s.id, "share_code": s.share_code, "created_at": str(s.created_at)} for s in shares]
            return MCPCallResponse(content=[{"type": "json", "data": share_data}])

        # === 系统信息 ===
        elif name == "get_system_stats":
            stats = await stats_service.get_dashboard_stats(db, current_user.id)
            return MCPCallResponse(content=[{"type": "json", "data": stats}])

        elif name == "get_task_status":
            # 返回简化的任务状态
            status = {"pending_tasks": 0, "running_tasks": 0, "message": "系统运行正常"}
            return MCPCallResponse(content=[{"type": "json", "data": status}])

        else:
            raise HTTPException(status_code=400, detail=f"未知工具: {name}")

    except Exception as e:
        import traceback
        traceback.print_exc()
        return MCPCallResponse(content=[{"type": "text", "text": f"执行出错: {str(e)}"}], is_error=True)

# 保留旧接口兼容性
@router.get("/search", summary="对话式图片搜索 (旧接口)")
async def mcp_search_old(
    query: str = Query(..., description="自然语言查询语句"),
    page: int = 1,
    page_size: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """向下兼容的旧接口"""
    request = AssetSearchRequest(query=query, ai_search=True, page=page, page_size=page_size)
    assets, total = await asset_service.search_assets(db, request, current_user_id=current_user.id)
    return {
        "items": [asset_to_response(a) for a in assets],
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": (page * page_size) < total
    }
