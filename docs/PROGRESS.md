# Zmage 开发进度与下一步（唯一记录点）
作者：周子为（zzw4257）｜809050685@qq.com｜github.com/zzw4257

> 说明：只在本文件记录进度。每次完成一个可演示闭环就更新一次。

## 进度日志（按时间倒序）
### 2026-01-01
- ✅ 初始化：文档就位（product/tech/rules/progress）
- 🔜 下一步：
  1. 生成项目骨架（Next.js + FastAPI + docker compose + 端口固定 2333/4257）
  2. 接入 MinIO（上传/缩略图）与 PostgreSQL（资产表/字段表/权限表）
  3. 接入 Gemini：上传后自动打标（png/jpg），用 `/test_media` 验证

## 当前阻塞
- （无）

## 下一步（可执行清单）
- [ ] Web：库页骨架 + 液态玻璃视觉（移动端可用）
- [ ] API：上传/资产列表/资产详情/字段 CRUD（OpenAPI 自动生成）
- [ ] Worker：定时扫描（每 6 小时）生成“相册建议”占位数据
- [ ] 集成：Qdrant 向量写入与相似检索（详情页 More like this）
