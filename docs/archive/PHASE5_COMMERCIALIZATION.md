# Zmage v3.0.0 - Phase 5: 商业化与用户增长

> **阶段目标**: 构建完整的商业化体系，提升用户体验和增长能力  
> **预计工作量**: 4-5周  
> **开始时间**: Phase 4 Day 2 完成后  
> **状态**: 🚀 准备启动

---

## 📋 目录

1. [阶段概览](#阶段概览)
2. [Week 1-2: 订阅与支付系统](#week-1-2-订阅与支付系统)
3. [Week 3: Elasticsearch 高级搜索](#week-3-elasticsearch-高级搜索)
4. [Week 3-4: 社交分享增强](#week-3-4-社交分享增强)
5. [Week 4-5: 数据分析与洞察](#week-4-5-数据分析与洞察)
6. [技术架构](#技术架构)
7. [实施检查清单](#实施检查清单)

---

## 阶段概览

### 🎯 核心目标

1. **商业化能力** 💰
   - 完整的订阅付费系统
   - 灵活的配额管理体系
   - Stripe 支付集成

2. **用户体验提升** 🔍
   - Elasticsearch 全文搜索
   - 高级过滤和排序
   - 以图搜图能力

3. **社交能力** 🌐
   - 时效性分享
   - 访问控制增强
   - 批量分享功能

4. **运营洞察** 📊
   - 用户行为分析
   - 存储使用统计
   - AI 使用监控
   - 可视化 Dashboard

### 📈 预期成果

```
功能模块：
✅ 订阅系统（Free/Pro/Premium）
✅ Stripe 支付集成
✅ 配额管理中间件
✅ Elasticsearch 搜索引擎
✅ 高级分享控制
✅ 数据分析 Dashboard

代码量：
- 新增代码：~8,000 行
- 新增测试：~2,000 行
- 新增文档：~3,000 行

数据库变更：
- 新增表：6 个
- 新增字段：15+ 个
- 新增索引：8 个
```

### 🗓️ 时间规划

| Week | 内容 | 工作量 | 优先级 |
|------|------|--------|--------|
| Week 1-2 | 订阅与支付系统 | 10天 | 🔴 P0 |
| Week 3 | Elasticsearch 搜索 | 5天 | 🟡 P1 |
| Week 3-4 | 社交分享增强 | 4天 | 🟡 P1 |
| Week 4-5 | 数据分析与洞察 | 6天 | 🟢 P2 |

---

## Week 1-2: 订阅与支付系统

### 📅 Day 1-2: 配额体系设计与数据模型

#### 目标
设计完整的订阅套餐体系和数据库架构

#### 任务清单

##### 1. 套餐定义
- [ ] 设计三档套餐（Free/Pro/Premium）
- [ ] 定义配额限制规则
- [ ] 设计价格策略

**套餐配置**：
```typescript
// lib/subscription/plans.ts
export const SUBSCRIPTION_PLANS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: null,
    limits: {
      storage: 5 * 1024 * 1024 * 1024, // 5GB
      aiAnalysisPerMonth: 100,
      aiGenerationPerMonth: 10,
      workshopsPerMonth: 20,
      albumsMax: 10,
      sharedLinksMax: 5,
      videoDurationMax: 60, // 秒
      batchOperationMax: 50,
    },
    features: [
      '5GB 存储空间',
      '每月 100 次 AI 分析',
      '每月 10 次 AI 生成',
      '每月 20 次创作工坊',
      '最多 10 个相册',
      '基础分享功能',
    ],
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    interval: 'month',
    stripeMonthlyPriceId: 'price_xxx', // Stripe Price ID
    stripeYearlyPriceId: 'price_yyy',
    limits: {
      storage: 100 * 1024 * 1024 * 1024, // 100GB
      aiAnalysisPerMonth: 1000,
      aiGenerationPerMonth: 100,
      workshopsPerMonth: 500,
      albumsMax: 100,
      sharedLinksMax: 50,
      videoDurationMax: 600,
      batchOperationMax: 500,
    },
    features: [
      '100GB 存储空间',
      '每月 1,000 次 AI 分析',
      '每月 100 次 AI 生成',
      '每月 500 次创作工坊',
      '最多 100 个相册',
      '高级分享功能（密码、过期时间）',
      '优先队列处理',
      '无广告',
    ],
  },
  PREMIUM: {
    id: 'premium',
    name: 'Premium',
    price: 29.99,
    interval: 'month',
    stripeMonthlyPriceId: 'price_aaa',
    stripeYearlyPriceId: 'price_bbb',
    limits: {
      storage: 1024 * 1024 * 1024 * 1024, // 1TB
      aiAnalysisPerMonth: -1, // 无限制
      aiGenerationPerMonth: -1,
      workshopsPerMonth: -1,
      albumsMax: -1,
      sharedLinksMax: -1,
      videoDurationMax: 3600,
      batchOperationMax: -1,
    },
    features: [
      '1TB 存储空间',
      '无限 AI 分析',
      '无限 AI 生成',
      '无限创作工坊',
      '无限相册',
      '高级分享 + 批量分享',
      '最高优先级处理',
      '专属客服支持',
      '数据导出功能',
      '团队协作（即将推出）',
    ],
  },
};
```

##### 2. 数据库 Schema 扩展
- [ ] 更新 Prisma schema
- [ ] 创建迁移脚本
- [ ] 添加必要索引

**新增表和字段**：
```prisma
// prisma/schema.prisma

// 订阅套餐（系统级配置）
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
  
  // 配额限制（JSON 存储）
  limits            Json
  
  // 功能特性（JSON 数组）
  features          Json
  
  isActive          Boolean  @default(true)
  sortOrder         Int      @default(0)
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // 关联
  subscriptions     UserSubscription[]
  
  @@map("subscription_plans")
}

// 用户订阅
model UserSubscription {
  id                String   @id @default(cuid())
  userId            String
  planId            String
  
  // Stripe 相关
  stripeCustomerId      String?  @unique
  stripeSubscriptionId  String?  @unique
  stripePriceId         String?
  stripeCurrentPeriodStart DateTime?
  stripeCurrentPeriodEnd   DateTime?
  
  // 订阅状态
  status            String   @default("active") // active, canceled, past_due, trialing
  cancelAtPeriodEnd Boolean  @default(false)
  canceledAt        DateTime?
  
  // 试用期
  trialStart        DateTime?
  trialEnd          DateTime?
  
  // 配额使用（当前周期）
  quotaUsage        Json     @default("{}")
  
  // 周期重置
  currentPeriodStart DateTime @default(now())
  currentPeriodEnd   DateTime
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // 关联
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  plan              SubscriptionPlan @relation(fields: [planId], references: [id])
  payments          Payment[]
  usageLogs         UsageLog[]
  
  @@index([userId])
  @@index([status])
  @@index([stripeCustomerId])
  @@index([stripeSubscriptionId])
  @@map("user_subscriptions")
}

// 支付记录
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
  
  // 关联
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  subscription      UserSubscription @relation(fields: [subscriptionId], references: [id])
  
  @@index([userId])
  @@index([subscriptionId])
  @@index([status])
  @@map("payments")
}

// 配额使用日志
model UsageLog {
  id                String   @id @default(cuid())
  userId            String
  subscriptionId    String
  
  // 使用类型
  type              String   // "ai_analysis", "ai_generation", "workshop", "storage", etc
  action            String   // 具体操作
  
  // 使用量
  amount            Float    @default(1)
  unit              String?  // "count", "bytes", "seconds"
  
  // 关联资源
  resourceType      String?  // "image", "video", "album"
  resourceId        String?
  
  // 元数据
  metadata          Json?
  
  createdAt         DateTime @default(now())
  
  // 关联
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  subscription      UserSubscription @relation(fields: [subscriptionId], references: [id])
  
  @@index([userId])
  @@index([subscriptionId])
  @@index([type])
  @@index([createdAt])
  @@map("usage_logs")
}

// User 表新增字段
model User {
  // ... 现有字段
  
  // 订阅相关
  subscriptions     UserSubscription[]
  payments          Payment[]
  usageLogs         UsageLog[]
  
  // Stripe Customer ID（冗余，便于快速查询）
  stripeCustomerId  String?  @unique
}
```

##### 3. 数据库迁移
- [ ] 创建迁移脚本
- [ ] 初始化套餐数据
- [ ] 为现有用户创建免费订阅

```bash
# 生成迁移
npx prisma migrate dev --name add_subscription_system

# 创建种子脚本
# prisma/seed-subscriptions.ts
```

#### 预期产出
- ✅ 完整的套餐配置文件
- ✅ 数据库 Schema 更新
- ✅ 迁移脚本和种子数据
- ✅ 套餐管理文档

---

### 📅 Day 3-5: Stripe 支付集成

#### 目标
完成 Stripe 支付流程的完整集成

#### 任务清单

##### 1. Stripe 环境配置
- [ ] 注册 Stripe 账号
- [ ] 创建产品和价格
- [ ] 配置 Webhook
- [ ] 环境变量设置

```bash
# .env.local
STRIPE_SECRET_KEY=REDACTED_KEY...
STRIPE_PUBLISHABLE_KEY=REDACTED_KEY...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=REDACTED_KEY...
```

##### 2. Stripe 客户端封装
- [ ] 创建 Stripe 服务类
- [ ] 实现订阅创建
- [ ] 实现订阅管理
- [ ] 实现 Webhook 处理

```typescript
// lib/stripe/stripe-service.ts
import Stripe from 'stripe';

export class StripeService {
  private stripe: Stripe;
  
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-11-20.acacia',
    });
  }
  
  // 创建或获取客户
  async getOrCreateCustomer(userId: string, email: string): Promise<string> {
    // 实现逻辑
  }
  
  // 创建订阅
  async createSubscription(params: {
    customerId: string;
    priceId: string;
    trialDays?: number;
  }): Promise<Stripe.Subscription> {
    // 实现逻辑
  }
  
  // 取消订阅
  async cancelSubscription(subscriptionId: string): Promise<void> {
    // 实现逻辑
  }
  
  // 更新订阅
  async updateSubscription(params: {
    subscriptionId: string;
    priceId: string;
  }): Promise<Stripe.Subscription> {
    // 实现逻辑
  }
  
  // 创建 Checkout Session
  async createCheckoutSession(params: {
    customerId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<Stripe.Checkout.Session> {
    // 实现逻辑
  }
  
  // 创建 Customer Portal Session
  async createPortalSession(customerId: string): Promise<string> {
    // 实现逻辑
  }
}
```

##### 3. API 端点开发
- [ ] `/api/subscription/plans` - 获取套餐列表
- [ ] `/api/subscription/current` - 获取当前订阅
- [ ] `/api/subscription/checkout` - 创建支付会话
- [ ] `/api/subscription/portal` - 客户管理门户
- [ ] `/api/subscription/webhook` - Stripe Webhook

```typescript
// app/api/subscription/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { StripeService } from '@/lib/stripe/stripe-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { priceId } = await request.json();
    
    const stripeService = new StripeService();
    const checkoutSession = await stripeService.createCheckoutSession({
      customerId: session.user.stripeCustomerId,
      priceId,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/subscription/success`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/subscription/cancel`,
    });
    
    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
```

##### 4. Webhook 处理器
- [ ] 实现 `checkout.session.completed`
- [ ] 实现 `invoice.paid`
- [ ] 实现 `customer.subscription.updated`
- [ ] 实现 `customer.subscription.deleted`

```typescript
// app/api/subscription/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }
  
  // 处理不同的事件类型
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object);
      break;
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;
  }
  
  return NextResponse.json({ received: true });
}
```

#### 预期产出
- ✅ Stripe 服务封装
- ✅ 完整的支付 API 端点
- ✅ Webhook 处理器
- ✅ 支付集成测试

---

### 📅 Day 6-7: 配额管理系统

#### 目标
实现完整的配额检查和使用统计系统

#### 任务清单

##### 1. 配额服务类
- [ ] 创建配额管理器
- [ ] 实现配额检查
- [ ] 实现配额扣减
- [ ] 实现配额重置

```typescript
// lib/subscription/quota-service.ts
export class QuotaService {
  // 检查配额
  async checkQuota(
    userId: string,
    type: QuotaType,
    amount: number = 1
  ): Promise<{ allowed: boolean; remaining: number }> {
    // 实现逻辑
  }
  
  // 消费配额
  async consumeQuota(
    userId: string,
    type: QuotaType,
    amount: number = 1,
    metadata?: any
  ): Promise<void> {
    // 实现逻辑
  }
  
  // 获取配额使用情况
  async getQuotaUsage(userId: string): Promise<QuotaUsage> {
    // 实现逻辑
  }
  
  // 重置周期配额
  async resetPeriodQuota(userId: string): Promise<void> {
    // 实现逻辑
  }
}
```

##### 2. 配额中间件
- [ ] 创建 API 配额检查中间件
- [ ] 集成到需要限制的端点
- [ ] 超限错误处理

```typescript
// lib/middleware/quota-middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { QuotaService } from '@/lib/subscription/quota-service';

export function withQuota(quotaType: QuotaType, amount: number = 1) {
  return async (request: NextRequest, handler: Function) => {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const quotaService = new QuotaService();
    const result = await quotaService.checkQuota(
      session.user.id,
      quotaType,
      amount
    );
    
    if (!result.allowed) {
      return NextResponse.json(
        {
          error: 'Quota exceeded',
          type: quotaType,
          message: 'You have reached your quota limit. Please upgrade your plan.',
        },
        { status: 429 }
      );
    }
    
    // 执行原始处理器
    const response = await handler(request);
    
    // 如果成功，消费配额
    if (response.ok) {
      await quotaService.consumeQuota(session.user.id, quotaType, amount);
    }
    
    return response;
  };
}
```

##### 3. 应用配额限制
- [ ] AI 分析端点
- [ ] AI 生成端点
- [ ] 创作工坊端点
- [ ] 批量操作端点

```typescript
// app/api/ai/analyze/route.ts
import { withQuota } from '@/lib/middleware/quota-middleware';

export const POST = withQuota('ai_analysis')(async (request: NextRequest) => {
  // AI 分析逻辑
});
```

##### 4. 定时任务
- [ ] 创建配额重置任务
- [ ] 订阅状态同步任务

```typescript
// lib/cron/quota-reset.ts
import { prisma } from '@/lib/prisma';

export async function resetExpiredQuotas() {
  const now = new Date();
  
  // 查找需要重置的订阅
  const subscriptions = await prisma.userSubscription.findMany({
    where: {
      currentPeriodEnd: {
        lte: now,
      },
      status: 'active',
    },
  });
  
  // 重置配额
  for (const sub of subscriptions) {
    await resetSubscriptionQuota(sub);
  }
}
```

#### 预期产出
- ✅ 配额服务完整实现
- ✅ 配额中间件
- ✅ 配额统计和监控
- ✅ 定时重置任务

---

### 📅 Day 8-10: 订阅管理 UI

#### 目标
构建完整的用户订阅管理界面

#### 任务清单

##### 1. 套餐选择页面
- [ ] 创建 `/subscription/plans` 页面
- [ ] 套餐卡片组件
- [ ] 功能对比表
- [ ] 支付按钮集成

```typescript
// app/(main)/subscription/plans/page.tsx
'use client';

import { SUBSCRIPTION_PLANS } from '@/lib/subscription/plans';
import { PlanCard } from '@/components/subscription/PlanCard';

export default function PlansPage() {
  return (
    <div className="container mx-auto py-12">
      <h1 className="text-4xl font-bold text-center mb-4">
        选择适合你的套餐
      </h1>
      <p className="text-center text-muted-foreground mb-12">
        灵活的定价，满足不同需求
      </p>
      
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {Object.values(SUBSCRIPTION_PLANS).map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>
    </div>
  );
}
```

##### 2. 订阅管理页面
- [ ] 创建 `/subscription/manage` 页面
- [ ] 当前套餐展示
- [ ] 使用情况统计
- [ ] 升级/降级按钮
- [ ] 取消订阅功能

```typescript
// components/subscription/UsageStats.tsx
'use client';

import { Progress } from '@/components/ui/progress';
import { useSubscription } from '@/hooks/useSubscription';

export function UsageStats() {
  const { subscription, usage } = useSubscription();
  
  return (
    <div className="space-y-6">
      {/* 存储空间 */}
      <div>
        <div className="flex justify-between mb-2">
          <span>存储空间</span>
          <span>{formatBytes(usage.storage)} / {formatBytes(subscription.limits.storage)}</span>
        </div>
        <Progress value={(usage.storage / subscription.limits.storage) * 100} />
      </div>
      
      {/* AI 分析 */}
      <div>
        <div className="flex justify-between mb-2">
          <span>AI 分析</span>
          <span>{usage.aiAnalysis} / {subscription.limits.aiAnalysisPerMonth}</span>
        </div>
        <Progress value={(usage.aiAnalysis / subscription.limits.aiAnalysisPerMonth) * 100} />
      </div>
      
      {/* 更多统计... */}
    </div>
  );
}
```

##### 3. 配额提示组件
- [ ] 创建配额警告组件
- [ ] 超限弹窗
- [ ] 升级引导

```typescript
// components/subscription/QuotaWarning.tsx
'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function QuotaWarning({ type, usage, limit }: QuotaWarningProps) {
  const router = useRouter();
  const percentage = (usage / limit) * 100;
  
  if (percentage < 80) return null;
  
  return (
    <Alert variant={percentage >= 100 ? 'destructive' : 'warning'}>
      <AlertDescription>
        你已使用 {percentage.toFixed(0)}% 的 {getQuotaName(type)} 配额
        {percentage >= 100 && '，请升级套餐以继续使用'}
      </AlertDescription>
      {percentage >= 80 && (
        <Button onClick={() => router.push('/subscription/plans')} size="sm">
          升级套餐
        </Button>
      )}
    </Alert>
  );
}
```

##### 4. Stripe Checkout 集成
- [ ] 创建支付流程
- [ ] 成功/失败页面
- [ ] Customer Portal 集成

```typescript
// hooks/useCheckout.ts
import { useState } from 'react';

export function useCheckout() {
  const [loading, setLoading] = useState(false);
  
  const checkout = async (priceId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });
      
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Checkout failed:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return { checkout, loading };
}
```

#### 预期产出
- ✅ 完整的订阅管理 UI
- ✅ 使用情况可视化
- ✅ 流畅的支付体验
- ✅ 配额提示和引导

---

## Week 3: Elasticsearch 高级搜索

### 📅 Day 11-12: Elasticsearch 部署与配置

#### 目标
部署单节点 Elasticsearch 并完成基础配置

#### 任务清单

##### 1. Docker 部署
- [ ] 更新 docker-compose.yml
- [ ] 配置 Elasticsearch
- [ ] 配置 Kibana（可选，开发用）

```yaml
# docker-compose.yml
version: '3.8'

services:
  # ... 现有服务

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: zmage-elasticsearch
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
      - "9300:9300"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data
    networks:
      - zmage-network
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:9200/_cluster/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5

  # Kibana（可选，开发调试用）
  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    container_name: zmage-kibana
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch
    networks:
      - zmage-network

volumes:
  elasticsearch-data:

networks:
  zmage-network:
    driver: bridge
```

##### 2. Elasticsearch 客户端封装
- [ ] 安装 @elastic/elasticsearch
- [ ] 创建客户端单例
- [ ] 实现连接管理

```bash
npm install @elastic/elasticsearch
```

```typescript
// lib/elasticsearch/client.ts
import { Client } from '@elastic/elasticsearch';

class ElasticsearchClient {
  private static instance: Client;
  
  static getInstance(): Client {
    if (!ElasticsearchClient.instance) {
      ElasticsearchClient.instance = new Client({
        node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      });
    }
    return ElasticsearchClient.instance;
  }
  
  static async healthCheck(): Promise<boolean> {
    try {
      const client = ElasticsearchClient.getInstance();
      const health = await client.cluster.health();
      return health.status === 'green' || health.status === 'yellow';
    } catch (error) {
      console.error('Elasticsearch health check failed:', error);
      return false;
    }
  }
}

export const esClient = ElasticsearchClient.getInstance();
```

##### 3. 索引定义
- [ ] 设计图片索引结构
- [ ] 设计视频索引结构
- [ ] 创建索引映射

```typescript
// lib/elasticsearch/indices.ts
export const MEDIA_INDEX = 'zmage-media';

export const MEDIA_INDEX_MAPPING = {
  properties: {
    // 基础信息
    id: { type: 'keyword' },
    userId: { type: 'keyword' },
    type: { type: 'keyword' }, // "image" | "video"
    fileName: {
      type: 'text',
      analyzer: 'standard',
      fields: {
        keyword: { type: 'keyword' }
      }
    },
    
    // 文件信息
    size: { type: 'long' },
    mimeType: { type: 'keyword' },
    width: { type: 'integer' },
    height: { type: 'integer' },
    duration: { type: 'float' }, // 视频时长
    
    // AI 分析结果
    aiDescription: {
      type: 'text',
      analyzer: 'standard'
    },
    aiTags: {
      type: 'text',
      analyzer: 'standard',
      fields: {
        keyword: { type: 'keyword' }
      }
    },
    aiObjects: {
      type: 'text',
      analyzer: 'standard'
    },
    aiScene: { type: 'keyword' },
    aiMood: { type: 'keyword' },
    
    // 用户数据
    tags: {
      type: 'text',
      analyzer: 'standard',
      fields: {
        keyword: { type: 'keyword' }
      }
    },
    memo: {
      type: 'text',
      analyzer: 'standard'
    },
    rating: { type: 'integer' },
    
    // EXIF 数据
    camera: { type: 'keyword' },
    lens: { type: 'keyword' },
    focalLength: { type: 'float' },
    aperture: { type: 'float' },
    iso: { type: 'integer' },
    shutterSpeed: { type: 'keyword' },
    
    // 地理信息
    location: { type: 'geo_point' }, // { lat, lon }
    locationName: {
      type: 'text',
      analyzer: 'standard'
    },
    
    // 时间信息
    takenAt: { type: 'date' },
    uploadedAt: { type: 'date' },
    
    // 相册关联
    albums: { type: 'keyword' }, // 数组
    
    // 向量嵌入（以图搜图用）
    embedding: {
      type: 'dense_vector',
      dims: 512, // 根据使用的模型调整
      index: true,
      similarity: 'cosine'
    }
  }
};
```

##### 4. 索引管理
- [ ] 创建索引
- [ ] 更新索引设置
- [ ] 删除和重建索引

```typescript
// lib/elasticsearch/index-manager.ts
import { esClient } from './client';
import { MEDIA_INDEX, MEDIA_INDEX_MAPPING } from './indices';

export class IndexManager {
  async createIndex(): Promise<void> {
    const exists = await esClient.indices.exists({ index: MEDIA_INDEX });
    
    if (exists) {
      console.log(`Index ${MEDIA_INDEX} already exists`);
      return;
    }
    
    await esClient.indices.create({
      index: MEDIA_INDEX,
      body: {
        mappings: MEDIA_INDEX_MAPPING,
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0, // 单节点无需副本
          analysis: {
            analyzer: {
              // 自定义分析器（可选）
            }
          }
        }
      }
    });
    
    console.log(`Index ${MEDIA_INDEX} created successfully`);
  }
  
  async deleteIndex(): Promise<void> {
    await esClient.indices.delete({ index: MEDIA_INDEX });
  }
  
  async reindex(): Promise<void> {
    await this.deleteIndex();
    await this.createIndex();
  }
}
```

#### 预期产出
- ✅ Elasticsearch 容器运行
- ✅ 客户端封装完成
- ✅ 索引结构定义
- ✅ 索引管理工具

---

### 📅 Day 13: 数据同步与索引

#### 目标
实现媒体数据自动同步到 Elasticsearch

#### 任务清单

##### 1. 索引服务类
- [ ] 创建文档索引服务
- [ ] 实现批量索引
- [ ] 实现增量更新

```typescript
// lib/elasticsearch/indexing-service.ts
import { esClient } from './client';
import { MEDIA_INDEX } from './indices';

export class IndexingService {
  // 索引单个媒体
  async indexMedia(media: MediaDocument): Promise<void> {
    await esClient.index({
      index: MEDIA_INDEX,
      id: media.id,
      document: this.prepareDocument(media),
    });
  }
  
  // 批量索引
  async bulkIndex(mediaList: MediaDocument[]): Promise<void> {
    const operations = mediaList.flatMap(media => [
      { index: { _index: MEDIA_INDEX, _id: media.id } },
      this.prepareDocument(media),
    ]);
    
    const result = await esClient.bulk({ operations });
    
    if (result.errors) {
      console.error('Bulk indexing errors:', result.items);
    }
  }
  
  // 更新文档
  async updateMedia(id: string, updates: Partial<MediaDocument>): Promise<void> {
    await esClient.update({
      index: MEDIA_INDEX,
      id,
      doc: updates,
    });
  }
  
  // 删除文档
  async deleteMedia(id: string): Promise<void> {
    await esClient.delete({
      index: MEDIA_INDEX,
      id,
    });
  }
  
  // 准备文档数据
  private prepareDocument(media: any): MediaDocument {
    return {
      id: media.id,
      userId: media.userId,
      type: media.type,
      fileName: media.fileName,
      size: media.size,
      mimeType: media.mimeType,
      width: media.width,
      height: media.height,
      duration: media.duration,
      aiDescription: media.aiDescription,
      aiTags: media.aiTags || [],
      tags: media.tags?.map((t: any) => t.name) || [],
      memo: media.memo,
      rating: media.rating,
      camera: media.camera,
      takenAt: media.takenAt,
      uploadedAt: media.createdAt,
      location: media.latitude && media.longitude
        ? { lat: media.latitude, lon: media.longitude }
        : undefined,
      albums: media.albums?.map((a: any) => a.albumId) || [],
    };
  }
}
```

##### 2. 钩子集成
- [ ] 上传时自动索引
- [ ] 更新时同步索引
- [ ] 删除时移除索引

```typescript
// lib/hooks/elasticsearch-hooks.ts
import { IndexingService } from '@/lib/elasticsearch/indexing-service';

const indexingService = new IndexingService();

// 在图片上传后调用
export async function onMediaUploaded(media: any) {
  try {
    await indexingService.indexMedia(media);
  } catch (error) {
    console.error('Failed to index media:', error);
    // 不影响主流程，记录错误即可
  }
}

// 在媒体更新后调用
export async function onMediaUpdated(id: string, updates: any) {
  try {
    await indexingService.updateMedia(id, updates);
  } catch (error) {
    console.error('Failed to update index:', error);
  }
}

// 在媒体删除后调用
export async function onMediaDeleted(id: string) {
  try {
    await indexingService.deleteMedia(id);
  } catch (error) {
    console.error('Failed to delete from index:', error);
  }
}
```

##### 3. 全量数据迁移
- [ ] 创建迁移脚本
- [ ] 批量导入现有数据
- [ ] 进度监控

```typescript
// scripts/migrate-to-elasticsearch.ts
import { prisma } from '@/lib/prisma';
import { IndexingService } from '@/lib/elasticsearch/indexing-service';
import { IndexManager } from '@/lib/elasticsearch/index-manager';

async function migrateToElasticsearch() {
  console.log('Starting Elasticsearch migration...');
  
  // 1. 创建索引
  const indexManager = new IndexManager();
  await indexManager.createIndex();
  
  // 2. 获取所有媒体
  const batchSize = 1000;
  let skip = 0;
  let total = 0;
  
  const indexingService = new IndexingService();
  
  while (true) {
    const mediaList = await prisma.image.findMany({
      skip,
      take: batchSize,
      include: {
        tags: true,
        albums: true,
      },
    });
    
    if (mediaList.length === 0) break;
    
    // 3. 批量索引
    await indexingService.bulkIndex(mediaList);
    
    total += mediaList.length;
    skip += batchSize;
    
    console.log(`Indexed ${total} media items...`);
  }
  
  console.log(`Migration complete! Total: ${total} items`);
}

migrateToElasticsearch().catch(console.error);
```

#### 预期产出
- ✅ 索引服务完整实现
- ✅ 自动同步机制
- ✅ 全量迁移脚本
- ✅ 数据一致性保证

---

### 📅 Day 14-15: 搜索功能实现

#### 目标
实现强大的搜索功能和 API

#### 任务清单

##### 1. 搜索服务类
- [ ] 创建搜索服务
- [ ] 实现全文搜索
- [ ] 实现过滤和排序
- [ ] 实现聚合统计

```typescript
// lib/elasticsearch/search-service.ts
import { esClient } from './client';
import { MEDIA_INDEX } from './indices';

export interface SearchParams {
  query?: string;
  userId: string;
  type?: 'image' | 'video';
  tags?: string[];
  albums?: string[];
  rating?: number;
  dateFrom?: Date;
  dateTo?: Date;
  camera?: string;
  location?: { lat: number; lon: number; radius: string };
  sort?: 'relevance' | 'date' | 'rating' | 'size';
  page?: number;
  size?: number;
}

export class SearchService {
  async search(params: SearchParams) {
    const {
      query,
      userId,
      type,
      tags,
      albums,
      rating,
      dateFrom,
      dateTo,
      camera,
      location,
      sort = 'relevance',
      page = 1,
      size = 24,
    } = params;
    
    // 构建查询
    const must: any[] = [
      { term: { userId } } // 只搜索当前用户的数据
    ];
    
    // 全文搜索
    if (query) {
      must.push({
        multi_match: {
          query,
          fields: [
            'fileName^3',
            'aiDescription^2',
            'aiTags^2',
            'tags^2',
            'memo',
            'locationName',
          ],
          type: 'best_fields',
          fuzziness: 'AUTO',
        }
      });
    }
    
    // 过滤条件
    const filter: any[] = [];
    
    if (type) filter.push({ term: { type } });
    if (tags?.length) filter.push({ terms: { 'tags.keyword': tags } });
    if (albums?.length) filter.push({ terms: { albums } });
    if (rating) filter.push({ range: { rating: { gte: rating } } });
    if (camera) filter.push({ term: { camera } });
    
    if (dateFrom || dateTo) {
      filter.push({
        range: {
          takenAt: {
            ...(dateFrom && { gte: dateFrom }),
            ...(dateTo && { lte: dateTo }),
          }
        }
      });
    }
    
    // 地理位置搜索
    if (location) {
      filter.push({
        geo_distance: {
          distance: location.radius,
          location: {
            lat: location.lat,
            lon: location.lon,
          }
        }
      });
    }
    
    // 排序
    const sortConfig = this.getSortConfig(sort);
    
    // 执行搜索
    const result = await esClient.search({
      index: MEDIA_INDEX,
      from: (page - 1) * size,
      size,
      query: {
        bool: {
          must,
          filter,
        }
      },
      sort: sortConfig,
      // 高亮搜索词
      highlight: query ? {
        fields: {
          fileName: {},
          aiDescription: {},
          memo: {},
        }
      } : undefined,
    });
    
    return {
      total: result.hits.total,
      items: result.hits.hits.map(hit => ({
        ...hit._source,
        highlights: hit.highlight,
        score: hit._score,
      })),
      page,
      size,
    };
  }
  
  // 获取排序配置
  private getSortConfig(sort: string) {
    switch (sort) {
      case 'date':
        return [{ takenAt: 'desc' }];
      case 'rating':
        return [{ rating: 'desc' }, { takenAt: 'desc' }];
      case 'size':
        return [{ size: 'desc' }];
      case 'relevance':
      default:
        return ['_score', { takenAt: 'desc' }];
    }
  }
  
  // 搜索建议（自动补全）
  async suggest(prefix: string, userId: string) {
    const result = await esClient.search({
      index: MEDIA_INDEX,
      size: 0,
      query: {
        bool: {
          must: [
            { term: { userId } },
            { prefix: { 'fileName.keyword': prefix } }
          ]
        }
      },
      aggs: {
        suggestions: {
          terms: {
            field: 'fileName.keyword',
            size: 10,
          }
        }
      }
    });
    
    return result.aggregations?.suggestions.buckets.map(b => b.key) || [];
  }
  
  // 相似图片搜索（基于向量）
  async searchSimilar(imageId: string, userId: string, size: number = 12) {
    // 获取目标图片的向量
    const target = await esClient.get({
      index: MEDIA_INDEX,
      id: imageId,
    });
    
    if (!target._source?.embedding) {
      throw new Error('Image embedding not found');
    }
    
    // 向量搜索
    const result = await esClient.search({
      index: MEDIA_INDEX,
      size,
      query: {
        bool: {
          must: [
            { term: { userId } },
            {
              script_score: {
                query: { match_all: {} },
                script: {
                  source: "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
                  params: {
                    query_vector: target._source.embedding,
                  }
                }
              }
            }
          ],
          must_not: [
            { term: { id: imageId } } // 排除自己
          ]
        }
      }
    });
    
    return result.hits.hits.map(hit => hit._source);
  }
}
```

##### 2. 搜索 API 端点
- [ ] `/api/search` - 主搜索端点
- [ ] `/api/search/suggest` - 自动补全
- [ ] `/api/search/similar` - 相似图片

```typescript
// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { SearchService } from '@/lib/elasticsearch/search-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const params = {
      query: searchParams.get('q') || undefined,
      userId: session.user.id,
      type: searchParams.get('type') as any,
      tags: searchParams.getAll('tags'),
      albums: searchParams.getAll('albums'),
      rating: searchParams.get('rating') ? parseInt(searchParams.get('rating')!) : undefined,
      sort: searchParams.get('sort') || 'relevance',
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      size: searchParams.get('size') ? parseInt(searchParams.get('size')!) : 24,
    };
    
    const searchService = new SearchService();
    const results = await searchService.search(params);
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
```

##### 3. 前端搜索组件
- [ ] 更新搜索框组件
- [ ] 添加高级筛选器
- [ ] 实现搜索结果高亮
- [ ] 添加搜索历史

```typescript
// components/search/AdvancedSearch.tsx
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useDebounce } from '@/hooks/useDebounce';

export function AdvancedSearch() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({
    type: 'all',
    sort: 'relevance',
    rating: 0,
  });
  
  const debouncedQuery = useDebounce(query, 300);
  
  // 搜索逻辑
  const handleSearch = async () => {
    const params = new URLSearchParams({
      q: debouncedQuery,
      ...filters,
    });
    
    const response = await fetch(`/api/search?${params}`);
    const results = await response.json();
    
    // 更新结果
  };
  
  return (
    <div className="space-y-4">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜索照片、标签、描述..."
      />
      
      <div className="flex gap-2">
        <Select
          value={filters.type}
          onValueChange={(v) => setFilters({ ...filters, type: v })}
        >
          <option value="all">全部</option>
          <option value="image">图片</option>
          <option value="video">视频</option>
        </Select>
        
        <Select
          value={filters.sort}
          onValueChange={(v) => setFilters({ ...filters, sort: v })}
        >
          <option value="relevance">相关性</option>
          <option value="date">日期</option>
          <option value="rating">评分</option>
        </Select>
      </div>
    </div>
  );
}
```

#### 预期产出
- ✅ 完整的搜索服务
- ✅ 搜索 API 端点
- ✅ 前端搜索组件
- ✅ 自动补全和建议

---

## Week 3-4: 社交分享增强

### 📅 Day 16-17: 高级分享控制

#### 目标
增强分享功能，支持时效性、密码保护等

#### 任务清单

##### 1. 数据模型扩展
- [ ] 更新 SharedLink 表
- [ ] 添加访问控制字段

```prisma
// prisma/schema.prisma

model SharedLink {
  id          String   @id @default(cuid())
  userId      String
  token       String   @unique
  
  // 分享内容
  type        String   // "image", "album", "collection"
  resourceId  String   // 图片ID或相册ID
  
  // 访问控制
  password    String?  // 加密后的密码
  expiresAt   DateTime? // 过期时间
  maxViews    Int?     // 最大访问次数
  viewCount   Int      @default(0)
  
  // 权限设置
  allowDownload Boolean @default(true)
  allowComments Boolean @default(false)
  
  // 状态
  isActive    Boolean  @default(true)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // 关联
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  views       ShareView[]
  
  @@index([userId])
  @@index([token])
  @@index([expiresAt])
  @@map("shared_links")
}

// 分享访问记录
model ShareView {
  id          String   @id @default(cuid())
  shareId     String
  
  // 访问者信息
  ip          String?
  userAgent   String?
  referer     String?
  
  // 访问行为
  action      String   // "view", "download"
  
  createdAt   DateTime @default(now())
  
  // 关联
  share       SharedLink @relation(fields: [shareId], references: [id], onDelete: Cascade)
  
  @@index([shareId])
  @@index([createdAt])
  @@map("share_views")
}
```

##### 2. 分享服务类
- [ ] 创建分享管理服务
- [ ] 实现访问控制
- [ ] 实现统计追踪

```typescript
// lib/share/share-service.ts
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export interface CreateShareParams {
  userId: string;
  type: 'image' | 'album' | 'collection';
  resourceId: string;
  password?: string;
  expiresAt?: Date;
  maxViews?: number;
  allowDownload?: boolean;
  allowComments?: boolean;
}

export class ShareService {
  // 创建分享链接
  async createShare(params: CreateShareParams) {
    const token = this.generateToken();
    const hashedPassword = params.password 
      ? await bcrypt.hash(params.password, 10)
      : null;
    
    const share = await prisma.sharedLink.create({
      data: {
        userId: params.userId,
        token,
        type: params.type,
        resourceId: params.resourceId,
        password: hashedPassword,
        expiresAt: params.expiresAt,
        maxViews: params.maxViews,
        allowDownload: params.allowDownload ?? true,
        allowComments: params.allowComments ?? false,
      },
    });
    
    return share;
  }
  
  // 验证分享访问
  async validateAccess(token: string, password?: string): Promise<{
    valid: boolean;
    reason?: string;
    share?: any;
  }> {
    const share = await prisma.sharedLink.findUnique({
      where: { token },
    });
    
    if (!share || !share.isActive) {
      return { valid: false, reason: 'Share not found or inactive' };
    }
    
    // 检查过期时间
    if (share.expiresAt && share.expiresAt < new Date()) {
      await this.deactivateShare(share.id);
      return { valid: false, reason: 'Share expired' };
    }
    
    // 检查访问次数
    if (share.maxViews && share.viewCount >= share.maxViews) {
      await this.deactivateShare(share.id);
      return { valid: false, reason: 'Max views reached' };
    }
    
    // 检查密码
    if (share.password) {
      if (!password) {
        return { valid: false, reason: 'Password required' };
      }
      const valid = await bcrypt.compare(password, share.password);
      if (!valid) {
        return { valid: false, reason: 'Invalid password' };
      }
    }
    
    return { valid: true, share };
  }
  
  // 记录访问
  async recordView(shareId: string, ip?: string, userAgent?: string) {
    await prisma.$transaction([
      // 创建访问记录
      prisma.shareView.create({
        data: {
          shareId,
          ip,
          userAgent,
          action: 'view',
        },
      }),
      // 增加访问计数
      prisma.sharedLink.update({
        where: { id: shareId },
        data: {
          viewCount: { increment: 1 },
        },
      }),
    ]);
  }
  
  // 停用分享
  async deactivateShare(shareId: string) {
    await prisma.sharedLink.update({
      where: { id: shareId },
      data: { isActive: false },
    });
  }
  
  // 生成唯一 token
  private generateToken(): string {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }
}
```

##### 3. 分享 API 端点
- [ ] `/api/share/create` - 创建分享
- [ ] `/api/share/[token]` - 获取分享内容
- [ ] `/api/share/[token]/verify` - 验证密码

```typescript
// app/api/share/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ShareService } from '@/lib/share/share-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const shareService = new ShareService();
    
    const share = await shareService.createShare({
      userId: session.user.id,
      ...body,
    });
    
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/shared/${share.token}`;
    
    return NextResponse.json({ share, url: shareUrl });
  } catch (error) {
    console.error('Create share error:', error);
    return NextResponse.json(
      { error: 'Failed to create share' },
      { status: 500 }
    );
  }
}
```

##### 4. 分享页面优化
- [ ] 密码验证页面
- [ ] 过期提示页面
- [ ] 访问统计页面

```typescript
// app/shared/[token]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { PasswordDialog } from '@/components/share/PasswordDialog';

export default function SharedPage() {
  const params = useParams();
  const token = params.