"""
认证相关 API 路由
"""
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.models import get_db, User
from src.schemas.user import (
    UserCreate, UserResponse, Token,
    SMSRequest, SMSLogin, EmailOTPRequest, EmailOTPLogin,
    AliyunOneKeyLogin, SocialLoginRequest
)
from src.utils.security import verify_password, get_password_hash, create_access_token, get_current_user
from src.config import settings

router = APIRouter(prefix="/auth", tags=["认证管理"])


@router.post("/register", response_model=UserResponse, summary="用户注册")
async def register(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    注册新用户
    
    - **username**: 用户名 (唯一)
    - **email**: 邮箱 (唯一且格式校验)
    - **password**: 密码 (长度 >= 6)
    """
    # 检查用户名是否已存在
    result = await db.execute(select(User).where(User.username == user_in.username))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已存在"
        )
    
    # 检查邮箱是否已存在
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该邮箱已被注册"
        )
    
    # 创建新用户
    db_user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
    )
    
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    
    return db_user


@router.post("/login", response_model=Token, summary="用户登录")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """用户登录接口，获取 Access Token"""
    # 查找用户 (支持用户名或邮箱登录)
    result = await db.execute(
        select(User).where(
            (User.username == form_data.username) | (User.email == form_data.username)
        )
    )
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户状态异常"
        )
    
    # 创建 Token
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.get("/me", response_model=UserResponse, summary="获取当前用户信息")
async def get_me(current_user: User = Depends(get_current_user)):
    """获取当前登录用户信息"""
    return current_user
@router.post("/sms/request", summary="申请发送短信验证码")
async def request_sms_code(data: SMSRequest):
    """
    发送短信验证码 (阿里云 SMS)
    """
    # TODO: 集成阿里云 SMS SDK
    return {"message": "验证码已发送", "mock_code": "123456"}


@router.post("/sms/login", response_model=Token, summary="短信验证码登录")
async def login_by_sms(data: SMSLogin, db: AsyncSession = Depends(get_db)):
    """
    通过短信验证码登录/注册
    """
    # TODO: 校验验证码逻辑
    # TODO: 查库，不存在则自动注册
    return {"access_token": "mock_token", "token_type": "bearer"}


@router.post("/aliyun/onekey/init", summary="初始化一键登录")
async def init_aliyun_onekey():
    """
    获取一键登录所需的 AccessToken/JwtToken
    """
    # TODO: 调阿里云 GetAuthToken
    return {"access_token": "mock_access", "jwt_token": "mock_jwt"}


@router.post("/aliyun/onekey/verify", response_model=Token, summary="一键登录验证")
async def verify_aliyun_onekey(data: AliyunOneKeyLogin, db: AsyncSession = Depends(get_db)):
    """
    提交 SpToken 换取手机号并登录
    """
    # TODO: 调阿里云 GetPhoneWithToken
    return {"access_token": "mock_token", "token_type": "bearer"}


@router.post("/email/request", summary="通过邮件发送验证码")
async def request_email_otp(data: EmailOTPRequest):
    """
    发送邮箱验证码 (阿里云 DirectMail)
    """
    # TODO: 集成阿里云 DirectMail
    return {"message": "校验码已发送到邮箱"}


@router.post("/social/login", response_model=Token, summary="社交登录 (微信/Google)")
async def social_login(data: SocialLoginRequest, db: AsyncSession = Depends(get_db)):
    """
    处理第三方社交登录回调
    """
    # TODO: 验签与换取 UserInfo
    return {"access_token": "mock_token", "token_type": "bearer"}
