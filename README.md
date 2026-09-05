# Content Intelligence Workbench

本项目是一个中文内容情报工作台。Phase 3 使用本地 Supabase/PostgreSQL、Auth、Storage 与 RLS 驱动正式页面，外部采集和 AI 分析仍是 Mock 体验。

## 本地启动

1. 复制 `.env.example` 为 `.env.local`，填入本地 Supabase 的 publishable key 与 seed 用户变量。
2. 执行 `pnpm install`。
3. 执行 `pnpm db:start` 启动本地 Supabase。
4. 执行 `pnpm db:reset` 应用迁移并清空本地数据库。
5. 执行 `pnpm db:types` 生成 `src/types/database.types.ts`。
6. 可选执行 `pnpm db:seed` 写入确定性的 Demo 数据。
7. 执行 `pnpm dev`，打开 `http://localhost:3000`。

本地工作台没有登录页面或登录按钮。浏览器首次访问时会自动创建匿名 Supabase 会话；该会话只用于满足服务端 `getUser()` 与 RLS 授权，用户不需要输入账号。访问旧的 `/login`、`/signup` 或 `/auth/callback` 地址会直接回到首页。未配置 Supabase 或服务不可用时，页面显示错误状态，不回退到 Mock 数据。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `pnpm db:start` | 启动隔离端口的本地 Supabase |
| `pnpm db:stop` | 停止本地 Supabase |
| `pnpm db:reset` | 重建数据库并应用迁移 |
| `pnpm db:seed` | 显式写入 Demo 数据 |
| `pnpm db:test` | 执行 PostgreSQL / pgTAP RLS 测试 |
| `pnpm db:types` | 从本地数据库生成类型 |
| `pnpm lint` | ESLint 检查 |
| `pnpm typecheck` | TypeScript 检查 |
| `pnpm test` | 客户端 reducer 与领域单元测试 |
| `pnpm build` | Next.js 生产构建 |

## 结构

- `app/`：App Router 页面与 `/api/v1` Route Handlers。
- `src/components/`：Shell、导航和共享 UI。
- `src/features/`：Today、Inbox、Intelligence、Competitors、Ideas、Analytics 等页面功能。
- `src/server/`：Auth、Zod 校验、Service、Repository、Mapper 与错误响应。
- `src/data/`：仅供 seed、测试和演示使用的 Mock 数据。
- `supabase/migrations/`：唯一数据库结构来源；禁止直接在 Dashboard 改表。
- `supabase/tests/`：跨用户、匿名角色与 Storage Policy 的 RLS 证据。

业务请求统一经过 `Route → Zod → Service → Repository → Supabase`。客户端 reducer 只承担缓存、hydrate、optimistic update 和 rollback；刷新页面的数据来源是本地 Supabase。
