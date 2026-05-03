# 鱼蛋花费

一个把 **生活记账** 和 **成长记录** 放在一起的极简个人站点。

基于 **Next.js 16 App Router** 构建，包含两个核心模块：

- **鱼蛋小账本** — 记录收入支出，支持网页管理与 Telegram 自然语言记账
- **成长 Log** — Markdown 写作，带文章问答

适合当作轻量的个人生活面板：一边记账，一边写点东西。

---

## 项目亮点

### 鱼蛋小账本 `/ledger`

面向个人的轻量账本，核心目标是 **录入快、查看清楚**。

- 收入 / 支出记录
- 按分类、类型、关键词筛选
- 查看、编辑、删除交易记录
- **数据仪表盘**：收支趋势图、分类 breakdown、汇总卡片（基于 Recharts）
- **日历热力图**：按日查看支出分布，点击查看详情
- **游标分页**：明细列表支持"加载更多"，避免全量加载
- **月度聚合**：服务端预计算月度数据，Dashboard 直接渲染
- Telegram Bot 自然语言记账
- Bearer Token 保护敏感写操作
- Supabase PostgreSQL 持久化

Telegram 记账示例：

- `午饭 35` → 支出 35
- `工资 +5000` → 收入 5000
- `咖啡 28 饮品` → 支出 28，分类"饮品"

### 成长 Log `/blog`

无数据库的静态内容模块，适合写周报、复盘、个人博客。

- 文章放在 `content/blog/` 目录，Markdown + Frontmatter
- 按日期倒序展示
- **AI 问答**：针对文章内容提问，流式返回回答
- **目录导航（TOC）**：自动提取 h2-h4 生成侧边栏目录
- **阅读进度条**：顶部实时显示阅读进度
- GFM 语法 + 代码高亮（rehype-highlight / highlight.js）
- 静态生成，部署成本低

---

## 技术栈

| 层面 | 技术 |
| --- | --- |
| 框架 | Next.js 16（App Router） |
| 语言 | TypeScript |
| UI / 样式 | Tailwind CSS 4、Radix UI |
| 数据存储 | Supabase PostgreSQL（账本模块） |
| 图表 | Recharts |
| 内容系统 | Markdown、gray-matter、react-markdown |
| Markdown 增强 | remark-gfm、rehype-highlight、rehype-raw、highlight.js |
| AI 能力 | MiMo 模型（OpenAI 兼容接口） |
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
BASE_URL=http://localhost:3000

# 可选 - AI 功能（文章问答）
MIMO_BASE_URL=your_mimo_api_base_url
MIMO_API_KEY=your_mimo_api_key
```

### 3. 初始化数据库

在 Supabase SQL Editor 中执行 `schema.sql`，创建 `transactions` 表。

### 4. 启动开发

```bash
npm run dev
```

访问：

- 首页：<http://localhost:3000>
- 账本：<http://localhost:3000/ledger>
- 成长 Log：<http://localhost:3000/blog>

> 如果只需要博客模块，配置 `MIMO_*` 环境变量即可获得 AI 能力，账本相关的 Supabase 配置可以跳过。

---

## 环境变量

| 变量名 | 必需 | 说明 |
| --- | --- | --- |
| `API_KEY` | 是 | 保护账本写操作的密钥 |
| `NEXT_PUBLIC_SUPABASE_URL` | 是 | Supabase 项目地址 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 是 | Supabase 匿名公钥 |
| `BASE_URL` | 是 | 站点对外地址，用于 Webhook 等 |
| `MIMO_BASE_URL` | 否 | MiMo API 地址，启用文章 AI 问答 |
| `MIMO_API_KEY` | 否 | MiMo API Key |

---

## 写成长日志

在 `content/blog/` 中新增 Markdown 文件即可：

```md
---
title: 我的标题
date: 2026-04-29
summary: 这篇文章讲了什么（可选，不填会自动截取正文前 120 字）
tags:
  - 标签一
  - 标签二
cover: /cover.png
---

正文内容，支持标准 Markdown / GFM 语法。
```

- 文件名即 slug：`my-story.md` → `/blog/my-story`
- 保存后刷新页面即可看到新文章

---

## API 概览

账本读取接口无需认证；写入接口（add / edit / delete）需要携带 `Authorization: Bearer <API_KEY>`。

| 方法 | 路径 | 说明 | 认证 |
| --- | --- | --- | --- |
| `GET` | `/api/list` | 游标分页查询交易记录 | 否 |
| `GET` | `/api/monthly` | 月度聚合数据（汇总、趋势、分类、热力图） | 否 |
| `GET` | `/api/daily` | 某日支出明细 | 否 |
| `POST` | `/api/add` | 新增交易记录 | 是 |
| `PATCH` | `/api/edit` | 编辑交易记录 | 是 |
| `DELETE` | `/api/delete` | 删除交易记录 | 是 |
| `POST` | `/api/telegram` | Telegram Webhook 入口 | 否 |
| `POST` | `/api/blog/chat` | 文章 AI 问答（流式） | 否 |

---

## Telegram Bot 接入

将 Bot Webhook 指向：

```
https://your-domain.com/api/telegram
```

然后直接给机器人发消息记账即可。本地调试可配合 `ngrok` 暴露端口。

---

## 项目结构

```
.
├── app/
│   ├── page.tsx                     # 首页
│   ├── greeting.tsx                 # 问候语（客户端组件）
│   ├── ledger/
│   │   ├── page.tsx                 # 账本主页
│   │   ├── dashboard/               # 数据仪表盘（趋势图、分类、汇总）
│   │   └── components/              # 账本相关组件
│   ├── blog/
│   │   ├── page.tsx                 # 文章列表页
│   │   ├── blog-list-client.tsx
│   │   └── [slug]/
│   │       ├── page.tsx             # 文章详情页
│   │       ├── markdown-content.tsx
│   │       ├── ai-chat.tsx          # AI 问答组件
│   │       ├── toc-card.tsx         # 目录导航
│   │       ├── reading-progress.tsx # 阅读进度条
│   │       └── post-actions.tsx     # 文章操作
│   └── api/
│       ├── add/route.ts
│       ├── edit/route.ts
│       ├── delete/route.ts
│       ├── list/route.ts
│       ├── monthly/route.ts         # 月度聚合接口
│       ├── daily/route.ts           # 日支出明细接口
│       ├── telegram/route.ts
│       └── blog/
│           └── chat/route.ts        # AI 问答接口
├── content/
│   └── blog/                        # Markdown 文章
├── lib/
│   ├── auth.ts                      # 鉴权
│   ├── blog.ts                      # 博客读取与解析
│   ├── parser.ts                    # 自然语言记账解析
│   └── supabase.ts                  # Supabase 客户端
├── public/
└── schema.sql                       # 数据库初始化脚本
```

---

## License

MIT
