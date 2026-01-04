"""
私密保险库相关 API 路由
"""
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Body, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from src.models import get_db, Asset, User
from src.schemas import AssetListResponse, AssetResponse
from src.routers.assets import asset_to_response
from src.utils.security import verify_password, get_password_hash, create_access_token
from src.routers.auth import get_current_user
from src.config import settings

# 简单的请求体 Schema
from pydantic import BaseModel

class PinSetup(BaseModel):
    pin: str

class PinVerify(BaseModel):
    pin: str

class VaultToken(BaseModel):
    vault_token: str
    expires_in: int


router = APIRouter(prefix="/vault", tags=["私密保险库"])


async def get_current_user_with_vault(
    user: User = Depends(get_current_user),
):
    """获取当前用户"""
    return user


@router.post("/setup", summary="设置/重置保险库 PIN")
async def setup_pin(
    data: PinSetup,
    user: User = Depends(get_current_user_with_vault),
    db: AsyncSession = Depends(get_db),
):
    """设置初始 PIN"""
    # 实际场景可能需要验证旧 PIN，或者只有管理员能重置
    user.vault_pin_hash = get_password_hash(data.pin)
    await db.commit()
    return {"message": "保险库 PIN 已设置"}


@router.post("/verify", response_model=VaultToken, summary="验证 PIN 并获取临时 Token")
async def verify_pin(
    data: PinVerify,
    user: User = Depends(get_current_user_with_vault),
):
    """验证 PIN，正确则颁发 vault_token"""
    if not user.vault_pin_hash:
        raise HTTPException(status_code=400, detail="未设置 Vault PIN")
        
    if not verify_password(data.pin, user.vault_pin_hash):
        raise HTTPException(status_code=403, detail="PIN 码错误")
    
    # 颁发一个临时的 Token，Subject 为 vault_access
    # 也可以直接复用 JWT 机制，签发一个带特殊 Scope 的 Token
    expires = timedelta(minutes=15) # 15分钟有效期
    token = create_access_token(
        data={"sub": "vault_access", "user_id": user.id},
        expires_delta=expires
    )
    
    return {
        "vault_token": token,
        "expires_in": 15 * 60
    }


from jose import jwt, JWTError

def verify_vault_token(request: Request):
    """
    依赖项：验证 Header 中的 X-Vault-Token
    校验 JWT 签名和过期时间
    """
    token = request.headers.get("X-Vault-Token")
    if not token:
        raise HTTPException(status_code=401, detail="需要保险库凭证 (X-Vault-Token)")
    
    try:
        payload = jwt.decode(
            token, 
            settings.jwt_secret, 
            algorithms=[settings.jwt_algorithm]
        )
        if payload.get("sub") != "vault_access":
            raise HTTPException(status_code=403, detail="无效的保险库凭证类型")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="保险库凭证无效或已过期")


@router.get("/assets", response_model=AssetListResponse, summary="获取保险库资产")
async def list_vault_assets(
    _authorized: bool = Depends(verify_vault_token),
    page: int = 1, 
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
):
    from src.utils.security import VisibilityHelper
    query = select(Asset).where(
        Asset.user_id == _authorized["user_id"],
        VisibilityHelper.private_assets()
    )
    count_query = select(func.count(Asset.id)).where(
        Asset.user_id == _authorized["user_id"],
        VisibilityHelper.private_assets()
    )
    
    total = await db.scalar(count_query)
    
    query = query.order_by(Asset.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    assets = result.scalars().all()
    
    return AssetListResponse(
        items=[asset_to_response(a) for a in assets],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.post("/assets/{asset_id}/move-in", summary="移入保险库")
async def move_in_vault(
    asset_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """将资产移入保险库"""
    asset = await db.get(Asset, asset_id)
    if not asset or asset.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="资产不存在")
        
    asset.is_private = True
    await db.commit()
    return {"message": "已移入保险库"}


@router.post("/assets/{asset_id}/move-out", summary="移出保险库")
async def move_out_vault(
    asset_id: int,
    _authorized: dict = Depends(verify_vault_token),
    db: AsyncSession = Depends(get_db),
):
    """将资产移出保险库 (变回公开)"""
    asset = await db.get(Asset, asset_id)
    if not asset or asset.user_id != _authorized["user_id"]:
        raise HTTPException(status_code=404, detail="资产不存在")
        
    asset.is_private = False
    await db.commit()
    return {"message": "已移出保险库"}


@router.post("/check-status", summary="检查保险库状态")
async def check_vault_status(
    user: User = Depends(get_current_user_with_vault),
):
    """检查是否已设置 PIN"""
    return {"has_pin": bool(user.vault_pin_hash)}
