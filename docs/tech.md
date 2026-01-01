# Zmage 技术选型与 Gemini 调用规范（执行版）
作者：周子为（zzw4257）｜809050685@qq.com｜github.com/zzw4257

> 目标：把“选型 + 模型调用”写死，避免版本/接口用错；`.env` 根目录已提供 `GEMINI_API_KEY`（可稳定使用）。

## 1. 总体架构（最小可用 + 可扩展）
- Web：**Next.js 14+（App Router）** + Tailwind（液态玻璃）+ 轻量动效（Framer Motion，受限）
- API：**FastAPI**（REST + WebSocket 进度）
- Worker：**Python worker（APScheduler）**：定期扫描/相册建议/重算向量（独立容器）
- DB：PostgreSQL（业务：用户/权限/字段/分享/相册）
- Object Storage：MinIO（原始媒体/缩略图/导出 zip）
- Vector DB：Qdrant（向量检索：文本/图片描述/标签）
- Cache/Queue：Redis（任务队列/进度/速率限制）

> 备注：把模型调用全部放在后端/worker，前端绝不直连（避免泄露 key）。

## 2. 目录与关键文件（建议）
- `/apps/web`：Next.js
- `/apps/api`：FastAPI
- `/apps/worker`：定时任务与长任务
- `/brand/icon.png`：应用图标
- `/test_media/*`：真实测试媒体（png/jpg/mp4）
- `/docs/PROGRESS.md`：唯一进度记录（每天更新）
- `/docs/rules.md`：执行规则（端口、提交、环境）
- `/product.md`：产品与验收

## 3. Gemini 模型“唯一指定”（不要自行改名）
### 3.1 文本/多模态 Agent（理解 + 规划 + 工具选择）
- **`gemini-3-flash-preview`**（Gemini 3 Flash 预览版） citeturn9view0

### 3.2 图片生成/编辑（Nano Banana）
- 速度优先：**`gemini-2.5-flash-image`** citeturn11view0  
- 质量/复杂指令：**`gemini-3-pro-image-preview`** citeturn9view0turn11view0  
> 注意：官方命名里并没有 “gemini-3-flash-image”；请按 Nano Banana 文档用以上两个模型。 citeturn11view0

### 3.3 向量嵌入
- **`gemini-embedding-001`**（建议输出 768 维） citeturn6view2

## 4. Python（后端/worker）调用：google-genai（强制）
安装：`pip install google-genai` citeturn8view0  
环境变量：只需 `GEMINI_API_KEY`，SDK 会自动读取（若同时设置 GOOGLE_API_KEY 会优先用后者，避免同时设置）。 citeturn8view0

### 4.1 文本/多模态（用于：自动打标、理解、MCP agent）
```python
from google import genai
from google.genai import types

client = genai.Client()  # 自动读取 GEMINI_API_KEY

resp = client.models.generate_content(
    model="gemini-3-flash-preview",
    contents=[
        "为这张图片生成：1)一句话标题 2)5个标签 3)可检索的描述",
        # 图片：用 inline_data（小文件）或 Files API（大文件）
    ],
)
print(resp.text)
```
模型 ID 与 generate_content 用法见 Gemini 3 指南。 citeturn9view0

### 4.2 图片生成/编辑（用于：智能裁剪建议、擦除、重绘、生成封面）
```python
from google import genai
from PIL import Image

client = genai.Client()

# 生成
resp = client.models.generate_content(
    model="gemini-2.5-flash-image",
    contents="生成一张“液态玻璃风格”的相册封面：半透明卡片+柔光背景+中文标题“新相册建议”。",
)

for part in resp.parts:
    if part.inline_data:
        img = part.as_image()
        img.save("cover.png")
```
Nano Banana 文档给出了 `gemini-2.5-flash-image` / `gemini-3-pro-image-preview` 的官方用法与 REST 端点。 citeturn11view0turn9view0

### 4.3 向量嵌入（用于：语义搜索/聚类/相似）
```python
from google import genai
from google.genai import types
import numpy as np

client = genai.Client()

result = client.models.embed_content(
    model="gemini-embedding-001",
    contents="一张海边日落的合照，适合归入旅行相册。",
    config=types.EmbedContentConfig(
        output_dimensionality=768,
        task_type="RETRIEVAL_DOCUMENT",
    ),
)

vec = np.array(result.embeddings[0].values, dtype=np.float32)
# 768/1536 维需要手动归一化（3072 已归一化）
vec = vec / (np.linalg.norm(vec) + 1e-12)
```
`output_dimensionality` 与“非 3072 维需归一化”的要求来自官方 Embeddings 文档。 citeturn6view2

### 4.4 视频理解（用于：mp4 自动摘要、抽帧描述、事件分段）
- 小视频（<20MB）可 inline；大视频用 Files API 上传后引用。 citeturn5view0
```python
from google import genai
client = genai.Client()

f = client.files.upload(file="test_media/sample.mp4")
resp = client.models.generate_content(
    model="gemini-3-flash-preview",
    contents=[f, "总结视频并给出3个可检索标签；指出关键时间点。"]
)
print(resp.text)
```
视频上传与引用方式见官方“视频理解”文档（含 REST/JS/Python 示例）。 citeturn5view0

## 5. REST 调用（只用于调试/排障）
- 文本/多模态：`POST https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent`  
Gemini 3 文档示例使用 header `x-goog-api-key`。 citeturn9view0  
生成内容 API 也展示了 `?key=$GEMINI_API_KEY` 的形式（两者择一保持一致）。 citeturn7view1

- 嵌入：`POST .../v1beta/models/gemini-embedding-001:embedContent`（支持 `output_dimensionality`） citeturn6view2

- 图片生成：`POST .../v1beta/models/gemini-2.5-flash-image:generateContent` citeturn11view0

## 6. 嵌入与搜索策略（落地规则）
- 文本检索：Query 用 `RETRIEVAL_QUERY`；文档/资产描述用 `RETRIEVAL_DOCUMENT`。 citeturn6view2
- 混合检索：关键词（字段/文件夹/扩展名）先过滤，再向量召回 TopK，再用 Gemini 3 Flash 轻量重排。
- 相册建议：先按时间窗分桶（如 7/30 天），再对向量做聚类（HDBSCAN/KMeans），最后让 Gemini 3 Flash 给“相册标题/理由/封面候选”。

## 7. 环境变量（最少且固定）
- `GEMINI_API_KEY`（根目录 `.env` 已有）
- `WEB_PORT=2333`
- `API_PORT=4257`
- `DATABASE_URL=postgresql://...`
- `REDIS_URL=redis://...`
- `QDRANT_URL=http://qdrant:6333`
- `S3_ENDPOINT=http://minio:9000`（MinIO）

