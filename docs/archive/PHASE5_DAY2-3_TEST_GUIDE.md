# Phase 5 Day 2-3: Stripe 集成测试指南

## 📋 测试概述

本文档提供了 Stripe 支付集成的完整测试指南，包括环境配置、测试执行和结果验证。

**测试脚本**: `frontend/scripts/test-subscription-stripe.ts`  
**测试覆盖**: 6 个测试组，18 个测试用例  
**预计用时**: 5-10 分钟（含 Stripe API 调用）

---

## 🚀 快速开始

### 方式一：完整 Stripe 集成测试（推荐开发环境）

需要配置完整的 Stripe 环境变量。

```bash
# 1. 进入 frontend 目录
cd frontend

# 2. 确保已安装依赖
npm install

# 3. 配置环境变量（参考下面的"环境配置"章节）
cp .env.stripe.example .env.local
# 编辑 .env.local 填入实际的 Stripe 密钥

# 4. 运行测试
npx tsx scripts/test-subscription-stripe.ts
```

### 方式二：部分测试（未配置 Stripe）

如果 Stripe 未配置，测试会自动跳过需要 API 的测试。

```bash
cd frontend
npx tsx scripts/test-subscription-stripe.ts
```

**输出示例**:
```
⚠️  Stripe 未完全配置，部分测试将被跳过
   缺少的配置项：
   - Missing STRIPE_SECRET_KEY
   ...
```

---

## 🔧 环境配置

### 1. 注册 Stripe 测试账号

1. 访问 https://dashboard.stripe.com/register
2. 注册账号并验证邮箱
3. **重要**: 确保切换到"测试模式"（Test Mode）

### 2. 获取 API 密钥

1. 登录 Stripe Dashboard
2. 进入 `Developers` > `API keys`
3. 复制以下密钥：
   - **Secret key** (REDACTED_KEY...)
   - **Publishable key** (REDACTED_KEY...)

### 3. 创建产品和价格

#### 创建 Pro 计划

1. 进入 `Products` > `Add product`
2. 填写产品信息：
   - **Name**: Pro Plan
   - **Description**: Professional features for power users
3. 添加价格：
   - **月付价格**:
     - Pricing model: Standard pricing
     - Price: $9.99 (或其他金额)
     - Billing period: Monthly
     - 复制 Price ID (price_xxx)
   
   - **年付价格**:
     - 点击 "Add another price"
     - Price: $99 (或其他金额)
     - Billing period: Yearly
     - 复制 Price ID (price_xxx)

#### 创建 Premium 计划

重复上述步骤，创建 Premium 产品：
- **Name**: Premium Plan
- **Description**: All features with priority support
- **月付**: $29.99
- **年付**: $299

### 4. 配置 Webhook（可选，用于真实集成测试）

1. 进入 `Developers` > `Webhooks`
2. 点击 "Add endpoint"
3. 填写信息：
   - **Endpoint URL**: `http://localhost:3000/api/subscription/webhook`
   - **Description**: Zmage Subscription Webhooks
   - **Events to send**: 选择以下事件
     - ✅ checkout.session.completed
     - ✅ invoice.paid
     - ✅ invoice.payment_failed
     - ✅ customer.subscription.created
     - ✅ customer.subscription.updated
     - ✅ customer.subscription.deleted
4. 复制 **Signing secret** (whsec_...)

### 5. 配置环境变量

创建或编辑 `frontend/.env.local`:

```env
# Stripe API Keys
STRIPE_SECRET_KEY=REDACTED_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=REDACTED_KEY
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Stripe Price IDs
STRIPE_PRICE_PRO_MONTHLY=price_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_PRO_YEARLY=price_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_PREMIUM_MONTHLY=price_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_PREMIUM_YEARLY=price_xxxxxxxxxxxxxxxxxxxxxxxx

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🧪 测试用例详解

### 测试组 1: 配置验证（3 个测试）

**目的**: 验证 Stripe 配置的完整性和正确性

| 测试 | 验证内容 | 预期结果 |
|------|----------|----------|
| 验证 Stripe 配置结构 | 配置对象结构正确 | PASS |
| 检查必需的环境变量 | 密钥类型正确 | PASS |
| 检查价格配置结构 | 产品配置存在 | PASS |

**输出示例**:
```
🧪 测试组 1: 配置验证

✅ PASSED: 验证 Stripe 配置结构 (5ms)
✅ PASSED: 检查必需的环境变量 (2ms)
✅ PASSED: 检查价格配置结构 (1ms)
```

### 测试组 2: Stripe 客户管理（3 个测试）

**目的**: 验证 Stripe 客户创建和获取的幂等性

| 测试 | 验证内容 | 预期结果 |
|------|----------|----------|
| 创建 Stripe 客户 | 客户 ID 格式正确 (cus_) | PASS |
| 获取已存在的 Stripe 客户 | 返回相同客户 ID（幂等） | PASS |
| 验证客户 ID 保存到数据库 | 数据库记录正确 | PASS |

**输出示例**:
```
🧪 测试组 2: Stripe 客户管理

✅ PASSED: 创建 Stripe 客户 (450ms)
✅ PASSED: 获取已存在的 Stripe 客户 (320ms)
✅ PASSED: 验证客户 ID 保存到数据库 (45ms)
```

**跳过条件**: Stripe 未配置时自动跳过

### 测试组 3: Checkout Session（3 个测试）

**目的**: 验证支付 Checkout Session 创建

| 测试 | 验证内容 | 预期结果 |
|------|----------|----------|
| 创建月付 Checkout Session | Session ID 格式 (cs_), URL 存在 | PASS |
| 创建年付 Checkout Session | Session ID 格式 (cs_), URL 存在 | PASS |
| 验证 Checkout Session metadata | userId 和 planType 正确 | PASS |

**输出示例**:
```
🧪 测试组 3: Checkout Session

✅ PASSED: 创建月付 Checkout Session (680ms)
✅ PASSED: 创建年付 Checkout Session (590ms)
✅ PASSED: 验证 Checkout Session metadata (520ms)
```

**跳过条件**: Stripe 未配置或价格 ID 未配置时跳过

### 测试组 4: Customer Portal（2 个测试）

**目的**: 验证客户订阅管理 Portal 创建

| 测试 | 验证内容 | 预期结果 |
|------|----------|----------|
| 创建 Portal Session | Portal URL 正确 | PASS |
| 获取用户的 Stripe 客户 ID | 客户 ID 格式正确 | PASS |

**输出示例**:
```
🧪 测试组 4: Customer Portal

✅ PASSED: 创建 Portal Session (420ms)
✅ PASSED: 获取用户的 Stripe 客户 ID (35ms)
```

### 测试组 5: Webhook 处理（4 个测试）

**目的**: 模拟 Webhook 事件处理（不需要真实 Stripe API）

| 测试 | 验证内容 | 预期结果 |
|------|----------|----------|
| 模拟 Checkout Session Completed | 订阅创建成功 | PASS |
| 模拟订阅状态更新 | 状态更新正确 | PASS |
| 模拟订阅取消 | 降级到免费计划 | PASS |
| 验证支付记录创建 | 支付记录正确 | PASS |

**输出示例**:
```
🧪 测试组 5: Webhook 处理（模拟）

✅ PASSED: 模拟 Checkout Session Completed (120ms)
✅ PASSED: 模拟订阅状态更新 (85ms)
✅ PASSED: 模拟订阅取消 (150ms)
✅ PASSED: 验证支付记录创建 (95ms)
```

### 测试组 6: 配额与订阅集成（3 个测试）

**目的**: 验证订阅变更时配额的正确处理

| 测试 | 验证内容 | 预期结果 |
|------|----------|----------|
| 订阅升级后配额应增加 | 配额限制增加 | PASS |
| 配额重置功能 | 使用量归零 | PASS |
| 配额检查与订阅关联 | 配额与计划一致 | PASS |

**输出示例**:
```
🧪 测试组 6: 配额与订阅集成

✅ PASSED: 订阅升级后配额应增加 (180ms)
✅ PASSED: 配额重置功能 (95ms)
✅ PASSED: 配额检查与订阅关联 (110ms)
```

---

## 📊 测试报告解读

### 成功报告示例

```
=============================================================
📊 Stripe Integration Test Report
=============================================================

总测试数: 18
✅ 通过: 18
❌ 失败: 0
⏭️  跳过: 0
📈 通过率: 100.00%

=============================================================
```

### 部分跳过报告示例

```
=============================================================
📊 Stripe Integration Test Report
=============================================================

总测试数: 18
✅ 通过: 9
❌ 失败: 0
⏭️  跳过: 9
📈 通过率: 100.00%

跳过的测试:
  ⏭️  创建 Stripe 客户
  ⏭️  获取已存在的 Stripe 客户
  ⏭️  验证客户 ID 保存到数据库
  ⏭️  创建月付 Checkout Session
  ⏭️  创建年付 Checkout Session
  ⏭️  验证 Checkout Session metadata
  ⏭️  创建 Portal Session
  ⏭️  获取用户的 Stripe 客户 ID
  ⏭️  验证客户 ID 保存到数据库

=============================================================
```

### 失败报告示例

```
=============================================================
📊 Stripe Integration Test Report
=============================================================

总测试数: 18
✅ 通过: 16
❌ 失败: 2
⏭️  跳过: 0
📈 通过率: 88.89%

失败的测试:
  ❌ 创建月付 Checkout Session
     Assertion failed: Price ID not configured for this plan
  ❌ 创建年付 Checkout Session
     Assertion failed: Price ID not configured for this plan

=============================================================
```

---

## 🔍 故障排查

### 问题 1: "Stripe secret key not configured"

**原因**: 环境变量未正确配置

**解决方案**:
1. 检查 `.env.local` 文件是否存在
2. 确认 `STRIPE_SECRET_KEY` 已设置
3. 重启测试脚本

### 问题 2: "Price ID not configured for this plan"

**原因**: Stripe 价格 ID 未在环境变量中配置

**解决方案**:
1. 在 Stripe Dashboard 中创建产品和价格
2. 复制 Price ID 到 `.env.local`
3. 确认以下变量已设置：
   - `STRIPE_PRICE_PRO_MONTHLY`
   - `STRIPE_PRICE_PRO_YEARLY`
   - `STRIPE_PRICE_PREMIUM_MONTHLY`
   - `STRIPE_PRICE_PREMIUM_YEARLY`

### 问题 3: "No active subscription found"

**原因**: 测试用户没有活跃订阅

**解决方案**:
这是预期行为，测试会自动创建订阅。如果持续失败：
1. 检查数据库连接
2. 运行 `npx prisma db push` 确保 schema 已同步
3. 运行 `npx tsx prisma/seed-subscriptions.ts` 初始化数据

### 问题 4: API 调用超时

**原因**: 网络问题或 Stripe API 慢

**解决方案**:
1. 检查网络连接
2. 确认可以访问 https://api.stripe.com
3. 重试测试

### 问题 5: "Subscription plan not found"

**原因**: 数据库中没有订阅计划数据

**解决方案**:
```bash
cd frontend
npx tsx prisma/seed-subscriptions.ts
```

---

## 🧪 本地开发 Webhook 测试

### 使用 Stripe CLI

Stripe CLI 可以将 Stripe 的 Webhook 转发到本地开发环境。

#### 1. 安装 Stripe CLI

**macOS** (使用 Homebrew):
```bash
brew install stripe/stripe-cli/stripe
```

**Linux**:
```bash
# 下载最新版本
wget https://github.com/stripe/stripe-cli/releases/download/vX.X.X/stripe_X.X.X_linux_x86_64.tar.gz
tar -xvf stripe_X.X.X_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin/
```

**Windows**:
下载 .exe 文件: https://github.com/stripe/stripe-cli/releases

#### 2. 登录 Stripe CLI

```bash
stripe login
```

浏览器会打开，确认授权。

#### 3. 启动本地应用

```bash
cd frontend
npm run dev
```

#### 4. 转发 Webhook

在另一个终端中：

```bash
stripe listen --forward-to localhost:3000/api/subscription/webhook
```

**输出示例**:
```
> Ready! Your webhook signing secret is whsec_xxxxx (^C to quit)
```

复制这个 `whsec_xxxxx` 到你的 `.env.local` 中的 `STRIPE_WEBHOOK_SECRET`。

#### 5. 触发测试 Webhook

在第三个终端中：

```bash
# 触发 checkout.session.completed 事件
stripe trigger checkout.session.completed

# 触发 invoice.paid 事件
stripe trigger invoice.paid

# 触发 customer.subscription.deleted 事件
stripe trigger customer.subscription.deleted
```

#### 6. 查看日志

在转发 Webhook 的终端中，你会看到：

```
2024-01-XX 10:30:45   --> checkout.session.completed [evt_xxx]
2024-01-XX 10:30:45   <--  [200] POST http://localhost:3000/api/subscription/webhook [evt_xxx]
```

---

## 📝 测试清单

在提交代码前，确保以下测试通过：

### 最小测试（无 Stripe 配置）

- [ ] 配置验证测试全部通过
- [ ] Webhook 处理模拟测试全部通过
- [ ] 配额集成测试全部通过

### 完整测试（含 Stripe 配置）

- [ ] 所有 18 个测试用例通过
- [ ] 客户创建和获取正常
- [ ] Checkout Session 创建成功
- [ ] Portal Session 创建成功
- [ ] 数据库记录正确

### 集成测试（使用 Stripe CLI）

- [ ] Webhook 签名验证成功
- [ ] checkout.session.completed 处理正确
- [ ] invoice.paid 处理正确
- [ ] customer.subscription.deleted 处理正确
- [ ] 数据库状态同步正确

---

## 🚀 持续集成建议

### GitHub Actions 示例

```yaml
name: Test Stripe Integration

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: cd frontend && npm install
    
    - name: Run Stripe tests (basic)
      run: cd frontend && npx tsx scripts/test-subscription-stripe.ts
      # 不配置 Stripe 密钥，只运行基础测试
    
    - name: Run Stripe tests (full)
      if: ${{ secrets.STRIPE_SECRET_KEY }}
      env:
        STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
        STRIPE_WEBHOOK_SECRET: ${{ secrets.STRIPE_WEBHOOK_SECRET }}
        # ... 其他密钥
      run: cd frontend && npx tsx scripts/test-subscription-stripe.ts
```

---

## 📚 相关文档

- [Stripe 集成详细文档](./PHASE5_DAY2-3_STRIPE.md)
- [Day 2-3 完成总结](./PHASE5_DAY2-3_SUMMARY.md)
- [Phase 5 进度跟踪](./PHASE5_PROGRESS.md)
- [Stripe API 文档](https://stripe.com/docs/api)
- [Stripe 测试卡号](https://stripe.com/docs/testing)

---

**文档版本**: v1.0  
**最后更新**: 2024-01-XX  
**维护者**: Zmage Dev Team