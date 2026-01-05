# Phase 5 - Day 22-23: Analytics Service & API Implementation

## 📋 概述

在 Day 22-23，我们实现了完整的数据分析服务和 API 系统，提供全面的系统使用统计、趋势分析和数据导出功能。

**实施日期**: Day 22-23  
**状态**: ✅ 已完成  
**负责人**: Development Team

---

## 🎯 实现目标

### 核心功能
- ✅ 分析服务层实现
- ✅ 多维度数据统计 API
- ✅ CSV/JSON 数据导出
- ✅ 分析仪表板页面
- ✅ 优化侧边栏布局

---

## 🏗️ 架构设计

### 服务层架构

```
lib/analytics/
├── analytics-service.ts    # 核心分析服务
├── event-tracker.ts         # 事件追踪器（已有）
├── metrics-calculator.ts    # 指标计算器（已有）
└── types.ts                 # TypeScript 类型定义
```

### API 端点设计

```
/api/analytics/
├── overview              # GET - 获取概览数据
├── storage               # GET - 存储统计
├── ai-usage              # GET - AI 使用统计
├── activity              # GET - 活动趋势
├── user                  # GET - 用户统计
└── export                # GET - 数据导出
```

---

## 📊 核心功能实现

### 1. 分析服务 (analytics-service.ts)

#### 功能概览
```typescript
interface AnalyticsService {
  // 获取系统概览
  getOverview(userId?: string): Promise<AnalyticsOverview>
  
  // 存储统计
  getStorageStats(days: number): Promise<StorageStats>
  
  // AI 使用统计
  getAIUsageStats(days: number): Promise<AIUsageStats>
  
  // 活动趋势
  getActivityTrend(period: 'day' | 'week' | 'month', days: number): Promise<ActivityTrend>
  
  // 用户统计
  getUserStats(userId: string): Promise<UserStats>
}
```

#### 数据类型定义

**概览数据**
```typescript
interface AnalyticsOverview {
  users: {
    total: number
    active: number
    dau: number      // Daily Active Users
    wau: number      // Weekly Active Users
    mau: number      // Monthly Active Users
  }
  storage: {
    totalBytes: number
    totalItems: number
    images: number
    videos: number
    others: number
    averageSize: number
  }
  activity: {
    uploads: number
    views: number
    downloads: number
    searches: number
    shares: number
  }
  ai: {
    totalRequests: number
    analysisCount: number
    generationCount: number
    tokensUsed: number
  }
  retention: {
    day1: number
    day7: number
    day30: number
  }
  timestamp: string
}
```

**存储统计**
```typescript
interface StorageStats {
  total: {
    bytes: number
    items: number
    formatted: string
  }
  byType: {
    images: { count: number; bytes: number; percentage: number }
    videos: { count: number; bytes: number; percentage: number }
    others: { count: number; bytes: number; percentage: number }
  }
  byUser: Array<{
    userId: string
    username: string
    bytes: number
    items: number
    percentage: number
  }>
  growth: Array<{
    date: string
    bytes: number
    items: number
    change: number
  }>
}
```

**AI 使用统计**
```typescript
interface AIUsageStats {
  total: {
    requests: number
    tokensUsed: number
    cost: number
  }
  byType: {
    analysis: { count: number; tokens: number; avgTokens: number }
    generation: { count: number; tokens: number; avgTokens: number }
    chat: { count: number; tokens: number; avgTokens: number }
    other: { count: number; tokens: number; avgTokens: number }
  }
  byModel: Array<{
    model: string
    requests: number
    tokens: number
    cost: number
  }>
  timeline: Array<{
    date: string
    requests: number
    tokens: number
    cost: number
  }>
  topUsers: Array<{
    userId: string
    username: string
    requests: number
    tokens: number
  }>
}
```

**活动趋势**
```typescript
interface ActivityTrend {
  period: 'day' | 'week' | 'month'
  metrics: Array<{
    date: string
    uploads: number
    views: number
    downloads: number
    searches: number
    shares: number
    activeUsers: number
  }>
  comparison: {
    current: number
    previous: number
    change: number
    changePercentage: number
  }
}
```

### 2. API 端点实现

#### GET /api/analytics/overview

**用途**: 获取系统概览数据

**查询参数**:
- `userId` (optional): 特定用户 ID

**响应示例**:
```json
{
  "users": {
    "total": 150,
    "active": 42,
    "dau": 25,
    "wau": 78,
    "mau": 120
  },
  "storage": {
    "totalBytes": 52428800000,
    "totalItems": 12450,
    "images": 10200,
    "videos": 1850,
    "others": 400,
    "averageSize": 4210000
  },
  "activity": {
    "uploads": 145,
    "views": 3200,
    "downloads": 580,
    "searches": 1250,
    "shares": 68
  },
  "ai": {
    "totalRequests": 4580,
    "analysisCount": 3200,
    "generationCount": 1280,
    "tokensUsed": 2850000
  },
  "retention": {
    "day1": 0.72,
    "day7": 0.45,
    "day30": 0.28
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### GET /api/analytics/storage

**用途**: 获取存储统计数据

**查询参数**:
- `days` (default: 30, range: 1-365): 统计天数

**响应示例**:
```json
{
  "total": {
    "bytes": 52428800000,
    "items": 12450,
    "formatted": "48.83 GB"
  },
  "byType": {
    "images": {
      "count": 10200,
      "bytes": 38400000000,
      "percentage": 73.24
    },
    "videos": {
      "count": 1850,
      "bytes": 13500000000,
      "percentage": 25.76
    },
    "others": {
      "count": 400,
      "bytes": 528800000,
      "percentage": 1.00
    }
  },
  "byUser": [
    {
      "userId": "user_001",
      "username": "zzw4257",
      "bytes": 8500000000,
      "items": 2100,
      "percentage": 16.21
    }
  ],
  "growth": [
    {
      "date": "2024-01-01",
      "bytes": 50000000000,
      "items": 12000,
      "change": 500000000
    }
  ]
}
```

#### GET /api/analytics/ai-usage

**用途**: 获取 AI 使用统计

**查询参数**:
- `days` (default: 30, range: 1-365): 统计天数

**响应示例**:
```json
{
  "total": {
    "requests": 4580,
    "tokensUsed": 2850000,
    "cost": 57.50
  },
  "byType": {
    "analysis": {
      "count": 3200,
      "tokens": 1920000,
      "avgTokens": 600
    },
    "generation": {
      "count": 1280,
      "tokens": 896000,
      "avgTokens": 700
    },
    "chat": {
      "count": 100,
      "tokens": 34000,
      "avgTokens": 340
    },
    "other": {
      "count": 0,
      "tokens": 0,
      "avgTokens": 0
    }
  },
  "byModel": [
    {
      "model": "gpt-4-vision-preview",
      "requests": 2800,
      "tokens": 1680000,
      "cost": 42.00
    },
    {
      "model": "dall-e-3",
      "requests": 1280,
      "tokens": 0,
      "cost": 12.80
    }
  ],
  "timeline": [
    {
      "date": "2024-01-15",
      "requests": 158,
      "tokens": 94800,
      "cost": 1.90
    }
  ],
  "topUsers": [
    {
      "userId": "user_001",
      "username": "zzw4257",
      "requests": 850,
      "tokens": 510000
    }
  ]
}
```

#### GET /api/analytics/activity

**用途**: 获取活动趋势数据

**查询参数**:
- `period` (default: 'day'): 统计周期 ('day' | 'week' | 'month')
- `days` (default: 30, range: 1-365): 统计天数

**响应示例**:
```json
{
  "period": "day",
  "metrics": [
    {
      "date": "2024-01-15",
      "uploads": 145,
      "views": 3200,
      "downloads": 580,
      "searches": 1250,
      "shares": 68,
      "activeUsers": 25
    }
  ],
  "comparison": {
    "current": 2180,
    "previous": 1950,
    "change": 230,
    "changePercentage": 11.79
  }
}
```

#### GET /api/analytics/user

**用途**: 获取用户统计数据

**查询参数**:
- `userId` (optional): 用户 ID，默认为当前用户

**响应示例**:
```json
{
  "userId": "user_001",
  "username": "zzw4257",
  "stats": {
    "totalUploads": 2100,
    "totalViews": 15800,
    "totalDownloads": 3200,
    "totalShares": 45,
    "storageUsed": 8500000000,
    "aiRequestsCount": 850,
    "lastActive": "2024-01-15T10:25:00.000Z"
  },
  "activity": [
    {
      "date": "2024-01-15",
      "uploads": 8,
      "views": 125,
      "downloads": 22
    }
  ]
}
```

#### GET /api/analytics/export

**用途**: 导出分析数据

**查询参数**:
- `type` (required): 数据类型 ('overview' | 'storage' | 'ai-usage' | 'activity' | 'user')
- `format` (default: 'csv'): 导出格式 ('csv' | 'json')
- `days` (default: 30): 统计天数（部分类型适用）

**响应**:
- Content-Type: `text/csv` 或 `application/json`
- Content-Disposition: `attachment; filename="<type>-<date>.<format>"`

**CSV 格式示例** (overview):
```csv
User Statistics
Metric,Value
Total Users,150
Active Users,42
DAU,25
WAU,78
MAU,120

Storage Statistics
Metric,Value
Total Bytes,52428800000
Total Items,12450
...
```

---

## 🎨 前端实现

### 1. 分析仪表板页面

**位置**: `app/(main)/analytics/page.tsx`

**功能**:
- 📊 概览卡片显示（用户、存储、活动、AI）
- 📈 多标签详细视图
- 🔄 实时数据刷新
- 📥 CSV/JSON 数据导出
- 📱 响应式设计

**组件结构**:
```tsx
AnalyticsPage
├── Header (标题 + 操作按钮)
├── Overview Cards (4个概览卡片)
└── Tabs
    ├── Overview Tab (用户统计 + 留存率)
    ├── Storage Tab (存储详情)
    ├── Activity Tab (活动统计)
    └── AI Tab (AI 使用统计)
```

**关键功能**:
```typescript
// 数据获取
const fetchOverview = async () => {
  const response = await fetch("/api/analytics/overview")
  const data = await response.json()
  setOverview(data)
}

// 数据导出
const handleExport = async (type: string, format: 'csv' | 'json') => {
  const response = await fetch(`/api/analytics/export?type=${type}&format=${format}`)
  const blob = await response.blob()
  // 触发下载
}
```

### 2. 侧边栏优化

**位置**: `components/layout/sidebar.tsx`

**改进内容**:
- ✅ 菜单分组（核心功能、AI 功能、管理）
- ✅ 可折叠分组
- ✅ 徽章标识（New、Beta）
- ✅ 更好的视觉层次
- ✅ 折叠模式下的图标提示

**分组结构**:
```typescript
const navGroups = [
  {
    title: "核心功能",
    defaultOpen: true,
    items: [图片库, 视频库, 上传, 搜索, 探索]
  },
  {
    title: "AI 功能",
    defaultOpen: true,
    items: [AI 生成, 创作, MCP (Beta)]
  },
  {
    title: "管理",
    defaultOpen: false,
    items: [分享, 数据分析 (New), 任务, 开发工坊, 设置]
  }
]
```

**新增组件**:
- `Collapsible` - 折叠面板组件
- `CollapsibleTrigger` - 触发器
- `CollapsibleContent` - 内容区

---

## 📈 性能优化

### 1. 数据缓存策略

```typescript
// 使用 DailyStats 表预聚合数据
const todayStats = await prisma.dailyStats.findUnique({
  where: { date: today }
})

// 实时数据作为补充
const realtimeData = await prisma.media.count()
```

### 2. 查询优化

```typescript
// 并行查询减少延迟
const [totalUsers, totalMedia, aiUsage] = await Promise.all([
  prisma.user.count(),
  prisma.media.count(),
  prisma.aIUsageStats.aggregate({
    _sum: { requestCount: true, tokensUsed: true }
  })
])
```

### 3. 数据格式化

```typescript
// 服务端预格式化，减少客户端计算
private formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
```

---

## 🧪 测试

### API 测试示例

```bash
# 获取概览
curl http://localhost:3000/api/analytics/overview

# 获取存储统计（最近 7 天）
curl http://localhost:3000/api/analytics/storage?days=7

# 获取 AI 使用统计（最近 30 天）
curl http://localhost:3000/api/analytics/ai-usage?days=30

# 获取活动趋势
curl http://localhost:3000/api/analytics/activity?period=day&days=30

# 获取用户统计
curl http://localhost:3000/api/analytics/user?userId=user_001

# 导出 CSV
curl http://localhost:3000/api/analytics/export?type=overview&format=csv -o overview.csv

# 导出 JSON
curl http://localhost:3000/api/analytics/export?type=storage&format=json -o storage.json
```

### 前端测试

```bash
# 启动开发服务器
cd frontend
npm run dev

# 访问分析页面
open http://localhost:3000/analytics
```

---

## 📝 使用说明

### 1. 访问分析仪表板

1. 登录系统
2. 点击侧边栏 "管理" 分组
3. 选择 "数据分析" 菜单项

### 2. 查看统计数据

- **概览卡片**: 快速查看关键指标
- **详细标签**: 切换不同维度的统计数据
- **刷新数据**: 点击右上角刷新按钮
- **导出数据**: 点击导出按钮，选择格式

### 3. 数据导出

```javascript
// 编程方式导出
const exportData = async (type, format) => {
  const response = await fetch(
    `/api/analytics/export?type=${type}&format=${format}`
  )
  const blob = await response.blob()
  // 保存文件
}
```

---

## 🔍 数据字典

### 指标说明

| 指标 | 说明 | 计算方式 |
|------|------|----------|
| DAU | 日活跃用户 | 当天有活动的独立用户数 |
| WAU | 周活跃用户 | 最近 7 天有活动的独立用户数 |
| MAU | 月活跃用户 | 最近 30 天有活动的独立用户数 |
| 1日留存 | 次日留存率 | 次日回访用户数 / 新用户数 |
| 7日留存 | 第7日留存率 | 第7日回访用户数 / 新用户数 |
| 30日留存 | 第30日留存率 | 第30日回访用户数 / 新用户数 |
| 平均大小 | 文件平均大小 | 总存储空间 / 文件数量 |
| Token 使用 | AI Token 消耗 | 所有 AI 请求的 token 总和 |

---

## 🚀 部署注意事项

### 1. 环境变量

无需额外环境变量，使用现有的数据库配置。

### 2. 数据库索引

确保以下索引存在以优化查询性能：

```sql
-- UserActivity 表
CREATE INDEX idx_user_activity_userId_createdAt ON UserActivity(userId, createdAt);
CREATE INDEX idx_user_activity_action ON UserActivity(action);

-- DailyStats 表
CREATE INDEX idx_daily_stats_date ON DailyStats(date DESC);

-- AIUsageStats 表
CREATE INDEX idx_ai_usage_date ON AIUsageStats(date DESC);
CREATE INDEX idx_ai_usage_userId ON AIUsageStats(userId);

-- Media 表
CREATE INDEX idx_media_userId ON Media(userId);
CREATE INDEX idx_media_type ON Media(type);
```

### 3. 定期数据聚合

确保定期运行数据聚合任务：

```bash
# 每日聚合
npm run stats:aggregate

# 回填历史数据
npm run stats:backfill
```

---

## 🔮 未来增强

### 短期计划
- [ ] 实时图表（折线图、柱状图、饼图）
- [ ] 自定义时间范围选择
- [ ] 更多导出格式（Excel、PDF）
- [ ] 数据对比功能（同比、环比）

### 中期计划
- [ ] 实时数据推送（WebSocket/SSE）
- [ ] 预警和通知系统
- [ ] 自定义报表生成
- [ ] 数据可视化拖拽配置

### 长期计划
- [ ] 预测分析（机器学习）
- [ ] 异常检测
- [ ] 用户行为分析
- [ ] A/B 测试支持

---

## 📚 相关文档

- [Phase 5 Day 20-21: Data Analytics Infrastructure](./PHASE5_DAY20-21_DATA_ANALYTICS.md)
- [Phase 5 Day 18-19: Bulk Share Implementation](./PHASE5_DAY18-19_BULK_SHARE.md)
- [Prisma Schema](../frontend/prisma/schema.prisma)

---

## 👥 贡献者

- **开发**: Development Team
- **测试**: QA Team
- **文档**: Documentation Team

---

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](../LICENSE) 文件。

---

**最后更新**: 2024-01-15  
**版本**: 1.0.0  
**状态**: ✅ 已完成