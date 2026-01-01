# Zmage - 数字资产管理系统

Zmage 是一个现代化的数字资产管理系统，专为创意团队和个人设计，提供智能化的资产组织、AI 驱动的标签和检索、以及灵活的分享协作功能。

> [!NOTE]
> **系统状态**: ✅ **Production Ready**
> 本项目已通过全面的代码审计和包括 70+ 个 API 端点的深度测试 (2025-01)。核心功能、数据库 Schema 及依赖注入均已验证。

## 功能特性

### 核心功能

- **多视图浏览**: 支持网格 (Grid)、列表 (List) 和瀑布流 (Waterfall) 视图切，满足不同浏览需求
- **批量管理**: 强大的多选模式，支持批量删除、加入相册、下载和打标签
- **足迹地图**: 交互式地理足迹地图，自动提取照片 GPS 信息，以聚类和缩略图形式展示您的足迹
- **资产管理**: 支持图片、视频、文档等多种格式，自动生成缩略图和预览
- **文件夹结构**: 保持原始文件夹层级，支持虚拟文件夹组织
- **重复检测**: 基于文件哈希的重复资产检测和管理

### 图片编辑与美化

- **滤镜实验室**: 内置多种专业预设滤镜 (如黑白、胶片、鲜艳等)，支持实时预览
- **参数微调**: 支持亮度、对比度、饱和度、模糊等参数的手动调节
- **美学分析**: (预览版) AI 辅助的构图评分和色彩分析

### AI 智能功能

- **自动标签**: 使用 Gemini AI 自动生成描述性标签
- **语义检索**: 支持自然语言搜索，理解查询意图
- **相似推荐**: 基于向量相似度推荐相关资产
- **智能相册**: AI 自动分析并建议相册分组

### 分享与协作

- **灵活分享**: 支持单个资产或集合分享，可设置密码和有效期
- **Portal 上传**: 创建公开上传入口，接收外部文件
- **协作备注**: 集合支持添加协作备注，方便团队沟通

### 用户管理

- **账号设置**: 个性化偏好设置，密码管理
- **安全机制**: 完善的登录和鉴权系统

## 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                        前端 (Next.js 14)                      │
│                        端口: 2333                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API 后端 (FastAPI)                       │
│                        端口: 4257                             │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  PostgreSQL   │    │    Redis      │    │    MinIO      │
│   (数据库)     │    │   (缓存)      │    │  (对象存储)    │
└───────────────┘    └───────────────┘    └───────────────┘
                              │
                              ▼
                     ┌───────────────┐
                     │    Qdrant     │
                     │  (向量数据库)  │
                     └───────────────┘
```

## 快速开始

### 环境要求

- Docker & Docker Compose
- Node.js 18+ (开发环境)
- Python 3.11+ (开发环境)

### 使用 Docker 启动

```bash
# 克隆项目
git clone <repository-url>
cd zmage

# 复制环境变量配置
cp .env.example .env

# 编辑 .env 文件，配置必要的环境变量
# 特别是 GEMINI_API_KEY

# 启动所有服务
./scripts/start.sh
```

### 开发环境

```bash
# 启动基础服务
./scripts/dev.sh

# 在不同终端中启动各服务

# 终端 1: API 服务器
cd apps/api
pip install -r requirements.txt
uvicorn src.main:app --reload --port 4257

# 终端 2: Worker 服务
cd apps/worker
pip install -r requirements.txt
python -m src.main

# 终端 3: 前端开发服务器
cd apps/web
pnpm install
pnpm dev
```

### 访问地址

- 前端界面: http://localhost:2333
- API 文档: http://localhost:4257/docs
- MinIO 控制台: http://localhost:9001

## 项目结构

```
zmage/
├── apps/
│   ├── api/                 # FastAPI 后端
│   │   ├── src/
│   │   │   ├── models/      # 数据模型
│   │   │   ├── routers/     # API 路由
│   │   │   ├── schemas/     # Pydantic schemas
│   │   │   ├── services/    # 业务逻辑服务
│   │   │   └── migrations/  # 数据库迁移
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   ├── web/                 # Next.js 前端
│   │   ├── src/
│   │   │   ├── app/         # 页面路由
│   │   │   ├── components/  # React 组件
│   │   │   ├── lib/         # 工具函数和 API 客户端
│   │   │   └── store/       # 状态管理
│   │   ├── Dockerfile
│   │   └── package.json
│   └── worker/              # 后台任务服务
│       ├── src/
│       ├── Dockerfile
│       └── requirements.txt
├── docs/                    # 文档
├── scripts/                 # 脚本
├── docker-compose.yml       # Docker 编排
├── .env.example             # 环境变量示例
└── README.md
```

## 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | - |
| `REDIS_URL` | Redis 连接字符串 | - |
| `MINIO_ENDPOINT` | MinIO 服务地址 | localhost:9000 |
| `MINIO_ACCESS_KEY` | MinIO 访问密钥 | - |
| `MINIO_SECRET_KEY` | MinIO 密钥 | - |
| `QDRANT_URL` | Qdrant 向量数据库地址 | - |
| `GEMINI_API_KEY` | Google Gemini API 密钥 | - |

## API 文档

启动服务后，访问 http://localhost:4257/docs 查看完整的 API 文档。

### 主要接口

- `GET /api/assets` - 获取资产列表
- `GET /api/assets/map` - 获取地图上的资产点 [New]
- `POST /api/assets/upload` - 上传资产
- `POST /api/assets/search` - 搜索资产
- `GET /api/albums` - 获取相册列表
- `GET /api/albums/suggestions` - 获取 AI 相册建议
- `GET /api/collections` - 获取集合列表
- `POST /api/shares` - 创建分享链接

## UI 设计

Zmage 采用现代化的「液态玻璃」UI 风格：

- 半透明毛玻璃效果
- 柔和的阴影和圆角
- 流畅的动画过渡
- 支持亮色/暗色主题
- 响应式设计，适配各种屏幕

## 贡献指南

欢迎提交 Issue 和 Pull Request。

## 许可证

MIT License
