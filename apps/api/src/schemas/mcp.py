"""
MCP (Model Context Protocol) 相关架构义
"""
from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field

class MCPTool(BaseModel):
    """MCP 工具定义"""
    name: str = Field(..., description="工具名称")
    description: str = Field(..., description="工具描述")
    input_schema: Dict[str, Any] = Field(..., description="工具参数的 JSON Schema")

class MCPToolsResponse(BaseModel):
    """工列表响应"""
    tools: List[MCPTool]

class MCPCallRequest(BaseModel):
    """调用工具请求"""
    name: str = Field(..., description="要调用的工具名称")
    arguments: Dict[str, Any] = Field(default_factory=dict, description="工具参数")

class MCPCallResponse(BaseModel):
    """调用结果响应"""
    content: List[Dict[str, Any]] = Field(..., description="返回内容列表")
    is_error: bool = Field(False, description="是否出错")
