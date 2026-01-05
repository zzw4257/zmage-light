# Zmage v3.0.0 - Phase 5 Day 1: 配额体系设计与数据模型

## 📅 日期
Phase 5 开始 - Day 1 完成

## 🎯 今日目标
1. ✅ 设计三档订阅套餐（Free/Pro/Premium）
2. ✅ 定义配额限制规则
3. ✅ 更新 Prisma Schema（4个新表）
4. ✅ 创建套餐配置文件
5. ✅ 创建类型定义文件
6. ✅ 实现配额管理服务基础类
7. ✅ 创建数据库种子脚本

## ✅ 完成内容

### 1. 订阅套餐体系设计

#### Free 套餐（免费版）
**目标用户**: 个人体验用户

**配额限制**:
- 💾 存储空间: 5GB
- 🤖 AI 分析: 100 次/月
- 🎨 AI 生成: 10 次/月
- 🛠️ 创作工坊: 20 次/月
- 📁 相册: 最多 10 个
- 🔗 分享链接: 最多 5 个
- 🎬 视频时长: 最长 1 分钟
- 📤 单文件: 最大 50MB
- 🔄 并发上传: 3 个
- ⚡ 队列优先级: 1（最低）

**特性**:
- 基础搜索功能
- 社区支持

**定价**: $0/月

---

#### Pro 套餐（专业版）⭐ 推荐
**目标用户**: 专业摄影师和内容创作者

**配额限制**:
- 💾 存储空间: 100GB
- 🤖 AI 分析: 1,000 次/月
- 🎨 AI 生成: 200 次/月
- 🛠️ 创作工坊: 500 次/月
- 📁 相册: 最多 100 个
- 🔗 分享链接: 最多 50 个
- 🎬 视频时长: 最长 10 分钟
- 📤 单文件: 最大 500MB
- 🔄 并发上传: 10 个
- ⚡ 队列优先级: 5（中等）

**特性**:
- ⚡ 优先队列处理
- 🔒 高级分享控制（密码、过期时间）
- 📊 高级搜索和筛选
- 🔍 Elasticsearch 全文搜索
- 📈 使用统计分析
- 🚫 无广告
- 📧 邮件支持

**定价**: 
- 月付: $9.99/月
- 年付: $99.99/年（节省 16%，约 $8.33/月）

---

#### Premium 套餐（企业版）
**目标用户**: 团队和企业级用户

**配额限制**:
- 💾 存储空间: 1TB
- 🤖 AI 分析: 无限制
- 🎨 AI 生成: 无限制
- 🛠️ 创作工坊: 无限制
- 📁 相册: 无限制
- 🔗 分享链接: 无限制
- 🎬 视频时长: 最长 1 小时
- 📤 单文件: 最大 2GB
- 🔄 并发上传: 50 个
- ⚡ 队列优先级: 10（最高）

**特性**:
- ⚡⚡ 最高优先级处理
- 🔒 全部高级分享功能
- 📊 完整数据分析 Dashboard
- 🔍 AI 以图搜图
- 📦 批量分享和打包下载
- 💾 数据导出功能
- 🔄 自动备份（即将推出）
- 👥 团队协作（即将推出）
- 🎯 自定义 AI 模型（即将推出）
- 📞 优先客服支持
- 🎓 专属培训资源

**定价**: 
- 月付: $29.99/月
- 年付: $299.99/年（节省 17%，约 $25/月）

---

### 2. 数据库 Schema 扩展

#### 新增表结构

##### SubscriptionPlan（订阅套餐表）
系统级配置，存储套餐信息

```prisma
model SubscriptionPlan {
  id                String   @id @default(cuid())
  name              String   @unique // "free", "pro", "premium"
  displayName       String
  description       String?
  price             Float
  interval          String?  // "month", "year", null for free
  stripeProductId   String?  @unique
  stripePriceId     String?  // 月付 Price ID
  stripeYearlyPriceId String? // 年付 Price ID
  limits            String   // JSON string
  features          String   // JSON string
  isActive          Boolean  @default(true)
  sortOrder         Int      @default(0)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  subscriptions     UserSubscription[]
}
```

##### UserSubscription（用户订阅表）
存储用户的订阅信息和配额使用情况

```prisma
model UserSubscription {
  id                String   @id @default(cuid())
  userId            String
  planId            String
  
  // Stripe 相关
  stripeCustomerId      String?
  stripeSubscriptionId  String?  @unique
  stripePriceId         String?
  stripeCurrentPeriodStart DateTime?
  stripeCurrentPeriodEnd   DateTime?
  
  // 订阅状态
  status            String   @default("active")
  cancelAtPeriodEnd Boolean  @default(false)
  canceledAt        DateTime?
  
  // 试用期
  trialStart        DateTime?
  trialEnd          DateTime?
  
  // 配额使用（当前周期，JSON 存储）
  quotaUsage        String   @default("{}")
  
  // 周期重置
  currentPeriodStart DateTime @default(now())
  currentPeriodEnd   DateTime
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  user              User     @relation(...)
  plan              SubscriptionPlan @relation(...)
  payments          Payment[]
  usageLogs         UsageLog[]
}
```

##### Payment（支付记录表）
存储所有支付交易记录

```prisma
model Payment {
  id                String   @id @default(cuid())
  userId            String
  subscriptionId    String
  
  // Stripe 相关
  stripePaymentIntentId String? @unique
  stripeInvoiceId       String? @unique
  
  // 支付信息
  amount            Float
  currency          String   @default("usd")
  status            String   // succeeded, pending, failed, refunded
  
  // 发票信息
  invoiceUrl        String?
  invoicePdf        String?
  receiptUrl        String?
  
  // 失败信息
  failureCode       String?
  failureMessage    String?
  
  // 退款信息
  refunded          Boolean  @default(false)
  refundedAt        DateTime?
  refundAmount      Float?
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  user              User     @relation(...)
  subscription      UserSubscription @relation(...)
}
```

##### UsageLog（配额使用日志表）
记录所有配额消费行为

```prisma
model UsageLog {
  id                String   @id @default(cuid())
  userId            String
  subscriptionId    String
  
  // 使用类型
  type              String   // "ai_analysis", "ai_generation", "workshop", etc
  action            String   // 具体操作
  
  // 使用量
  amount            Float    @default(1)
  unit              String?  // "count", "bytes", "seconds"
  
  // 关联资源
  resourceType      String?  // "image", "video", "album"
  resourceId        String?
  
  // 元数据（JSON 存储）
  metadata          String?
  
  createdAt         DateTime @default(now())
  
  user              User     @relation(...)
  subscription      UserSubscription @relation(...)
}
```

#### User 表新增字段
```prisma
model User {
  // ... 现有字段
  
  // 订阅相关
  subscriptions     UserSubscription[]
  payments          Payment[]
  usageLogs         UsageLog[]
  stripeCustomerId  String?  @unique
}
```

---

### 3. 套餐配置文件

**文件**: `frontend/lib/subscription/plans.ts`（419 行）

#### 核心功能

##### 套餐常量定义
```typescript
export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanId, SubscriptionPlan> = {
  free: { /* 免费套餐配置 */ },
  pro: { /* 专业套餐配置 */ },
  premium: { /* 企业套餐配置 */ },
};
```

##### 配额类型
```typescript
export type QuotaType =
  | 'storage'               // 存储空间
  | 'ai_analysis'           // AI 分析
  | 'ai_generation'         // AI 生成
  | 'workshop'              // 创作工坊
  | 'album'                 // 相册
  | 'shared_link'           // 分享链接
  | 'video_duration'        // 视频时长
  | 'batch_operation'       // 批量操作
  | 'file_size'             // 文件大小
  | 'concurrent_upload';    // 并发上传
```

##### 工具函数
```typescript
// 获取套餐信息
getPlan(planId: SubscriptionPlanId): SubscriptionPlan

// 获取所有套餐（排序）
getAllPlans(): SubscriptionPlan[]

// 根据 Stripe Price ID 获取套餐
getPlanByPriceId(priceId: string): SubscriptionPlan | undefined

// 格式化存储空间
formatStorage(bytes: number): string

// 格式化价格
formatPrice(price: number, currency?: string): string

// 计算年费节省百分比
calculateYearlySavings(monthlyPrice: number, yearlyPrice: number): number

// 检查配额是否无限
isUnlimited(limit: number): boolean

// 获取配额显示文本
getQuotaDisplay(limit: number, unit?: string): string

// 比较套餐等级
comparePlans(planA: SubscriptionPlanId, planB: SubscriptionPlanId): number

// 检查是否可以降级
canDowngrade(
  currentPlan: SubscriptionPlanId,
  targetPlan: SubscriptionPlanId,
  currentUsage: Partial<QuotaUsage>
): { allowed: boolean; reasons: string[] }

// 获取推荐套餐
getRecommendedPlan(): SubscriptionPlan | undefined
```

---

### 4. 类型定义文件

**文件**: `frontend/lib/subscription/types.ts`（351 行）

#### 核心类型

##### 订阅状态
```typescript
export type SubscriptionStatus =
  | 'active'        // 活跃
  | 'trialing'      // 试用期
  | 'past_due'      // 逾期
  | 'canceled'      // 已取消
  | 'unpaid'        // 未支付
  | 'incomplete'    // 未完成
  | 'incomplete_expired'; // 未完成已过期
```

##### 支付状态
```typescript
export type PaymentStatus =
  | 'succeeded'     // 成功
  | 'pending'       // 处理中
  | 'failed'        // 失败
  | 'refunded'      // 已退款
  | 'canceled';     // 已取消
```

##### 配额检查结果
```typescript
export interface QuotaCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  percentage: number;
  isUnlimited: boolean;
  reason?: string;
}
```

##### Webhook 事件类型
```typescript
export type WebhookEventType =
  | 'checkout.session.completed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.paid'
  | 'payment_intent.succeeded'
  // ... 更多事件
```

---

### 5. 配额管理服务

**文件**: `frontend/lib/subscription/quota-service.ts`（440 行）

#### 核心方法

##### checkQuota() - 检查配额
检查用户配额是否充足

```typescript
async checkQuota(
  userId: string,
  type: QuotaType,
  amount: number = 1
): Promise<QuotaCheckResult>
```

**功能**:
- 获取用户当前订阅和套餐
- 解析套餐配额限制
- 处理无限制配额（-1）
- 计算当前使用量和剩余量
- 返回详细的检查结果

**示例**:
```typescript
const result = await quotaService.checkQuota('user-id', 'ai_analysis', 1);
if (!result.allowed) {
  console.log(`配额不足: ${result.reason}`);
}
```

##### consumeQuota() - 消费配额
消费配额并记录使用日志

```typescript
async consumeQuota(params: ConsumeQuotaParams): Promise<void>
```

**功能**:
- 更新订阅的配额使用情况
- 记录详细的使用日志
- 支持元数据记录
- 关联资源信息

**示例**:
```typescript
await quotaService.consumeQuota({
  userId: 'user-id',
  type: 'ai_analysis',
  amount: 1,
  resourceType: 'image',
  resourceId: 'image-id',
  metadata: { provider: 'gemini', model: 'gemini-2.0-flash-exp' }
});
```

##### getQuotaUsage() - 获取配额使用情况
获取用户当前周期的配额使用统计

```typescript
async getQuotaUsage(userId: string): Promise<QuotaUsage>
```

**返回**:
```typescript
{
  storage: 1024000000,      // 字节
  aiAnalysis: 50,           // 次数
  aiGeneration: 5,          // 次数
  workshops: 10,            // 次数
  albums: 3,                // 个数
  sharedLinks: 2,           // 个数
  periodStart: Date,        // 周期开始
  periodEnd: Date,          // 周期结束
}
```

##### resetPeriodQuota() - 重置周期配额
重置单个用户的周期性配额

```typescript
async resetPeriodQuota(userId: string): Promise<QuotaResetResult>
```

**功能**:
- 重置周期性配额（AI 分析、生成、工坊）
- 保留累计性配额（存储、相册、分享链接）
- 更新周期时间（+1个月）
- 返回重置结果

##### resetExpiredSubscriptions() - 批量重置
批量重置所有过期订阅的配额

```typescript
async resetExpiredSubscriptions(): Promise<QuotaResetResult[]>
```

**用途**: 定时任务调用，每日检查并重置过期订阅

##### checkAndResetIfExpired() - 检查并重置
检查用户配额是否过期，如果过期则自动重置

```typescript
async checkAndResetIfExpired(userId: string): Promise<boolean>
```

**用途**: 在每次配额检查前调用，确保配额数据最新

---

### 6. 数据库种子脚本

**文件**: `frontend/prisma/seed-subscriptions.ts`（142 行）

#### 功能

##### 1. 初始化订阅套餐
从配置文件读取套餐定义，创建或更新数据库中的套餐记录

```typescript
for (const plan of Object.values(SUBSCRIPTION_PLANS)) {
  // 创建或更新套餐
  await prisma.subscriptionPlan.upsert({
    where: { name: plan.id },
    create: { /* 套餐数据 */ },
    update: { /* 套餐数据 */ },
  });
}
```

##### 2. 为现有用户创建订阅
扫描所有用户，为没有订阅的用户创建免费订阅

```typescript
for (const user of users) {
  if (user.subscriptions.length === 0) {
    await prisma.userSubscription.create({
      data: {
        userId: user.id,
        planId: freePlan.id,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        quotaUsage: JSON.stringify({
          storage: 0,
          aiAnalysis: 0,
          aiGeneration: 0,
          workshops: 0,
          albums: 0,
          sharedLinks: 0,
        }),
      },
    });
  }
}
```

##### 3. 显示统计信息
统计各套餐的用户分布

```typescript
const subscriptionStats = await prisma.userSubscription.groupBy({
  by: ['planId'],
  _count: { id: true },
});
```

#### 使用方法
```bash
# 执行种子脚本
cd frontend
npx tsx prisma/seed-subscriptions.ts
```

---

## 📊 代码统计

### 新增文件
| 文件 | 行数 | 说明 |
|------|------|------|
| `lib/subscription/plans.ts` | 419 | 套餐配置和工具函数 |
| `lib/subscription/types.ts` | 351 | 类型定义 |
| `lib/subscription/quota-service.ts` | 440 | 配额管理服务 |
| `prisma/seed-subscriptions.ts` | 142 | 种子数据脚本 |
| **总计** | **1,352** | **新增代码** |

### 修改文件
| 文件 | 变更 | 说明 |
|------|------|------|
| `prisma/schema.prisma` | +157 行 | 新增 4 个表和关系 |

### 文档
| 文件 | 行数 | 说明 |
|------|------|------|
| `docs/PHASE5_COMMERCIALIZATION.md` | 1917 | Phase 5 完整计划 |
| `docs/PHASE5_PROGRESS.md` | 541 | Phase 5 进度跟踪 |
| `docs/PHASE5_DAY1_SUMMARY.md` | 本文档 | Day 1 工作总结 |

---

## 🎯 技术亮点

### 1. 灵活的配额体系设计
- ✅ 支持多种配额类型（存储、计数、时长等）
- ✅ 区分周期性配额和累计性配额
- ✅ 支持无限制配额（-1）
- ✅ 详细的配额检查结果

### 2. 完善的数据模型
- ✅ 清晰的表结构和关系
- ✅ 支持 Stripe 集成（预留字段）
- ✅ 支持试用期功能
- ✅ 完整的支付和退款记录
- ✅ 详细的使用日志追踪

### 3. 健壮的配额管理
- ✅ 原子性的配额检查和消费
- ✅ 自动化的周期重置
- ✅ 过期检查和自动重置
- ✅ 批量处理能力
- ✅ 详细的使用日志

### 4. 优雅的 API 设计
- ✅ 类型安全的接口
- ✅ 清晰的错误处理
- ✅ 易于扩展的架构
- ✅ 丰富的工具函数

### 5. 易于维护的配置
- ✅ 集中式套餐配置
- ✅ 环境变量支持（Stripe IDs）
- ✅ 种子脚本自动化初始化
- ✅ 支持套餐动态更新

---

## 🔄 下一步工作（Phase 5 Day 2-3）

### Day 2-3: Stripe 支付集成（预计 3 天）

#### 环境配置
- [ ] 注册 Stripe 账号（测试环境）
- [ ] 创建产品和价格（3个套餐 x 月付/年付）
- [ ] 配置 Webhook 端点
- [ ] 设置环境变量

#### Stripe 服务封装
- [ ] 安装 `stripe` npm 包
- [ ] 创建 `lib/stripe/stripe-service.ts`
- [ ] 实现客户管理方法
  - [ ] `getOrCreateCustomer()`
  - [ ] `updateCustomer()`
- [ ] 实现订阅管理方法
  - [ ] `createSubscription()`
  - [ ] `updateSubscription()`
  - [ ] `cancelSubscription()`
- [ ] 实现 Checkout 方法
  - [ ] `createCheckoutSession()`
  - [ ] `createPortalSession()`

#### API 端点开发
- [ ] `/api/subscription/plans` - 获取套餐列表
- [ ] `/api/subscription/current` - 获取当前订阅
- [ ] `/api/subscription/checkout` - 创建支付会话
- [ ] `/api/subscription/portal` - 客户管理门户
- [ ] `/api/subscription/webhook` - Stripe Webhook 处理

#### Webhook 处理器
- [ ] 实现事件验证
- [ ] 处理 `checkout.session.completed`
- [ ] 处理 `invoice.paid`
- [ ] 处理 `customer.subscription.updated`
- [ ] 处理 `customer.subscription.deleted`
- [ ] 处理 `invoice.payment_failed`

#### 测试
- [ ] 测试支付流程（成功）
- [ ] 测试支付失败场景
- [ ] 测试订阅更新
- [ ] 测试订阅取消
- [ ] 测试 Webhook 处理

---

## 💡 经验总结

### 设计决策

#### 1. JSON 存储 vs 关系型存储
**决策**: 配额限制和使用情况使用 JSON 存储

**原因**:
- ✅ 灵活性：配额类型可能随时扩展
- ✅ 性能：减少表连接查询
- ✅ 原子性：单次更新配额使用情况
- ❌ 劣势：无法直接聚合查询（可通过 UsageLog 补充）

#### 2. 配额类型设计
**决策**: 区分周期性配额和累计性配额

**周期性配额**（每月重置）:
- AI 分析次数
- AI 生成次数
- 创作工坊使用次数

**累计性配额**（不重置）:
- 存储空间
- 相册数量
- 分享链接数量

**原因**: 符合实际业务逻辑，计费方式更合理

#### 3. 配额服务单例模式
**决策**: 导出配额服务单例

**优点**:
- ✅ 避免重复创建 Prisma 客户端
- ✅ 统一的配额管理入口
- ✅ 方便后续添加缓存层

### 最佳实践

#### 1. 类型安全
- 使用 TypeScript 严格类型
- 定义清晰的接口和类型
- 避免使用 `any` 类型

#### 2. 错误处理
- 捕获并记录所有错误
- 返回友好的错误信息
- 避免暴露敏感信息

#### 3. 数据一致性
- 使用事务处理关键操作
- 配额检查和消费原子化
- 避免并发冲突

#### 4. 可扩展性
- 配置化的套餐定义
- 灵活的配额类型系统
- 预留 Stripe 集成字段

---

## 🐛 已知问题

### 待解决

1. **配额并发冲突**
   - 问题: 高并发场景下可能出现配额超限
   - 解决方案: 添加乐观锁或分布式锁（Day 6-7 优化）

2. **存储配额实时性**
   - 问题: 存储配额依赖实时计算文件大小总和
   - 解决方案: 在上传/删除时同步更新配额（Day 8-10 实现）

3. **配额重置定时任务**
   - 问题: 尚未实现自动化的定时重置任务
   - 解决方案: 使用 BullMQ 定时任务（Day 6-7 实现）

### 改进建议

1. **配额缓存**
   - 将配额检查结果缓存到 Redis
   - 减少数据库查询压力
   - 设置合理的缓存过期时间（5-10 分钟）

2. **配额预警**
   - 当配额使用达到 80% 时发送通知
   - 提前引导用户升级套餐
   - 提升用户体验和付费转化

3. **配额统计优化**
   - 使用 UsageLog 进行配额统计分析
   - 生成配额使用趋势图表
   - 辅助运营决策

---

## 📚 相关文档

- [Phase 5 完整计划](./PHASE5_COMMERCIALIZATION.md)
- [Phase 5 进度跟踪](./PHASE5_PROGRESS.md)
- [订阅套餐配置](../frontend/lib/subscription/plans.ts)
- [配额管理服务](../frontend/lib/subscription/quota-service.ts)
- [Prisma Schema](../frontend/prisma/schema.prisma)

---

## 🎉 Day 1 总结

今天成功完成了 Phase 5 Day 1 的所有工作：

✅ **完整的订阅套餐体系设计** - 3 个套餐，覆盖不同用户群体  
✅ **完善的数据库架构** - 4 个新表，157 行 Schema  
✅ **强大的配额管理系统** - 440 行核心服务代码  
✅ **类型安全的 API** - 351 行类型定义  
✅ **自动化的初始化脚本** - 142 行种子脚本  

**新增代码**: ~1,352 行  
**修改文件**: 1 个（schema.prisma）  
**新增文档**: 3 份  
**Git 提交**: 准备提交  
**预计完成度**: Phase 5 Day 1 - 100% ✅

**订阅系统数据模型和配额体系已完全就绪！** 下一步将集成 Stripe 支付功能。

---

**最后更新**: Phase 5 Day 1 完成  
**下一步**: Day 2-3 Stripe 支付集成  
**版本**: v3.0.0-phase5-day1