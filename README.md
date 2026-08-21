# 鱼蛋花费

一个把 **生活记账** 和 **成长记录** 放在一起的极简个人站点。

项目当前已经迁移到 **Astro + React Islands**，并使用 `@astrojs/vercel` 适配 Vercel 部署。核心模块仍然是：

- **鱼蛋小账本**：记录收入支出，支持网页管理与 Telegram 自然语言记账
- **成长 Log**：用 Markdown 写文章，沉淀日常、复盘和成长记录

适合当作轻量的个人生活面板：一边记账，一边写点东西。

---

## 项目亮点

### 鱼蛋小账本 `/ledger`

面向个人的轻量账本，核心目标是 **录入快、查看清楚**。

- 收入 / 支出记录
- 按分类、类型、月份和关键词筛选
- 查看、编辑、删除交易记录
- 数据仪表盘：收支趋势图、分类统计、汇总卡片
- 日历热力图：按日查看支出分布，点击查看详情
- 游标分页：明细列表支持“加载更多”，避免全量加载
- 月度聚合：服务端计算月度数据，Dashboard 直接渲染
- Telegram Bot 自然语言记账
- Bearer Token 保护敏感写操作
- Supabase PostgreSQL 持久化

Telegram 记账示例：

- `午饭 35` -> 支出 35
- `工资 +5000` -> 收入 5000
- `咖啡 28 饮品` -> 支出 28，分类“饮品”

### 成长 Log `/blog`

无数据库的内容模块，适合写周报、复盘、个人博客。

- 文章放在 `content/blog/`，使用 Markdown + Frontmatter
- 按日期倒序展示
- 自动生成文章详情页：`content/blog/my-story.md` -> `/blog/my-story`
- GFM 语法 + 代码高亮
- 支持 React 交互组件按需加载

> 迁移说明：原 Next.js 版文章 AI 问答接口目前在 Astro 迁移中暂时禁用，`/api/blog/chat` 会返回 503。恢复前需要重新确认外部 AI 转发策略。

---

## 技术栈

| 层面 | 技术 |
| --- | --- |
| 框架 | Astro 6 |
| 交互组件 | React 19 + `@astrojs/react` |
| 部署 | Vercel + `@astrojs/vercel` |
| 语言 | TypeScript |
| UI / 样式 | Tailwind CSS 4、Radix UI |
| 数据存储 | Supabase PostgreSQL |
| 图表 | Recharts |
| 内容系统 | Astro Content Collections、Markdown、gray-matter |
| Markdown 增强 | remark-gfm、rehype-highlight、rehype-raw、highlight.js |
| Bot 接入 | Telegram Webhook |
| 鉴权 | Bearer Token |

---

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

在项目根目录创建 `.env.local`：

```bash
# 必需 - 账本模块
API_KEY=your_secret_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
SUPABASE_SECRET_KEY=your_supabase_secret_key
BASE_URL=http://localhost:4321

# 可选 - AI 功能预留
MIMO_BASE_URL=your_mimo_api_base_url
MIMO_API_KEY=your_mimo_api_key
```

### 3. 初始化数据库

在 Supabase SQL Editor 中依次执行：

- `schema.sql`：创建账本的 `transactions` 表。
- `yudan-schema.sql`：创建鱼蛋看板数据表和 GitHub 所有者权限。
- `access-control.sql`：为已有数据库开启账本 RLS，并更新看板权限。

鱼蛋看板与账本使用 Supabase GitHub 登录。GitHub OAuth 回调地址设为 `https://<project-ref>.supabase.co/auth/v1/callback`；在 Supabase Authentication 的 URL Configuration 中，将线上域名设为 Site URL，并加入 Redirect URLs。只有 GitHub 邮箱 `William.chen@utah.edu` 可以写入，账本 API 也继续接受 `API_KEY`。

### 4. 启动开发

```bash
npm run dev
```

默认访问：

- 首页：<http://localhost:4321>
- 账本：<http://localhost:4321/ledger>
- 成长 Log：<http://localhost:4321/blog>

### 5. 本地构建

```bash
npm run build
npm run start
```

`npm run build` 会运行 `astro build`，产物输出到 `dist/`。`npm run start` 会用 `astro preview` 预览构建结果。

---

## Vercel 从 Next.js 更新为 Astro

当前代码已经满足 Astro 部署需要：

- `package.json` 的 `build` 脚本是 `astro build`
- `package.json` 的 `dev` 脚本是 `astro dev`
- `astro.config.mjs` 已配置 `output: 'server'` 和 `adapter: vercel()`
- API 已迁移到 `src/pages/api/*.ts`

在 Vercel 后台这样更新：

1. 进入 Vercel 项目。
2. 打开 `Settings` -> `Build and Deployment`。
3. 在 `Framework Preset` 里选择 `Astro`。如果 Vercel 已自动识别 Astro，可以保持自动识别。
4. 确认 `Build Command` 使用 `npm run build`，不要再使用 `next build`。
5. 确认 `Install Command` 使用默认值，通常是 `npm install`。
6. `Output Directory` 不要手动写 `.next`。选择 Astro preset 时通常交给 Vercel 自动配置；如果你打开了 Override，静态模式一般是 `dist`，但本项目使用 Vercel adapter 的 server output，建议关闭 Override。
7. 如果项目不是仓库根目录，检查 `Root Directory` 是否指向真正包含 `package.json` 和 `astro.config.mjs` 的目录。
8. 在 `Environment Variables` 中保留这些变量：`API_KEY`、`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`、`SUPABASE_SECRET_KEY`、`BASE_URL`。如果之后恢复 AI 问答，再补上 `MIMO_BASE_URL` 和 `MIMO_API_KEY`。
9. 回到 `Deployments`，点击最新部署的 `Redeploy`，或推送一次新 commit 触发部署。

如果部署仍然按 Next.js 构建，优先检查这三处：

- Vercel 项目设置里是否还锁着 `Next.js` preset
- `Build Command` 是否还覆盖成了 `next build`
- 仓库里是否还有 `vercel.json` 覆盖了 `framework`、`buildCommand` 或 `outputDirectory`

---

## 环境变量

| 变量名 | 必需 | 说明 |
| --- | --- | --- |
| `API_KEY` | 是 | 账本 API 写操作的备用密钥 |
| `NEXT_PUBLIC_SUPABASE_URL` | 是 | Supabase 项目地址 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 是 | Supabase 匿名公钥 |
| `SUPABASE_SECRET_KEY` | 是 | 仅服务端使用，用于通过 RLS 执行已授权的账本写操作 |
| `BASE_URL` | 是 | 站点对外地址，用于 Webhook 等 |
| `MIMO_BASE_URL` | 否 | AI API 地址，当前为预留配置 |
| `MIMO_API_KEY` | 否 | AI API Key，当前为预留配置 |

---

## 写成长日志

在 `content/blog/` 中新增 Markdown 文件即可：

```md
---
title: 我的标题
date: 2026-04-29
summary: 这篇文章讲了什么
tags:
  - 标签一
  - 标签二
cover: /cover.png
---

正文内容，支持标准 Markdown / GFM 语法。
```

- 文件名即 slug：`my-story.md` -> `/blog/my-story`
- 保存后刷新页面即可看到新文章

---

## API 概览

账本读取接口无需认证；写入接口接受 Supabase GitHub access token 或 `Authorization: Bearer <API_KEY>`。GitHub token 仅在邮箱为 `William.chen@utah.edu` 且登录提供商为 GitHub 时通过。

| 方法 | 路径 | 说明 | 认证 |
| --- | --- | --- | --- |
| `GET` | `/api/list` | 游标分页查询交易记录 | 否 |
| `GET` | `/api/monthly` | 月度聚合数据 | 否 |
| `GET` | `/api/daily` | 某日支出明细 | 否 |
| `POST` | `/api/add` | 新增交易记录 | 是 |
| `PATCH` | `/api/edit` | 编辑交易记录 | 是 |
| `DELETE` | `/api/delete` | 删除交易记录 | 是 |
| `POST` | `/api/telegram` | Telegram Webhook 入口 | 否 |
| `POST` | `/api/blog/chat` | 文章 AI 问答，迁移中暂时禁用 | 否 |

---

## Telegram Bot 接入

将 Bot Webhook 指向：

```text
https://your-domain.com/api/telegram
```

然后直接给机器人发消息记账即可。本地调试可配合 `ngrok` 暴露端口。

---

## 项目结构

```text
.
├── astro.config.mjs                 # Astro + Vercel adapter 配置
├── src/
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── ledger.astro
│   │   ├── blog/
│   │   │   ├── index.astro
│   │   │   └── [slug].astro
│   │   └── api/                     # Astro API routes
│   ├── components/                  # Astro / React 组件
│   └── lib/                         # Astro 侧工具函数
├── content/
│   └── blog/                        # Markdown 文章
├── lib/                             # 共享业务逻辑
├── public/                          # 静态资源
└── schema.sql                       # 数据库初始化脚本
```

> `app/` 目录是旧 Next.js 版本遗留代码。当前 Astro 路由入口在 `src/pages/`。

---

## License

MIT
