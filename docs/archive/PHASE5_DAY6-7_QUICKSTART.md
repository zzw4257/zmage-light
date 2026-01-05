# Phase 5 Day 6-7 快速开始指南

> 🚀 快速上手定时任务、缓存优化和并发控制

---

## 📋 前置要求

确保以下服务已启动：

```bash
# 1. Redis (必须)
redis-server

# 2. PostgreSQL (必须)
# 确保数据库已迁移和种子数据已导入

# 3. Next.js 开发服务器
cd frontend
npm run dev
```

---

## 🚀 5分钟快速开始

### 1. 初始化定时任务

创建初始化脚本 `scripts/init-cron.ts`:

```typescript
import { setupDailyResetCron, setupMonthlyResetCron } from '../lib/queue/jobs/quota-reset.job';
import { setupSubscriptionSyncCron } from '../lib/queue/jobs/subscription-sync.job';

async function initCronJobs() {
  console.log('🔧 Initializing cron jobs...');

  await setupDailyResetCron();      // 每天 00:05 重置上传配额
  await setupMonthlyResetCron();    // 每月1日 00:10 重置 AI 配额
  await setupSubscriptionSyncCron(); // 每小时同步订阅状态

  console.log('✅ All cron jobs initialized!');
  process.exit(0);
}

initCronJobs().catch(console.error);
```

运行：

```bash
npx tsx scripts/init-cron.ts
```

### 2. 使用增强版配额服务

在你的 API 路由中替换旧版配额服务：

**Before** (V1 - 无锁，无缓存):

```typescript
import { QuotaService } from '@/lib/subscription/quota-service';

const quotaService = new QuotaService();
const check = await quotaService.checkQuota(userId, 'aiRequest', 1);

if (check.allowed) {
  await quotaService.consumeQuota({ userId, type: 'aiRequest', amount: 1 });
}
```

**After** (V2 - 带锁和缓存):

```typescript
import { quotaServiceV2 } from '@/lib/subscription/quota-service-v2';

// 原子性检查并消费（推荐）
const result = await quotaServiceV2.checkAndConsumeQuota({
  userId,
  type: 'aiRequest',
  amount: 1,
  resourceType: 'image-analysis',
  resourceId: imageId,
});

if (!result.allowed) {
  return NextResponse.json({ error: 'Quota exceeded' }, { status: 429 });
}
```

### 3. 运行并发测试

验证系统并发安全性：

```bash
npx tsx scripts/test-quota-concurrency.ts
```

预期输出：

```
✅ ALL TESTS PASSED! Lock mechanism is working correctly.
```

---

## 💡 常用场景

### 场景 1: 手动触发配额重置

```typescript
import { scheduleDailyQuotaReset } from '@/lib/queue/jobs/quota-reset.job';

// 重置单个用户
await scheduleDailyQuotaReset(userId);

// 重置所有用户
await scheduleDailyQuotaReset();
```

### 场景 2: 手动同步订阅

```typescript
import { syncUserSubscription, syncAllSubscriptions } from '@/lib/queue/jobs/subscription-sync.job';

// 同步单个用户
await syncUserSubscription(userId);

// 同步所有订阅
await syncAllSubscriptions(force = true);
```

### 场景 3: 检查配额告警

```typescript
import { quotaMonitor } from '@/lib/monitoring/quota-monitor';

// 检查单个用户
const alerts = await quotaMonitor.checkUserQuotaStatus(userId);

for (const alert of alerts) {
  console.log(`⚠️  ${alert.alertLevel}: ${alert.reason}`);
}

// 检查所有用户
const allAlerts = await quotaMonitor.checkAllUsersQuotaStatus();
```

### 场景 4: 批量消费配额

```typescript
import { quotaServiceV2 } from '@/lib/subscription/quota-service-v2';

// 单锁优化的批量操作
await quotaServiceV2.batchConsumeQuota(userId, [
  { type: 'aiRequest', amount: 5 },
  { type: 'storage', amount: 1048576 }, // 1MB
  { type: 'upload', amount: 1 },
]);
```

### 场景 5: 清除缓存

```typescript
import { invalidateAllUserCache } from '@/lib/cache/quota-cache';
import { invalidateAllUserSubscriptionCache } from '@/lib/cache/subscription-cache';

// 用户订阅变更后清除缓存
await invalidateAllUserCache(userId);
await invalidateAllUserSubscriptionCache(userId);
```

---

## 🔧 配置说明

### 环境变量

确保 `.env` 包含：

```bash
# Redis
REDIS_URL=redis://localhost:6379

# PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/zmage

# Stripe (用于订阅同步)
STRIPE_SECRET_KEY=REDACTED_KEY...
```

### 定时任务配置

修改 Cron 时间（在对应的 job 文件中）：

```typescript
// 每日重置：默认 00:05
await quotaResetQueue.add('daily-reset-cron', data, {
  repeat: {
    pattern: '5 0 * * *', // 修改这里
  },
});

// 每月重置：默认每月1日 00:10
await quotaResetQueue.add('monthly-reset-cron', data, {
  repeat: {
    pattern: '10 0 1 * *', // 修改这里
  },
});

// 订阅同步：默认每小时
await subscriptionSyncQueue.add('subscription-sync-cron', data, {
  repeat: {
    pattern: '0 * * * *', // 修改这里
  },
});
```

### 缓存 TTL 配置

在 `lib/cache/quota-cache.ts` 中修改：

```typescript
const CACHE_TTL = {
  USER_QUOTA: 300,        // 5 分钟 → 修改为你需要的秒数
  USER_USAGE: 60,         // 1 分钟
  USER_SUBSCRIPTION: 300, // 5 分钟
  SUBSCRIPTION_PLAN: 3600, // 1 小时
};
```

---

## 🐛 故障排查

### 问题 1: Redis 连接失败

```
❌ Redis error: ECONNREFUSED
```

**解决方案**:

```bash
# 检查 Redis 是否运行
redis-cli ping
# 应返回: PONG

# 如果未运行，启动 Redis
redis-server
```

### 问题 2: 定时任务未执行

**检查方法**:

```typescript
import { getQuotaResetStats } from '@/lib/queue/jobs/quota-reset.job';

const stats = await getQuotaResetStats();
console.log(stats);
// { waiting: 0, active: 0, completed: 1, failed: 0, delayed: 0 }
```

**解决方案**:

- 确保 Worker 进程正在运行
- 检查 Redis 连接
- 查看 BullMQ 队列日志

### 问题 3: 缓存未失效

**手动清除缓存**:

```typescript
import { clearAllQuotaCache } from '@/lib/cache/quota-cache';
import { clearAllSubscriptionCache } from '@/lib/cache/subscription-cache';

await clearAllQuotaCache();
await clearAllSubscriptionCache();
```

### 问题 4: 并发测试失败

```
❌ SOME TESTS FAILED
```

**检查**:

1. 确认使用的是 V2 服务（`useV2: true`）
2. Redis 是否正常运行
3. 数据库连接是否正常
4. 种子数据是否已导入（Free 计划必须存在）

---

## 📊 监控和观察

### 查看缓存统计

```typescript
import { getCacheStats } from '@/lib/cache/quota-cache';
import { getSubscriptionCacheStats } from '@/lib/cache/subscription-cache';

const quotaStats = await getCacheStats();
console.log('Quota cache:', quotaStats);
// {
//   quotaCount: 45,
//   usageCount: 135,
//   subscriptionCount: 42,
//   totalSize: '2.3M'
// }

const subStats = await getSubscriptionCacheStats();
console.log('Subscription cache:', subStats);
```

### 查看任务队列统计

```typescript
import { getQuotaResetStats } from '@/lib/queue/jobs/quota-reset.job';
import { getSubscriptionSyncStats } from '@/lib/queue/jobs/subscription-sync.job';

const resetStats = await getQuotaResetStats();
const syncStats = await getSubscriptionSyncStats();

console.log('Quota reset queue:', resetStats);
console.log('Subscription sync queue:', syncStats);
```

### 查看分布式锁状态

```typescript
import { getAllLocks } from '@/lib/lock/redis-lock';

const locks = await getAllLocks();
console.log('Active locks:', locks);
// [
//   { key: 'quota:consume:user123:aiRequest', ttl: 4523 },
//   ...
// ]
```

---

## 🚀 生产部署

### 1. 使用 Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    environment:
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/zmage
    depends_on:
      - redis
      - postgres

  worker:
    build: .
    command: node dist/worker.js
    environment:
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/zmage
    depends_on:
      - redis
      - postgres

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: zmage
      POSTGRES_PASSWORD: password
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  redis-data:
  postgres-data:
```

启动：

```bash
docker-compose up -d
```

### 2. 使用 PM2

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'zmage-app',
      script: 'npm',
      args: 'start',
      instances: 2,
      exec_mode: 'cluster',
    },
    {
      name: 'zmage-worker',
      script: 'node',
      args: 'dist/worker.js',
      instances: 1,
    },
  ],
};
```

启动：

```bash
pm2 start ecosystem.config.js
```

---

## 📚 进阶阅读

- [完整技术文档](./PHASE5_DAY6-7_OPTIMIZATION.md)
- [分布式锁详解](./PHASE5_DAY6-7_OPTIMIZATION.md#1-redis-分布式锁)
- [缓存策略说明](./PHASE5_DAY6-7_OPTIMIZATION.md#2-缓存层)
- [并发测试指南](./PHASE5_DAY6-7_OPTIMIZATION.md#并发测试)

---

## ❓ 常见问题

**Q: V1 和 V2 配额服务能共存吗？**

A: 可以，但建议尽快迁移到 V2。V2 向后兼容 V1 的 API。

**Q: 定时任务会自动启动吗？**

A: 需要在应用启动时手动初始化，或使用 Worker 进程。

**Q: 缓存会自动失效吗？**

A: 是的，写操作（消费配额、订阅变更）会自动失效相关缓存。

**Q: 分布式锁会死锁吗？**

A: 不会，锁有自动过期时间（默认 5-10 秒），防止死锁。

**Q: 如何监控系统性能？**

A: 使用 `quotaMonitor` 生成报告，或集成 Prometheus + Grafana。

---

**快速开始成功！🎉 现在可以使用高性能、并发安全的配额系统了。**

如有问题，请参考[完整文档](./PHASE5_DAY6-7_OPTIMIZATION.md)或提交 Issue。