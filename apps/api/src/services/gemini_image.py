"""
Gemini 图像生成与编辑服务 - 专用机 (Nano Banana & Pro)
"""
import base64
import json
import httpx
from typing import Optional, List, Dict, Any, Union
from enum import Enum

from src.config import settings

class GeminiImageModel(str, Enum):
    NANO_BANANA = "gemini-2.5-flash-image"
    NANO_BANANA_PRO = "gemini-3-pro-image-preview"

class ImageAspectRatio(str, Enum):
    """Gemini API 官方支持的 10 种标准宽高比"""
    RATIO_1_1 = "1:1"
    RATIO_2_3 = "2:3"
    RATIO_3_2 = "3:2"
    RATIO_3_4 = "3:4"
    RATIO_4_3 = "4:3"
    RATIO_4_5 = "4:5"
    RATIO_5_4 = "5:4"
    RATIO_9_16 = "9:16"
    RATIO_16_9 = "16:9"
    RATIO_21_9 = "21:9"


# 预计算每个标准比例的数值，用于快速比对
STANDARD_RATIOS = {
    "1:1": 1.0,
    "2:3": 2 / 3,
    "3:2": 3 / 2,
    "3:4": 3 / 4,
    "4:3": 4 / 3,
    "4:5": 4 / 5,
    "5:4": 5 / 4,
    "9:16": 9 / 16,
    "16:9": 16 / 9,
    "21:9": 21 / 9,
}


def find_closest_aspect_ratio(width: int, height: int) -> ImageAspectRatio:
    """
    根据图片实际尺寸，自动匹配最接近的 Gemini 支持的标准宽高比。
    
    Args:
        width: 图片宽度
        height: 图片高度
        
    Returns:
        最接近的标准宽高比枚举值
    """
    if width <= 0 or height <= 0:
        return ImageAspectRatio.RATIO_1_1  # 默认回落
    
    actual_ratio = width / height
    
    best_match = "1:1"
    min_error = float("inf")
    
    for ratio_str, ratio_value in STANDARD_RATIOS.items():
        error = abs(actual_ratio - ratio_value)
        if error < min_error:
            min_error = error
            best_match = ratio_str
    
    # 将字符串转回枚举
    for member in ImageAspectRatio:
        if member.value == best_match:
            return member
    
    return ImageAspectRatio.RATIO_1_1


class ImageSize(str, Enum):
    SIZE_2K = "2K"
    SIZE_4K = "4K"

class GeminiImageService:
    """Gemini (Flash Image / Pro Image Preview) 服务"""
    
    def __init__(self):
        self.api_key = settings.gemini_api_key
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models"

    def _get_url(self, model: str) -> str:
        # 使用 generateContent 端点
        return f"{self.base_url}/{model}:generateContent?key={self.api_key}"

    async def generate_image(
        self,
        prompt: str,
        model: GeminiImageModel = GeminiImageModel.NANO_BANANA,
        negative_prompt: Optional[str] = None,
        aspect_ratio: ImageAspectRatio = ImageAspectRatio.RATIO_1_1,
        image_size: Optional[ImageSize] = None,
        reference_images: Optional[List[bytes]] = None,
        reference_mime_types: Optional[List[str]] = None,
        number_of_images: int = 1,
    ) -> List[bytes]:
        """
        生成或编辑图片 (采用 GenerateContent 模式)
        """
        if not self.api_key:
            raise ValueError("未配置 GEMINI_API_KEY")

        # 构造 parts
        parts = [{"text": prompt}]
        
        # 添加参考图 (Pro 支持最多 14 张)
        if reference_images:
            for i, img_data in enumerate(reference_images):
                mime = (reference_mime_types[i] if reference_mime_types and i < len(reference_mime_types) else "image/jpeg")
                parts.append({
                    "inlineData": {
                        "mimeType": mime,
                        "data": base64.b64encode(img_data).decode("utf-8")
                    }
                })

        # 构建请求体
        image_config = {
            "aspectRatio": aspect_ratio.value
        }
        
        # 只有 Pro 支持 imageSize
        if model == GeminiImageModel.NANO_BANANA_PRO and image_size:
            image_config["imageSize"] = image_size.value

        req_body = {
            "contents": [
                {
                    "role": "user",
                    "parts": parts
                }
            ],
            "generationConfig": {
                "responseModalities": ["IMAGE", "TEXT"],
                "imageConfig": image_config,
                "candidateCount": 1 # 目前 API 限制
            }
        }
        
        # 负向提示词 (如果模型支持)
        if negative_prompt:
             # 有些模型通过 prompt 尾缀支持，或者在某些特定字段，这里按通用 prompt 处理
             parts[0]["text"] += f" (Negative prompt: {negative_prompt})"

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self._get_url(model.value),
                    json=req_body,
                    timeout=120.0
                )
                response.raise_for_status()
                result_json = response.json()
            except httpx.HTTPStatusError as e:
                print(f"Gemini API Error: {e.response.text}")
                raise ValueError(f"AI生成请求失败: {e.response.text}")

        images = []
        # 解析返回的 parts
        if "candidates" in result_json and result_json["candidates"]:
            candidate = result_json["candidates"][0]
            
            # 检查结束原因
            finish_reason = candidate.get("finishReason")
            if finish_reason and finish_reason != "STOP":
                safety_ratings = candidate.get("safetyRatings", [])
                print(f"Gemini Issue: FinishReason={finish_reason}, Safety={safety_ratings}")
                if finish_reason == "SAFETY":
                     raise ValueError("图片生成被安全策略拦截，请尝试调整提示词")
                elif finish_reason == "RECITATION":
                     raise ValueError("图片生成涉及版权内容被拦截")
                else:
                     raise ValueError(f"AI 生成中断: {finish_reason}")

            if "content" in candidate and "parts" in candidate["content"]:
                for part in candidate["content"]["parts"]:
                    # 兼容 inlineData 和 inline_data
                    inline_data = part.get("inlineData") or part.get("inline_data")
                    if inline_data and "data" in inline_data:
                        images.append(base64.b64decode(inline_data["data"]))
        
        return images

gemini_image_service = GeminiImageService()
