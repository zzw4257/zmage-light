from fastapi import APIRouter, Depends, HTTPException, Body, UploadFile, File, Form
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import base64

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.models import get_db, Asset, User
from src.services import gemini_image_service, storage_service, asset_service
from src.services.gemini_image import GeminiImageModel, ImageAspectRatio, ImageSize
from src.utils.security import get_current_user

router = APIRouter(
    prefix="/ai",
    tags=["AI 生成"],
)

class AIImageGenerateRequest(BaseModel):
    prompt: str
    negative_prompt: Optional[str] = None
    model: GeminiImageModel = GeminiImageModel.NANO_BANANA
    aspect_ratio: ImageAspectRatio = ImageAspectRatio.SQUARE
    image_size: Optional[ImageSize] = None
    number_of_images: int = 1

class AIImageEditRequest(BaseModel):
    prompt: str
    reference_asset_id: int
    negative_prompt: Optional[str] = None
    model: GeminiImageModel = GeminiImageModel.NANO_BANANA_PRO
    aspect_ratio: ImageAspectRatio = ImageAspectRatio.SQUARE
    image_size: Optional[ImageSize] = None

class AIImageResponse(BaseModel):
    images: List[str] # Base64 encoded images
    mime_type: str = "image/jpeg"

@router.post("/generate", response_model=AIImageResponse)
async def generate_image(request: AIImageGenerateRequest):
    """
    文生图
    """
    try:
        images_bytes = await gemini_image_service.generate_image(
            prompt=request.prompt,
            model=request.model,
            negative_prompt=request.negative_prompt,
            aspect_ratio=request.aspect_ratio,
            image_size=request.image_size,
            number_of_images=request.number_of_images
        )
        
        b64_images = [base64.b64encode(img).decode("utf-8") for img in images_bytes]
        
        return AIImageResponse(images=b64_images)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Generate error: {e}")
        raise HTTPException(status_code=500, detail="图片生成失败，请检查 API Key 或网络连接")

@router.post("/edit", response_model=AIImageResponse)
async def edit_image(
    request: AIImageEditRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    图生图 / 图片编辑
    """
    from src.utils.security import VisibilityHelper
    # 获取参考图片
    asset = await db.get(Asset, request.reference_asset_id)
    if not asset or asset.deleted_at is not None or asset.is_private or asset.user_id != current_user.id:
        # 虽然逻辑相同，但保持导入 VisibilityHelper 以同步未来逻辑
        raise HTTPException(status_code=404, detail="参考资产不存在或不可用")
        
    # 下载图片数据
    try:
        if not await storage_service.file_exists(asset.file_path):
             raise HTTPException(status_code=404, detail="资产文件丢失")
             
        file_bytes = await storage_service.download_file(asset.file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"读取资产文件失败: {str(e)}")

    try:
        images_bytes = await gemini_image_service.generate_image(
            prompt=request.prompt,
            model=request.model,
            negative_prompt=request.negative_prompt,
            aspect_ratio=request.aspect_ratio,
            image_size=request.image_size,
            reference_images=[file_bytes],
            reference_mime_types=[asset.mime_type or "image/jpeg"],
        )
        
        b64_images = [base64.b64encode(img).decode("utf-8") for img in images_bytes]
        
        return AIImageResponse(images=b64_images)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Edit error: {e}")
        raise HTTPException(status_code=500, detail="图片编辑失败，请检查 API Key 或网络连接")
class AIChatMessage(BaseModel):
    role: str
    content: str

class AIChatRequest(BaseModel):
    messages: List[AIChatMessage]

class AIChatResponse(BaseModel):
    content: str
    role: str = "bot"
    tool_results: Optional[List[Dict[str, Any]]] = None

@router.post("/chat", response_model=AIChatResponse)
async def chat_with_agent(
    request: AIChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    智能对话，支持工具调用管理资产
    """
    from src.services.gemini import gemini_service
    from src.routers.mcp import TOOLS
    
    # 转换为 dict 列表
    history = [m.model_dump() for m in request.messages]
    
    try:
        response = await gemini_service.chat_with_tools(
            messages=history,
            available_tools=TOOLS,
            db=db,
            current_user=current_user
        )
        return AIChatResponse(**response)
    except Exception as e:
        print(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
