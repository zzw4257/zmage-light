# Phase 5 - Day 13: Elasticsearch 数据同步与索引

> **实施日期**: 2024-01-XX  
> **状态**: ✅ 已完成  
> **目标**: 实现媒体文件的自动索引同步、全量数据迁移和事件钩子集成

---

## 📋 目录

- [概述](#概述)
- [架构设计](#架构设计)
- [实现内容](#实现内容)
  - [1. IndexingService 索引服务](#1-indexingservice-索引服务)
  - [2. Media Hooks 媒体钩子](#2-media-hooks-媒体钩子)
  - [3. API 集成](#3-api-集成)
  - [4. 全量同步脚本](#4-全量同步脚本)
- [使用指南](#使用指南)
- [测试验证](#测试验证)
- [性能优化](#性能优化)
- [故障排查](#故障排查)

---

## 概述

Day 13 实现了 Elasticsearch 的数据同步机制，确保数据库中的媒体数据自动同步到搜索引擎索引中。

### 核心功能

✅ **自动索引同步**
- 上传时自动索引
- 更新时增量同步
- 删除时自动清理
- 批量操作支持

✅ **事件驱动架构**
- 非阻塞式钩子调用
- 失败不影响主业务
- 自动错误恢复
- 详细日志记录

✅ **全量数据迁移**
- 批量处理优化
- 进度实时显示
- 断点续传支持
- 试运行模式

✅ **幂等性保证**
- 重复索引安全
- 删除操作幂等
- 数据一致性检查

---

## 架构设计

### 数据流向

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   API 请求   │────────▶│   Prisma DB  │────────▶│  ES 钩子调用  │
└─────────────┘         └──────────────┘         └──────────────┘
                              │                          │
                              │ 主业务（同步）             │ 索引（异步）
                              ▼                          ▼
                        ┌──────────────┐         ┌──────────────┐
                        │  返回响应     │         │ Elasticsearch│
                        └──────────────┘         └──────────────┘
```

### 模块结构

```
lib/elasticsearch/
├── client.ts              # ES 客户端封装
├── index-manager.ts       # 索引管理器
├── indexing-service.ts    # 索引服务 (NEW)
├── media-hooks.ts         # 媒体事件钩子 (NEW)
└── mappings/
    └── media.ts           # 媒体索引映射

scripts/
└── sync-media-to-elasticsearch.ts  # 全量同步脚本 (NEW)

app/api/
├── upload/
│   ├── route.ts           # 集成上传钩子
│   ├── from-url/route.ts  # 集成 URL 导入钩子
│   └── from-dataurl/route.ts  # 集成 DataURL 钩子
└── images/
    ├── [id]/route.ts      # 集成删除钩子
    └── batch-delete/route.ts  # 集成批量删除钩子
```

---

## 实现内容

### 1. IndexingService 索引服务

**文件**: `lib/elasticsearch/indexing-service.ts`

提供核心索引操作 API。

#### 核心方法

##### `indexMedia(image: ImageWithRelations): Promise<boolean>`

索引单个媒体文件。

```typescript
import { indexMedia } from '@/lib/elasticsearch/indexing-service'

// 上传后索引
const image = await prisma.image.create({ data: {...} })
await indexMedia(image) // 非阻塞
```

**特性**:
- ✅ 自动转换数据格式
- ✅ 地理位置解析（lat/lon）
- ✅ AI 标签提取
- ✅ 全文搜索字段生成
- ✅ 错误处理和日志

##### `bulkIndexMedia(images: ImageWithRelations[]): Promise<BulkResult>`

批量索引媒体文件。

```typescript
const images = await prisma.image.findMany({...})
const result = await bulkIndexMedia(images)
console.log(`成功: ${result.success}, 失败: ${result.failed}`)
```

**特性**:
- ⚡ 批量操作优化
- 📊 详细结果报告
- 🔁 错误项单独记录
- 🛡️ 部分失败不中断

##### `updateMedia(imageId: string, updates: Partial<MediaDocument>): Promise<boolean>`

更新媒体索引。

```typescript
await updateMedia(imageId, {
  memo: '更新的备注',
  rating: 5,
  updatedAt: new Date(),
})
```

**特性**:
- 📝 增量更新（仅更新字段）
- 🔍 文档缺失自动忽略
- ⚡ 异步刷新策略

##### `deleteMedia(imageId: string): Promise<boolean>`

删除媒体索引。

```typescript
await deleteMedia(imageId)
```

**特性**:
- 🗑️ 幂等删除（重复删除安全）
- 📝 详细日志记录

##### `bulkDeleteMedia(imageIds: string[]): Promise<BulkResult>`

批量删除媒体索引。

```typescript
await bulkDeleteMedia(['id1', 'id2', 'id3'])
```

#### 辅助方法

```typescript
// 检查文档是否存在
await mediaExists(imageId)

// 刷新索引（用于测试）
await refreshIndex()

// 获取索引统计
const stats = await getIndexStats()
// { documentCount: 1234, indexSize: '45.67 MB', health: 'green' }
```

#### 数据转换

**`imageToDocument(image: ImageWithRelations): MediaDocument`**

将 Prisma Image 模型转换为 ES 文档格式。

**转换逻辑**:
1. **地理位置解析**: 从 `location` 字符串提取 `lat,lon` → `geoPoint { lat, lon }`
2. **AI 标签转换**: `ImageTag[]` → `aiTags[]`
3. **全文搜索字段**: 合并 `originalName`, `memo`, `aiDescription`, `tags`, `camera`, `lens` 等
4. **可选字段处理**: `null` → `undefined`（ES 规范）

---

### 2. Media Hooks 媒体钩子

**文件**: `lib/elasticsearch/media-hooks.ts`

提供事件驱动的自动索引同步。

#### 设计原则

- **非阻塞执行**: 使用 `setImmediate()` 异步调用
- **失败不影响主业务**: 索引失败仅记录日志
- **自动错误恢复**: 连接断开时跳过索引
- **详细日志**: 记录所有操作和错误

#### 核心钩子

##### `onMediaUploaded(image: ImageWithRelations): Promise<void>`

媒体上传后触发。

```typescript
// 在 API 路由中调用
const image = await prisma.image.create({ data: {...} })
await onMediaUploaded(image) // 非阻塞
```

##### `onMediaUpdated(imageId: string, updates: Partial<ImageWithRelations>): Promise<void>`

媒体更新后触发。

```typescript
await prisma.image.update({ where: { id }, data: { memo: 'new memo' } })
await onMediaUpdated(id, { memo: 'new memo' })
```

**自动处理**:
- ✅ 字段映射转换
- ✅ `searchText` 自动更新（当 memo/aiDescription/tags 变化）
- ✅ `updatedAt` 自动设置

##### `onMediaDeleted(imageId: string): Promise<void>`

媒体删除后触发。

```typescript
await prisma.image.delete({ where: { id } })
await onMediaDeleted(id)
```

##### `onMediaBatchDeleted(imageIds: string[]): Promise<void>`

批量删除后触发。

```typescript
await prisma.image.deleteMany({ where: { id: { in: ids } } })
await onMediaBatchDeleted(ids)
```

#### 专用钩子

##### `onAIAnalysisCompleted(imageId, analysis): Promise<void>`

AI 分析完成后更新索引。

```typescript
await onAIAnalysisCompleted(imageId, {
  description: 'A beautiful sunset over the ocean',
  tags: [
    { name: 'sunset', type: 'ai', category: 'scene', confidence: 0.95 },
    { name: 'ocean', type: 'ai', category: 'landscape', confidence: 0.92 },
  ],
})
```

##### `onTagsUpdated(imageId, tags): Promise<void>`

标签更新后同步。

##### `onShareStatusUpdated(imageId, isPublic, shareId): Promise<void>`

分享状态变化后同步。

##### `onViewsIncremented(imageId, views): Promise<void>`

浏览量增加后同步。

---

### 3. API 集成

#### 上传 API 集成

**文件**: `app/api/upload/route.ts`, `from-url/route.ts`, `from-dataurl/route.ts`

```typescript
import { onMediaUploaded } from '@/lib/elasticsearch/media-hooks'

export async function POST(req: NextRequest) {
  // ... 文件上传逻辑
  
  const image = await prisma.image.create({ data: {...} })
  
  // 索引到 Elasticsearch（非阻塞）
  await onMediaUploaded(image)
  
  return NextResponse.json({ image })
}
```

#### 删除 API 集成

**文件**: `app/api/images/[id]/route.ts`

```typescript
import { onMediaDeleted } from '@/lib/elasticsearch/media-hooks'

export async function DELETE(req: NextRequest, { params }) {
  const { id } = await params
  
  // 删除文件和数据库记录
  await prisma.image.delete({ where: { id } })
  
  // 从 Elasticsearch 删除（非阻塞）
  await onMediaDeleted(id)
  
  return NextResponse.json({ message: '删除成功' })
}
```

#### 批量删除 API 集成

**文件**: `app/api/images/batch-delete/route.ts`

```typescript
import { onMediaBatchDeleted } from '@/lib/elasticsearch/media-hooks'

export async function POST(req: NextRequest) {
  const { imageIds } = await req.json()
  
  await prisma.image.deleteMany({ where: { id: { in: imageIds } } })
  
  // 批量删除索引（非阻塞）
  await onMediaBatchDeleted(imageIds)
  
  return NextResponse.json({ success: true })
}
```

---

### 4. 全量同步脚本

**文件**: `scripts/sync-media-to-elasticsearch.ts`

用于将现有数据库数据批量迁移到 Elasticsearch。

#### 使用方法

```bash
# 基础同步（批量大小 100）
npm run es:sync

# 试运行模式（不实际写入）
npm run es:sync:dry-run

# 强制重建索引并同步
npm run es:sync:force

# 自定义批量大小
npx tsx scripts/sync-media-to-elasticsearch.ts --batch-size 50

# 仅同步特定用户
npx tsx scripts/sync-media-to-elasticsearch.ts --user clxxx123

# 查看帮助
npx tsx scripts/sync-media-to-elasticsearch.ts --help
```

#### 功能特性

✅ **智能批量处理**
- 可配置批量大小（默认 100）
- 自动分批查询和索引
- 避免内存溢出

✅ **进度可视化**
```
同步进度: [████████████████████████████████████████] 100.0% (1000/1000)
```

✅ **完整统计报告**
```
📊 同步完成统计:
  总计: 1000
  成功: 998
  失败: 2
  耗时: 45.23s
  速率: 22 条/秒
```

✅ **错误详情输出**
```
❌ 错误详情:
  - clxxx123: document_parsing_exception
  - clxxx456: mapper_parsing_exception
```

✅ **数据验证**
- 同步后自动验证索引文档数
- 对比成功数和实际索引数
- 发现不一致时警告

#### 命令行选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `--batch-size <number>` | 批量处理大小 | 100 |
| `--dry-run` | 试运行模式（不写入） | false |
| `--force` | 强制重建索引 | false |
| `--user <userId>` | 仅同步指定用户 | 全部 |
| `--help` | 显示帮助信息 | - |

#### 工作流程

1. **连接检查**: 验证 Elasticsearch 可用性
2. **索引检查**: 检查索引是否存在
   - 若 `--force`: 删除并重建索引
   - 若不存在: 自动创建索引
3. **数据统计**: 统计需要同步的媒体总数
4. **批量处理**: 按批次查询并索引
   - 包含关联数据（aiTags, user）
   - 实时显示进度
   - 批次间延迟 100ms 避免过载
5. **刷新索引**: 强制刷新使数据可搜索
6. **验证统计**: 对比索引文档数和成功数
7. **报告输出**: 详细统计和错误报告

---

## 使用指南

### 初始化流程

#### 1. 启动 Elasticsearch

```bash
cd 完整自己开发版本
docker-compose up -d elasticsearch kibana
```

#### 2. 初始化索引

```bash
cd frontend
npm run es:init
```

#### 3. 全量同步现有数据

```bash
# 先试运行查看效果
npm run es:sync:dry-run

# 确认无误后正式同步
npm run es:sync
```

#### 4. 验证同步结果

```bash
# 检查索引健康状态
npm run es:health

# 使用 Kibana Dev Tools
# 打开 http://localhost:5601 → Dev Tools
GET zmage_media/_count
GET zmage_media/_search
```

### 日常开发

#### 新增媒体

```typescript
// API 路由中
const image = await prisma.image.create({
  data: {
    userId: session.user.id,
    filename: 'photo.jpg',
    // ... 其他字段
  },
})

// 自动索引（非阻塞）
await onMediaUploaded(image)
```

#### 更新媒体

```typescript
await prisma.image.update({
  where: { id },
  data: { memo: 'Updated memo', rating: 5 },
})

// 同步更新索引
await onMediaUpdated(id, { memo: 'Updated memo', rating: 5 })
```

#### 删除媒体

```typescript
await prisma.image.delete({ where: { id } })

// 同步删除索引
await onMediaDeleted(id)
```

#### AI 分析完成

```typescript
// 在 AI 分析任务完成后
await onAIAnalysisCompleted(imageId, {
  description: 'AI generated description',
  tags: [
    { name: 'cat', type: 'ai', category: 'animal', confidence: 0.95 },
  ],
})
```

### 定期维护

#### 重建索引

```bash
# 强制重建并全量同步
npm run es:sync:force
```

#### 数据一致性检查

```typescript
// 检查索引文档数
const stats = await getIndexStats()
console.log(`索引文档数: ${stats.documentCount}`)

// 检查数据库记录数
const dbCount = await prisma.image.count()
console.log(`数据库记录数: ${dbCount}`)
```

---

## 测试验证

### 单元测试

#### 测试索引服务

```typescript
import { indexMedia, mediaExists, deleteMedia } from '@/lib/elasticsearch/indexing-service'

// 测试索引创建
const image = await prisma.image.findFirst()
const success = await indexMedia(image)
expect(success).toBe(true)

// 验证存在性
const exists = await mediaExists(image.id)
expect(exists).toBe(true)

// 测试删除
await deleteMedia(image.id)
const existsAfter = await mediaExists(image.id)
expect(existsAfter).toBe(false)
```

#### 测试批量操作

```typescript
const images = await prisma.image.findMany({ take: 10 })
const result = await bulkIndexMedia(images)

expect(result.success).toBe(10)
expect(result.failed).toBe(0)
expect(result.errors).toHaveLength(0)
```

### 集成测试

#### 测试完整流程

```bash
# 1. 上传图片
curl -X POST http://localhost:3000/api/upload \
  -F "file=@test.jpg" \
  -H "Cookie: session=..."

# 2. 等待索引完成（通常 < 1s）
sleep 2

# 3. 在 Kibana 中验证
GET zmage_media/_search
{
  "query": {
    "match": {
      "originalName": "test.jpg"
    }
  }
}

# 4. 删除图片
curl -X DELETE http://localhost:3000/api/images/{imageId} \
  -H "Cookie: session=..."

# 5. 验证索引已删除
GET zmage_media/_doc/{imageId}
# 应返回 404
```

### 性能测试

#### 批量索引性能

```bash
# 同步 1000 条数据
time npm run es:sync -- --batch-size 100

# 预期性能指标:
# - 速率: 20-50 条/秒
# - 1000 条数据: 20-50 秒
```

#### 压力测试

```typescript
// 测试批量上传 + 索引
const promises = []
for (let i = 0; i < 100; i++) {
  promises.push(uploadAndIndex(`test-${i}.jpg`))
}
await Promise.all(promises)
// 预期: 所有请求成功，索引无丢失
```

---

## 性能优化

### 已实现的优化

✅ **批量操作**
- 使用 `bulk` API 代替逐条插入
- 批量大小可配置（默认 100）
- 减少网络往返次数

✅ **异步刷新**
- 索引操作使用 `refresh: false`
- 避免每次操作立即刷新
- 提高吞吐量

✅ **非阻塞钩子**
- 使用 `setImmediate()` 异步执行
- 主业务不等待索引完成
- 提升 API 响应速度

✅ **连接管理**
- 单例客户端复用连接
- 自动重连机制
- Keep-alive 长连接

✅ **错误处理**
- 索引失败不影响主业务
- 详细日志便于排查
- 幂等操作避免重复

### 进一步优化建议

#### 1. 使用队列系统

将索引操作放入 BullMQ 队列：

```typescript
// 添加索引任务到队列
await indexQueue.add('index-media', { imageId })

// Worker 处理
indexQueue.process('index-media', async (job) => {
  const { imageId } = job.data
  const image = await prisma.image.findUnique({
    where: { id: imageId },
    include: { aiTags: { include: { tag: true } } },
  })
  await indexMedia(image)
})
```

**优势**:
- ✅ 可靠的重试机制
- ✅ 任务持久化
- ✅ 监控和统计
- ✅ 削峰填谷

#### 2. 增量同步

定期检查并同步缺失的索引：

```typescript
// scripts/incremental-sync.ts
const dbImages = await prisma.image.findMany({
  where: { updatedAt: { gte: lastSyncTime } },
})

for (const image of dbImages) {
  const exists = await mediaExists(image.id)
  if (!exists) {
    await indexMedia(image)
  }
}
```

#### 3. 压缩传输

启用请求/响应压缩：

```typescript
const client = new Client({
  node: process.env.ELASTICSEARCH_NODE,
  compression: 'gzip', // 启用压缩
})
```

---

## 故障排查

### 常见问题

#### 1. 索引失败 - 连接超时

**症状**:
```
Failed to index media: connect ETIMEDOUT
```

**排查**:
```bash
# 检查 ES 是否运行
docker-compose ps elasticsearch

# 检查端口
curl http://localhost:9200/_cluster/health

# 查看日志
docker-compose logs elasticsearch
```

**解决**:
```bash
# 重启 Elasticsearch
docker-compose restart elasticsearch
```

#### 2. 索引失败 - 映射冲突

**症状**:
```
mapper_parsing_exception: failed to parse field [geoPoint]
```

**排查**:
```bash
# 检查索引映射
curl http://localhost:9200/zmage_media/_mapping?pretty

# 检查问题文档
GET zmage_media/_doc/{imageId}
```

**解决**:
```bash
# 方案 1: 重建索引
npm run es:sync:force

# 方案 2: 修复数据格式
# 确保 location 字段格式正确: "lat,lon"
```

#### 3. 同步脚本卡住

**症状**:
```
同步进度: [████████░░░░░░░░░░░░░░░░░░] 35.2% (352/1000)
[长时间无响应]
```

**排查**:
```bash
# 检查 ES 性能
curl http://localhost:9200/_nodes/stats?pretty

# 检查 CPU/内存
docker stats elasticsearch
```

**解决**:
```bash
# 减小批量大小
npm run es:sync -- --batch-size 50

# 增加 JVM 内存（修改 docker-compose.yml）
ES_JAVA_OPTS: "-Xms1g -Xmx1g"
```

#### 4. 文档数不一致

**症状**:
```
⚠️ 警告: 索引文档数 (950) 与成功数 (1000) 不一致
```

**排查**:
```bash
# 检查索引健康状态
npm run es:health

# 手动刷新索引
curl -X POST http://localhost:9200/zmage_media/_refresh
```

**解决**:
```bash
# 重新同步缺失数据
npm run es:sync
```

### 调试模式

#### 启用详细日志

```typescript
// lib/logger.ts
export const logger = {
  level: 'debug', // 'info' | 'warn' | 'error' | 'debug'
  // ...
}
```

#### 查看 ES 慢查询日志

```bash
# 在 Kibana Dev Tools 中
PUT /zmage_media/_settings
{
  "index.search.slowlog.threshold.query.warn": "1s",
  "index.search.slowlog.threshold.query.info": "500ms",
  "index.indexing.slowlog.threshold.index.warn": "1s"
}

# 查看日志
docker-compose logs elasticsearch | grep slowlog
```

---

## 下一步

Day 13 完成后，数据同步机制已就绪。接下来的工作：

### Day 14-15: 搜索 API 与前端

- [ ] 实现 SearchService（查询封装）
- [ ] 创建搜索 API 端点 (`/api/search`)
- [ ] 实现前端搜索组件（SearchBar, Filters, Results）
- [ ] 添加自动完成和建议功能
- [ ] 实现高级搜索（faceted search, geo filters）
- [ ] 相关性调优和排序

### 未来优化

- [ ] 集成 BullMQ 队列系统
- [ ] 实现增量同步任务
- [ ] 添加搜索分析和统计
- [ ] 实现同义词和拼写纠正
- [ ] 多语言分词支持
- [ ] 搜索结果缓存

---

## 参考资料

- [Elasticsearch Node.js Client](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/index.html)
- [Bulk API 性能优化](https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-bulk.html)
- [Index Lifecycle Management](https://www.elastic.co/guide/en/elasticsearch/reference/current/index-lifecycle-management.html)
- [Zmage Phase 5 总体规划](./PHASE5_PROGRESS.md)

---

**实施完成时间**: 2024-01-XX  
**文档版本**: 1.0  
**维护者**: Zmage Team