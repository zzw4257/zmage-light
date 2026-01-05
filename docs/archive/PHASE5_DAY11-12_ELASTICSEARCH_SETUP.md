# Phase 5 Day 11-12: Elasticsearch 部署与配置

> **完成日期**: 2024-01-XX  
> **开发者**: AI Assistant  
> **状态**: ✅ 已完成  
> **代码行数**: 1,979 行

---

## 📋 目标回顾

部署单节点 Elasticsearch 集群并完成基础配置，为图片搜索功能打下基础。

### 核心任务
1. ✅ Docker 部署 Elasticsearch 8.x
2. ✅ Kibana 可视化工具配置
3. ✅ Elasticsearch 客户端封装
4. ✅ 媒体索引定义
5. ✅ 索引管理器实现
6. ✅ 初始化脚本

---

## ✅ 完成内容

### 1. Docker Compose 配置

**文件**: `docker-compose.yml` (更新)

**新增服务**:

#### Elasticsearch 服务
```yaml
elasticsearch:
  image: docker.elastic.co/elasticsearch/elasticsearch:8.11.3
  container_name: zmage-elasticsearch
  environment:
    - node.name=zmage-es-node
    - cluster.name=zmage-cluster
    - discovery.type=single-node
    - bootstrap.memory_lock=true
    - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    - xpack.security.enabled=false
    - xpack.security.enrollment.enabled=false
    - xpack.security.http.ssl.enabled=false
    - xpack.security.transport.ssl.enabled=false
  ports:
    - "9200:9200"
    - "9300:9300"
  volumes:
    - elasticsearch-data:/usr/share/elasticsearch/data
  healthcheck:
    test: ["CMD-SHELL", "curl -f http://localhost:9200/_cluster/health || exit 1"]
    interval: 30s
    timeout: 10s
    retries: 5
    start_period: 60s
```

**特性**:
- ✅ 单节点模式（开发环境）
- ✅ 内存限制 512MB（可调整）
- ✅ 禁用 X-Pack 安全功能（简化开发）
- ✅ 健康检查配置
- ✅ 数据持久化

#### Kibana 服务
```yaml
kibana:
  image: docker.elastic.co/kibana/kibana:8.11.3
  container_name: zmage-kibana
  environment:
    - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    - SERVER_HOST=0.0.0.0
  ports:
    - "5601:5601"
  depends_on:
    elasticsearch:
      condition: service_healthy
```

**特性**:
- ✅ 自动连接 Elasticsearch
- ✅ 依赖健康检查
- ✅ 开发者友好的 UI

---

### 2. Elasticsearch 客户端

**文件**: `lib/elasticsearch/client.ts` (529 行)

**类结构**: `ElasticsearchClient`

#### 核心功能

##### 连接管理
```typescript
class ElasticsearchClient {
  private client: Client | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  
  // 自动连接
  public getClient(): Client;
  
  // 健康检查
  public async ping(): Promise<boolean>;
  public async health(): Promise<HealthStatus | null>;
  
  // 重连机制
  public async reconnect(): Promise<void>;
}
```

##### 索引操作
```typescript
// 索引管理
public async indexExists(index: string): Promise<boolean>;
public async createIndex(index: string, settings?: any, mappings?: any): Promise<boolean>;
public async deleteIndex(index: string): Promise<boolean>;
public async refreshIndex(index: string): Promise<boolean>;
public async getIndexStats(index: string): Promise<any>;
```

##### 文档操作
```typescript
// CRUD 操作
public async indexDocument(index: string, id: string, document: any): Promise<any>;
public async updateDocument(index: string, id: string, document: any): Promise<any>;
public async deleteDocument(index: string, id: string): Promise<any>;
public async getDocument(index: string, id: string): Promise<any>;

// 批量操作
public async bulk(operations: any[]): Promise<any>;

// 搜索
public async search(index: string, query: any): Promise<any>;
public async count(index: string, query?: any): Promise<number>;
```

#### 配置选项

```typescript
interface ElasticsearchConfig {
  node: string;                    // Elasticsearch 节点地址
  auth?: {
    username?: string;
    password?: string;
    apiKey?: string;
  };
  maxRetries?: number;             // 最大重试次数（默认 3）
  requestTimeout?: number;         // 请求超时（默认 30000ms）
  compression?: boolean;           // 启用 GZIP 压缩（默认 true）
}
```

#### 单例模式

```typescript
// 获取客户端单例
const client = getElasticsearchClient({
  node: 'http://localhost:9200',
});

// 使用客户端
await client.ping();
await client.search('zmage_media', query);
```

---

### 3. 索引定义

**文件**: `lib/elasticsearch/indices.ts` (600 行)

#### 索引常量

```typescript
export const INDICES = {
  MEDIA: 'zmage_media',
  MEDIA_ALIAS: 'zmage_media_alias',
} as const;
```

#### 分析器配置

```typescript
export const ANALYZERS = {
  standard: { type: 'standard' },           // 标准分析器
  ik_smart: { type: 'ik_smart' },           // 中文智能分词
  ik_max_word: { type: 'ik_max_word' },     // 中文最大化分词
  english: { type: 'english' },             // 英文分析器
  
  // 边缘 N-gram（搜索建议）
  edge_ngram_analyzer: {
    type: 'custom',
    tokenizer: 'edge_ngram_tokenizer',
    filter: ['lowercase', 'asciifolding'],
  },
  
  // 路径分析器
  path_analyzer: {
    type: 'custom',
    tokenizer: 'path_hierarchy',
    filter: ['lowercase'],
  },
};
```

#### 索引映射（完整字段）

**基本信息字段**:
```typescript
{
  id: { type: 'keyword' },
  userId: { type: 'keyword' },
  filename: {
    type: 'text',
    fields: {
      keyword: { type: 'keyword' },
      suggest: { type: 'text', analyzer: 'edge_ngram_analyzer' },
    },
  },
  originalName: { type: 'text' },
  path: { type: 'text', analyzer: 'path_analyzer' },
}
```

**元数据字段**:
```typescript
{
  title: {
    type: 'text',
    analyzer: 'standard',
    fields: {
      keyword: { type: 'keyword' },
      suggest: { type: 'text', analyzer: 'edge_ngram_analyzer' },
    },
  },
  description: { type: 'text' },
  tags: { type: 'keyword' },
  albums: { type: 'keyword' },
}
```

**AI 分析结果字段**:
```typescript
{
  aiAnalysis: {
    properties: {
      objects: { type: 'keyword' },       // 识别的对象
      scenes: { type: 'keyword' },        // 场景标签
      text: { type: 'text' },             // OCR 文本
      colors: { type: 'keyword' },        // 主要颜色
      celebrities: { type: 'keyword' },   // 名人识别
      sentiment: { type: 'keyword' },     // 情感分析
      faceCount: { type: 'integer' },     // 人脸数量
      confidence: { type: 'float' },      // 置信度
      categories: { type: 'keyword' },    // 分类
    },
  },
}
```

**位置信息字段**:
```typescript
{
  location: {
    properties: {
      coordinates: { type: 'geo_point' },  // 地理坐标
      name: { type: 'text' },
      country: { type: 'keyword' },
      city: { type: 'keyword' },
      address: { type: 'text' },
    },
  },
}
```

**EXIF 数据字段**:
```typescript
{
  exif: {
    properties: {
      camera: { type: 'keyword' },        // 相机型号
      lens: { type: 'keyword' },          // 镜头型号
      iso: { type: 'integer' },           // ISO
      aperture: { type: 'keyword' },      // 光圈
      shutterSpeed: { type: 'keyword' },  // 快门速度
      focalLength: { type: 'keyword' },   // 焦距
      dateTime: { type: 'date' },         // 拍摄时间
      make: { type: 'keyword' },          // 制造商
      model: { type: 'keyword' },         // 型号
      software: { type: 'keyword' },      // 软件
    },
  },
}
```

**文件属性字段**:
```typescript
{
  fileInfo: {
    properties: {
      size: { type: 'long' },              // 文件大小
      format: { type: 'keyword' },         // 格式
      mimeType: { type: 'keyword' },       // MIME 类型
      mediaType: { type: 'keyword' },      // 媒体类型
      width: { type: 'integer' },          // 宽度
      height: { type: 'integer' },         // 高度
      duration: { type: 'float' },         // 时长
      aspectRatio: { type: 'keyword' },    // 纵横比
      orientation: { type: 'keyword' },    // 方向
    },
  },
}
```

**统计字段**:
```typescript
{
  stats: {
    properties: {
      rating: { type: 'float' },
      viewCount: { type: 'integer' },
      downloadCount: { type: 'integer' },
      shareCount: { type: 'integer' },
      favoriteCount: { type: 'integer' },
    },
  },
}
```

**时间字段**:
```typescript
{
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' },
  capturedAt: { type: 'date' },
  uploadedAt: { type: 'date' },
}
```

**其他字段**:
- 状态信息: `status`, `visibility`, `isPublic`, `isFavorite`, `isArchived`
- 哈希值: `hash`, `pHash`
- 缩略图: `thumbnails.small`, `thumbnails.medium`, `thumbnails.large`
- 存储信息: `storage.provider`, `storage.bucket`, `storage.key`, `storage.url`
- 关联信息: `related.similarIds`, `related.duplicateIds`, `related.seriesId`
- 权限信息: `permissions.accessUsers`, `permissions.editUsers`
- 搜索优化: `searchText`

#### 辅助函数

```typescript
// 生成搜索文本（组合多个字段）
export function generateSearchText(media: any): string;

// 验证索引映射
export function validateMapping(mapping: any): boolean;
```

---

### 4. 索引管理器

**文件**: `lib/elasticsearch/index-manager.ts` (555 行)

**类结构**: `IndexManager`

#### 核心功能

##### 索引初始化
```typescript
class IndexManager {
  // 初始化所有索引
  async initializeIndices(): Promise<void>;
  
  // 创建媒体索引
  async createMediaIndex(): Promise<boolean>;
  
  // 删除索引
  async deleteIndex(indexName: string): Promise<boolean>;
}
```

##### 索引信息
```typescript
// 获取索引详情
async getIndexInfo(indexName: string): Promise<IndexInfo | null>;

// 获取所有索引
async getAllIndices(): Promise<IndexInfo[]>;

// 刷新索引
async refreshIndex(indexName: string): Promise<boolean>;
```

##### 别名管理
```typescript
// 创建别名
async createAlias(indexName: string, aliasName: string): Promise<boolean>;

// 更新别名（原子性切换）
async updateAlias(
  oldIndexName: string, 
  newIndexName: string, 
  aliasName: string
): Promise<boolean>;
```

##### 重建索引
```typescript
// 重建索引
async reindexMedia(
  sourceIndex: string,
  targetIndex?: string,
  onProgress?: (progress: ReindexProgress) => void
): Promise<MigrationResult>;

// 零停机迁移
async migrateWithZeroDowntime(sourceIndex: string): Promise<MigrationResult>;
```

##### 索引维护
```typescript
// 更新设置
async updateIndexSettings(indexName: string, settings: any): Promise<boolean>;

// 更新映射
async updateIndexMapping(indexName: string, mappings: any): Promise<boolean>;

// 优化索引（强制合并）
async optimizeIndex(indexName: string): Promise<boolean>;

// 清空索引
async clearIndex(indexName: string): Promise<boolean>;
```

##### 健康检查
```typescript
// 检查索引健康状态
async checkIndexHealth(indexName: string): Promise<{
  healthy: boolean;
  status: string;
  message: string;
}>;

// 验证索引结构
async validateIndexStructure(indexName: string): Promise<{
  valid: boolean;
  errors: string[];
}>;
```

#### 使用示例

```typescript
import { getIndexManager } from '@/lib/elasticsearch/index-manager';

const indexManager = getIndexManager();

// 初始化索引
await indexManager.initializeIndices();

// 获取索引信息
const info = await indexManager.getIndexInfo('zmage_media');
console.log(`Documents: ${info.docsCount}, Size: ${info.storeSize}`);

// 重建索引（零停机）
const result = await indexManager.migrateWithZeroDowntime('zmage_media');
console.log(`Migrated ${result.docsCount} documents in ${result.duration}ms`);
```

---

### 5. 初始化脚本

**文件**: `scripts/init-elasticsearch.ts` (295 行)

#### 功能步骤

**Step 1: 检查连接**
```typescript
async function checkConnection() {
  // 1. Ping Elasticsearch
  const isAlive = await client.ping();
  
  // 2. 获取集群信息
  const info = await client.info();
  console.log(`Elasticsearch ${info.version.number}`);
  
  // 3. 检查健康状态
  const health = await client.health();
  console.log(`Cluster status: ${health.status}`);
}
```

**Step 2: 创建索引**
```typescript
async function createIndices() {
  const indexManager = getIndexManager();
  
  // 创建媒体索引
  await indexManager.createMediaIndex();
  
  // 验证别名
  const aliasExists = await esClient.indices.existsAlias({
    name: INDICES.MEDIA_ALIAS,
  });
}
```

**Step 3: 验证索引**
```typescript
async function validateIndices() {
  const indexManager = getIndexManager();
  
  // 验证结构
  const validation = await indexManager.validateIndexStructure(INDICES.MEDIA);
  
  // 检查健康状态
  const health = await indexManager.checkIndexHealth(INDICES.MEDIA);
  
  // 获取索引信息
  const info = await indexManager.getIndexInfo(INDICES.MEDIA);
}
```

**Step 4: 显示摘要**
```typescript
async function displaySummary() {
  const allIndices = await indexManager.getAllIndices();
  
  // 表格格式输出
  console.log('┌─────────────────────────────┬────────┬───────────┐');
  console.log('│ Index Name                  │ Health │ Docs      │');
  console.log('├─────────────────────────────┼────────┼───────────┤');
  // ...
  console.log('└─────────────────────────────┴────────┴───────────┘');
}
```

#### 使用方法

```bash
# 运行初始化脚本
npx tsx scripts/init-elasticsearch.ts

# 输出示例：
# 🚀 Zmage Elasticsearch Initialization
#
# ============================================================
#  1. Checking Elasticsearch Connection
# ============================================================
# ✓ Elasticsearch is reachable
# ✓ Connected to Elasticsearch 8.11.3
# ✓ Cluster status: green
#
# ============================================================
#  2. Creating Indices
# ============================================================
# ✓ Index zmage_media created or already exists
# ✓ Alias zmage_media_alias exists
#
# ============================================================
#  3. Validating Indices
# ============================================================
# ✓ Index structure is valid
# ✓ Index health: green
# ✓ Index information retrieved
#   - Documents: 0
#   - Store size: 208 B
#
# ============================================================
#  4. Summary
# ============================================================
# ✓ Found 1 Zmage index(es)
#
# ┌─────────────────────────────┬────────┬───────────┐
# │ Index Name                  │ Health │ Docs      │
# ├─────────────────────────────┼────────┼───────────┤
# │ zmage_media                 │ green  │         0 │
# └─────────────────────────────┴────────┴───────────┘
```

---

## 🚀 快速开始

### 1. 启动 Elasticsearch

```bash
# 启动所有服务（包括 Elasticsearch 和 Kibana）
docker-compose up -d elasticsearch kibana

# 查看日志
docker-compose logs -f elasticsearch

# 等待健康检查通过（约 60 秒）
docker-compose ps
```

### 2. 验证连接

```bash
# 测试 Elasticsearch
curl http://localhost:9200

# 应该返回类似：
# {
#   "name" : "zmage-es-node",
#   "cluster_name" : "zmage-cluster",
#   "version" : {
#     "number" : "8.11.3",
#     ...
#   }
# }

# 测试健康状态
curl http://localhost:9200/_cluster/health
```

### 3. 访问 Kibana

打开浏览器访问: http://localhost:5601

- Dev Tools: http://localhost:5601/app/dev_tools#/console
- Index Management: http://localhost:5601/app/management/data/index_management/indices

### 4. 安装依赖

```bash
cd frontend

# 安装 Elasticsearch 客户端
npm install @elastic/elasticsearch
```

### 5. 配置环境变量

创建或更新 `.env.local`:

```env
# Elasticsearch
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=
ELASTICSEARCH_API_KEY=
```

### 6. 初始化索引

```bash
# 运行初始化脚本
npx tsx scripts/init-elasticsearch.ts

# 如果成功，会看到绿色的成功消息
```

---

## 🔧 配置说明

### Elasticsearch 内存设置

默认配置为 512MB，如需调整：

```yaml
# docker-compose.yml
environment:
  - "ES_JAVA_OPTS=-Xms1g -Xmx1g"  # 调整为 1GB
```

**推荐配置**:
- 开发环境: 512MB - 1GB
- 测试环境: 1GB - 2GB
- 生产环境: 4GB - 8GB

### 索引设置

```typescript
// lib/elasticsearch/indices.ts
export const MEDIA_INDEX_SETTINGS = {
  number_of_shards: 1,        // 分片数（单节点建议 1）
  number_of_replicas: 0,      // 副本数（单节点建议 0）
  max_result_window: 10000,   // 最大搜索结果窗口
  // ...
};
```

### 安全配置（生产环境）

```yaml
# docker-compose.yml (生产环境)
environment:
  - xpack.security.enabled=true
  - xpack.security.http.ssl.enabled=true
  - ELASTIC_PASSWORD=your_strong_password
```

---

## 📊 索引设计理念

### 1. 字段类型选择

| 数据类型 | Elasticsearch 类型 | 说明 |
|---------|-------------------|------|
| ID/UUID | `keyword` | 精确匹配，不分词 |
| 标题/描述 | `text` + `keyword` | 全文搜索 + 精确匹配 |
| 标签 | `keyword` | 聚合和过滤 |
| 数字 | `integer`/`long`/`float` | 范围查询 |
| 日期 | `date` | 时间范围查询 |
| 坐标 | `geo_point` | 地理位置搜索 |

### 2. Multi-fields 策略

```typescript
{
  filename: {
    type: 'text',              // 全文搜索
    fields: {
      keyword: {               // 精确匹配、排序
        type: 'keyword'
      },
      suggest: {               // 搜索建议
        type: 'text',
        analyzer: 'edge_ngram_analyzer'
      }
    }
  }
}
```

### 3. 嵌套对象 vs 扁平化

**嵌套对象** (用于相关字段组):
```typescript
{
  aiAnalysis: {
    properties: {
      objects: { ... },
      scenes: { ... },
      text: { ... }
    }
  }
}
```

**扁平化** (用于独立字段):
```typescript
{
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' },
  capturedAt: { type: 'date' }
}
```

### 4. 搜索优化

**searchText 字段**:
```typescript
// 组合多个字段用于全文搜索
searchText: {
  type: 'text',
  analyzer: 'standard'
}

// 生成时包含：
// - title + description + filename
// - tags + albums
// - AI 分析结果（objects, scenes, text）
// - 位置信息（city, country）
```

---

## 🧪 测试命令

### 使用 curl 测试

```bash
# 1. 检查集群健康
curl http://localhost:9200/_cluster/health?pretty

# 2. 列出所有索引
curl http://localhost:9200/_cat/indices?v

# 3. 查看索引映射
curl http://localhost:9200/zmage_media/_mapping?pretty

# 4. 查看索引设置
curl http://localhost:9200/zmage_media/_settings?pretty

# 5. 统计文档数量
curl http://localhost:9200/zmage_media/_count?pretty

# 6. 搜索所有文档
curl -X GET "http://localhost:9200/zmage_media/_search?pretty" \
  -H 'Content-Type: application/json' \
  -d '{"query": {"match_all": {}}}'
```

### 使用 Kibana Dev Tools

访问 http://localhost:5601/app/dev_tools#/console

```javascript
// 1. 查看索引
GET zmage_media

// 2. 搜索文档
GET zmage_media/_search
{
  "query": {
    "match_all": {}
  }
}

// 3. 按标题搜索
GET zmage_media/_search
{
  "query": {
    "match": {
      "title": "sunset"
    }
  }
}

// 4. 复杂查询（布尔查询）
GET zmage_media/_search
{
  "query": {
    "bool": {
      "must": [
        { "match": { "aiAnalysis.objects": "person" } }
      ],
      "filter": [
        { "range": { "createdAt": { "gte": "2024-01-01" } } },
        { "term": { "mediaType": "image" } }
      ]
    }
  }
}

// 5. 地理位置搜索
GET zmage_media/_search
{
  "query": {
    "bool": {
      "filter": {
        "geo_distance": {
          "distance": "10km",
          "location.coordinates": {
            "lat": 30.2741,
            "lon": 120.1551
          }
        }
      }
    }
  }
}

// 6. 聚合查询（按标签统计）
GET zmage_media/_search
{
  "size": 0,
  "aggs": {
    "popular_tags": {
      "terms": {
        "field": "tags",
        "size": 10
      }
    }
  }
}
```

---

## 🐛 故障排除

### 问题 1: Elasticsearch 启动失败

**症状**: `docker-compose up` 后 Elasticsearch 容器一直重启

**原因**: 内存不足或 `vm.max_map_count` 设置过低

**解决**:

```bash
# Linux/macOS
sudo sysctl -w vm.max_map_count=262144

# 永久生效
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf

# Docker Desktop (macOS/Windows)
# 在 Docker Desktop 设置中增加内存到至少 4GB
```

### 问题 2: 连接被拒绝

**症状**: `curl http://localhost:9200` 返回 "Connection refused"

**原因**: Elasticsearch 还未完全启动

**解决**:

```bash
# 查看日志
docker-compose logs -f elasticsearch

# 等待看到类似消息：
# "started"
# "Node [zmage-es-node] started"

# 检查健康状态
docker-compose ps elasticsearch
```

### 问题 3: 索引创建失败

**症状**: `init-elasticsearch.ts` 报错 "Index creation failed"

**原因**: 索引映射配置错误或权限问题

**解决**:

```bash
# 1. 检查 Elasticsearch 日志
docker-compose logs elasticsearch | tail -50

# 2. 手动删除索引重试
curl -X DELETE http://localhost:9200/zmage_media

# 3. 重新初始化
npx tsx scripts/init-elasticsearch.ts
```

### 问题 4: 内存溢出

**症状**: 容器 OOM（Out of Memory）

**原因**: Java heap size 设置过大

**解决**:

```yaml
# docker-compose.yml
environment:
  # 减小内存分配
  - "ES_JAVA_OPTS=-Xms256m -Xmx256m"
```

### 问题 5: 数据丢失

**症状**: 重启后索引和数据消失

**原因**: Docker volume 未正确配置

**解决**:

```bash
# 检查 volume
docker volume ls | grep elasticsearch

# 如果不存在，确保 docker-compose.yml 中有：
volumes:
  elasticsearch-data:
    driver: local
```

---

## 📚 相关资源

### 官方文档
- [Elasticsearch 8.x 文档](https://www.elastic.co/guide/en/elasticsearch/reference/8.11/index.html)
- [Elasticsearch Node.js 客户端](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/index.html)
- [Mapping 参数](https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-params.html)
- [Query DSL](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html)

### 相关文件
- `docker-compose.yml` - Docker 配置
- `lib/elasticsearch/client.ts` - 客户端封装
- `lib/elasticsearch/indices.ts` - 索引定义
- `lib/elasticsearch/index-manager.ts` - 索引管理
- `scripts/init-elasticsearch.ts` - 初始化脚本

### 下一步文档
- `PHASE5_DAY13_DATA_SYNC.md` - 数据同步与索引（即将创建）
- `PHASE5_DAY14-15_SEARCH_API.md` - 搜索功能实现（即将创建）

---

## 📊 统计数据

### 代码行数

| 文件 | 行数 | 类型 |
|------|------|------|
| docker-compose.yml | 68 (新增) | 配置 |
| client.ts | 529 | 核心类 |
| indices.ts | 600 | 索引定义 |
| index-manager.ts | 555 | 管理器 |
| init-elasticsearch.ts | 295 | 脚本 |
| **总计** | **1,979** | - |

### 功能覆盖

- ✅ Docker 部署: 100%
- ✅ 客户端封装: 100%
- ✅ 索引定义: 100%
- ✅ 索引管理: 100%
- ✅ 初始化脚本: 100%
- ⏳ 数据同步: 0% (Day 13)
- ⏳ 搜索 API: 0% (Day 14-15)

---

## 🎯 下一步计划

### Day 13: 数据同步与索引

**目标**: 实现媒体数据自动同步到 Elasticsearch

**任务**:
1. 创建索引服务类 (`IndexingService`)
2. 实现 CRUD 钩子集成
3. 编写全量数据迁移脚本
4. 测试数据一致性

**预期产出**:
- `lib/elasticsearch/indexing-service.ts`
- `lib/hooks/elasticsearch-hooks.ts`
- `scripts/sync-media-to-elasticsearch.ts`

### Day 14-15: 搜索功能实现

**目标**: 实现完整的搜索 API 和前端集成

**任务**:
1. 创建搜索服务类 (`SearchService`)
2. 实现搜索 API 端点
3. 开发前端搜索组件
4. 添加搜索建议功能
5. 实现高级过滤和聚合

**预期产出**:
- `lib/elasticsearch/search-service.ts`
- `app/api/search/route.ts`
- `components/search/SearchBar.tsx`
- `components/search/SearchFilters.tsx`
- `components/search/SearchResults.tsx`

---

## ✅ 验收标准

- [x] Elasticsearch 通过 Docker 成功部署
- [x] Kibana 可以访问并连接到 Elasticsearch
- [x] 客户端可以 ping 通 Elasticsearch
- [x] 媒体索引创建成功
- [x] 索引映射包含所有必需字段
- [x] 索引别名正确配置
- [x] 初始化脚本运行无错误
- [x] 健康检查通过（green 状态）
- [x] 所有代码有完整注释和类型定义

---

## 🎉 总结

Day 11-12 成功完成了 Elasticsearch 的部署和配置：

✅ **完整的 Docker 部署** - Elasticsearch + Kibana  
✅ **强大的客户端封装** - 单例模式、连接管理、自动重连  
✅ **详细的索引定义** - 40+ 字段、多种分析器、优化配置  
✅ **灵活的索引管理** - 创建、删除、重建、零停机迁移  
✅ **友好的初始化脚本** - 自动化设置、彩色输出、错误处理  

**下一步**: 开始 Day 13 - 数据同步与索引！🚀