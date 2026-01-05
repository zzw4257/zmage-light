#!/bin/bash

# Zmage 开发环境启动脚本
# 启动基础设施服务 (数据库、缓存、存储) 并提供开发指引

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}🔧 Zmage 开发环境${NC}"
echo -e "${CYAN}==================${NC}"
echo ""

# 进入项目目录
cd "$PROJECT_DIR"

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  未找到 .env 文件，从示例创建...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}📝 请编辑 .env 文件配置必要的环境变量${NC}"
fi

# 加载环境变量
set -a
source .env 2>/dev/null || true
set +a

# 检查 Docker
if ! docker --version &> /dev/null; then
    echo -e "${RED}❌ Docker 未能正常执行${NC}"
    echo -e "${YELLOW}💡 如果您使用的是 WSL 2，请确保在 Docker Desktop 设置中启用了 WSL 集成${NC}"
    exit 1
fi

# 确定 Docker Compose 命令
COMPOSE_CMD=""
if docker compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif docker-compose --version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    echo -e "${RED}❌ Docker Compose 未安装${NC}"
    exit 1
fi

# 解析参数
START_API=false
START_WEB=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --api)
            START_API=true
            shift
            ;;
        --web)
            START_WEB=true
            shift
            ;;
        --all)
            START_API=true
            START_WEB=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "默认只启动基础设施服务 (PostgreSQL, Redis, MinIO, Qdrant)"
            echo ""
            echo "Options:"
            echo "  --api       同时启动 API 服务 (Docker 容器)"
            echo "  --web       同时启动前端服务 (Docker 容器)"
            echo "  --all       启动所有服务 (等同于 ./start.sh)"
            echo "  --help, -h  显示帮助信息"
            exit 0
            ;;
        *)
            echo -e "${RED}未知参数: $1${NC}"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}📦 启动基础设施服务 (PostgreSQL, Redis, MinIO, Qdrant)...${NC}"
$COMPOSE_CMD up -d img-lib-postgres img-lib-redis img-lib-minio img-lib-minio-init img-lib-qdrant

echo ""
echo -e "${YELLOW}⏳ 等待数据库启动...${NC}"
sleep 5

# 可选启动 API
if [ "$START_API" = true ]; then
    echo ""
    echo -e "${BLUE}🔧 启动 API 服务...${NC}"
    $COMPOSE_CMD up -d img-lib-api img-lib-worker
fi

# 可选启动前端
if [ "$START_WEB" = true ]; then
    echo ""
    echo -e "${BLUE}🌐 启动前端服务...${NC}"
    $COMPOSE_CMD up -d img-lib-web
fi

# 运行数据库迁移
echo ""
echo -e "${BLUE}🔄 运行数据库迁移...${NC}"
cd "$PROJECT_DIR/apps/api"
python3 -m src.migrations.migrate 2>/dev/null || echo -e "${YELLOW}⚠️  迁移可能已执行过或 Python 环境未配置${NC}"
cd "$PROJECT_DIR"

# 显示状态
echo ""
echo -e "${GREEN}✅ 基础服务已启动！${NC}"
echo ""
$COMPOSE_CMD ps

echo ""
echo -e "${CYAN}🏷️  基础设施端口:${NC}"
echo "   - PostgreSQL: localhost:30432"
echo "   - Redis:      localhost:30379"
echo "   - Qdrant:     localhost:30333"
echo "   - MinIO API:  localhost:30900"
echo "   - MinIO UI:   localhost:30901"
echo ""

if [ "$START_API" = false ] || [ "$START_WEB" = false ]; then
    echo -e "${CYAN}📝 本地开发服务启动方式:${NC}"
    echo ""
    
    if [ "$START_API" = false ]; then
        echo -e "   ${YELLOW}API 服务器 (端口 34257):${NC}"
        echo "   cd $PROJECT_DIR/apps/api && uvicorn src.main:app --reload --host 0.0.0.0 --port 34257"
        echo ""
    fi
    
    if [ "$START_WEB" = false ]; then
        echo -e "   ${YELLOW}前端开发服务器 (端口 32333):${NC}"
        echo "   cd $PROJECT_DIR/apps/web && pnpm dev"
        echo ""
    fi
fi

echo -e "${CYAN}🌐 访问地址:${NC}"
if [ "$START_WEB" = true ]; then
    echo -e "   - 前端:     ${GREEN}http://localhost:32333${NC} (Docker)"
else
    echo -e "   - 前端:     ${GREEN}http://localhost:32333${NC} (需手动启动)"
fi

if [ "$START_API" = true ]; then
    echo -e "   - API:      ${GREEN}http://localhost:34257${NC} (Docker)"
    echo -e "   - API 文档: ${GREEN}http://localhost:34257/docs${NC}"
else
    echo -e "   - API:      ${GREEN}http://localhost:34257${NC} (需手动启动)"
fi
