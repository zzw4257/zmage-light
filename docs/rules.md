# Zmage 执行规则（Rules）
作者：周子为（zzw4257）｜809050685@qq.com｜github.com/zzw4257

## 0. 端口与对外暴露（硬性）
- Web：**2333**
- API：**4257**
- 只暴露这两个端口；DB/Redis/Qdrant/MinIO 只在 docker network 内部通信。
- 所有端口/URL 必须可通过 `.env` 覆盖，但默认固定上述端口。

## 1. 运行方式（必须一键、最少依赖）
- 根目录提供：`docker-compose.yml` + `.env.example`
- 启动：
  - `docker compose up --build`
  - 打开：`http://localhost:2333`（Web），`http://localhost:4257/docs`（API）
- 禁止“本机手动装一堆依赖才能跑”；容器内也禁止临时 apt/pip 热补丁（见第 2 条）。

## 2. 干净构建（不打热补丁）
- **不允许**在运行中的容器里 `pip install` / `apt-get` 解决问题。
- 依赖变更只允许：更新 lockfile（如 `uv.lock`/`poetry.lock`/`package-lock.json`）+ Dockerfile + commit。
- 任何“临时修复”都必须回写到仓库文件，保证可复现。

## 3. 唯一进度文档（强制）
- 进度只写在：`/docs/PROGRESS.md`
- 规则：
  - 每次完成一个可演示闭环（如“上传→自动打标→可搜索”）就更新一次
  - 每条记录包含：日期、完成项、证据（截图/命令/接口）、阻塞点、下一步（可执行）

## 4. 文档对齐清单（必须读完并保持一致）
- `/product.md`：产品范围与验收（以此为准）
- `/docs/tech.md`：技术选型与 Gemini 调用规范（以此为准）
- `/docs/rules.md`：执行规则（以此为准）
- `/docs/PROGRESS.md`：进度与下一步（以此为准）
- `/brand/icon.png`：应用图标（UI/README 必须引用）
- `/test_media/*`：测试媒体（演示/验收必须使用；禁止 mock/自造）

## 5. Git 规范（必须精细）
- 提交频率：**小步快跑**（每个 commit 都能 build & run）
- Commit message 建议：`feat(web): ...` / `feat(api): ...` / `fix: ...` / `chore: ...`
- 每个 PR/阶段性合入：更新 `/docs/PROGRESS.md`（否则不合）
- 禁止一次性“大杂烩提交”；禁止把生成文件/大 zip 直接进 git（媒体只放 `/test_media`）。

## 6. 文案与交互标准（硬性）
- **全中文**：按钮、提示、空状态、错误提示、帮助文案。
- 文案要“可操作”：错误提示必须给出下一步（例如“权限不足→去申请访问/联系管理员”）。
- 交互要“精致灵动但克制”：动效时长 150–220ms；不做夸张动画；移动端同样流畅。

