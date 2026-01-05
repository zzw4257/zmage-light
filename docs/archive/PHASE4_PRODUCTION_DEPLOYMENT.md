# Zmage v3.0.0 - Phase 4: Production Deployment Plan

## 📋 概览

**阶段**: Phase 4 - 生产环境准备与部署  
**开始时间**: 继Phase 3完成后  
**预计周期**: 3-4周  
**状态**: 🚧 进行中

## 🎯 Phase 4 目标

### 主要目标
1. ✅ **生产环境基础设施准备** - 数据库、存储、缓存迁移方案
2. ✅ **容器化与编排** - Docker化应用和worker
3. ✅ **测试覆盖提升** - 单元测试、集成测试、E2E测试
4. ✅ **监控与日志系统** - 生产级别的可观测性
5. ✅ **性能优化与压测** - 确保系统可扩展性
6. ✅ **安全加固** - 生产环境安全最佳实践
7. ✅ **文档完善** - 部署文档、运维手册

### 成功标准
- [ ] 数据库成功迁移到PostgreSQL
- [ ] 媒体文件存储迁移到S3/OSS
- [ ] Redis生产配置完成
- [ ] 所有核心模块测试覆盖率 > 80%
- [ ] 压测通过（1000+ RPS）
- [ ] 容器化部署成功
- [ ] 监控和告警系统运行正常
- [ ] 完整的部署文档

---

## 📅 详细时间线

### Week 1: 基础设施准备 (Day 1-7)
**目标**: 生产环境数据库、存储、缓存配置

#### Day 1-2: PostgreSQL迁移方案
- [x] 创建PostgreSQL schema适配
- [ ] 编写数据迁移脚本
- [ ] 测试迁移流程
- [ ] 性能对比测试

#### Day 3-4: 对象存储集成
- [ ] S3/OSS SDK集成
- [ ] 上传/下载适配器
- [ ] 预签名URL生成
- [ ] 媒体迁移工具

#### Day 5: Redis生产配置
- [ ] Redis持久化配置
- [ ] 连接池优化
- [ ] Sentinel/Cluster评估
- [ ] 备份策略

#### Day 6-7: 环境变量管理
- [ ] .env.production模板
- [ ] 密钥管理方案（Vault/Secret Manager）
- [ ] 配置验证脚本
- [ ] 文档更新

**交付物**:
- ✅ PostgreSQL迁移文档
- ✅ 对象存储集成代码
- ✅ Redis生产配置
- ✅ 环境配置文档

---

### Week 2: 容器化与编排 (Day 8-14)

#### Day 8-9: Docker容器化
- [ ] 编写Dockerfile（Web + Worker）
- [ ] 多阶段构建优化
- [ ] 健康检查配置
- [ ] 镜像大小优化

#### Day 10-11: Docker Compose配置
- [ ] docker-compose.yml（开发环境）
- [ ] docker-compose.prod.yml（生产环境）
- [ ] 服务编排（Web + Worker + Redis + PostgreSQL）
- [ ] 数据卷配置

#### Day 12-13: 进程管理
- [ ] Worker进程管理（PM2/Bull Board）
- [ ] 优雅关闭处理
- [ ] 自动重启策略
- [ ] 日志轮转

#### Day 14: CI/CD Pipeline
- [ ] GitHub Actions workflow
- [ ] 自动化测试
- [ ] 自动化构建和推送
- [ ] 部署脚本

**交付物**:
- ✅ Dockerfile和.dockerignore
- ✅ docker-compose配置文件
- ✅ CI/CD配置
- ✅ 部署脚本

---

### Week 3: 测试覆盖与质量保证 (Day 15-21)

#### Day 15-16: 单元测试
- [ ] AI Provider Manager测试
- [ ] Provider Adapters测试
- [ ] Cache系统测试
- [ ] 工具函数测试

#### Day 17-18: 集成测试
- [ ] Queue系统测试
- [ ] Worker任务测试
- [ ] API端点测试
- [ ] 数据库操作测试

#### Day 19-20: E2E测试
- [ ] Playwright配置
- [ ] 上传流程测试
- [ ] AI分析流程测试
- [ ] 用户设置流程测试

#### Day 21: 测试报告与覆盖率
- [ ] 生成测试报告
- [ ] 覆盖率分析
- [ ] 修复关键测试失败
- [ ] 文档更新

**交付物**:
- ✅ 单元测试套件
- ✅ 集成测试套件
- ✅ E2E测试套件
- ✅ 测试覆盖率报告

---

### Week 4: 监控、优化与发布 (Day 22-28)

#### Day 22-23: 监控系统
- [ ] 应用性能监控（APM）
- [ ] 错误追踪（Sentry）
- [ ] 日志聚合（Loki/ELK）
- [ ] 指标收集（Prometheus）
- [ ] 可视化仪表板（Grafana）

#### Day 24: 性能优化
- [ ] 数据库查询优化
- [ ] API响应时间优化
- [ ] 前端打包优化
- [ ] CDN配置

#### Day 25: 压力测试
- [ ] 负载测试脚本
- [ ] 压测执行（1000+ RPS）
- [ ] 瓶颈分析
- [ ] 性能报告

#### Day 26: 安全加固
- [ ] 安全审计
- [ ] 依赖漏洞扫描
- [ ] API限流配置
- [ ] HTTPS/TLS配置
- [ ] CORS配置

#### Day 27: 文档完善
- [ ] 部署文档
- [ ] 运维手册
- [ ] API文档更新
- [ ] 用户文档更新

#### Day 28: 发布准备
- [ ] 生产环境预发布
- [ ] 灰度发布策略
- [ ] 回滚方案
- [ ] v3.0.0正式发布 🎉

**交付物**:
- ✅ 监控系统配置
- ✅ 性能优化报告
- ✅ 安全审计报告
- ✅ 完整部署文档
- ✅ v3.0.0发布

---

## 🏗️ 技术架构

### 生产环境架构图

```
┌─────────────────────────────────────────────────────────────┐
│                         CDN (CloudFlare)                     │
│                    (静态资源 + 媒体缓存)                      │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer (Nginx)                     │
└───────────────────────────┬─────────────────────────────────┘
                            │
          ┌─────────────────┴─────────────────┐
          ▼                                   ▼
┌──────────────────────┐            ┌──────────────────────┐
│   Web App Instance   │            │   Web App Instance   │
│   (Next.js + Node)   │            │   (Next.js + Node)   │
│   - API Routes       │            │   - API Routes       │
│   - SSR/SSG          │            │   - SSR/SSG          │
│   - SSE Endpoints    │            │   - SSE Endpoints    │
└──────────┬───────────┘            └──────────┬───────────┘
           │                                   │
           └───────────────┬───────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Worker Node  │  │ Worker Node  │  │ Worker Node  │
│ - BullMQ     │  │ - BullMQ     │  │ - BullMQ     │
│ - AI Jobs    │  │ - AI Jobs    │  │ - AI Jobs    │
│ - Media Jobs │  │ - Media Jobs │  │ - Media Jobs │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  PostgreSQL  │  │ Redis Cluster│  │   S3/OSS     │
│  (Primary)   │  │ - Cache      │  │ - Images     │
│              │  │ - Queue      │  │ - Videos     │
│  PostgreSQL  │  │ - Session    │  │ - Thumbnails │
│  (Replica)   │  └──────────────┘  └──────────────┘
└──────────────┘
          │
          ▼
┌──────────────┐
│   Backup     │
│   Storage    │
└──────────────┘
```

### 监控架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Application Layer                       │
│  - Next.js (Instrumented with OpenTelemetry)                │
│  - Workers (Custom Metrics)                                 │
└───────────────────────────┬─────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│    Sentry    │  │  Prometheus  │  │     Loki     │
│ Error Track  │  │   Metrics    │  │     Logs     │
└──────────────┘  └──────┬───────┘  └──────┬───────┘
                         │                 │
                         └────────┬────────┘
                                  ▼
                         ┌──────────────┐
                         │   Grafana    │
                         │  Dashboards  │
                         └──────┬───────┘
                                │
                                ▼
                         ┌──────────────┐
                         │ AlertManager │
                         │  (Slack/SMS) │
                         └──────────────┘
```

---

## 🗄️ 数据库迁移方案

### PostgreSQL Schema 适配

#### 更新 schema.prisma

```prisma
datasource db {
  provider = "postgresql"  // 从 sqlite 改为 postgresql
  url      = env("DATABASE_URL")
}
```

#### 数据类型映射

| SQLite 类型 | PostgreSQL 类型 | 说明 |
|------------|----------------|------|
| INTEGER    | INTEGER        | 保持不变 |
| REAL       | DOUBLE PRECISION | Float类型 |
| TEXT       | TEXT/VARCHAR   | 字符串 |
| BLOB       | BYTEA          | 二进制 |
| DateTime   | TIMESTAMP      | 时间戳 |

#### 索引优化

```prisma
// 添加生产级别索引
model Image {
  // ... 现有字段 ...
  
  @@index([userId, createdAt])           // 复合索引
  @@index([pHash, dHash])                // 去重查询
  @@index([isPublic, views])             // 热门内容
  @@index([captureTime], type: BTree)    // 时间线查询
  @@fulltext([aiDescription])            // 全文搜索
}
```

### 迁移步骤

1. **准备阶段**
   ```bash
   # 1. 备份SQLite数据
   sqlite3 dev.db ".backup backup.db"
   
   # 2. 导出数据为SQL
   sqlite3 dev.db .dump > dump.sql
   ```

2. **转换阶段**
   ```bash
   # 使用迁移工具转换
   npx prisma migrate dev --name postgres_migration
   ```

3. **数据迁移**
   ```bash
   # 运行自定义迁移脚本
   npm run migrate:to-postgres
   ```

4. **验证阶段**
   ```bash
   # 验证数据完整性
   npm run verify:migration
   ```

---

## 📦 对象存储集成

### S3/OSS 适配器设计

#### 创建 `lib/storage/adapter.ts`

```typescript
export interface StorageAdapter {
  upload(file: Buffer, key: string, metadata?: Record<string, string>): Promise<string>
  download(key: string): Promise<Buffer>
  delete(key: string): Promise<void>
  getSignedUrl(key: string, expiresIn?: number): Promise<string>
  exists(key: string): Promise<boolean>
}

// S3 实现
export class S3StorageAdapter implements StorageAdapter {
  // AWS S3 实现
}

// OSS 实现（阿里云）
export class OSSStorageAdapter implements StorageAdapter {
  // Aliyun OSS 实现
}

// 本地文件系统（开发环境）
export class LocalStorageAdapter implements StorageAdapter {
  // 本地文件系统实现
}
```

#### 配置

```typescript
// lib/storage/index.ts
import { S3StorageAdapter, LocalStorageAdapter } from './adapter'

const storageAdapter = process.env.NODE_ENV === 'production'
  ? new S3StorageAdapter({
      region: process.env.AWS_REGION!,
      bucket: process.env.S3_BUCKET!,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    })
  : new LocalStorageAdapter({
      basePath: './uploads',
    })

export { storageAdapter }
```

### 媒体迁移工具

```bash
# scripts/migrate-media-to-s3.ts
npm run migrate:media -- --source=./uploads --target=s3://bucket-name
```

---

## 🐳 Docker 容器化

### Dockerfile (Web App)

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci --workspace=frontend

# Copy source
COPY . .

# Build
RUN npm run build --workspace=frontend

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV production

# Install production dependencies only
COPY package*.json ./
COPY frontend/package*.json ./frontend/
RUN npm ci --workspace=frontend --omit=dev

# Copy built assets
COPY --from=builder /app/frontend/.next ./frontend/.next
COPY --from=builder /app/frontend/public ./frontend/public
COPY --from=builder /app/frontend/prisma ./frontend/prisma

# Generate Prisma Client
RUN npx prisma generate --schema=./frontend/prisma/schema.prisma

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

USER nextjs

EXPOSE 3000

CMD ["npm", "start", "--workspace=frontend"]
```

### Dockerfile (Worker)

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY frontend/package*.json ./frontend/

RUN npm ci --workspace=frontend --omit=dev

COPY frontend ./frontend

RUN npx prisma generate --schema=./frontend/prisma/schema.prisma

# Install system dependencies for media processing
RUN apk add --no-cache ffmpeg sharp

CMD ["npm", "run", "workers", "--workspace=frontend"]
```

### docker-compose.yml (生产环境)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: zmage
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  web:
    build:
      context: .
      dockerfile: Dockerfile
      target: runner
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/zmage
      REDIS_URL: redis://redis:6379
      NODE_ENV: production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/zmage
      REDIS_URL: redis://redis:6379
      NODE_ENV: production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    deploy:
      replicas: 3

volumes:
  postgres_data:
  redis_data:
```

---

## 🧪 测试策略

### 单元测试覆盖

#### AI Provider Manager

```typescript
// __tests__/lib/ai/provider-manager.test.ts
describe('AIProviderManager', () => {
  it('should select provider by strategy', async () => {
    // 测试提供商选择策略
  })
  
  it('should fallback on provider failure', async () => {
    // 测试失败降级
  })
  
  it('should collect statistics', async () => {
    // 测试统计收集
  })
})
```

#### Provider Adapters

```typescript
// __tests__/lib/ai/adapters/*.test.ts
describe('GeminiAdapter', () => {
  it('should analyze image successfully', async () => {})
  it('should handle rate limit', async () => {})
  it('should retry on network error', async () => {})
})
```

### 集成测试

#### Queue System

```typescript
// __tests__/integration/queue.test.ts
describe('Queue System', () => {
  it('should enqueue and process job', async () => {
    // 测试完整的任务入队和处理流程
  })
})
```

### E2E测试

#### Upload Flow

```typescript
// e2e/upload.spec.ts
import { test, expect } from '@playwright/test'

test('user can upload and analyze image', async ({ page }) => {
  await page.goto('/upload')
  await page.setInputFiles('input[type="file"]', 'test-image.jpg')
  await page.click('button:has-text("Upload")')
  await expect(page.locator('.analysis-result')).toBeVisible({ timeout: 30000 })
})
```

---

## 📊 监控与告警

### 应用性能监控

#### Sentry 集成

```typescript
// lib/sentry.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
})
```

#### 自定义指标

```typescript
// lib/monitoring/metrics.ts
import { Registry, Counter, Histogram } from 'prom-client'

export const registry = new Registry()

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
})

export const aiProviderRequests = new Counter({
  name: 'ai_provider_requests_total',
  help: 'Total AI provider requests',
  labelNames: ['provider', 'status'],
  registers: [registry],
})
```

### Grafana Dashboard

#### 关键指标

- **系统健康**
  - CPU使用率
  - 内存使用率
  - 磁盘I/O
  - 网络流量

- **应用性能**
  - API响应时间 (P50, P95, P99)
  - 请求成功率
  - 错误率
  - 活跃连接数

- **业务指标**
  - 上传量 (图片/视频)
  - AI分析任务数
  - 队列长度
  - 提供商可用性

### 告警规则

```yaml
# alerts.yml
groups:
  - name: zmage_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
          
      - alert: SlowAPIResponse
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 2
        for: 5m
        annotations:
          summary: "API response time too slow"
          
      - alert: QueueBacklog
        expr: bullmq_queue_waiting > 100
        for: 10m
        annotations:
          summary: "Queue backlog detected"
```

---

## 🔒 安全加固

### API 限流

```typescript
// middleware/rate-limit.ts
import rateLimit from 'express-rate-limit'

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制100次请求
  message: 'Too many requests from this IP',
})

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 50, // 限制50次上传
})
```

### HTTPS/TLS配置

```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name zmage.app;

    ssl_certificate /etc/letsencrypt/live/zmage.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/zmage.app/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://web:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 环境变量验证

```typescript
// lib/env.ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
})

export const env = envSchema.parse(process.env)
```

---

## 📈 性能优化

### 数据库查询优化

```typescript
// 使用SELECT优化
const images = await prisma.image.findMany({
  select: {
    id: true,
    filename: true,
    thumbnailPath: true,
    // 只选择需要的字段
  },
  take: 20,
})

// 使用批量查询
const images = await prisma.image.findMany({
  where: { id: { in: imageIds } },
})

// 添加连接池
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['query', 'error', 'warn'],
  connectionPool: {
    min: 2,
    max: 10,
  },
})
```

### API响应缓存

```typescript
// lib/cache/response-cache.ts
import { redis } from '@/lib/redis'

export async function getCachedResponse<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  const cached = await redis.get(key)
  if (cached) {
    return JSON.parse(cached)
  }
  
  const data = await fetcher()
  await redis.setex(key, ttl, JSON.stringify(data))
  return data
}
```

### 前端打包优化

```javascript
// next.config.js
module.exports = {
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@radix-ui/react-icons'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
  },
}
```

---

## 🚀 部署清单

### 部署前检查

- [ ] 所有测试通过
- [ ] 代码审查完成
- [ ] 环境变量配置完成
- [ ] 数据库迁移脚本准备
- [ ] 备份方案就绪
- [ ] 回滚方案就绪
- [ ] 监控系统就绪
- [ ] 文档更新完成

### 部署步骤

1. **准备阶段**
   ```bash
   # 1. 拉取最新代码
   git pull origin main
   
   # 2. 安装依赖
   npm ci
   
   # 3. 构建应用
   npm run build
   
   # 4. 运行数据库迁移
   npx prisma migrate deploy
   ```

2. **部署阶段**
   ```bash
   # 使用Docker Compose部署
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **验证阶段**
   ```bash
   # 健康检查
   curl https://zmage.app/api/health
   
   # 查看日志
   docker-compose logs -f web worker
   ```

4. **监控阶段**
   - 检查Grafana仪表板
   - 确认Sentry无新错误
   - 监控系统资源使用

### 回滚方案

```bash
# 快速回滚到上一个版本
docker-compose -f docker-compose.prod.yml down
git checkout <previous-commit>
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📚 相关文档

- [DEPLOYMENT.md](./DEPLOYMENT.md) - 详细部署指南
- [PERFORMANCE_OPTIMIZATION.md](./PERFORMANCE_OPTIMIZATION.md) - 性能优化文档
- [SECURITY.md](./SECURITY.md) - 安全最佳实践
- [API.md](./API.md) - API文档

---

## ✅ Phase 4 完成标准

### 必须完成项
- [ ] PostgreSQL数据库迁移成功
- [ ] S3/OSS对象存储集成完成
- [ ] Docker容器化完成
- [ ] 核心模块测试覆盖率 > 80%
- [ ] 监控系统运行正常
- [ ] 压测通过（1000 RPS）
- [ ] 生产环境部署成功

### 可选完成项
- [ ] Kubernetes部署配置
- [ ] 多区域部署
- [ ] CDN集成
- [ ] 自动扩缩容配置

---

## 🎯 下一步计划

Phase 4完成后，进入：
- **Phase 5**: 业务功能扩展（创作工坊、订阅系统）
- **Phase 6**: 移动端开发
- **Phase 7**: 社区功能

---

**更新日期**: 2024-01-XX  
**维护者**: Zmage Dev Team  
**状态**: 🚧 进行中