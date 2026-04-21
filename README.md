# 🐟 鱼蛋花费

一个极简的个人生活平台，目前包含两个核心模块：**小账本** 和 **成长 Log**。

基于 Next.js (App Router) 构建，支持 Telegram Bot 自然语言记账，成长日志使用纯静态 Markdown 文件驱动。

---

## ✨ 功能模块

### 📒 鱼蛋小账本 (`/ledger`)

个人记账工具，支持收支记录、搜索、筛选和编辑。

- **收支管理**：记录收入和支出，自动计算余额
- **分类筛选**：按收入/支出类型筛选，按分类标签快速过滤
- **关键词搜索**：搜索备注或分类
- **编辑/删除**：点击记录可查看详情、编辑或删除（需配置 API Key）
- **Telegram Bot**：通过 Telegram 发送自然语言消息自动记账（如 `午饭 35`）
- **安全**：通过 Bearer Token 鉴权，API Key 存储在浏览器本地

### 🌱 成长 Log (`/blog`)

纯静态博客模块，使用 Markdown 文件作为数据源，无需数据库。

- **Markdown 驱动**：在 `content/blog/` 目录下新建 `.md` 文件即可发布
- **Frontmatter 支持**：通过 YAML 头部定义标题和日期
- **自动排序**：文章按日期倒序展示
- **精美渲染**：使用 `react-markdown` + Tailwind Typography 样式渲染
- **完全静态**：支持 SSG 静态生成，无需 API 调用

---

## 🧱 技术栈

| 层面 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router, Turbopack) |
| 语言 | TypeScript |
| 样式 | Tailwind CSS 4 |
| UI 组件 | Radix UI (Dialog, Separator) |
| 数据库 | Supabase (PostgreSQL) — 仅账本模块 |
| Markdown | react-markdown + gray-matter |
| Bot | Telegram Webhook |
| 鉴权 | Bearer Token (API_KEY) |

---

## 📁 项目结构

```
├── app/
│   ├── page.tsx              # 首页 - 模块入口
│   ├── ledger/
│   │   └── page.tsx          # 账本模块
│   ├── blog/
│   │   ├── page.tsx          # 成长 Log 列表页
│   │   └── [slug]/
│   │       ├── page.tsx      # 文章详情页
│   │       └── markdown-content.tsx  # Markdown 渲染组件
│   └── api/                  # API 路由 (记账相关)
├── content/
│   └── blog/                 # Markdown 文章目录
│       └── hello-world.md    # 示例文章
├── lib/
│   ├── blog.ts               # 博客工具 (读取/解析 md)
│   ├── supabase.ts           # Supabase 客户端
│   ├── parser.ts             # 自然语言解析
│   ├── auth.ts               # 鉴权工具
│   └── utils.ts              # 通用工具
└── components/
    └── ui/                   # UI 组件库
```

---

## 🛠 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env.local` 文件：

```bash
API_KEY=your_secret_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
BASE_URL=http://localhost:3000
```

### 3. 初始化数据库

在 Supabase SQL Editor 中运行 `schema.sql` 创建 `transactions` 表。

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 即可看到模块入口页。

---

## 📝 如何写成长日志

1. 在 `content/blog/` 目录下创建一个 `.md` 文件，例如 `my-story.md`
2. 文件顶部添加 frontmatter：

```md
---
title: 我的标题
date: 2026-04-21
---

正文内容，支持标准 Markdown 语法...

## 二级标题
- 列表项
- **加粗**、*斜体*

> 引用

![图片](url)
```

3. 保存后刷新页面，文章会自动出现在成长 Log 列表中
4. 文件名即为 URL slug，例如 `my-story.md` → `/blog/my-story`

---

## ⚙️ API 接口

所有接口（除 `/api/telegram`）需要 `Authorization: Bearer <API_KEY>` 请求头。

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/add` | 添加交易记录 |
| `PATCH` | `/api/edit` | 编辑交易记录 |
| `DELETE` | `/api/delete` | 删除交易记录 |
| `GET` | `/api/list` | 获取所有交易记录 |
| `POST` | `/api/telegram` | Telegram Webhook（自然语言记账） |

---

## 🤖 Telegram Bot 记账

配置 Telegram Bot Webhook 指向 `/api/telegram`，然后发送自然语言消息即可自动记账：

- `午饭 35` → 支出 ¥35，备注"午饭"
- `工资 +5000` → 收入 ¥5000，备注"工资"
- `咖啡 28 饮品` → 支出 ¥28，备注"咖啡"，分类"饮品"

---

## 📄 License

MIT
