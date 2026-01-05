#!/bin/bash

# Zmage 启动脚本
# 用于一键启动所有 Docker 服务

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

echo -e "${CYAN}🚀 Zmage 数字资产管理系统${NC}"
echo -e "${CYAN}==========================${NC}"
echo ""

# 检查 Docker
if ! docker --version &> /dev/null; then
    echo -e "${RED}❌ Docker 未能正常执行${NC}"
    echo -e "${YELLOW}💡 如果您使用的是 WSL 2，请确保在 Docker Desktop 设置中启用了 WSL 集成${NC}"
    echo "   (Settings -> Resources -> WSL Integration)"
    exit 1
fi

# 检查 Docker Compose
COMPOSE_CMD=""
if docker compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif docker-compose --version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    echo -e "${RED}❌ Docker Compose 未安装或无法执行${NC}"
    exit 1
fi

# 进入项目目录
cd "$PROJECT_DIR"

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  未找到 .env 文件，从示例创建...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}📝 请编辑 .env 文件配置必要的环境变量 (特别是 GEMINI_API_KEY)${NC}"
fi

# 加载环境变量
set -a
source .env 2>/dev/null || true
set +a

# 解析参数
BUILD_FLAG=""
DETACH_FLAG="-d"

while [[ $# -gt 0 ]]; do
    case $1 in
        --build|-b)
            BUILD_FLAG="--build"
            echo -e "${BLUE}🏗️  将重新构建镜像...${NC}"
            shift
            ;;
        --follow|-f)
            DETACH_FLAG=""
            echo -e "${BLUE}� 将跟随日志输出...${NC}"
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --build, -b    重新构建 Docker 镜像"
            echo "  --follow, -f   前台运行并跟随日志输出"
            echo "  --help, -h     显示帮助信息"
            exit 0
            ;;
        *)
            echo -e "${RED}未知参数: $1${NC}"
            exit 1
            ;;
    esac
done

# 在 Docker 环境下强制使用容器内部主机名
export DATABASE_URL="postgresql+asyncpg://zmage:zmage_password@img-lib-postgres:5432/zmage"
export REDIS_URL="redis://img-lib-redis:6379/0"
export QDRANT_URL="http://img-lib-qdrant:6333"
export S3_ENDPOINT="http://img-lib-minio:9000"

# 启动服务
echo ""
echo -e "${BLUE}📦 启动服务...${NC}"

$COMPOSE_CMD -f docker-compose.yml up $DETACH_FLAG $BUILD_FLAG

if [ -n "$DETACH_FLAG" ]; then
    echo ""
    echo -e "${YELLOW}⏳ 等待服务初始化...${NC}"
    sleep 5

    # 检查服务状态
    echo ""
    echo -e "${BLUE}📊 服务状态:${NC}"
    $COMPOSE_CMD ps

    echo ""
    echo -e "${GREEN}✅ 启动完成！${NC}"
    echo ""
    echo -e "${CYAN}🌐 访问地址:${NC}"
    echo -e "   - 前端:     ${GREEN}http://localhost:${WEB_PORT:-32333}${NC}"
    echo -e "   - API:      ${GREEN}http://localhost:${API_PORT:-34257}${NC}"
    echo -e "   - API 文档: ${GREEN}http://localhost:${API_PORT:-34257}/docs${NC}"
    echo -e "   - MinIO:    ${GREEN}http://localhost:30901${NC} (${S3_ACCESS_KEY:-minioadmin} / ${S3_SECRET_KEY:-minioadmin})"
    echo ""
    echo -e "${CYAN}📝 常用命令:${NC}"
    echo "   - 查看日志: $COMPOSE_CMD logs -f [服务名]"
    echo "   - 停止服务: $COMPOSE_CMD down"
    echo "   - 重启服务: $COMPOSE_CMD restart"
    echo "   - 重建前端: $COMPOSE_CMD up -d --build img-lib-web"
    echo ""
    echo -e "${CYAN}🏷️  端口映射:${NC}"
    echo "   - 前端 (Next.js):  ${WEB_PORT:-32333}"
    echo "   - API (FastAPI):   ${API_PORT:-34257}"
    echo "   - PostgreSQL:      30432"
    echo "   - Redis:           30379"
    echo "   - Qdrant:          30333"
    echo "   - MinIO API:       30900"
    echo "   - MinIO Console:   30901"
fi
