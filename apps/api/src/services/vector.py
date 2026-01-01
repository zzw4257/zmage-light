"""
Qdrant 向量数据库服务
"""
from typing import List, Dict, Any, Optional
import uuid

from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
    SearchParams,
)

from src.config import settings


class VectorService:
    """Qdrant 向量服务"""
    
    def __init__(self):
        self.client = AsyncQdrantClient(url=settings.qdrant_url)
        self.collection_name = settings.qdrant_collection
        self.dimension = settings.embedding_dimension
    
    async def init_collection(self):
        """初始化集合"""
        try:
            collections_result = await self.client.get_collections()
            collection_names = [c.name for c in collections_result.collections]
            
            if self.collection_name not in collection_names:
                await self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(
                        size=self.dimension,
                        distance=Distance.COSINE,
                    ),
                )
                print(f"Created Qdrant collection: {self.collection_name}")
        except Exception as e:
            print(f"Failed to initialize Qdrant: {e}")
    
    async def upsert_vector(
        self,
        asset_id: int,
        vector: List[float],
        payload: Dict[str, Any],
    ) -> str:
        """
        插入或更新向量
        
        Args:
            asset_id: 资产 ID
            vector: 向量数据
            payload: 元数据
            
        Returns:
            向量 ID
        """
        vector_id = str(uuid.uuid4())
        
        await self.client.upsert(
            collection_name=self.collection_name,
            points=[
                PointStruct(
                    id=vector_id,
                    vector=vector,
                    payload={
                        "asset_id": asset_id,
                        **payload,
                    },
                )
            ],
        )
        
        return vector_id
    
    async def delete_vector(self, vector_id: str):
        """删除向量"""
        await self.client.delete(
            collection_name=self.collection_name,
            points_selector=[vector_id],
        )
    
    async def search_similar(
        self,
        vector: List[float],
        limit: int = 20,
        filter_conditions: Optional[Dict[str, Any]] = None,
        exclude_asset_ids: Optional[List[int]] = None,
    ) -> List[Dict[str, Any]]:
        """
        搜索相似向量
        
        Args:
            vector: 查询向量
            limit: 返回数量
            filter_conditions: 过滤条件
            exclude_asset_ids: 排除的资产 ID
            
        Returns:
            搜索结果列表
        """
        # 构建过滤器
        must_conditions = []
        must_not_conditions = []
        
        if filter_conditions:
            for key, value in filter_conditions.items():
                if value is not None:
                    must_conditions.append(
                        FieldCondition(key=key, match=MatchValue(value=value))
                    )
        
        if exclude_asset_ids:
            for asset_id in exclude_asset_ids:
                must_not_conditions.append(
                    FieldCondition(key="asset_id", match=MatchValue(value=asset_id))
                )
        
        query_filter = None
        if must_conditions or must_not_conditions:
            query_filter = Filter(
                must=must_conditions if must_conditions else None,
                must_not=must_not_conditions if must_not_conditions else None,
            )
        
        results = await self.client.search(
            collection_name=self.collection_name,
            query_vector=vector,
            limit=limit,
            query_filter=query_filter,
            search_params=SearchParams(hnsw_ef=128, exact=False),
        )
        
        return [
            {
                "asset_id": hit.payload.get("asset_id"),
                "score": hit.score,
                "payload": hit.payload,
            }
            for hit in results
        ]
    
    async def search_by_asset_id(
        self,
        asset_id: int,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        根据资产 ID 搜索相似资产
        
        Args:
            asset_id: 资产 ID
            limit: 返回数量
            
        Returns:
            相似资产列表
        """
        # 先获取该资产的向量
        scroll_result = await self.client.scroll(
            collection_name=self.collection_name,
            scroll_filter=Filter(
                must=[FieldCondition(key="asset_id", match=MatchValue(value=asset_id))]
            ),
            limit=1,
            with_vectors=True,
        )
        
        points, _ = scroll_result
        
        if not points:
            return []
        
        vector = points[0].vector
        
        # 搜索相似向量，排除自身
        return await self.search_similar(
            vector=vector,
            limit=limit + 1,
            exclude_asset_ids=[asset_id],
        )
    
    async def get_all_vectors(
        self,
        limit: int = 1000,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """获取所有向量（用于聚类）"""
        scroll_result = await self.client.scroll(
            collection_name=self.collection_name,
            limit=limit,
            offset=offset,
            with_vectors=True,
        )
        points, _ = scroll_result
        
        return [
            {
                "id": point.id,
                "asset_id": point.payload.get("asset_id"),
                "vector": point.vector,
                "payload": point.payload,
            }
            for point in points
        ]


# 单例
vector_service = VectorService()
