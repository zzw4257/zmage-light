"""
图片编辑服务
"""
import io
from PIL import Image, ImageEnhance, ImageOps
from typing import Optional, List, Dict, Any


class ImageEditorService:
    """图片编辑服务"""
    
    def process_history(self, image_data: bytes, ops: List[Dict[str, Any]]) -> bytes:
        """
        基于操作历史处理图片
        
        Args:
            image_data: 原始图片
            ops: 操作列表 [{type: 'rotate', params: {degree: 90}}, ...]
        """
        img = Image.open(io.BytesIO(image_data))
        
        # 自动旋转 (根据 EXIF)
        img = ImageOps.exif_transpose(img)
        
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
            
        for op in ops:
            try:
                op_type = op.get("type")
                params = op.get("params", {})
                
                if op_type == "rotate":
                    # 顺时针旋转
                    degree = float(params.get("degree", 0))
                    # PIL rotate is CCW, so we use negative for CW
                    # expand=True ensures the full rotated image is kept
                    img = img.rotate(-degree, expand=True, resample=Image.BICUBIC)
                    
                elif op_type == "crop":
                    current_w, current_h = img.size
                    x = int(params.get("x", 0))
                    y = int(params.get("y", 0))
                    w = int(params.get("width", current_w))
                    h = int(params.get("height", current_h))
                    
                    # Bounds checking & clamping
                    x = max(0, x)
                    y = max(0, y)
                    w = min(current_w - x, w)
                    h = min(current_h - y, h)
                    
                    if w > 0 and h > 0:
                        img = img.crop((x, y, x + w, y + h))
                    
                elif op_type == "adjust":
                    if "brightness" in params:
                        img = ImageEnhance.Brightness(img).enhance(float(params["brightness"]))
                    if "contrast" in params:
                        img = ImageEnhance.Contrast(img).enhance(float(params["contrast"]))
                    if "saturation" in params:
                        img = ImageEnhance.Color(img).enhance(float(params["saturation"]))
                    if "sharpness" in params:
                        img = ImageEnhance.Sharpness(img).enhance(float(params["sharpness"]))
                        
                elif op_type == "flip":
                    if params.get("horizontal"):
                        img = ImageOps.mirror(img)
                    if params.get("vertical"):
                        img = ImageOps.flip(img)
                        
            except Exception as e:
                # Log error but continue with other ops? Or stop?
                # Professional: Skip failed op but warn. For now, just print/log.
                print(f"Image processing op failed: {op_type} - {e}")

        output = io.BytesIO()
        # Ensure RGB mode for JPEG
        if img.mode != "RGB":
            img = img.convert("RGB")
            
        img.save(output, format="JPEG", quality=95)
        return output.getvalue()
    
    def process_image(
        self,
        image_data: bytes,
        crop: Optional[dict] = None,
        brightness: float = 1.0,
        contrast: float = 1.0,
        saturation: float = 1.0,
        sharpness: float = 1.0,
    ) -> bytes:
        """
        处理图片 (Legacy Wrapper)
        """
        ops = []
        if crop:
            ops.append({"type": "crop", "params": crop})
            
        # Adjustments
        adjust_params = {}
        if brightness != 1.0: adjust_params["brightness"] = brightness
        if contrast != 1.0: adjust_params["contrast"] = contrast
        if saturation != 1.0: adjust_params["saturation"] = saturation
        if sharpness != 1.0: adjust_params["sharpness"] = sharpness
        
        if adjust_params:
            ops.append({"type": "adjust", "params": adjust_params})
            
        return self.process_history(image_data, ops)


image_editor_service = ImageEditorService()
