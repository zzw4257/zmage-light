# Phase 5 - Day 14-15: Elasticsearch 搜索 API 与前端实现

> **实施日期**: 2024-01-XX  
> **状态**: ✅ 已完成  
> **目标**: 实现强大的全文搜索功能、自动完成建议、高级过滤和前端搜索界面

---

## 📋 目录

- [概述](#概述)
- [架构设计](#架构设计)
- [实现内容](#实现内容)
  - [1. SearchService 搜索服务](#1-searchservice-搜索服务)
  - [2. API 端点](#2-api-端点)
  - [3. 前端搜索页面](#3-前端搜索页面)
  - [4. 辅助工具](#4-辅助工具)
- [功能特性](#功能特性)
- [使用指南](#使用指南)
- [API 文档](#api-文档)
- [前端组件](#前端组件)
- [性能优化](#性能优化)
- [故障排查](#故障排查)

---

## 概述

Day 14-15 实现了基于 Elasticsearch 的完整搜索解决方案，提供强大的全文搜索、智能建议、高级过滤和用户友好的搜索界面。

### 核心功能

✅ **全文搜索**
- Multi-match 查询（多字段搜索）
- 模糊匹配（拼写容错）
- 相关性评分
- 搜索结果高亮

✅ **智能建议**
- 实时自动完成
- 防抖优化
- 标签建议
- 前缀匹配

✅ **高级过滤**
- 标签过滤
- 相机型号筛选
- 日期范围筛选
- 评分筛选
- 文件类型筛选
- 地理位置筛选

✅ **聚合分析**
- Faceted Search（分面搜索）
- 标签统计
- 相机统计
- 日期直方图
- 评分/大小统计

✅ **相似图片搜索**
- 基于 AI 标签
- 基于 EXIF 信息
- 基于拍摄时间
- More Like This 查询

✅ **搜索统计**
- 用户图库统计
- 热门标签
- 上传趋势
- 存储统计

---

## 架构设计

### 技术栈

```
┌─────────────────────────────────────────────────────────────┐
│                     前端 (Next.js)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ SearchAdvanced│  │ useDebounce  │  │ ImageCard    │       │
│  │ Page          │  │ Hook         │  │ Component    │       │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘       │
│         │                  │                                  │
│         ▼                  ▼                                  │
│  ┌──────────────────────────────────────────────────┐       │
│  │              API 客户端 (fetch)                   │       │
│  └──────────────────────┬───────────────────────────┘       │
└─────────────────────────┼───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    API 层 (Next.js API)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ /api/search  │  │ /api/search/ │  │ /api/search/ │       │
│  │              │  │ suggest      │  │ similar/[id] │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                  │                  │               │
│         ▼                  ▼                  ▼               │
│  ┌──────────────────────────────────────────────────┐       │
│  │            SearchService (服务层)                 │       │
│  └──────────────────────┬───────────────────────────┘       │
└─────────────────────────┼───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Elasticsearch 集群                           │
│  ┌──────────────────────────────────────────────────┐       │
│  │         zmage_media 索引 (媒体文件索引)           │       │
│  │  - 40+ 字段                                       │       │
│  │  - 6 种分析器                                     │       │
│  │  - 地理位置支持                                   │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### 数据流

```
用户输入查询
    │
    ▼
useDebounce (300ms)
    │
    ▼
获取建议 (Auto-complete)
    │
    ├─→ 显示建议列表
    │
用户点击搜索 / 选择建议
    │
    ▼
构建查询参数
    │
    ├─→ query (搜索关键词)
    ├─→ filters (过滤条件)
    ├─→ sort (排序)
    ├─→ pagination (分页)
    │
    ▼
/api/search 端点
    │
    ▼
SearchService.search()
    │
    ├─→ buildQuery() (构建 ES 查询)
    ├─→ buildSort() (构建排序)
    ├─→ buildHighlight() (配置高亮)
    ├─→ buildAggregations() (构建聚合)
    │
    ▼
Elasticsearch 执行查询
    │
    ▼
解析响应
    │
    ├─→ hits (搜索结果)
    ├─→ aggregations (聚合数据)
    ├─→ total (总数)
    ├─→ took (耗时)
    │
    ▼
返回前端展示
    │
    ├─→ 结果列表 (带高亮)
    ├─→ Facets (侧边栏过滤器)
    ├─→ 统计信息
    └─→ 分页控件
```

---

## 实现内容

### 1. SearchService 搜索服务

**文件**: `lib/elasticsearch/search-service.ts` (763 行)

完整的搜索服务封装，提供所有搜索相关功能。

#### 核心方法

##### `search(options: SearchOptions): Promise<SearchResults>`

主搜索方法，支持全文搜索、过滤、排序、分页。

```typescript
const results = await searchService.search({
  query: "风景",
  filters: {
    userId: session.user.id,
    tags: ["sunset", "ocean"],
    rating: { min: 4 },
    dateRange: {
      from: new Date("2024-01-01"),
      to: new Date("2024-12-31"),
    },
  },
  sort: { field: "createdAt", order: "desc" },
  pagination: { page: 1, pageSize: 20 },
  highlight: true,
  aggregations: true,
})
```

**SearchOptions 接口**:
```typescript
interface SearchOptions {
  query: string                // 搜索关键词
  filters?: SearchFilters      // 过滤条件
  sort?: SearchSort            // 排序
  pagination?: SearchPagination // 分页
  highlight?: boolean          // 是否高亮
  aggregations?: boolean       // 是否返回聚合
}
```

**返回结果**:
```typescript
interface SearchResults {
  hits: Array<{
    id: string
    source: MediaDocument
    score: number
    highlight?: Record<string, string[]>
  }>
  total: {
    value: number
    relation: "eq" | "gte"
  }
  aggregations?: SearchAggregations
  took: number
}
```

##### `getSuggestions(options: SuggestionOptions): Promise<string[]>`

自动完成建议。

```typescript
const suggestions = await searchService.getSuggestions({
  field: "searchText",
  prefix: "风",
  size: 10,
})
// 返回: ["风景", "风光摄影", "风车", ...]
```

##### `getTagSuggestions(prefix: string, size: number): Promise<string[]>`

标签建议。

```typescript
const tags = await searchService.getTagSuggestions("sun", 10)
// 返回: ["sunset", "sunrise", "sunflower", ...]
```

##### `findSimilar(imageId: string, size: number): Promise<SearchImage[]>`

相似图片搜索。

```typescript
const similar = await searchService.findSimilar("clxxx123", 10)
// 返回: 与指定图片相似的其他图片
```

**相似度计算因素**:
- AI 标签匹配（boost: 2.0）
- AI 描述相似（boost: 1.5）
- 相同相机（boost: 1.2）
- 拍摄时间接近（±7天，boost: 1.0）

##### `getStatistics(userId: string): Promise<Statistics>`

用户图库统计。

```typescript
const stats = await searchService.getStatistics(userId)
// 返回: {
//   totalImages: 1000,
//   totalSize: 5368709120, // bytes
//   avgRating: 3.8,
//   topTags: [{ tag: "landscape", count: 250 }, ...],
//   topCameras: [{ camera: "Canon EOS 5D", count: 150 }, ...],
//   uploadTrend: [{ date: "2024-01", count: 50 }, ...]
// }
```

#### 查询构建

##### `buildQuery(filters: SearchFilters): object`

构建 Elasticsearch 查询 DSL。

**支持的查询类型**:

1. **Multi-match 全文搜索**
   ```json
   {
     "multi_match": {
       "query": "风景",
       "fields": [
         "searchText^3",
         "originalName^2",
         "aiDescription^1.5",
         "memo",
         "aiTags.name^2",
         "camera",
         "lens"
       ],
       "type": "best_fields",
       "fuzziness": "AUTO",
       "operator": "or"
     }
   }
   ```

2. **标签过滤（Terms Query）**
   ```json
   {
     "terms": {
       "aiTags.name.keyword": ["sunset", "ocean"]
     }
   }
   ```

3. **日期范围（Range Query）**
   ```json
   {
     "range": {
       "createdAt": {
         "gte": "2024-01-01T00:00:00Z",
         "lte": "2024-12-31T23:59:59Z"
       }
     }
   }
   ```

4. **地理位置（Geo Distance）**
   ```json
   {
     "geo_distance": {
       "distance": "10km",
       "geoPoint": {
         "lat": 30.2741,
         "lon": 120.1551
       }
     }
   }
   ```

##### `buildSort(sort: SearchSort): object`

构建排序。

**支持的排序字段**:
- `relevance`: 相关性评分（默认）
- `createdAt`: 拍摄时间
- `updatedAt`: 更新时间
- `rating`: 评分
- `views`: 浏览量
- `size`: 文件大小

##### `buildHighlight(): object`

配置搜索结果高亮。

**高亮配置**:
```json
{
  "fields": {
    "searchText": {
      "fragment_size": 150,
      "number_of_fragments": 3,
      "pre_tags": ["<mark>"],
      "post_tags": ["</mark>"]
    },
    "originalName": { ... },
    "aiDescription": { ... },
    "memo": { ... }
  }
}
```

##### `buildAggregations(): object`

构建聚合查询（Faceted Search）。

**聚合类型**:

1. **标签聚合**
   ```json
   {
     "tags": {
       "terms": {
         "field": "aiTags.name.keyword",
         "size": 50,
         "order": { "_count": "desc" }
       }
     }
   }
   ```

2. **相机聚合**
   ```json
   {
     "cameras": {
       "terms": {
         "field": "camera.keyword",
         "size": 20
       }
     }
   }
   ```

3. **日期直方图**
   ```json
   {
     "dateHistogram": {
       "date_histogram": {
         "field": "createdAt",
         "calendar_interval": "month",
         "format": "yyyy-MM"
       }
     }
   }
   ```

4. **统计聚合**
   ```json
   {
     "ratingStats": {
       "stats": { "field": "rating" }
     },
     "sizeStats": {
       "stats": { "field": "size" }
     }
   }
   ```

---

### 2. API 端点

#### `/api/search` - 主搜索 API

**方法**: `GET`

**Query Parameters**:

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `q` | string | 搜索关键词 | - |
| `page` | number | 页码 | 1 |
| `pageSize` | number | 每页大小 | 20 |
| `sort` | string | 排序字段 | relevance |
| `order` | string | 排序方向 (asc/desc) | desc |
| `tags` | string | 标签（逗号分隔） | - |
| `camera` | string | 相机型号 | - |
| `fromDate` | string | 开始日期 (ISO 8601) | - |
| `toDate` | string | 结束日期 (ISO 8601) | - |
| `minRating` | number | 最小评分 | - |
| `maxRating` | number | 最大评分 | - |
| `mimeType` | string | MIME 类型 | - |
| `isPublic` | boolean | 是否公开 | - |
| `highlight` | boolean | 是否高亮 | true |
| `aggregations` | boolean | 是否返回聚合 | false |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "hits": [
      {
        "id": "clxxx123",
        "source": {
          "originalName": "sunset.jpg",
          "aiDescription": "Beautiful sunset over the ocean",
          "tags": [{ "name": "sunset" }, { "name": "ocean" }],
          ...
        },
        "score": 8.234567,
        "highlight": {
          "searchText": ["Beautiful <mark>sunset</mark> over the ocean"]
        }
      }
    ],
    "total": { "value": 42, "relation": "eq" },
    "took": 15,
    "aggregations": {
      "tags": [
        { "key": "sunset", "count": 25 },
        { "key": "ocean", "count": 18 }
      ],
      "cameras": [
        { "key": "Canon EOS 5D", "count": 15 }
      ]
    }
  }
}
```

---

#### `/api/search/suggest` - 自动完成建议

**方法**: `GET`

**Query Parameters**:

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `q` | string | 搜索前缀（至少 2 字符） | - |
| `field` | string | 字段 (searchText/tags) | searchText |
| `size` | number | 返回数量 | 10 |

**响应示例**:
```json
{
  "success": true,
  "suggestions": [
    "sunset over ocean",
    "sunset photography",
    "sunset landscape"
  ]
}
```

---

#### `/api/search/similar/[id]` - 相似图片搜索

**方法**: `GET`

**Path Parameters**:
- `id`: 图片 ID

**Query Parameters**:
- `size`: 返回数量（默认 10，最大 50）

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx456",
      "source": { ... },
      "score": 7.654321
    }
  ],
  "sourceId": "clxxx123"
}
```

---

#### `/api/search/stats` - 搜索统计

**方法**: `GET`

**Query Parameters**:
- `userId`: 用户 ID（可选，默认当前用户）

**响应示例**:
```json
{
  "success": true,
  "data": {
    "totalImages": 1000,
    "totalSize": 5368709120,
    "avgRating": 3.8,
    "topTags": [
      { "tag": "landscape", "count": 250 },
      { "tag": "portrait", "count": 180 }
    ],
    "topCameras": [
      { "camera": "Canon EOS 5D", "count": 150 }
    ],
    "uploadTrend": [
      { "date": "2024-01", "count": 50 },
      { "date": "2024-02", "count": 65 }
    ]
  }
}
```

---

### 3. 前端搜索页面

**文件**: `app/(main)/search-advanced/page.tsx` (705 行)

完整的高级搜索界面，包含所有搜索功能。

#### 功能特性

✅ **实时自动完成**
- 输入 2 个字符后触发
- 300ms 防抖优化
- 建议列表悬浮显示
- 点击建议自动搜索

✅ **Faceted Search（分面搜索）**
- 标签过滤（点击即添加）
- 相机筛选（下拉选择）
- 文件类型筛选
- 评分筛选（1-5 星）
- 日期范围筛选

✅ **智能排序**
- 相关性（默认）
- 拍摄时间
- 更新时间
- 评分
- 浏览量
- 文件大小
- 升序/降序切换

✅ **搜索结果展示**
- 网格布局（响应式）
- 高亮显示匹配文本
- 相关性评分显示
- 分页控件
- 骨架屏加载

✅ **统计信息**
- 搜索结果总数
- 查询耗时显示
- 平均评分
- 总文件大小
- 标签分布
- 相机分布

✅ **交互体验**
- 筛选条件标签显示
- 一键清除所有筛选
- 侧边栏显示/隐藏
- 移动端响应式
- Lightbox 查看
- 详情面板

#### 关键代码

**自动完成实现**:
```typescript
const [searchQuery, setSearchQuery] = useState("")
const [debouncedQuery] = useDebounce(searchQuery, 300)
const [suggestions, setSuggestions] = useState<string[]>([])

useEffect(() => {
  if (debouncedQuery.length >= 2) {
    fetchSuggestions(debouncedQuery)
  } else {
    setSuggestions([])
  }
}, [debouncedQuery])

const fetchSuggestions = async (query: string) => {
  const response = await fetch(
    `/api/search/suggest?q=${encodeURIComponent(query)}&field=searchText&size=8`
  )
  const data = await response.json()
  if (data.success) {
    setSuggestions(data.suggestions || [])
  }
}
```

**搜索执行**:
```typescript
const handleSearch = useCallback(async (resetPage = true) => {
  const params = new URLSearchParams()
  
  if (searchQuery.trim()) {
    params.append("q", searchQuery.trim())
  }
  
  params.append("page", resetPage ? "1" : page.toString())
  params.append("pageSize", pageSize.toString())
  params.append("sort", sortField)
  params.append("order", sortOrder)
  params.append("highlight", "true")
  params.append("aggregations", "true")
  
  // Apply filters
  if (selectedTags.length > 0) {
    params.append("tags", selectedTags.join(","))
  }
  // ... 其他过滤器
  
  const response = await fetch(`/api/search?${params.toString()}`)
  const data = await response.json()
  
  setImages(data.data.hits || [])
  setTotal(data.data.total?.value || 0)
  setAggregations(data.data.aggregations || {})
}, [/* dependencies */])
```

**Faceted Search UI**:
```tsx
{/* Tags Facet */}
{aggregations.tags && aggregations.tags.length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle className="text-sm flex items-center gap-2">
        <Tag className="w-4 h-4" />
        标签
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      {aggregations.tags.slice(0, 10).map((tag) => (
        <div
          key={tag.key}
          className="flex items-center justify-between cursor-pointer"
          onClick={() => handleTagClick(tag.key)}
        >
          <span className="text-sm">{tag.key}</span>
          <Badge variant="secondary">{tag.count}</Badge>
        </div>
      ))}
    </CardContent>
  </Card>
)}
```

---

### 4. 辅助工具

#### useDebounce Hook

**文件**: `hooks/use-debounce.ts` (40 行)

防抖 Hook，用于优化自动完成性能。

```typescript
export function useDebounce<T>(value: T, delay: number = 300): [T] {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return [debouncedValue]
}
```

**使用场景**:
- 搜索框自动完成
- 实时搜索
- 表单验证
- API 请求节流

---

## 功能特性

### 1. 全文搜索

**Multi-field Search（多字段搜索）**:
- 搜索范围：文件名、标签、备注、AI 描述、相机、镜头
- 字段权重：`searchText^3`, `originalName^2`, `aiDescription^1.5`
- 模糊匹配：自动纠正拼写错误（`fuzziness: "AUTO"`）
- 前缀长度：保留前 2 个字符精确匹配

**相关性排序**:
- TF-IDF 算法
- 字段权重加成
- 文档长度归一化
- 自定义 boost 值

### 2. 自动完成建议

**Prefix Match（前缀匹配）**:
- 最少 2 个字符触发
- 300ms 防抖延迟
- 最多返回 10 条建议
- 支持中英文

**建议来源**:
- `searchText` 字段（全文）
- `aiTags.name` 字段（标签）
- 聚合统计（按出现次数排序）

**性能优化**:
- 使用 Aggregations 而非全表扫描
- Include 参数限制匹配范围
- Size 参数限制返回数量

### 3. Faceted Search（分面搜索）

**动态 Facets**:
- 根据当前搜索结果动态生成
- 显示匹配文档数量
- 点击 Facet 自动添加过滤
- 支持多选

**Facet 类型**:
- **Terms Facet**: 标签、相机、文件类型
- **Range Facet**: 评分、文件大小
- **Date Histogram**: 按月/周/日分组
- **Stats Facet**: 平均值、总和、最大/最小值

### 4. 高级过滤

**过滤器类型**:

1. **标签过滤（AND/OR）**
   - 多选标签
   - 任意匹配或全部匹配
   - 实时结果更新

2. **日期范围**
   - 拍摄时间范围
   - 上传时间范围
   - 支持开放区间

3. **评分过滤**
   - 最小评分
   - 最大评分
   - 未评分选项

4. **地理位置**
   - 以指定位置为中心
   - 指定半径范围
   - Geo Distance 查询

5. **文件属性**
   - MIME 类型
   - 文件大小范围
   - 分辨率范围

### 5. 搜索结果高亮

**高亮配置**:
- Fragment Size: 150 字符
- Fragment Count: 最多 3 个片段
- Pre/Post Tags: `<mark>...</mark>`

**高亮字段**:
- `searchText`: 全文内容
- `originalName`: 文件名
- `aiDescription`: AI 描述
- `memo`: 用户备注

**前端渲染**:
```tsx
{image.highlight?.searchText?.[0] && (
  <div
    className="line-clamp-2"
    dangerouslySetInnerHTML={{
      __html: image.highlight.searchText[0]
    }}
  />
)}
```

### 6. 相似图片搜索

**More Like This 策略**:

1. **AI 标签相似度（Boost: 2.0）**
   ```typescript
   {
     terms: {
       "aiTags.name.keyword": sourceImage.aiTags,
       boost: 2.0
     }
   }
   ```

2. **AI 描述相似（Boost: 1.5）**
   ```typescript
   {
     match: {
       aiDescription: {
         query: sourceImage.aiDescription,
         fuzziness: "AUTO",
         boost: 1.5
       }
     }
   }
   ```

3. **相同相机（Boost: 1.2）**
   ```typescript
   {
     term: {
       "camera.keyword": {
         value: sourceImage.camera,
         boost: 1.2
       }
     }
   }
   ```

4. **拍摄时间接近（Boost: 1.0）**
   ```typescript
   {
     range: {
       captureTime: {
         gte: sourceTime - 7days,
         lte: sourceTime + 7days,
         boost: 1.0
       }
     }
   }
   ```

**minimum_should_match**: 至少匹配 1 个条件

---

## 使用指南

### 快速开始

#### 1. 访问高级搜索页面

```
http://localhost:3000/search-advanced
```

#### 2. 基础搜索

```typescript
// 输入关键词
搜索框: "风景"

// 点击搜索按钮或按 Enter
```

#### 3. 使用自动完成

```typescript
// 输入至少 2 个字符
搜索框: "日"

// 等待建议出现（300ms）
建议列表:
  - 日落
  - 日出
  - 日本风景

// 点击建议自动搜索
```

#### 4. 添加过滤器

```typescript
// 点击标签 Facet
标签: "sunset" (25)  ← 点击

// 选择相机
相机下拉: "Canon EOS 5D" (15)

// 设置日期范围
开始日期: 2024-01-01
结束日期: 2024-12-31

// 自动重新搜索
```

#### 5. 调整排序

```typescript
// 选择排序字段
排序: 拍摄时间

// 选择排序方向
顺序: 降序

// 自动重新搜索
```

---

### API 调用示例

#### 1. 简单搜索

```typescript
const response = await fetch('/api/search?q=风景&page=1&pageSize=20')
const data = await response.json()

console.log(`找到 ${data.data.total.value} 个结果`)
console.log(`耗时 ${data.data.took} ms`)
```

#### 2. 带过滤器的搜索

```typescript
const params = new URLSearchParams({
  q: '风景',
  tags: 'sunset,ocean',
  camera: 'Canon EOS 5D',
  minRating: '4',
  fromDate: '2024-01-01T00:00:00Z',
  toDate: '2024-12-31T23:59:59Z',
  sort: 'createdAt',
  order: 'desc',
  page: '1',
  pageSize: '20',
  highlight: 'true',
  aggregations: 'true',
})

const response = await fetch(`/api/search?${params.toString()}`)
const data = await response.json()
```

#### 3. 获取自动完成建议

```typescript
const response = await fetch(
  '/api/search/suggest?q=日&field=searchText&size=10'
)
const data = await response.json()

console.log(data.suggestions)
// ["日落", "日出", "日本风景", ...]
```

#### 4. 查找相似图片

```typescript
const response = await fetch('/api/search/similar/clxxx123?size=10')
const data = await response.json()

console.log(`找到 ${data.data.length} 张相似图片`)
```

#### 5. 获取统计信息

```typescript
const response = await fetch('/api/search/stats')
const data = await response.json()

console.log(`总图片数: ${data.data.totalImages}`)
console.log(`平均评分: ${data.data.avgRating}`)
console.log(`热门标签:`, data.data.topTags)
```

---

### 前端集成示例

#### 1. 在组件中使用搜索

```tsx
"use client"

import { useState } from 'react'

function MySearchComponent() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])

  const handleSearch = async () => {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
    const data = await response.json()
    setResults(data.data.hits)
  }

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
      />
      <button onClick={handleSearch}>搜索</button>
      
      {results.map((item) => (
        <div key={item.id}>
          <img src={`/uploads/${item.source.thumbnailPath}`} />
          <p>{item.source.originalName}</p>
        </div>
      ))}
    </div>
  )
}
```

#### 2. 使用 useDebounce 优化

```tsx
import { useState, useEffect } from 'react'
import { useDebounce } from '@/hooks/use-debounce'

function SearchWithAutoComplete() {
  const [query, setQuery] = useState('')
  const [debouncedQuery] = useDebounce(query, 300)
  const [suggestions, setSuggestions] = useState([])

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      fetch(`/api/search/suggest?q=${encodeURIComponent(debouncedQuery)}`)
        .then(res => res.json())
        .then(data => setSuggestions(data.suggestions || []))
    }
  }, [debouncedQuery])

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {suggestions.length > 0 && (
        <ul>
          {suggestions.map((s, i) => (
            <li key={i} onClick={() => setQuery(s)}>{s}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

---

## API 文档

### 请求格式

所有搜索 API 均使用 GET 请求，参数通过 Query String 传递。

### 认证

所有搜索 API 需要用户登录，通过 Session Cookie 认证。

### 响应格式

#### 成功响应

```json
{
  "success": true,
  "data": { ... }
}
```

#### 错误响应

```json
{
  "error": "错误类型",
  "message": "详细错误信息"
}
```

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

---

## 性能优化

### 1. 查询优化

✅ **使用 Filter Context 代替 Query Context**
```typescript
// Filter context (不计算评分，可缓存)
{
  bool: {
    must: [...],
    filter: [
      { term: { userId: "clxxx" } },
      { range: { rating: { gte: 4 } } }
    ]
  }
}
```

✅ **限制聚合大小**
```typescript
{
  aggs: {
    tags: {
      terms: {
        field: "aiTags.name.keyword",
        size: 50  // 限制为 50
      }
    }
  }
}
```

✅ **使用 track_total_hits 限制**
```typescript
{
  track_total_hits: true  // 或 10000
}
```

### 2. 前端优化

✅ **防抖（Debounce）**
- 自动完成：300ms
- 实时搜索：500ms

✅ **分页加载**
- 默认 20 条/页
- 最大 100 条/页

✅ **缓存建议**
- 使用 `useMemo` 缓存计算结果
- 使用 `useCallback` 缓存函数

✅ **骨架屏**
- 加载时显示占位符
- 改善用户体验

### 3. 索引优化

✅ **Refresh Interval**
```bash
# 降低刷新频率
PUT /zmage_media/_settings
{
  "index": {
    "refresh_interval": "30s"
  }
}
```

✅ **合并段（Merge）**
```bash
# 定期合并索引段
POST /zmage_media/_forcemerge?max_num_segments=1
```

---

## 故障排查

### 问题 1: 搜索结果为空

**症状**:
```json
{
  "data": {
    "hits": [],
    "total": { "value": 0 }
  }
}
```

**排查步骤**:

1. **检查索引是否有数据**
   ```bash
   curl http://localhost:9200/zmage_media/_count?pretty
   ```

2. **检查查询语法**
   ```bash
   # 使用 match_all 测试
   GET /zmage_media/_search
   {
     "query": { "match_all": {} }
   }
   ```

3. **检查过滤器**
   ```typescript
   // 移除所有过滤器重试
   const results = await searchService.search({
     query: "test",
     filters: {}, // 空过滤器
   })
   ```

---

### 问题 2: 自动完成无建议

**症状**: 输入关键词后无建议显示

**排查步骤**:

1. **检查输入长度**
   ```typescript
   // 至少 2 个字符
   if (query.length < 2) return []
   ```

2. **检查防抖延迟**
   ```typescript
   // 确保 debounce 正常工作
   console.log('Original:', query)
   console.log('Debounced:', debouncedQuery)
   ```

3. **检查 API 响应**
   ```typescript
   const response = await fetch('/api/search/suggest?q=test')
   console.log(await response.json())
   ```

---

### 问题 3: 高亮不显示

**症状**: 搜索结果中没有高亮标记

**排查步骤**:

1. **检查 highlight 参数**
   ```typescript
   // 确保传递了 highlight: true
   const params = new URLSearchParams({
     q: 'test',
     highlight: 'true'  // ← 必须
   })
   ```

2. **检查 HTML 渲染**
   ```tsx
   // 使用 dangerouslySetInnerHTML
   <div dangerouslySetInnerHTML={{
     __html: highlight.searchText[0]
   }} />
   ```

3. **检查 CSS**
   ```css
   mark {
     background-color: yellow;
     padding: 2px 4px;
   }
   ```

---

### 问题 4: 相似图片搜索失败

**症状**:
```json
{
  "error": "图片不存在"
}
```

**排查步骤**:

1. **检查图片是否已索引**
   ```bash
   curl http://localhost:9200/zmage_media/_doc/clxxx123?pretty
   ```

2. **检查 AI 标签是否存在**
   ```typescript
   // 源图片必须有 AI 标签或描述
   const image = await prisma.image.findUnique({
     where: { id: 'clxxx123' },
     include: { aiTags: true }
   })
   console.log(image.aiTags)
   ```

---

### 问题 5: 聚合数据不准确

**症状**: Facet 计数与实际不符

**排查步骤**:

1. **刷新索引**
   ```bash
   curl -X POST http://localhost:9200/zmage_media/_refresh
   ```

2. **检查过滤器影响**
   ```typescript
   // 聚合基于当前过滤后的结果
   // 移除过滤器查看完整聚合
   ```

3. **检查聚合大小限制**
   ```typescript
   {
     aggs: {
       tags: {
         terms: {
           size: 50  // 增加 size
         }
       }
     }
   }
   ```

---

## 下一步

Day 14-15 完成后，搜索功能已完全就绪。后续优化方向：

### 功能增强

- [ ] 搜索历史记录
- [ ] 保存的搜索条件
- [ ] 高级查询语法（AND, OR, NOT）
- [ ] 图片批量操作（基于搜索结果）
- [ ] 导出搜索结果
- [ ] 分享搜索结果

### 性能优化

- [ ] 搜索结果缓存
- [ ] 聚合结果缓存
- [ ] 使用 Redis 缓存热门查询
- [ ] 实现搜索分析和推荐

### AI 增强

- [ ] 自然语言查询（"上个月拍的风景照"）
- [ ] 图像相似度搜索（以图搜图）
- [ ] 智能标签建议
- [ ] 搜索结果个性化

---

## 参考资料

- [Elasticsearch Query DSL](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html)
- [Elasticsearch Aggregations](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations.html)
- [Elasticsearch Highlighting](https://www.elastic.co/guide/en/elasticsearch/reference/current/highlighting.html)
- [Elasticsearch Performance Tuning](https://www.elastic.co/guide/en/elasticsearch/reference/current/tune-for-search-speed.html)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

---

**实施完成时间**: 2024-01-XX  
**文档版本**: 1.0  
**维护者**: Zmage Team