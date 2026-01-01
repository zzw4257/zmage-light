from datetime import datetime, timedelta, timezone
import logging
from typing import Any, Dict, List, Optional, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select, func, and_
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from src.models import Asset, User, get_db
from src.config import settings

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("zmage")

class VisibilityHelper:
    """可见性辅助工具"""
    @staticmethod
    def active_assets():
        """返回公开且未删除的资产过滤条件"""
        return and_(Asset.deleted_at.is_(None), Asset.is_private.is_(False))

    @staticmethod
    def trashed_assets():
        """返回已删除的资产过滤条件"""
        return Asset.deleted_at.isnot(None)

    @staticmethod
    def private_assets():
        """返回私密资产过滤条件"""
        return and_(Asset.is_private.is_(True), Asset.deleted_at.is_(None))

# 密码哈希上下文
# 使用 pbkdf2_sha256 作为首选，兼容 bcrypt
pwd_context = CryptContext(schemes=["pbkdf2_sha256", "bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """生成密码哈希"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """创建访问令牌"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return encoded_jwt


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """获取当前登录用户"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无法验证凭据",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="用户不活跃")
        
    return user
