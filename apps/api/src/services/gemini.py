"""
Gemini AI 服务
"""
import json
import base64
from typing import List, Dict, Any, Optional
import numpy as np

from src.config import settings


class GeminiService:
    """Gemini AI 服务"""
    
    def __init__(self):
        self.api_key = settings.gemini_api_key
        self._client = None
    
    @property
    def client(self):
        """延迟初始化客户端"""
        if not self.api_key or self.api_key == "YOUR_GEMINI_API_KEY":
            return None
        if self._client is None:
            from google import genai
            try:
                self._client = genai.Client(api_key=self.api_key)
            except Exception as e:
                print(f"Failed to initialize Gemini client: {e}")
                return None
        return self._client
    
    async def analyze_image(self, image_data: bytes, mime_type: str = "image/jpeg") -> Dict[str, Any]:
        """
        分析图片，生成标题、描述、标签
        """
        if not self.client:
            return {
                "title": "图片资产",
                "description": "由于未配置 AI 服务，暂无详细描述。",
                "tags": ["未分析"],
                "ocr_text": "",
                "objects": [],
                "scene": "",
                "colors": []
            }

        from google.genai import types
        
        prompt = """请分析这张图片，并以 JSON 格式返回以下信息：
{
    "title": "一句话标题（简洁、描述性）",
    "description": "详细描述（2-3句话，包含场景、主体、氛围等）",
    "tags": ["标签1", "标签2", "标签3", "标签4", "标签5"],
    "ocr_text": "图片中的文字（如果有的话，否则为空字符串）",
    "objects": ["识别到的物体1", "物体2"],
    "scene": "场景类型（如：室内、户外、自然、城市等）",
    "colors": ["主要颜色1", "颜色2"]
}

要求：
1. 标签要具体、可搜索，包含物体、场景、情感、风格等
2. 描述要详细但不冗长
3. 如果有文字，完整提取
4. 只返回 JSON，不要其他内容"""
        
        try:
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    types.Content(
                        parts=[
                            types.Part(
                                inline_data=types.Blob(
                                    mime_type=mime_type,
                                    data=image_data
                                )
                            ),
                            types.Part(text=prompt)
                        ]
                    )
                ]
            )
            
            # 解析 JSON 响应
            text = response.text.strip()
            # 移除可能的 markdown 代码块标记
            if text.startswith("```json"):
                text = text[7:]
            elif text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            
            result = json.loads(text.strip())
            return result
            
        except Exception as e:
            print(f"Gemini 图片分析失败: {e}")
            return {
                "title": "",
                "description": "",
                "tags": [],
                "ocr_text": "",
                "objects": [],
                "scene": "",
                "colors": []
            }
    
    async def analyze_video(self, video_path: str) -> Dict[str, Any]:
        """
        分析视频，生成摘要和标签
        """
        if not self.client:
            return {
                "title": "视频资产",
                "description": "由于未配置 AI 服务，暂无详细描述。",
                "tags": ["未分析"],
                "key_moments": [],
                "transcript": ""
            }

        prompt = """请分析这个视频，并以 JSON 格式返回以下信息：
{
    "title": "视频标题",
    "description": "视频内容描述",
    "tags": ["标签1", "标签2", "标签3"],
    "key_moments": [
        {"time": "00:00", "description": "关键时刻描述"}
    ],
    "transcript": "视频中的对话或旁白（如果有）"
}

只返回 JSON，不要其他内容"""

        try:
            # 上传视频文件
            video_file = self.client.files.upload(file=video_path)
            
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[video_file, prompt]
            )
            
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            elif text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            
            return json.loads(text.strip())
            
        except Exception as e:
            print(f"Gemini 视频分析失败: {e}")
            return {
                "title": "",
                "description": "",
                "tags": [],
                "key_moments": [],
                "transcript": ""
            }
    
    async def generate_embedding(self, text: str, task_type: str = "RETRIEVAL_DOCUMENT") -> List[float]:
        """
        生成文本向量嵌入
        """
        if not self.client:
            return [0.0] * settings.embedding_dimension

        from google.genai import types
        
        try:
            result = self.client.models.embed_content(
                model="gemini-embedding-001",
                contents=text,
                config=types.EmbedContentConfig(
                    output_dimensionality=settings.embedding_dimension,
                    task_type=task_type,
                ),
            )
            
            vec = np.array(result.embeddings[0].values, dtype=np.float32)
            # 归一化
            vec = vec / (np.linalg.norm(vec) + 1e-12)
            return vec.tolist()
            
        except Exception as e:
            print(f"Gemini 嵌入生成失败: {e}")
            return [0.0] * settings.embedding_dimension
    
    async def generate_query_embedding(self, query: str) -> List[float]:
        """生成查询向量"""
        return await self.generate_embedding(query, task_type="RETRIEVAL_QUERY")
    
    async def suggest_albums(
        self,
        assets_info: List[Dict[str, Any]],
        existing_albums: List[str],
    ) -> List[Dict[str, Any]]:
        if not self.client:
            return []

        prompt = f"""根据以下资产信息，建议创建新的相册。

已有相册：{', '.join(existing_albums) if existing_albums else '无'}

资产信息：
{json.dumps(assets_info, ensure_ascii=False, indent=2)}

请分析这些资产，找出可以归类的主题、事件、时间段或场景，建议创建相册。

以 JSON 格式返回建议：
{{
    "suggestions": [
        {{
            "name": "相册名称",
            "description": "相册描述",
            "reason": "建议理由（为什么这些资产应该归为一个相册）",
            "asset_ids": [1, 2, 3],
            "cover_asset_id": 1,
            "confidence": 0.85
        }}
    ]
}}

要求：
1. 相册名称要有意义、易于理解
2. 每个相册至少包含 3 个资产
3. 不要与已有相册重复
4. confidence 表示建议的置信度 (0-1)
5. 只返回 JSON，不要其他内容"""

        try:
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            elif text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            
            result = json.loads(text.strip())
            return result.get("suggestions", [])
            
        except Exception as e:
            print(f"Gemini 相册建议失败: {e}")
            return []
    
    async def semantic_search_rerank(
        self,
        query: str,
        candidates: List[Dict[str, Any]],
        top_k: int = 20,
    ) -> List[Dict[str, Any]]:
        if not self.client or not candidates:
            return candidates[:top_k]
        
        prompt = f"""用户搜索："{query}"

候选资产：
{json.dumps(candidates[:50], ensure_ascii=False, indent=2)}

请根据用户搜索意图，对候选资产进行相关性排序。

以 JSON 格式返回排序结果：
{{
    "ranked_ids": [资产ID按相关性从高到低排列],
    "explanation": "排序理由"
}}

只返回 JSON，不要其他内容"""

        try:
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            elif text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            
            result = json.loads(text.strip())
            ranked_ids = result.get("ranked_ids", [])
            
            # 按排序结果重新排列
            id_to_candidate = {c["id"]: c for c in candidates}
            ranked = []
            for asset_id in ranked_ids[:top_k]:
                if asset_id in id_to_candidate:
                    ranked.append(id_to_candidate[asset_id])
            
            return ranked
            
        except Exception as e:
            print(f"Gemini 重排序失败: {e}")
            return candidates[:top_k]


    async def chat_with_tools(
        self,
        messages: List[Dict[str, str]],
        available_tools: List[Any],
        db: Any,
        current_user: Any,
    ) -> Dict[str, Any]:
        """
        具有工具调用能力的对话模型
        """
        if not self.client:
            return {"content": "AI 服务未配置", "role": "bot"}

        from google.genai import types
        
        # 转换工具定义为 Gemini 格式
        gemini_tools = []
        for tool in available_tools:
            gemini_tools.append(types.Tool(
                function_declarations=[
                    types.FunctionDeclaration(
                        name=tool.name,
                        description=tool.description,
                        parameters=tool.input_schema
                    )
                ]
            ))

        # 准备历史消息
        history = []
        for msg in messages[:-1]:
            history.append(types.Content(
                role="user" if msg["role"] == "user" else "model",
                parts=[types.Part(text=msg["content"])]
            ))

        try:
            # 创建会话
            chat = self.client.chats.create(
                model="gemini-2.5-flash",
                config=types.GenerateContentConfig(
                    tools=gemini_tools,
                    system_instruction="你是一个专业的图片管理助手。你可以通过工具搜索图片、更新元数据、管理相册等。请优先使用工具来获取准确信息，并在操作后给用户明确的反馈。"
                ),
                history=history
            )

            # 发送当前消息
            response = chat.send_message(messages[-1]["content"])
            
            # 处理工具调用循环
            all_tool_results = []
            
            while response.candidates[0].content.parts and any(p.function_call for p in response.candidates[0].content.parts):
                tool_results = []
                for part in response.candidates[0].content.parts:
                    if part.function_call:
                        call = part.function_call
                        print(f"🤖 AI 请求调用工具: {call.name} 参数: {call.args}")
                        
                        # 执行工具逻辑
                        from src.routers.mcp import call_tool, MCPCallRequest
                        mcp_req = MCPCallRequest(name=call.name, arguments=call.args)
                        mcp_res = await call_tool(mcp_req, db, current_user)
                        
                        # 记录结果供前端展示
                        all_tool_results.append({
                            "tool": call.name,
                            "args": call.args,
                            "result": mcp_res.content
                        })
                        
                        # 转换结果给模型
                        tool_results.append(types.Part(
                            function_response=types.FunctionResponse(
                                name=call.name,
                                response={"result": mcp_res.content}
                            )
                        ))
                
                # 将工具结果发送回模型获取最终回复
                response = chat.send_message(tool_results)

            return {
                "content": response.text,
                "role": "bot",
                "tool_results": all_tool_results
            }

        except Exception as e:
            print(f"Gemini Tool-Chat 失败: {e}")
            return {"content": f"对话发生错误: {str(e)}", "role": "bot"}

# 单例
gemini_service = GeminiService()
