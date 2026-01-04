#!/bin/bash

# Zmage 启动脚本
# 用于启动所有服务

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🚀 Zmage 数字资产管理系统"
echo "=========================="

# 检查 Docker
if ! docker --version &> /dev/null; then
    echo "❌ Docker 未能正常执行"
    echo "💡 如果您使用的是 WSL 2，请确保在 Docker Desktop 设置中启用了 WSL 集成"
    echo "   (Settings -> Resources -> WSL Integration)"
    exit 1
fi

# 检查 Docker Compose
COMPOSE_CMD=""
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif docker-compose --version &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo "❌ Docker Compose 未安装或无法执行"
    exit 1
fi

# 进入项目目录
cd "$PROJECT_DIR"

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo "⚠️  未找到 .env 文件，从示例创建..."
    cp .env.example .env
    echo "📝 请编辑 .env 文件配置必要的环境变量"
fi

# 启动服务
echo ""
echo "📦 启动服务..."

# 在 Docker 环境下强制使用容器内部主机名，覆盖 .env 中的 localhost 配置
export DATABASE_URL="postgresql+asyncpg://zmage:zmage_password@img-lib-postgres:5432/zmage"
export REDIS_URL="redis://img-lib-redis:6379/0"
export QDRANT_URL="http://img-lib-qdrant:6333"
export S3_ENDPOINT="http://img-lib-minio:9000"

BUILD_FLAG=""
if [ "$1" == "--build" ]; then
    BUILD_FLAG="--build"
    echo "🏗️  将重新构建镜像..."
fi

if [ -n "$COMPOSE_CMD" ]; then
    # 启动服务
    echo ""
    echo "📦 启动服务..."
    # 停止旧服务 (可选，避免端口冲突)
    # $COMPOSE_CMD down --remove-orphans > /dev/null 2>&1

    $COMPOSE_CMD -f docker-compose.yml up -d $BUILD_FLAG
fi

echo ""
echo "⏳ 等待服务初始化..."
sleep 5

# 检查服务状态
echo ""
echo "📊 服务状态:"
if [ -n "$COMPOSE_CMD" ]; then
    $COMPOSE_CMD ps
fi

echo ""
echo "✅ 启动完成！"
echo ""
echo "🌐 访问地址:"
echo "   - 前端: http://localhost:32333"
echo "   - API:  http://localhost:34257"
echo "   - API 文档: http://localhost:34257/docs"
echo ""
echo "📝 常用命令:"
echo "   - 查看日志: $COMPOSE_CMD logs -f"
echo "   - 停止服务: $COMPOSE_CMD down"
echo "   - 重启服务: $COMPOSE_CMD restart"
