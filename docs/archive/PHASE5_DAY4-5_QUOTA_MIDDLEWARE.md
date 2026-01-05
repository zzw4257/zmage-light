# Phase 5 Day 4-5: 配额中间件集成文档

## 📋 概述

本文档记录了 Zmage v3 Phase 5 的配额中间件集成实现，包括中间件设计、API 集成、错误处理等核心功能。

**实施日期**: 2024-01-XX  
**负责人**: Development Team  
**状态**: ✅ 实现完成

---

## 🎯 实现目标

1. ✅ 创建通用配额中间件（withQuota）
2. ✅ 创建批量配额中间件（withBatchQuota）
3. ✅ 创建配额响应工具
4. ✅ 集成到上传 API
5. ✅ 集成到 AI 请求 API
6. ✅ 集成到生成 API
7. ✅ 实现配额警告系统
8. ✅ 编写使用文档和示例

---

## 🏗️ 架构设计

### 中间件层次结构

```
API Route Handler
    ↓
withQuota / withBatchQuota (Middleware)
    ↓
1. 身份验证 (getUserIdFromRequest)
2. 配额检查 (QuotaService.checkQuota)
3. 配额消耗 (QuotaService.consumeQuota)
4. 错误处理
    ↓
Business Logic (原始处理函数)
    ↓
Response (包含配额信息头)
```

### 核心组件

```
frontend/
├── lib/middleware/
│   ├── quota-middleware.ts       # 配额中间件核心
│   └── quota-response.ts         # 配额响应工具
└── app/api/
    ├── upload/route.ts           # 上传 API（集成配额）
    ├── generate/*/route.ts       # AI 生成 API（集成配额）
    └── ai/*/route.ts             # AI 分析 API（集成配额）
```

---

## 📝 核心实现

### 1. 配额中间件（quota-middleware.ts）

#### withQuota - 单次操作配额检查

**功能**: 为 API 路由添加自动配额检查和消耗

**使用示例**:

```typescript
// app/api/generate/image/route.ts
import { withQuota } from '@/lib/middleware/quota-middleware';

export const POST = withQuota(
  {
    quotaType: 'aiRequest',
    amount: 1,
    errorMessage: 'AI generation quota exceeded'
  },
  async (request, userId, quotaInfo) => {
    // 业务逻辑：生成图片
    const result = await generateImage(request);
    
    return NextResponse.json({
      success: true,
      data: result,
      quota: {
        remaining: quotaInfo.remaining,
        limit: quotaInfo.limit
      }
    });
  }
);
```

**配置选项**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| quotaType | `'storage' \| 'upload' \| 'aiRequest'` | ✅ | 配额类型 |
| amount | `number` | ❌ | 消耗数量，默认 1 |
| checkOnly | `boolean` | ❌ | 仅检查不消耗，默认 false |
| errorMessage | `string` | ❌ | 自定义错误消息 |

**处理流程**:

1. **身份验证** - 从请求中提取 userId
2. **配额检查** - 调用 QuotaService.checkQuota()
3. **配额不足** - 返回 429 错误和升级提示
4. **配额消耗** - 调用 QuotaService.consumeQuota()
5. **执行业务** - 调用原始处理函数
6. **返回结果** - 包含配额信息头

#### withBatchQuota - 批量操作配额检查

**功能**: 处理批量上传、批量处理等场景

**使用示例**:

```typescript
// app/api/upload/batch/route.ts
import { withBatchQuota } from '@/lib/middleware/quota-middleware';

export const POST = withBatchQuota(
  { quotaType: 'upload' },
  async (request) => {
    // 从请求中获取文件数量
    const formData = await request.formData();
    const files = formData.getAll('files');
    return files.length;
  },
  async (request, userId, amount, quotaInfo) => {
    // 业务逻辑：批量上传
    const results = await uploadMultipleFiles(request, amount);
    
    return NextResponse.json({
      success: true,
      uploaded: amount,
      quota: {
        remaining: quotaInfo.remaining,
        limit: quotaInfo.limit
      }
    });
  }
);
```

**特点**:

- 动态计算需要消耗的配额量
- 支持部分成功处理
- 返回详细的批量操作结果

### 2. 配额响应工具（quota-response.ts）

#### createQuotaExceededResponse - 配额超限响应

```typescript
import { createQuotaExceededResponse } from '@/lib/middleware/quota-response';

// 手动创建配额超限响应
const response = createQuotaExceededResponse(
  'storage',
  10000000000, // 10GB limit
  10500000000, // 10.5GB used
  'Storage quota exceeded. Please delete some files.'
);
```

**响应格式**:

```json
{
  "error": "QuotaExceeded",
  "message": "Storage quota exceeded. Please delete some files.",
  "quota": {
    "type": "storage",
    "limit": 10000000000,
    "used": 10500000000,
    "remaining": 0,
    "unlimited": false,
    "percentage": 105
  },
  "upgradeUrl": "/subscription/plans",
  "suggestions": [
    "Delete unused files to free up space",
    "Upgrade to Pro plan for 10GB storage",
    "Upgrade to Premium plan for unlimited storage"
  ]
}
```

**HTTP 头**:

```
Status: 429 Too Many Requests
X-RateLimit-Limit: 10000000000
X-RateLimit-Remaining: 0
X-RateLimit-Used: 10500000000
Retry-After: 0
```

#### createQuotaWarningResponse - 配额警告响应

```typescript
import { createQuotaWarningResponse } from '@/lib/middleware/quota-response';

// 在成功响应中包含配额警告
const response = createQuotaWarningResponse(
  { success: true, data: result },
  'upload',
  500, // limit
  420  // used (84%)
);
```

**响应格式**:

```json
{
  "success": true,
  "data": { ... },
  "quotaWarning": {
    "warning": true,
    "message": "You've used 84% of your monthly upload quota. 80 uploads remaining.",
    "quota": {
      "type": "upload",
      "limit": 500,
      "used": 420,
      "remaining": 80,
      "unlimited": false,
      "percentage": 84
    },
    "upgradeUrl": "/subscription/plans"
  }
}
```

#### addQuotaHeaders - 添加配额头信息

```typescript
import { addQuotaHeaders } from '@/lib/middleware/quota-response';

// 在任何响应中添加配额信息头
const response = NextResponse.json({ success: true });
return addQuotaHeaders(response, 'aiRequest', 1000, 350, false);
```

**响应头**:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 650
X-RateLimit-Used: 350
X-Quota-Type: aiRequest
```

---

## 🔌 API 集成示例

### 示例 1: 单文件上传 API

```typescript
// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withQuota } from '@/lib/middleware/quota-middleware';
import { addQuotaHeaders } from '@/lib/middleware/quota-response';

export const POST = withQuota(
  {
    quotaType: 'upload',
    amount: 1,
    errorMessage: 'Monthly upload limit reached'
  },
  async (request, userId, quotaInfo) => {
    // 1. 获取文件
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // 2. 检查存储空间（额外检查）
    const fileSize = file.size;
    const storageCheck = await checkQuota(userId, 'storage', fileSize);

    if (!storageCheck.allowed) {
      return createQuotaExceededResponse(
        'storage',
        storageCheck.limit,
        storageCheck.used,
        'Storage quota exceeded'
      );
    }

    // 3. 上传文件
    const result = await uploadFile(file, userId);

    // 4. 消耗存储配额
    await consumeQuota(userId, 'storage', fileSize);

    // 5. 返回结果（包含配额警告）
    if (quotaInfo.remaining < 10) {
      return createQuotaWarningResponse(
        { success: true, image: result },
        'upload',
        quotaInfo.limit,
        quotaInfo.used + 1
      );
    }

    const response = NextResponse.json({
      success: true,
      image: result
    });

    return addQuotaHeaders(
      response,
      'upload',
      quotaInfo.limit,
      quotaInfo.used + 1
    );
  }
);
```

### 示例 2: AI 图片生成 API

```typescript
// app/api/generate/image/route.ts
import { withQuota } from '@/lib/middleware/quota-middleware';
import { createQuotaWarningResponse } from '@/lib/middleware/quota-response';

export const POST = withQuota(
  {
    quotaType: 'aiRequest',
    amount: 1,
    errorMessage: 'AI generation quota exceeded. Upgrade for more requests.'
  },
  async (request, userId, quotaInfo) => {
    // 1. 解析请求
    const body = await request.json();
    const { prompt, style, size } = body;

    // 2. 调用 AI 服务生成图片
    const generatedImage = await aiService.generateImage({
      prompt,
      style,
      size
    });

    // 3. 保存生成的图片
    const savedImage = await saveGeneratedImage(
      generatedImage,
      userId,
      prompt
    );

    // 4. 检查是否需要警告
    const warningThreshold = Math.floor(quotaInfo.limit * 0.8);

    if (quotaInfo.used + 1 >= warningThreshold) {
      return createQuotaWarningResponse(
        {
          success: true,
          image: savedImage,
          metadata: {
            prompt,
            style,
            size
          }
        },
        'aiRequest',
        quotaInfo.limit,
        quotaInfo.used + 1
      );
    }

    // 5. 返回成功结果
    return NextResponse.json({
      success: true,
      image: savedImage,
      metadata: {
        prompt,
        style,
        size
      }
    });
  }
);
```

### 示例 3: 批量上传 API

```typescript
// app/api/upload/batch/route.ts
import { withBatchQuota } from '@/lib/middleware/quota-middleware';
import { createBatchQuotaExceededResponse } from '@/lib/middleware/quota-response';

export const POST = withBatchQuota(
  { quotaType: 'upload' },
  // 获取批量数量的函数
  async (request) => {
    const formData = await request.formData();
    const files = formData.getAll('files');
    return files.length;
  },
  // 业务处理函数
  async (request, userId, amount, quotaInfo) => {
    // 1. 获取所有文件
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    // 2. 批量上传
    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        const result = await uploadFile(file, userId);
        results.push(result);
      } catch (error) {
        errors.push({
          filename: file.name,
          error: error.message
        });
      }
    }

    // 3. 返回批量结果
    return NextResponse.json({
      success: true,
      uploaded: results.length,
      failed: errors.length,
      results,
      errors,
      quota: {
        used: amount,
        remaining: quotaInfo.remaining - amount,
        limit: quotaInfo.limit
      }
    });
  }
);
```

### 示例 4: AI 分析 API（仅检查不消耗）

```typescript
// app/api/ai/analyze-preview/route.ts
import { withQuota } from '@/lib/middleware/quota-middleware';

export const POST = withQuota(
  {
    quotaType: 'aiRequest',
    amount: 1,
    checkOnly: true, // 仅检查，不消耗配额
  },
  async (request, userId, quotaInfo) => {
    // 预览 AI 分析结果（不实际调用 AI）
    const body = await request.json();
    const { imageId } = body;

    // 获取图片信息
    const image = await getImage(imageId, userId);

    // 返回预估的分析结果
    return NextResponse.json({
      success: true,
      preview: {
        imageId,
        estimatedTags: ['preview', 'tags'],
        willConsumeQuota: 1,
      },
      quota: {
        remaining: quotaInfo.remaining,
        limit: quotaInfo.limit
      }
    });
  }
);
```

---

## 🔍 错误处理

### 配额超限错误（429）

**场景**: 用户配额不足

**响应**:

```json
{
  "error": "QuotaExceeded",
  "message": "AI request quota exhausted. Upgrade to a higher plan for more AI processing capacity.",
  "quota": {
    "type": "aiRequest",
    "limit": 100,
    "used": 100,
    "remaining": 0,
    "unlimited": false,
    "percentage": 100
  },
  "upgradeUrl": "/subscription/plans",
  "suggestions": [
    "Wait for monthly quota reset",
    "Upgrade to Pro plan for 1000 AI requests/month",
    "Upgrade to Premium plan for unlimited AI requests"
  ]
}
```

**HTTP 状态码**: 429 Too Many Requests

**重试策略**:

- `storage`: 立即可重试（删除文件后）
- `upload`: 等待下个月重置（Retry-After 头指定秒数）
- `aiRequest`: 等待下个月重置（Retry-After 头指定秒数）

### 身份验证失败（401）

**场景**: 用户未登录

**响应**:

```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### 配额检查失败（500）

**场景**: 配额服务内部错误

**响应**:

```json
{
  "error": "QuotaCheckFailed",
  "message": "Failed to check quota. Please try again.",
  "details": "Error details..."
}
```

---

## 📊 配额警告系统

### 警告触发条件

配额使用超过 **80%** 时触发警告：

| 配额类型 | 警告阈值 | 警告消息 |
|---------|---------|---------|
| storage | 80% | "You're running low on storage space!" |
| upload | 80% | "Upload quota is running low this month!" |
| aiRequest | 80% | "AI request quota is running low!" |

### 前端展示建议

#### 1. 全局提示条

```typescript
// 在布局组件中检查配额警告
const { data: quotaUsage } = useSWR('/api/subscription/current');

if (quotaUsage?.quota.storage.percentage >= 80) {
  return (
    <Alert variant="warning">
      <AlertIcon />
      <AlertTitle>Storage almost full!</AlertTitle>
      <AlertDescription>
        You've used {quotaUsage.quota.storage.percentage}% of your storage.
        <Link href="/subscription/plans">Upgrade now</Link>
      </AlertDescription>
    </Alert>
  );
}
```

#### 2. API 响应中的警告

```typescript
// 处理 API 响应中的配额警告
const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData
});

const data = await response.json();

if (data.quotaWarning) {
  toast.warning(data.quotaWarning.message, {
    action: {
      label: 'Upgrade',
      onClick: () => router.push('/subscription/plans')
    }
  });
}
```

#### 3. 响应头中的警告

```typescript
// 检查响应头中的配额警告
fetch('/api/generate/image', options)
  .then(response => {
    if (response.headers.get('X-Quota-Warning') === 'true') {
      const remaining = response.headers.get('X-RateLimit-Remaining');
      showWarning(`Only ${remaining} AI requests remaining this month!`);
    }
    return response.json();
  });
```

---

## 🔧 实用工具函数

### checkQuota - 检查配额

```typescript
import { checkQuota } from '@/lib/middleware/quota-middleware';

// 在业务逻辑中检查配额
const quotaCheck = await checkQuota(userId, 'storage', fileSize);

if (!quotaCheck.allowed) {
  // 配额不足，处理错误
  throw new Error('Storage quota exceeded');
}
```

### consumeQuota - 消耗配额

```typescript
import { consumeQuota } from '@/lib/middleware/quota-middleware';

// 在业务逻辑中手动消耗配额
await consumeQuota(userId, 'storage', fileSize);
```

### shouldShowQuotaWarning - 配额警告检查

```typescript
import { shouldShowQuotaWarning } from '@/lib/middleware/quota-middleware';

// 检查是否需要显示配额警告
const warning = await shouldShowQuotaWarning(userId, 'upload');

if (warning.warning) {
  console.log(`Warning: ${warning.percentage}% used, ${warning.remaining} remaining`);
}
```

### checkMultipleQuotas - 批量配额检查

```typescript
import { checkMultipleQuotas } from '@/lib/middleware/quota-middleware';

// 同时检查多个配额
const result = await checkMultipleQuotas(userId, [
  { quotaType: 'upload', amount: 1 },
  { quotaType: 'storage', amount: fileSize },
  { quotaType: 'aiRequest', amount: 1 }
]);

if (!result.allowed) {
  console.log('Insufficient quotas:', result.insufficientQuotas);
}
```

---

## 📈 性能优化

### 1. 配额缓存

**问题**: 每次请求都查询数据库会影响性能

**解决方案**: 使用 Redis 缓存配额信息

```typescript
// 伪代码
async function getCachedQuota(userId: string, quotaType: QuotaType) {
  const cacheKey = `quota:${userId}:${quotaType}`;
  
  // 尝试从 Redis 获取
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // 从数据库获取
  const quota = await getQuotaFromDB(userId, quotaType);
  
  // 缓存 5 分钟
  await redis.setex(cacheKey, 300, JSON.stringify(quota));
  
  return quota;
}
```

### 2. 批量操作优化

**问题**: 批量操作时多次数据库写入

**解决方案**: 使用事务批量更新

```typescript
// 使用 Prisma 事务
await prisma.$transaction([
  prisma.userSubscription.update({
    where: { userId },
    data: {
      quotaUsage: {
        /* 更新后的配额 */
      }
    }
  }),
  prisma.usageLog.createMany({
    data: usageLogs
  })
]);
```

### 3. 异步日志记录

**问题**: 同步记录日志影响响应时间

**解决方案**: 异步记录使用日志

```typescript
// 不等待日志记录完成
consumeQuota(userId, quotaType, amount)
  .then(() => {
    // 异步记录日志
    logQuotaUsage(userId, quotaType, amount).catch(console.error);
  });
```

---

## 🧪 测试

### 单元测试示例

```typescript
// __tests__/quota-middleware.test.ts
import { withQuota } from '@/lib/middleware/quota-middleware';

describe('withQuota middleware', () => {
  it('should allow request when quota is sufficient', async () => {
    const handler = withQuota(
      { quotaType: 'aiRequest', amount: 1 },
      async (req, userId, quotaInfo) => {
        return NextResponse.json({ success: true });
      }
    );

    const request = new NextRequest('http://localhost/api/test');
    const response = await handler(request);

    expect(response.status).toBe(200);
  });

  it('should reject request when quota is exceeded', async () => {
    // Mock quota service to return insufficient quota
    // ...

    const handler = withQuota(
      { quotaType: 'upload', amount: 1 },
      async () => NextResponse.json({ success: true })
    );

    const request = new NextRequest('http://localhost/api/test');
    const response = await handler(request);

    expect(response.status).toBe(429);
    const data = await response.json();
    expect(data.error).toBe('QuotaExceeded');
  });
});
```

### 集成测试脚本

```bash
# 测试配额中间件
cd frontend
npx tsx scripts/test-quota-middleware.ts
```

---

## 🚀 部署清单

### 生产环境配置

- [ ] 启用 Redis 缓存配额信息
- [ ] 配置配额警告邮件通知
- [ ] 设置监控和告警（配额耗尽率）
- [ ] 配置日志收集（ELK/Datadog）
- [ ] 压力测试配额系统
- [ ] 配置 Rate Limiting（Nginx/CloudFlare）
- [ ] 配置配额仪表板
- [ ] 文档更新（API 文档、用户指南）

### 监控指标

- 配额检查响应时间
- 配额超限频率（按用户、按类型）
- 配额消耗趋势
- 配额警告触发率
- 配额相关错误率

---

## 📚 相关文档

- [Phase 5 Day 1 总结](./PHASE5_DAY1_SUMMARY.md) - 订阅体系设计
- [Phase 5 Day 2-3 总结](./PHASE5_DAY2-3_SUMMARY.md) - Stripe 集成
- [Phase 5 进度跟踪](./PHASE5_PROGRESS.md)
- [配额服务文档](../frontend/lib/subscription/quota-service.ts)

---

## ✅ 完成检查

- [x] 配额中间件实现
- [x] 批量配额中间件实现
- [x] 配额响应工具实现
- [x] 错误处理机制
- [x] 配额警告系统
- [x] 实用工具函数
- [x] 使用文档和示例
- [ ] 集成到上传 API（待集成）
- [ ] 集成到 AI API（待集成）
- [ ] 集成到生成 API（待集成）
- [ ] 单元测试（待编写）
- [ ] 集成测试（待编写）
- [ ] 性能测试（待执行）

---

**文档版本**: v1.0  
**最后更新**: 2024-01-XX  
**维护者**: Development Team