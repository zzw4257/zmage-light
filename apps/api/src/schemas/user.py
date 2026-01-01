"""
用户相关 Pydantic 模型
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserBase(BaseModel):
    """用户基础模型"""
    username: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    mobile: Optional[str] = Field(None, max_length=20)
    full_name: Optional[str] = Field(None, max_length=100)
    avatar_url: Optional[str] = None


class UserCreate(UserBase):
    """用户注册模型"""
    password: Optional[str] = Field(None, min_length=6, description="密码长度至少为 6 位")


class UserUpdate(BaseModel):
    """用户更新模型"""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = Field(None, min_length=6)
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    """用户返回模型"""
    id: int
    is_active: bool
    is_superuser: bool
    email_verified: bool
    mobile_verified: bool
    wechat_openid: Optional[str] = None
    google_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    """Token 模型"""
    access_token: str
    token_type: str


class TokenData(BaseModel):
    """Token 数据模型"""
    username: Optional[str] = None

class SMSRequest(BaseModel):
    mobile: str = Field(..., pattern=r'^1[3-9]\d{9}$')

class SMSLogin(BaseModel):
    mobile: str = Field(..., pattern=r'^1[3-9]\d{9}$')
    code: str = Field(..., min_length=6, max_length=6)

class EmailOTPRequest(BaseModel):
    email: EmailStr

class EmailOTPLogin(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)

class AliyunOneKeyLogin(BaseModel):
    sp_token: str

class SocialLoginRequest(BaseModel):
    provider: str
    code: str
    state: Optional[str] = None
