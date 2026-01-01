"""
Gemini 图像生成与编辑服务
"""
import base64
import json
import httpx
from typing import Optional, List, Dict, Any, Union
from enum import Enum

from src.config import settings

class GeminiImageModel(str, Enum):
    NANO_BANANA = "gemini-2.5-flash-image"       # Flash Image
    NANO_BANANA_PRO = "gemini-3-pro-image-preview" # Pro Image Preview

class ImageAspectRatio(str, Enum):
    SQUARE = "SQUARE"
    PORTRAIT = "PORTRAIT"
    LANDSCAPE = "LANDSCAPE"

class ImageSize(str, Enum):
    # 仅 Pro 支持
    SIZE_1024 = "1024" # 默认
    SIZE_2048 = "2048" # 2K
    SIZE_4096 = "4096" # 4K

class GeminiImageService:
    """Gemini 图像生成服务"""
    
    def __init__(self):
        self.api_key = settings.gemini_api_key
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models"

    def _get_url(self, model: str) -> str:
        return f"{self.base_url}/{model}:generateContent?key={self.api_key}"

    async def generate_image(
        self,
        prompt: str,
        model: GeminiImageModel = GeminiImageModel.NANO_BANANA,
        negative_prompt: Optional[str] = None,
        aspect_ratio: ImageAspectRatio = ImageAspectRatio.SQUARE,
        image_size: Optional[ImageSize] = None,
        reference_images: Optional[List[bytes]] = None,
        reference_mime_types: Optional[List[str]] = None,
        number_of_images: int = 1,
    ) -> List[bytes]:
        """
        生成或编辑图片
        
        Args:
            prompt: 提示词
            model: 模型选择
            negative_prompt: 负向提示词 (目前通过 prompt 规避)
            aspect_ratio: 宽高比
            image_size: 图片尺寸 (仅 Pro)
            reference_images: 参考图/底图列表 (二进制)
            reference_mime_types: 参考图 MIME 类型列表
            number_of_images: 生成数量 (目前 API 单次通常只返回一张，需循环调用或 check API 支持)
            
        Returns:
            生成的图片数据列表 (bytes)
        """
        
        if not self.api_key:
            raise ValueError("未配置 GEMINI_API_KEY")

        # 构建请求体 contents
        parts = []
        
        # 1. 提示词
        full_prompt = prompt
        if negative_prompt:
            full_prompt += f" (Do NOT include: {negative_prompt})"
            
        parts.append({"text": full_prompt})
        
        # 2. 参考图 (Inline Data)
        if reference_images and reference_mime_types:
            if len(reference_images) != len(reference_mime_types):
                raise ValueError("参考图数量与 MIME 类型数量不一致")
                
            # Pro 模型最多支持 14 张参考图
            max_refs = 14 if model == GeminiImageModel.NANO_BANANA_PRO else 1
            
            for i, (img_data, mime) in enumerate(zip(reference_images, reference_mime_types)):
                if i >= max_refs:
                    break
                b64_data = base64.b64encode(img_data).decode("utf-8")
                parts.append({
                    "inline_data": {
                        "mime_type": mime,
                        "data": b64_data
                    }
                })

        # 构建 generationConfig
        image_config = {
            "aspectRatio": aspect_ratio.value
        }
        
        # 仅 Pro 支持 imageSize
        if model == GeminiImageModel.NANO_BANANA_PRO and image_size:
             if image_size == ImageSize.SIZE_2048:
                 image_config["imageSize"] = "2K" 
             elif image_size == ImageSize.SIZE_4096:
                 image_config["imageSize"] = "4K"

        req_body = {
            "contents": [{
                "role": "user",
                "parts": parts
            }],
            "generationConfig": {
                "responseModalities": ["IMAGE"],
                "imageConfig": image_config
            }
        }
        
        # 发送请求 (异步)
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self._get_url(model.value),
                    json=req_body,
                    headers={"Content-Type": "application/json"},
                    timeout=60.0 # 生成图片可能较慢
                )
                response.raise_for_status()
                result_json = response.json()
            except httpx.HTTPStatusError as e:
                print(f"Gemini API Error: {e.response.text}")
                # 尝试提取错误信息
                try:
                    err_detail = e.response.json()
                    detail = err_detail.get('error', {}).get('message', e.response.text)
                except:
                    detail = e.response.text
                raise ValueError(f"API请求失败: {detail}")
            except Exception as e:
                print(f"Gemini Network Error: {e}")
                raise e

        # 解析响应
        images = []
        
        if "candidates" not in result_json or not result_json["candidates"]:
            print("Gemini API No candidates returned:", result_json)
            # 可能是 content blocked
            if result_json.get("promptFeedback", {}).get("blockReason"):
                raise ValueError(f"生成被拦截: {result_json['promptFeedback']['blockReason']}")
            return []
            
        candidate = result_json["candidates"][0]
        if candidate.get("finishReason") == "SAFETY":
             raise ValueError("生成被安全过滤器拦截")

        if "content" in candidate and "parts" in candidate["content"]:
            for part in candidate["content"]["parts"]:
                # 兼容 inlineData (camel) 和 inline_data (snake)
                inline_data = part.get("inlineData") or part.get("inline_data")
                if inline_data and "data" in inline_data:
                    img_bytes = base64.b64decode(inline_data["data"])
                    images.append(img_bytes)
        
        return images

gemini_image_service = GeminiImageService()
