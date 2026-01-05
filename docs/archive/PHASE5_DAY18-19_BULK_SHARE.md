# Phase 5 - Day 18-19: 批量分享功能

> **实施时间**: Day 18-19 (2024-01-XX)  
> **状态**: ✅ 已完成  
> **开发者**: AI Assistant

---

## 📋 目录

- [概览](#概览)
- [实施内容](#实施内容)
  - [Day 18: 后端服务与 API](#day-18-后端服务与-api)
  - [Day 19: 前端组件与测试](#day-19-前端组件与测试)
- [数据库设计](#数据库设计)
- [API 文档](#api-文档)
- [前端组件](#前端组件)
- [测试指南](#测试指南)
- [使用示例](#使用示例)
- [性能优化](#性能优化)
- [安全考虑](#安全考虑)
- [总结](#总结)

---

## 概览

### 🎯 目标

实现批量分享功能，支持：
- ✅ 批量文件分享（多图片/视频）
- ✅ 相册整体分享
- ✅ ZIP 打包下载
- ✅ 批量分享管理
- ✅ 详细统计分析

### 📊 完成情况

| 任务 | 状态 | 说明 |
|-----|------|-----|
| 数据库扩展 | ✅ | 新增 ShareItem 表 |
| 批量分享服务 | ✅ | BulkShareService 完整实现 |
| ZIP 下载 | ✅ | 支持 archiver 打包 |
| API Endpoints | ✅ | 7 个 REST API |
| 前端组件 | ✅ | 创建和查看组件 |
| 测试脚本 | ✅ | 9 个综合测试用例 |
| 文档 | ✅ | 完整 API 和使用文档 |

### 🏗️ 技术栈

- **后端**: Prisma ORM, bcryptjs, archiver
- **API**: Next.js App Router API Routes
- **前端**: React, TypeScript, Tailwind CSS, shadcn/ui
- **存储**: SQLite (dev) / PostgreSQL (prod)
- **文件处理**: archiver (ZIP), Node.js streams

---

## 实施内容

### Day 18: 后端服务与 API

#### 1. 数据库模型扩展

**新增 ShareItem 表**：

```prisma
model ShareItem {
  id          String @id @default(cuid())
  shareLinkId String
  shareLink   ShareLink @relation(fields: [shareLinkId], references: [id], onDelete: Cascade)

  // 媒体引用
  imageId String?
  image   Image?  @relation(fields: [imageId], references: [id], onDelete: Cascade)
  videoId String?
  video   Video?  @relation(fields: [videoId], references: [id], onDelete: Cascade)

  // 排序
  order Int @default(0)

  createdAt DateTime @default(now())

  @@index([shareLinkId])
  @@index([imageId])
  @@index([videoId])
  @@index([order])
  @@map("share_items")
}
```

**扩展 ShareLink 表**：

```prisma
model ShareLink {
  // ... 现有字段 ...
  
  // 分享类型
  shareType String @default("single") // "single", "batch", "album"
  
  // 批量分享配置
  enableZipDownload Boolean @default(false)
  zipPassword       String?
  
  // 新增描述字段
  description String?
  
  // 关联
  items ShareItem[]
}
```

**迁移文件**：

```sql
-- 添加批量分享支持
ALTER TABLE ShareLink ADD COLUMN shareType TEXT DEFAULT 'single';
ALTER TABLE ShareLink ADD COLUMN description TEXT;
ALTER TABLE ShareLink ADD COLUMN enableZipDownload BOOLEAN DEFAULT 0;
ALTER TABLE ShareLink ADD COLUMN zipPassword TEXT;
ALTER TABLE ShareLink ADD COLUMN albumId TEXT;

-- 创建 ShareItem 表
CREATE TABLE share_items (
    id TEXT PRIMARY KEY,
    shareLinkId TEXT NOT NULL,
    imageId TEXT,
    videoId TEXT,
    "order" INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shareLinkId) REFERENCES ShareLink(id) ON DELETE CASCADE,
    FOREIGN KEY (imageId) REFERENCES Image(id) ON DELETE CASCADE,
    FOREIGN KEY (videoId) REFERENCES Video(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX idx_share_items_shareLink ON share_items(shareLinkId);
CREATE INDEX idx_share_items_image ON share_items(imageId);
CREATE INDEX idx_share_items_video ON share_items(videoId);
CREATE INDEX idx_share_items_order ON share_items("order");
```

#### 2. 批量分享服务

**文件**: `lib/share/bulk-share-service.ts`

核心功能：

```typescript
export class BulkShareService {
  // 创建批量分享
  static async createBulkShare(options: BulkShareOptions): Promise<BulkShareInfo>
  
  // 获取批量分享信息
  static async getBulkShareInfo(shareId: string): Promise<BulkShareInfo | null>
  
  // 生成 ZIP 文件流
  static async createZipStream(shareId: string, zipPassword?: string): Promise<{
    stream: Readable;
    filename: string;
    totalSize: number;
  }>
  
  // 获取批量分享统计
  static async getBulkShareStats(shareId: string, userId: string): Promise<BulkShareStats>
  
  // 更新批量分享
  static async updateBulkShare(shareId: string, userId: string, updates: object): Promise<BulkShareInfo>
  
  // 删除批量分享
  static async deleteBulkShare(shareId: string, userId: string): Promise<void>
  
  // 获取用户的批量分享列表
  static async getUserBulkShares(userId: string): Promise<BulkShareInfo[]>
}
```

**特性**：
- ✅ 支持批量文件和相册两种分享类型
- ✅ 自动验证用户权限
- ✅ 密码加密（bcrypt）
- ✅ ZIP 文件流式生成（不占用大量内存）
- ✅ 级联删除（自动清理 items 和 views）
- ✅ 详细统计数据聚合

#### 3. API Endpoints

##### 3.1 创建批量分享

**POST** `/api/share/bulk/create`

请求体：
```json
{
  "shareType": "batch",
  "imageIds": ["img_1", "img_2"],
  "videoIds": ["vid_1"],
  "title": "我的旅行照片",
  "description": "2024年春季旅行",
  "password": "secret123",
  "expiresAt": "2024-12-31T23:59:59Z",
  "maxViews": 100,
  "allowDownload": true,
  "enableZipDownload": true,
  "zipPassword": "zip123"
}
```

响应：
```json
{
  "success": true,
  "shareLink": {
    "id": "share_xxx",
    "shareId": "abc123",
    "shareUrl": "https://example.com/shared/abc123",
    "shareType": "batch",
    "itemCount": 3,
    "totalSize": 15728640,
    "items": [...],
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

##### 3.2 获取批量分享详情

**GET** `/api/share/bulk/[shareId]`

响应：
```json
{
  "success": true,
  "share": {
    "id": "share_xxx",
    "shareId": "abc123",
    "title": "我的旅行照片",
    "description": "2024年春季旅行",
    "itemCount": 3,
    "totalSize": 15728640,
    "enableZipDownload": true,
    "items": [
      {
        "id": "item_1",
        "type": "image",
        "filename": "photo1.jpg",
        "thumbnailPath": "/uploads/thumbs/photo1.jpg",
        "size": 5242880,
        "order": 0
      }
    ]
  }
}
```

##### 3.3 下载 ZIP 文件

**GET** `/api/share/bulk/[shareId]/download?zipPassword=xxx`

响应：ZIP 文件流

Content-Type: `application/zip`  
Content-Disposition: `attachment; filename="share_abc123.zip"`

##### 3.4 更新批量分享

**PUT** `/api/share/bulk/[shareId]`

请求体：
```json
{
  "title": "更新的标题",
  "maxViews": 200,
  "allowComment": true
}
```

##### 3.5 删除批量分享

**DELETE** `/api/share/bulk/[shareId]`

响应：
```json
{
  "success": true,
  "message": "分享已删除"
}
```

##### 3.6 获取统计数据

**GET** `/api/share/bulk/[shareId]/stats`

响应：
```json
{
  "success": true,
  "data": {
    "shareLink": {
      "id": "share_xxx",
      "shareId": "abc123",
      "itemCount": 3,
      "totalSize": 15728640
    },
    "stats": {
      "totalViews": 150,
      "uniqueIPs": 45,
      "totalDownloads": 30,
      "zipDownloads": 20,
      "individualDownloads": 10,
      "viewsByDate": {
        "2024-01-15": 50,
        "2024-01-16": 100
      },
      "downloadsByDate": {
        "2024-01-15": 10,
        "2024-01-16": 20
      }
    }
  }
}
```

##### 3.7 获取我的分享列表

**GET** `/api/share/bulk/my-shares`

响应：
```json
{
  "success": true,
  "shares": [...],
  "total": 5
}
```

---

### Day 19: 前端组件与测试

#### 1. 批量分享创建对话框

**文件**: `components/share/BulkShareDialog.tsx`

**功能**：
- ✅ 批量文件选择器
- ✅ 相册选择器
- ✅ 分享设置表单（密码、过期、权限等）
- ✅ ZIP 下载配置
- ✅ 实时预览已选文件
- ✅ 文件大小统计
- ✅ 分享链接复制

**使用示例**：
```tsx
import { BulkShareDialog } from '@/components/share/BulkShareDialog';

function MyComponent() {
  const [open, setOpen] = useState(false);
  
  return (
    <BulkShareDialog
      open={open}
      onOpenChange={setOpen}
      preSelectedImages={selectedImageIds}
      onShareCreated={(url, id) => {
        console.log('分享创建成功:', url);
      }}
    />
  );
}
```

#### 2. 批量分享查看组件

**文件**: `components/share/BulkShareView.tsx`

**功能**：
- ✅ 响应式网格布局展示文件
- ✅ 灯箱查看器（支持键盘导航）
- ✅ 单个文件下载
- ✅ ZIP 批量下载
- ✅ ZIP 密码输入对话框
- ✅ 文件信息显示
- ✅ 分享信息头部

**使用示例**：
```tsx
import { BulkShareView } from '@/components/share/BulkShareView';

function SharedPage({ shareData }) {
  return <BulkShareView {...shareData} />;
}
```

#### 3. 测试脚本

**文件**: `scripts/test-bulk-share.ts`

**测试覆盖**：
1. ✅ 创建批量文件分享
2. ✅ 创建相册分享
3. ✅ 获取分享信息
4. ✅ 更新分享设置
5. ✅ 模拟访问记录
6. ✅ 获取统计数据
7. ✅ 获取用户分享列表
8. ✅ 权限验证
9. ✅ 删除分享

**运行测试**：
```bash
cd frontend
npm run test:bulk-share
```

**预期输出**：
```
批量分享功能测试
============================================================

============================================================
设置测试环境
============================================================
✓ 创建测试用户: bulk-share-test@example.com
✓ 创建 5 个测试图片
✓ 创建 2 个测试视频
✓ 创建测试相册: 测试相册 (3 张图片)

============================================================
测试 1: 创建批量文件分享
============================================================
✓ 创建批量分享成功
  分享ID: abc123
  文件数量: 5
  总大小: 35.00 MB

...

============================================================
测试总结
============================================================
总测试数: 9
通过: 9
失败: 0
耗时: 2.34s

🎉 所有测试通过！
```

---

## 数据库设计

### ER 图

```
┌─────────────┐       ┌──────────────┐       ┌─────────┐
│ ShareLink   │──────<│ ShareItem    │>──────│ Image   │
│             │       │              │       │         │
│ - id        │       │ - id         │       │ - id    │
│ - shareId   │       │ - shareLinkId│       │ - path  │
│ - shareType │       │ - imageId    │       └─────────┘
│ - title     │       │ - videoId    │
│ - enableZip │       │ - order      │       ┌─────────┐
└─────────────┘       └──────────────┘>──────│ Video   │
      │                                       │         │
      │                                       │ - id    │
      v                                       │ - path  │
┌─────────────┐                              └─────────┘
│ ShareView   │
│             │
│ - id        │
│ - shareLinkId
│ - action    │
│ - viewedAt  │
└─────────────┘
```

### 数据流

**创建批量分享**：
1. 验证用户身份
2. 验证媒体所有权
3. 创建 ShareLink
4. 批量创建 ShareItem（事务）
5. 返回分享信息

**ZIP 下载**：
1. 验证分享有效性
2. 验证 ZIP 密码（如有）
3. 创建 archiver 实例
4. 流式添加文件
5. 返回 ZIP 流
6. 记录下载访问

**统计数据**：
1. 查询 ShareLink + items + views
2. 聚合统计指标
3. 按日期分组
4. 返回统计结果

---

## API 文档

详见上文 [API Endpoints](#3-api-endpoints) 章节。

---

## 前端组件

### BulkShareDialog Props

```typescript
interface BulkShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShareCreated?: (shareUrl: string, shareId: string) => void;
  preSelectedImages?: string[];
  preSelectedVideos?: string[];
  preSelectedAlbum?: string;
}
```

### BulkShareView Props

```typescript
interface BulkShareViewProps {
  shareId: string;
  shareType: string;
  title?: string;
  description?: string;
  itemCount: number;
  totalSize: number;
  items: ShareItemInfo[];
  allowDownload: boolean;
  enableZipDownload: boolean;
  // ... 更多属性
}
```

---

## 测试指南

### 单元测试

```bash
# 运行批量分享测试
npm run test:bulk-share

# 测试特定场景
tsx scripts/test-bulk-share.ts
```

### 手动测试流程

#### 1. 创建批量分享

```bash
curl -X POST http://localhost:3000/api/share/bulk/create \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=xxx" \
  -d '{
    "shareType": "batch",
    "imageIds": ["img_1", "img_2"],
    "title": "测试分享",
    "enableZipDownload": true
  }'
```

#### 2. 访问分享页面

```
http://localhost:3000/shared/{shareId}
```

#### 3. 下载 ZIP

```bash
curl -O http://localhost:3000/api/share/bulk/{shareId}/download
```

#### 4. 查看统计

```bash
curl http://localhost:3000/api/share/bulk/{shareId}/stats \
  -H "Cookie: next-auth.session-token=xxx"
```

---

## 使用示例

### 完整流程示例

```typescript
// 1. 用户在图库选择文件
const selectedImages = ['img_1', 'img_2', 'img_3'];
const selectedVideos = ['vid_1'];

// 2. 打开批量分享对话框
<BulkShareDialog
  open={shareDialogOpen}
  onOpenChange={setShareDialogOpen}
  preSelectedImages={selectedImages}
  preSelectedVideos={selectedVideos}
  onShareCreated={(url, id) => {
    // 分享创建成功
    toast.success('分享链接已创建！');
    copyToClipboard(url);
    
    // 可选：跳转到分享管理页面
    router.push(`/share/manage?highlight=${id}`);
  }}
/>

// 3. 访客访问分享页面
async function SharedPage({ params }) {
  const shareData = await fetchShareData(params.shareId);
  
  return (
    <div>
      {shareData.hasPassword ? (
        <PasswordDialog shareId={params.shareId} />
      ) : (
        <BulkShareView {...shareData} />
      )}
    </div>
  );
}
```

### 相册分享示例

```typescript
// 从相册页面分享整个相册
function AlbumPage({ album }) {
  const handleShareAlbum = () => {
    setShareDialogOpen(true);
  };
  
  return (
    <>
      <Button onClick={handleShareAlbum}>
        <ShareIcon /> 分享相册
      </Button>
      
      <BulkShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        preSelectedAlbum={album.id}
        onShareCreated={(url) => {
          toast.success(`相册"${album.name}"分享成功！`);
        }}
      />
    </>
  );
}
```

---

## 性能优化

### 1. ZIP 生成优化

**流式处理**：
```typescript
// 使用 archiver 的流式 API，避免一次性加载所有文件到内存
const archive = archiver('zip', {
  zlib: { level: 9 } // 最高压缩
});

// 逐个添加文件
for (const item of items) {
  archive.file(filePath, { name: fileName });
}

// 流式返回
return new ReadableStream({
  start(controller) {
    archive.on('data', chunk => controller.enqueue(chunk));
    archive.on('end', () => controller.close());
  }
});
```

**优势**：
- ✅ 内存占用稳定（不随文件数量增长）
- ✅ 支持大文件分享
- ✅ 边压缩边传输

### 2. 数据库查询优化

**批量加载**：
```typescript
// 使用 include 减少查询次数
const shareLink = await prisma.shareLink.findUnique({
  where: { shareId },
  include: {
    items: {
      include: {
        image: true,
        video: true,
      },
      orderBy: { order: 'asc' },
    },
    views: true, // 统计时才加载
  },
});
```

**索引优化**：
```sql
-- 关键索引
CREATE INDEX idx_share_items_shareLink ON share_items(shareLinkId);
CREATE INDEX idx_share_items_order ON share_items("order");
CREATE INDEX idx_share_views_action ON share_views(action);
CREATE INDEX idx_share_views_viewedAt ON share_views(viewedAt);
```

### 3. 前端优化

**懒加载**：
```typescript
// 分页加载大量文件
const ITEMS_PER_PAGE = 20;
const [page, setPage] = useState(1);
const visibleItems = items.slice(0, page * ITEMS_PER_PAGE);

// 使用 IntersectionObserver 自动加载更多
```

**图片优化**：
```tsx
<Image
  src={item.thumbnailPath}
  alt={item.filename}
  loading="lazy"
  sizes="(max-width: 640px) 50vw, 20vw"
/>
```

---

## 安全考虑

### 1. 权限验证

**所有权检查**：
```typescript
// 通过 items 中的媒体验证所有权
const firstItem = shareLink.items[0];
const media = firstItem.image || firstItem.video;
if (media.userId !== userId) {
  throw new Error('无权限操作此分享');
}
```

### 2. 密码保护

**双重密码**：
- 分享访问密码：控制谁能看到内容
- ZIP 下载密码：额外保护下载的文件

**密码加密**：
```typescript
const hashedPassword = await bcrypt.hash(password, 10);
const hashedZipPassword = await bcrypt.hash(zipPassword, 10);
```

### 3. 速率限制

**建议实施**：
```typescript
// 限制 ZIP 下载频率
const rateLimiter = new RateLimiter({
  points: 5, // 5次
  duration: 3600, // 1小时
});

// 限制创建分享频率
const createLimiter = new RateLimiter({
  points: 10,
  duration: 600, // 10分钟
});
```

### 4. 文件访问控制

**路径遍历防护**：
```typescript
// 验证文件路径在允许的目录内
const uploadDir = path.resolve(process.cwd(), 'uploads');
const filePath = path.resolve(uploadDir, media.path);
if (!filePath.startsWith(uploadDir)) {
  throw new Error('非法文件路径');
}
```

---

## 总结

### 已完成 ✅

1. **数据库设计**
   - ✅ ShareItem 表设计与迁移
   - ✅ ShareLink 扩展字段
   - ✅ 索引优化

2. **后端服务**
   - ✅ BulkShareService 完整实现
   - ✅ ZIP 流式生成
   - ✅ 权限验证
   - ✅ 统计聚合

3. **API 开发**
   - ✅ 7 个 REST API endpoints
   - ✅ 请求验证（Zod）
   - ✅ 错误处理

4. **前端组件**
   - ✅ BulkShareDialog（创建）
   - ✅ BulkShareView（查看）
   - ✅ 响应式设计
   - ✅ 灯箱查看器

5. **测试**
   - ✅ 9 个综合测试用例
   - ✅ 权限测试
   - ✅ 级联删除测试

6. **文档**
   - ✅ API 文档
   - ✅ 使用指南
   - ✅ 性能优化建议

### 代码统计

| 类型 | 文件数 | 代码行数 |
|-----|-------|---------|
| 后端服务 | 1 | ~730 |
| API Routes | 5 | ~500 |
| 前端组件 | 2 | ~1,000 |
| 测试脚本 | 1 | ~640 |
| 文档 | 1 | ~800 |
| **总计** | **10** | **~3,670** |

### 技术亮点

1. **流式 ZIP 生成**
   - 使用 archiver 库实现
   - 内存占用恒定
   - 支持大文件打包

2. **灵活的分享类型**
   - 批量文件分享
   - 相册整体分享
   - 统一的数据模型

3. **完善的权限控制**
   - 多层权限验证
   - 密码双重保护
   - 所有权检查

4. **详细的统计分析**
   - 按日期分组
   - 多维度统计
   - 实时聚合

### 下一步 (可选增强)

1. **生产优化**
   - [ ] 添加 Redis 缓存
   - [ ] ZIP 下载速率限制
   - [ ] CDN 集成

2. **功能增强**
   - [ ] 单个文件下载跟踪
   - [ ] GeoIP 地理位置
   - [ ] 分享评论功能

3. **用户体验**
   - [ ] 分享预览模板
   - [ ] 社交媒体分享
   - [ ] 二维码生成

4. **监控与分析**
   - [ ] 分享热度排行
   - [ ] 异常访问检测
   - [ ] 数据报表导出

---

## 📚 相关文档

- [Phase 5 进度跟踪](./PHASE5_PROGRESS.md)
- [Day 16-17 高级分享控制](./PHASE5_DAY16-17_ADVANCED_SHARE.md)
- [API 总览](./API_REFERENCE.md)

---

**文档版本**: v1.0  
**最后更新**: 2024-01-XX  
**维护者**: Development Team