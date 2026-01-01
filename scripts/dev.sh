#!/bin/bash

# Zmage 开发环境启动脚本
# 用于本地开发时启动服务

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🔧 Zmage 开发环境"
echo "=================="

# 进入项目目录
cd "$PROJECT_DIR"

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo "⚠️  未找到 .env 文件，从示例创建..."
    cp .env.example .env
    echo "📝 请编辑 .env 文件配置必要的环境变量"
fi

# 加载环境变量
export $(grep -v '^#' .env | xargs)

# 启动基础服务 (数据库等)
echo ""
# 检查 Docker
if ! docker --version &> /dev/null; then
    echo "❌ Docker 未能正常执行"
    echo "💡 如果您使用的是 WSL 2，请确保在 Docker Desktop 设置中启用了 WSL 集成"
    exit 1
fi

# 确定 Docker Compose 命令
COMPOSE_CMD=""
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif docker-compose --version &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo "❌ Docker Compose 未安装"
    exit 1
fi

echo ""
echo "📦 启动基础服务 (PostgreSQL, Redis, MinIO, Qdrant)..."
$COMPOSE_CMD up -d postgres redis minio qdrant

echo ""
echo "⏳ 等待数据库启动..."
sleep 5

# 运行数据库迁移
echo ""
echo "🔄 运行数据库迁移..."
cd "$PROJECT_DIR/apps/api"
python3 -m src.migrations.migrate || echo "⚠️  迁移可能已执行过"

# 提示启动开发服务器
echo ""
echo "✅ 基础服务已启动！"
echo ""
echo "📝 请在不同终端中启动以下服务:"
echo ""
echo "   API 服务器 (端口 4257):"
echo "   cd $PROJECT_DIR/apps/api && uvicorn src.main:app --reload --port 4257"
echo ""
echo "   Worker 服务:"
echo "   cd $PROJECT_DIR/apps/worker && python3 -m src.main"
echo ""
echo "   前端开发服务器 (端口 2333):"
echo "   cd $PROJECT_DIR/apps/web && pnpm dev"
echo ""
echo "🌐 访问地址:"
echo "   - 前端: http://localhost:2333"
echo "   - API:  http://localhost:4257"
echo "   - API 文档: http://localhost:4257/docs"
echo "   - MinIO 控制台: http://localhost:9001"
