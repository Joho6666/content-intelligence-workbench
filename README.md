# 内容情报工作台

个人、多领域、多平台内容运营：手动收集 → 原文分析 → 选题 → 平台稿件 → 制作排期 → 人工发布 → 真实快照复盘。优先支持抖音、小红书。自动采集、定时监测、自动发布尚未接入。

## 启动

需要 Node.js 22+ 和 pnpm。首次执行：

```sh
pnpm install --frozen-lockfile
pnpm run check:env
pnpm dev
```

打开 http://127.0.0.1:3000/settings。macOS 可双击 `启动工作台.command`。生产运行用 `pnpm build && pnpm start`。两个服务不能共用同一数据目录；启动第二个服务时使用独立 `WORKBENCH_DATA_DIR`。只监听本机，不支持公开部署、多用户或无持久磁盘的函数服务。

默认使用本地 PostgreSQL（PGlite），不需要 Docker；业务数据写入 `work/local/postgres`，身份存在数据库中，与浏览器 Cookie 无关。数据目录错误不会回退到假数据。不要删除 `work/local`；更换目录相当于新建工作区。

## 第一次使用

1. 设置中添加运营账号，填写领域、受众、语气、目标。账号背景用于分析和生成。
2. 配置 OpenAI 兼容 Base URL、模型和密钥，保存后测试。例：DeepSeek 的 `https://api.deepseek.com/v1`。请求使用 `/chat/completions`、JSON 输出；提供商须支持该协议。密钥保存在本机数据目录的 `ai.json`，不会返回浏览器或进入业务备份。
3. 在灵感 Inbox / 情报库粘贴分享文本、填写标题及正文/字幕，可上传参考图片和录入指标。分享文本只提取链接；只有链接会显示“待补充”。图片目前用于参考与备份，AI 读取手工正文。
4. 分析材料，查看材料事实与创作建议，再转为选题。没有 AI 也能手工编辑。
5. 打开选题，选择稿件账号和平台。AI 生成只打开预览；采用需要确认，重新生成不会自动改原稿。抖音、小红书稿件分别保存。编辑后 1.2 秒自动保存，每个平台稿件保留最近100版历史于本机 `draft-history` 目录，失败时保留输入和浏览器恢复草稿；支持立即保存、复制、Markdown 导出。
6. 加入内容执行，设置素材、状态、排期。在日历中点击任务修改。去平台人工发布后登记真实时间、链接和账号。同一选题可建立两个平台稿件与发布记录。
7. 在数据复盘中录入表现快照：播放/阅读、点赞、评论、收藏、分享、获客。不知道的留空。每条内容只取最新累计快照计入总数；历史快照逐条展示。数据不足时不可证明增长；AI 复盘必须引用有数据的发布记录。

## 备份、恢复与旧工作区

设置中“下载完整业务备份”包含所有业务记录与 PNG/JPEG/WebP 图片；单图 5MB，附件总量约40MB。恢复先验证结构和关联，确认后替换当前记录，先保存当前工作区备份到 `work/local/backups`，保留目标工作区身份。可在全新目录启动后恢复。不含密钥、Supabase 身份；迁移机器如需保留配置，关闭服务后单独安全复制完整数据目录。未引用附件可在设置中删除。

连接旧 Supabase 时先备份原数据库与 Storage，设置 `APP_STORAGE=supabase` 及原项目配置。使用 **增量迁移** `supabase db push`，不要运行 `db:reset`（它会清空数据库）。新增 `operation_documents` 使用原有 workspace owner 的 RLS，旧表保留原样。首次访问使用原浏览器会话验证并保存本机身份，或配置已有账号的 OWNER_EMAIL / OWNER_PASSWORD；不会自动创建匿名账号。保存文件 `supabase-owner.json` 需和数据目录一起保留。

首次读取将旧业务记录导入新文档，在本机保留原始记录备份。未知来源的旧默认指标置空并标为未核验；旧模拟分析不用于新分析。旧 Supabase Storage 中的附件仍在原桶，**不会自动迁入本地业务附件备份**，需要下载后重新上传。不要删除原桶。若旧匿名会话已丢失，需要先恢复其身份或从数据库备份导出原工作区；应用不会代你新建空工作区。

## 检查与维护

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
# 安装 Playwright Chromium 或指定本机 Chrome 路径
pnpm exec playwright install chromium
pnpm test:e2e
```

浏览器测试启动独立生产服务、使用临时数据库，不污染工作区。可设置 `CHROME_EXECUTABLE` 和 `QA_ARTIFACT_DIR`。单元/接口测试包含独立 AI 测试接口、保存失败、重复链接、稿件冲突、超时、恢复及 PostgreSQL RLS 隔离；测试接口结果不代表真实模型质量。完整 Supabase 的既有 pgTAP 检查需要 Docker 和 `pnpm db:test`。

接口保持 `/api/v1`，新增 accounts、drafts、assets、connection/test、snapshots、analytics/review、backup；业务校验位于 `src/server/operations`，运行时类型位于 `src/features/operations/model.ts`。现有 Supabase 服务层用于原工作区读取与迁移。Next.js 固定为官方安全修复版本 16.3.8。

验收结果与未验证项见 [验收记录](docs/ACCEPTANCE.md)。
