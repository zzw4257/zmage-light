# Phase 5 Day 2-3: Stripe 集成实现文档

## 📋 概述

本文档记录了 Zmage v3 Phase 5 的 Stripe 支付集成实现，包括订阅管理、支付处理、Webhook 事件处理等核心功能。

**实施日期**: 2024-01-XX  
**负责人**: Development Team  
**状态**: ✅ 实现完成 / 🧪 测试中

---

## 🎯 实现目标

1. ✅ 集成 Stripe SDK（服务端和客户端）
2. ✅ 实现客户管理（创建、获取、更新）
3. ✅ 实现 Checkout Session（订阅支付流程）
4. ✅ 实现 Customer Portal（订阅管理界面）
5. ✅ 实现 Webhook 事件处理（订阅生命周期）
6. ✅ 实现 API 端点（计划、订阅、支付）
7. ✅ 编写完整测试脚本

---

## 📦 依赖包安装

```bash
npm install stripe @stripe/stripe-js
```

**版本信息**:
- `stripe`: ^14.x (服务端 SDK)
- `@stripe/stripe-js`: ^2.x (客户端 SDK)

---

## 🏗️ 架构设计

### 核心组件

```
frontend/
├── lib/subscription/
│   ├── stripe-config.ts       # Stripe 配置和类型定义
│   ├── stripe-service.ts      # Stripe 核心服务
│   ├── quota-service.ts       # 配额管理服务（已有）
│   ├── plans.ts               # 订阅计划配置（已有）
│   └── types.ts               # 类型定义（已有）
├── app/api/subscription/
│   ├── plans/route.ts         # 获取订阅计划列表
│   ├── current/route.ts       # 获取当前订阅信息
│   ├── checkout/route.ts      # 创建 Checkout Session
│   ├── portal/route.ts        # 创建 Customer Portal Session
│   └── webhook/route.ts       # 处理 Stripe Webhook 事件
└── scripts/
    └── test-subscription-stripe.ts  # Stripe 集成测试
```

---

## 🔧 环境变量配置

### 必需的环境变量

在 `.env.local` 中添加以下配置：

```env
# Stripe API Keys
STRIPE_SECRET_KEY=REDACTED_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=REDACTED_KEY
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx

# Stripe Price IDs（需要在 Stripe Dashboard 中创建产品和价格后获取）
STRIPE_PRICE_FREE=price_xxxxxxxxxxxxxxxxxxxxx          # 可选，免费计划
STRIPE_PRICE_PRO_MONTHLY=price_xxxxxxxxxxxxxxxxxxxxx   # Pro 月付价格 ID
STRIPE_PRICE_PRO_YEARLY=price_xxxxxxxxxxxxxxxxxxxxx    # Pro 年付价格 ID
STRIPE_PRICE_PREMIUM_MONTHLY=price_xxxxxxxxxxxxxxxxxxxxx  # Premium 月付价格 ID
STRIPE_PRICE_PREMIUM_YEARLY=price_xxxxxxxxxxxxxxxxxxxxx   # Premium 年付价格 ID

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 获取 Stripe 密钥

1. **注册 Stripe 账号**: https://dashboard.stripe.com/register
2. **获取测试密钥**:
   - 登录 Stripe Dashboard
   - 切换到"测试模式"（Test Mode）
   - 进入 Developers > API keys
   - 复制 Secret key 和 Publishable key

3. **创建产品和价格**:
   - 进入 Products > Add product
   - 创建 Pro 和 Premium 产品
   - 为每个产品添加月付和年付价格
   - 复制价格 ID（以 `price_` 开头）

4. **配置 Webhook**:
   - 进入 Developers > Webhooks
   - 添加端点：`https://yourdomain.com/api/subscription/webhook`
   - 选择监听事件（见下文"Webhook 事件"）
   - 复制 Webhook 签名密钥

---

## 📝 核心实现

### 1. Stripe 配置（stripe-config.ts）

**功能**:
- 环境变量管理
- 价格 ID 映射
- 类型定义
- 配置验证

**关键函数**:
- `getPriceId(planType, interval)`: 获取指定计划和周期的价格 ID
- `parsePriceId(priceId)`: 从价格 ID 解析计划类型和周期
- `mapStripeStatus(stripeStatus)`: 映射 Stripe 订阅状态到内部状态
- `validateStripeConfig()`: 验证 Stripe 配置完整性

### 2. Stripe 服务（stripe-service.ts）

**功能**:
- Stripe API 交互
- 客户管理
- 订阅管理
- Webhook 事件处理

**核心方法**:

#### 客户管理
```typescript
// 创建或获取 Stripe 客户
async createOrGetCustomer(userId, email, name?)
  -> StripeCustomerInfo

// 获取用户的 Stripe 客户 ID
async getUserStripeCustomerId(userId)
  -> string | null
```

#### Checkout & Portal
```typescript
// 创建 Checkout Session（订阅支付）
async createCheckoutSession(params)
  -> Stripe.Checkout.Session

// 创建 Customer Portal Session（管理订阅）
async createPortalSession(params)
  -> Stripe.BillingPortal.Session
```

#### 订阅管理
```typescript
// 获取订阅信息
async getSubscription(subscriptionId)
  -> StripeSubscriptionInfo | null

// 取消订阅（周期结束时）
async cancelSubscription(subscriptionId)
  -> SubscriptionResult

// 立即取消订阅
async cancelSubscriptionImmediately(subscriptionId)
  -> SubscriptionResult

// 恢复已取消的订阅
async resumeSubscription(subscriptionId)
  -> SubscriptionResult

// 更新订阅计划
async updateSubscription(subscriptionId, newPriceId)
  -> SubscriptionResult
```

#### Webhook 处理
```typescript
// 验证 Webhook 签名
verifyWebhookSignature(payload, signature)
  -> Stripe.Event | null

// 处理 Checkout Session 完成
async handleCheckoutSessionCompleted(session)

// 处理发票支付成功
async handleInvoicePaid(invoice)

// 处理发票支付失败
async handleInvoicePaymentFailed(invoice)

// 处理订阅更新
async handleSubscriptionUpdated(subscription)

// 处理订阅删除/取消
async handleSubscriptionDeleted(subscription)
```

### 3. API 端点

#### GET /api/subscription/plans
获取所有可用的订阅计划

**响应**:
```json
{
  "plans": [
    {
      "id": "plan_id",
      "type": "PRO",
      "name": "Pro",
      "description": "...",
      "price": 999,
      "interval": "MONTHLY",
      "features": {},
      "quotas": { ... },
      "isCurrent": false
    }
  ],
  "currentPlan": {
    "id": "plan_id",
    "type": "FREE",
    "name": "Free",
    "status": "ACTIVE",
    "currentPeriodStart": "2024-01-01T00:00:00Z",
    "currentPeriodEnd": "2024-02-01T00:00:00Z"
  }
}
```

#### GET /api/subscription/current
获取当前用户的订阅信息和配额使用情况

**响应**:
```json
{
  "subscription": {
    "id": "sub_id",
    "planType": "PRO",
    "status": "ACTIVE",
    "currentPeriodStart": "...",
    "currentPeriodEnd": "...",
    "stripeSubscriptionId": "sub_xxx"
  },
  "plan": {
    "id": "plan_id",
    "type": "PRO",
    "name": "Pro",
    "price": 999,
    "features": {}
  },
  "quota": {
    "storage": {
      "used": 1000000,
      "limit": 10000000000,
      "remaining": 9999000000,
      "unlimited": false
    },
    "upload": { ... },
    "aiRequest": { ... }
  }
}
```

#### POST /api/subscription/checkout
创建 Stripe Checkout Session

**请求**:
```json
{
  "planType": "PRO",
  "interval": "month"
}
```

**响应**:
```json
{
  "sessionId": "cs_test_xxx",
  "url": "https://checkout.stripe.com/pay/cs_test_xxx"
}
```

**使用流程**:
1. 客户端调用此 API 创建 Checkout Session
2. 重定向用户到返回的 `url`
3. 用户完成支付
4. Stripe 发送 `checkout.session.completed` webhook
5. 系统创建订阅记录并重置配额

#### POST /api/subscription/portal
创建 Stripe Customer Portal Session

**请求**:
```json
{
  "returnUrl": "http://localhost:3000/subscription"  // 可选
}
```

**响应**:
```json
{
  "url": "https://billing.stripe.com/p/session/xxx"
}
```

**使用流程**:
1. 客户端调用此 API 创建 Portal Session
2. 重定向用户到返回的 `url`
3. 用户可以管理订阅（更新、取消等）
4. Stripe 发送相应的 webhook 事件
5. 系统自动更新订阅状态

#### POST /api/subscription/webhook
处理 Stripe Webhook 事件

**监听的事件**:
- `checkout.session.completed`: 支付成功，创建订阅
- `invoice.paid`: 发票支付成功（续费）
- `invoice.payment_failed`: 支付失败
- `customer.subscription.created`: 订阅创建
- `customer.subscription.updated`: 订阅更新
- `customer.subscription.deleted`: 订阅取消

**安全性**:
- 使用 Stripe 签名验证 webhook 真实性
- 验证失败返回 400 错误
- Stripe 会自动重试失败的 webhook

---

## 🔄 订阅生命周期

### 1. 新用户注册
```
用户注册 → 自动创建免费订阅 → 分配免费配额
```

### 2. 升级到付费计划
```
用户选择计划 → 调用 /api/subscription/checkout
→ 重定向到 Stripe Checkout → 用户完成支付
→ Stripe 发送 checkout.session.completed webhook
→ 系统创建付费订阅 → 取消旧订阅 → 重置配额为新计划
→ 创建支付记录
```

### 3. 订阅续费
```
订阅到期 → Stripe 自动扣款 → 发送 invoice.paid webhook
→ 系统更新订阅状态为 ACTIVE → 重置配额
→ 创建支付记录
```

### 4. 支付失败
```
自动扣款失败 → 发送 invoice.payment_failed webhook
→ 系统更新订阅状态为 PAST_DUE → 创建失败的支付记录
→ 通知用户（待实现）
```

### 5. 取消订阅
```
用户取消订阅（通过 Portal）
→ 发送 customer.subscription.deleted webhook
→ 系统更新订阅状态为 CANCELED
→ 为用户创建免费订阅 → 重置配额为免费计划
```

### 6. 降级到免费计划
```
同"取消订阅"流程
```

---

## 🧪 测试

### 运行测试脚本

```bash
cd frontend
npx tsx scripts/test-subscription-stripe.ts
```

### 测试覆盖

**测试组 1: 配置验证**
- ✅ 验证 Stripe 配置结构
- ✅ 检查必需的环境变量
- ✅ 检查价格配置结构

**测试组 2: Stripe 客户管理**
- ✅ 创建 Stripe 客户
- ✅ 获取已存在的 Stripe 客户
- ✅ 验证客户 ID 保存到数据库

**测试组 3: Checkout Session**
- ✅ 创建月付 Checkout Session
- ✅ 创建年付 Checkout Session
- ✅ 验证 Checkout Session metadata

**测试组 4: Customer Portal**
- ✅ 创建 Portal Session
- ✅ 获取用户的 Stripe 客户 ID

**测试组 5: Webhook 处理（模拟）**
- ✅ 模拟 Checkout Session Completed
- ✅ 模拟订阅状态更新
- ✅ 模拟订阅取消
- ✅ 验证支付记录创建

**测试组 6: 配额与订阅集成**
- ✅ 订阅升级后配额应增加
- ✅ 配额重置功能
- ✅ 配额检查与订阅关联

### 测试注意事项

1. **Stripe 未配置时**: 测试会自动跳过需要 Stripe API 的测试
2. **测试数据清理**: 脚本会自动清理测试产生的数据
3. **实际 API 调用**: 如果配置了 Stripe，会进行真实的 API 调用（使用测试模式）

---

## 🔒 安全性考虑

### 1. API 密钥管理
- ❌ **禁止**将 Secret Key 暴露到客户端
- ✅ Secret Key 仅在服务端使用
- ✅ Publishable Key 可以安全地在客户端使用
- ✅ 使用环境变量存储敏感信息

### 2. Webhook 安全
- ✅ 验证 Stripe 签名确保请求来自 Stripe
- ✅ 拒绝未签名或签名无效的请求
- ✅ 处理重复的 webhook 事件（幂等性）

### 3. 用户身份验证
- ✅ 所有订阅相关 API 都需要身份验证
- ✅ 验证用户只能访问自己的订阅信息
- ✅ Portal Session 绑定到特定客户

### 4. 金额和货币
- ✅ 在数据库中以分为单位存储金额（避免浮点精度问题）
- ✅ 验证价格 ID 的有效性
- ✅ 记录货币类型

---

## 🐛 常见问题

### Q1: Webhook 收不到事件？

**可能原因**:
1. Webhook URL 配置错误
2. 本地开发环境无法接收外部请求
3. Webhook 签名验证失败

**解决方案**:
- 使用 Stripe CLI 转发 webhook 到本地: `stripe listen --forward-to localhost:3000/api/subscription/webhook`
- 检查 STRIPE_WEBHOOK_SECRET 是否正确
- 查看 Stripe Dashboard 中的 webhook 日志

### Q2: Checkout Session 创建失败？

**可能原因**:
1. Price ID 不存在或错误
2. Customer 创建失败
3. API 密钥权限不足

**解决方案**:
- 验证环境变量中的 Price ID 是否正确
- 检查 Stripe Dashboard 中的产品和价格是否存在
- 确保使用的是测试模式的密钥

### Q3: 订阅状态不同步？

**可能原因**:
1. Webhook 处理失败
2. 网络问题导致 webhook 延迟
3. 数据库事务未提交

**解决方案**:
- 检查 webhook 处理函数的日志
- 在 Stripe Dashboard 中手动重发 webhook
- 实现 webhook 重试逻辑

### Q4: 测试支付如何模拟？

**Stripe 测试卡号**:
- 成功支付: `4242 4242 4242 4242`
- 需要 3D 验证: `4000 0025 0000 3155`
- 支付失败: `4000 0000 0000 9995`
- 任意未来日期和 CVC

---

## 📈 性能优化

### 1. 缓存策略
- 使用 Redis 缓存订阅计划列表（很少变化）
- 缓存用户的当前订阅信息（TTL: 5分钟）
- 缓存 Stripe 客户 ID（永久，直到更新）

### 2. 并发控制
- 订阅创建/更新使用数据库事务
- Webhook 处理实现幂等性
- 配额消耗使用乐观锁或 Redis 原子操作

### 3. 错误处理
- Webhook 失败自动重试（Stripe 提供）
- API 调用实现超时和重试
- 记录详细的错误日志

---

## 🚀 部署清单

### 生产环境配置

- [ ] 切换到 Stripe 生产模式密钥
- [ ] 更新所有 Price ID 为生产环境的 ID
- [ ] 配置生产环境的 Webhook 端点
- [ ] 验证 Webhook 签名密钥
- [ ] 设置正确的 `NEXT_PUBLIC_APP_URL`
- [ ] 启用 Stripe Radar（欺诈检测）
- [ ] 配置 Stripe 邮件通知
- [ ] 设置支付失败重试策略
- [ ] 配置税务设置（如适用）
- [ ] 测试完整的支付流程

### 监控和告警

- [ ] 监控 Webhook 成功率
- [ ] 监控支付成功/失败率
- [ ] 设置支付失败告警
- [ ] 监控订阅流失率
- [ ] 记录 Stripe API 调用延迟
- [ ] 设置配额耗尽告警

---

## 📚 相关文档

- [Stripe API 文档](https://stripe.com/docs/api)
- [Stripe Webhooks 文档](https://stripe.com/docs/webhooks)
- [Stripe Checkout 文档](https://stripe.com/docs/payments/checkout)
- [Stripe Customer Portal 文档](https://stripe.com/docs/billing/subscriptions/customer-portal)
- [Stripe 测试卡号](https://stripe.com/docs/testing)

---

## 🔄 下一步

1. **实现前端 UI** (Day 4-5)
   - 订阅计划展示页面
   - 当前订阅管理页面
   - 配额使用统计图表
   - 支付成功/失败页面

2. **配额中间件集成** (Day 6)
   - 在上传 API 中集成配额检查
   - 在 AI 请求 API 中集成配额检查
   - 实现配额警告通知

3. **邮件通知** (Day 7)
   - 订阅成功邮件
   - 支付失败邮件
   - 配额即将耗尽邮件
   - 订阅到期提醒邮件

4. **高级功能**
   - 优惠码/促销码支持
   - 团队/企业订阅
   - 自定义计费周期
   - 使用量计费（Metered billing）

---

## ✅ 完成检查

- [x] Stripe SDK 集成
- [x] 配置文件和类型定义
- [x] StripeService 实现
- [x] API 端点实现
- [x] Webhook 处理
- [x] 测试脚本编写
- [x] 文档编写
- [ ] 前端 UI 实现（待 Day 4-5）
- [ ] 配额中间件集成（待 Day 6）
- [ ] 邮件通知（待 Day 7）
- [ ] 生产环境部署

---

**文档版本**: v1.0  
**最后更新**: 2024-01-XX  
**维护者**: Development Team