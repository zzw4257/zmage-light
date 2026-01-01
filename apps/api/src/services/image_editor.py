"""
图片编辑服务
"""
import io
from PIL import Image, ImageEnhance
from typing import Optional


class ImageEditorService:
    """图片编辑服务"""
    
    @staticmethod
    def process_image(
        image_data: bytes,
        crop: Optional[dict] = None,
        brightness: float = 1.0,
        contrast: float = 1.0,
        saturation: float = 1.0,
        sharpness: float = 1.0,
    ) -> bytes:
        """
        处理图片
        
        Args:
            image_data: 原始图片数据
            crop: 裁剪参数 {"x": int, "y": int, "width": int, "height": int}
            brightness: 亮度 (1.0 为原图)
            contrast: 对比度 (1.0 为原图)
            saturation: 饱和度 (1.0 为原图)
            sharpness: 锐度 (1.0 为原图)
            
        Returns:
            处理后的图片数据 (JPEG)
        """
        img = Image.open(io.BytesIO(image_data))
        
        # 转换模式以支持更多格式
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
            
        # 裁剪
        if crop:
            x = crop.get("x", 0)
            y = crop.get("y", 0)
            w = crop.get("width", img.width)
            h = crop.get("height", img.height)
            img = img.crop((x, y, x + w, y + h))
            
        # 亮度
        if brightness != 1.0:
            enhancer = ImageEnhance.Brightness(img)
            img = enhancer.enhance(brightness)
            
        # 对比度
        if contrast != 1.0:
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(contrast)
            
        # 饱和度 (颜色)
        if saturation != 1.0:
            enhancer = ImageEnhance.Color(img)
            img = enhancer.enhance(saturation)
            
        # 锐度
        if sharpness != 1.0:
            enhancer = ImageEnhance.Sharpness(img)
            img = enhancer.enhance(sharpness)
            
        # 输出为 JPEG
        output = io.BytesIO()
        img.save(output, format="JPEG", quality=95)
        return output.getvalue()


image_editor_service = ImageEditorService()
