# 🐟 鱼蛋花费

一个把 **生活记录** 和 **个人记账** 放在一起的极简小站。

它基于 **Next.js 16 App Router** 构建，目前包含两个核心模块：

- **📒 鱼蛋小账本**：记录收入、支出，支持网页管理和 Telegram 自然语言记账
- **🌱 成长 Log**：使用 Markdown 写成长日志，生成静态博客内容

适合把它当作一个轻量的个人生活面板：一边记账，一边写下日常、复盘和成长。

---

## ✨ 项目亮点

### 📒 鱼蛋小账本 `/ledger`

面向个人使用的轻量账本系统，重点是“**录入足够快，查看足够清楚**”。

- 支持 **收入 / 支出** 记录
- 支持按 **分类、类型、关键词** 检索与筛选
- 支持查看、编辑、删除交易记录
- 支持通过 **Telegram Bot** 发送自然语言完成记账
- 通过 `Authorization: Bearer <API_KEY>` 保护敏感写操作
- 使用 **Supabase PostgreSQL** 持久化账本数据

示例：

- `午饭 35` → 记录一笔支出 35
- `工资 +5000` → 记录一笔收入 5000
- `咖啡 28 饮品` → 支出 28，备注“咖啡”，分类“饮品”

### 🌱 成长 Log `/blog`

一个无需数据库的静态内容模块，适合写周报、反思、成长记录或个人博客。

- 文章内容直接放在 `content/blog/` 目录
- 使用 **Markdown + Frontmatter** 管理标题、日期等元信息
- 按日期自动倒序展示
- 基于 `react-markdown` 渲染，支持更现代的 Markdown 工作流
- 集成 `remark-gfm`、`rehype-highlight`、`highlight.js`，支持 GFM 与代码高亮
- 页面可静态生成，部署与维护成本低

---

## 🧱 技术栈

| 层面 | 技术 |
| --- | --- |
| 框架 | Next.js 16（App Router） |
| 语言 | TypeScript |
| UI / 样式 | Tailwind CSS 4、Radix UI |
| 数据存储 | Supabase PostgreSQL（账本模块） |
| 内容系统 | Markdown、gray-matter、react-markdown |
| Markdown 增强 | remark-gfm、rehype-highlight、highlight.js |
| Bot 接入 | Telegram Webhook |
| 鉴权方式 | Bearer Token（`API_KEY`） |

---

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

在项目根目录创建 `.env.local`：

```bash
API_KEY=your_secret_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
BASE_URL=http://localhost:3000
```

### 3. 初始化数据库

在 Supabase 的 SQL Editor 中执行项目根目录下的 `schema.sql`，创建 `transactions` 表。

当前表结构很简单，主要字段包括：

- `amount`：金额
- `category`：分类
- `note`：备注
- `type`：`expense` / `income`
- `transaction_time`：交易时间
- `created_at`：创建时间

### 4. 启动开发环境

```bash
npm run dev
```

启动后访问：

- 首页：<http://localhost:3000>
- 账本：<http://localhost:3000/ledger>
- 成长 Log：<http://localhost:3000/blog>

---

## 🔐 环境变量说明

| 变量名 | 说明 |
| --- | --- |
| `API_KEY` | 保护新增、编辑、删除等敏感接口的密钥 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目地址 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase 匿名公钥 |
| `BASE_URL` | 当前站点对外访问地址，用于 Webhook 等场景 |

---

## 📝 如何写成长日志

只需要在 `content/blog/` 中新增一个 Markdown 文件。

例如新建 `my-story.md`：

````md
---
title: 我的标题
date: 2026-04-21
---

这里是正文内容，支持标准 Markdown / GFM 语法。

## 二级标题

- 列表项
- **加粗**
- `行内代码`

```ts
console.log('hello blog');
```
````

说明：

1. 文件名会作为文章 slug
2. `my-story.md` 会映射到 `/blog/my-story`
3. 保存后刷新页面即可看到新文章

---

## ⚙️ API 概览

除 Telegram Webhook 外，其余账本接口都需要携带请求头：

```http
Authorization: Bearer <API_KEY>
```

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/list` | 获取交易记录列表 |
| `POST` | `/api/add` | 新增交易记录 |
| `PATCH` | `/api/edit` | 编辑交易记录 |
| `DELETE` | `/api/delete` | 删除交易记录 |
| `POST` | `/api/telegram` | Telegram Webhook，自然语言记账入口 |

---

## 🤖 Telegram Bot 接入

如果你想通过 Telegram 直接记账，需要把 Bot Webhook 指向：

```text
https://your-domain.com/api/telegram
```

配置完成后，就可以直接给机器人发消息记账，例如：

- `午饭 35`
- `工资 +5000`
- `咖啡 28 饮品`

如果本地调试 Webhook，可以先运行开发环境，再使用 `ngrok` 等工具把本地端口暴露到公网。

---

## 📁 项目结构

```text
.
├── app/
│   ├── page.tsx                 # 首页，两个模块的入口
│   ├── ledger/
│   │   └── page.tsx             # 小账本页面
│   ├── blog/
│   │   ├── page.tsx             # 成长 Log 列表页
│   │   ├── blog-list-client.tsx
│   │   └── [slug]/
│   │       ├── page.tsx         # 文章详情页
│   │       └── markdown-content.tsx
│   └── api/
│       ├── add/route.ts
│       ├── edit/route.ts
│       ├── delete/route.ts
│       ├── list/route.ts
│       └── telegram/route.ts
├── content/
│   └── blog/                    # Markdown 文章内容
├── lib/
│   ├── auth.ts                  # 鉴权逻辑
│   ├── blog.ts                  # 博客读取与解析
│   ├── parser.ts                # 自然语言记账解析
│   └── supabase.ts              # Supabase 客户端
├── public/
└── schema.sql                   # 数据表初始化脚本
```

---

## 💡 适合继续扩展的方向

- 账本统计图表与月度分析
- 更智能的自然语言解析
- 标签系统 / 多账本支持
- 博客草稿、置顶、封面图等内容能力
- 登录体系与多用户隔离

---

## 📄 License

MIT
