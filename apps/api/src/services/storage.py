"""
MinIO 存储服务
"""
import io
import hashlib
from typing import Optional, BinaryIO
from datetime import timedelta
from fastapi.concurrency import run_in_threadpool

import boto3
from botocore.config import Config
from PIL import Image

from src.config import settings


class StorageService:
    """MinIO 存储服务"""
    
    def __init__(self):
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            config=Config(signature_version="s3v4"),
        )
        self.bucket = settings.s3_bucket
        
    async def init_bucket(self):
        """初始化存储桶"""
        def _init():
            try:
                self.client.head_bucket(Bucket=self.bucket)
            except Exception:
                print(f"Creating bucket: {self.bucket}")
                self.client.create_bucket(Bucket=self.bucket)
        
        await run_in_threadpool(_init)
    
    async def upload_file(
        self,
        file_data: BinaryIO,
        file_path: str,
        content_type: str = "application/octet-stream",
    ) -> str:
        """
        上传文件到 MinIO
        
        Args:
            file_data: 文件数据
            file_path: 存储路径
            content_type: 文件类型
            
        Returns:
            文件路径
        """
        await run_in_threadpool(
            self.client.upload_fileobj,
            file_data,
            self.bucket,
            file_path,
            ExtraArgs={"ContentType": content_type},
        )
        return file_path
    
    async def upload_bytes(
        self,
        data: bytes,
        file_path: str,
        content_type: str = "application/octet-stream",
    ) -> str:
        """上传字节数据"""
        file_obj = io.BytesIO(data)
        return await self.upload_file(file_obj, file_path, content_type)
    
    async def download_file(self, file_path: str) -> bytes:
        """下载文件"""
        response = await run_in_threadpool(
            self.client.get_object, Bucket=self.bucket, Key=file_path
        )
        return await run_in_threadpool(response["Body"].read)
    
    async def delete_file(self, file_path: str) -> bool:
        """删除文件"""
        try:
            await run_in_threadpool(
                self.client.delete_object, Bucket=self.bucket, Key=file_path
            )
            return True
        except Exception:
            return False
    
    async def file_exists(self, file_path: str) -> bool:
        """检查文件是否存在"""
        try:
            await run_in_threadpool(
                self.client.head_object, Bucket=self.bucket, Key=file_path
            )
            return True
        except Exception:
            return False
    
    def get_file_url(self, file_path: str, expires_in: int = 3600) -> str:
        """
        获取文件访问 URL
        
        Args:
            file_path: 文件路径
            expires_in: 过期时间(秒)
            
        Returns:
            预签名 URL
        """
        url = self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": file_path},
            ExpiresIn=expires_in,
        )
        # 替换内部地址为外部地址
        return url.replace("http://minio:9000", f"http://localhost:4257/api/storage")
    
    def get_public_url(self, file_path: str) -> str:
        """获取公开访问 URL (通过 API 代理)"""
        return f"/api/storage/{file_path}"
    
    async def generate_thumbnail(
        self,
        image_data: bytes,
        max_size: tuple = (400, 400),
        quality: int = 85,
    ) -> bytes:
        """生成缩略图"""
        def _generate():
            img = Image.open(io.BytesIO(image_data))
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            output = io.BytesIO()
            img.save(output, format="JPEG", quality=quality, optimize=True)
            return output.getvalue()
            
        return await run_in_threadpool(_generate)
    
    async def resize_image(
        self,
        image_data: bytes,
        width: Optional[int] = None,
        height: Optional[int] = None,
        aspect_ratio: Optional[str] = None,
        format: str = "JPEG",
        quality: int = 90,
    ) -> bytes:
        """调整图片尺寸"""
        def _resize():
            img = Image.open(io.BytesIO(image_data))
            original_width, original_height = img.size
            if img.mode in ("RGBA", "P") and format.upper() == "JPEG":
                img = img.convert("RGB")
            
            if aspect_ratio:
                ratio_w, ratio_h = map(int, aspect_ratio.split(":"))
                target_ratio = ratio_w / ratio_h
                current_ratio = original_width / original_height
                if current_ratio > target_ratio:
                    new_width = int(original_height * target_ratio)
                    left = (original_width - new_width) // 2
                    img = img.crop((left, 0, left + new_width, original_height))
                else:
                    new_height = int(original_width / target_ratio)
                    top = (original_height - new_height) // 2
                    img = img.crop((0, top, original_width, top + new_height))
            
            if width and height:
                img = img.resize((width, height), Image.Resampling.LANCZOS)
            elif width:
                ratio = width / img.width
                img = img.resize((width, int(img.height * ratio)), Image.Resampling.LANCZOS)
            elif height:
                ratio = height / img.height
                img = img.resize((int(img.width * ratio), height), Image.Resampling.LANCZOS)
            
            output = io.BytesIO()
            img.save(output, format=format.upper(), quality=quality, optimize=True)
            return output.getvalue()
            
        return await run_in_threadpool(_resize)


def calculate_file_hash(file_data: bytes) -> str:
    """计算文件 SHA256 哈希"""
    return hashlib.sha256(file_data).hexdigest()


# 单例
storage_service = StorageService()
