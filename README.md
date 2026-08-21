# 鱼蛋看板

一个给家庭使用的轻量记录站，把 **疫苗与体重**、**日常账本** 和 **成长日志** 放在一起。

**正式地址：[https://cost.ykn.cm](https://cost.ykn.cm)**

## 现在能做什么

### 疫苗与体重看板 `/`

- 根据出生日期自动生成建议接种日期
- 按常规接种时间排序，直接对照建议日期与实际日期
- 以中国国家免疫规划为主，参考美国 CDC 儿童接种程序补充自费项目
- 记录体重、身高、头围与备注，展示体重趋势
- 手机和 PC 自适应布局
- 通过 Supabase 跨设备同步

> 看板用于家庭记录和就诊前整理，不代替接种门诊、儿科医生或当地卫生部门的个体化建议。

### 鱼蛋小账本 `/ledger`

- 记录、编辑和删除收支
- 月度汇总、趋势图、分类统计和日历热力图
- 按月份、类型、分类和关键词查询
- 游标分页，避免一次加载全部明细
- 网页可使用授权 GitHub 账号或 API Key 写入
- Telegram 等外部工具可继续通过 API Key 记账

### 成长日志 `/blog`

- 使用 Markdown + Frontmatter 管理内容
- 支持 GFM、代码高亮和文章详情页
- 按日期倒序展示家庭与成长记录

## 权限模型

站点默认使用 Supabase GitHub OAuth。

| 区域 | 读取 | 写入 |
| --- | --- | --- |
| 疫苗与体重看板 | 授权所有者 | 仅 GitHub 邮箱 `William.chen@utah.edu` |
| 账本页面 | 公开只读 | 授权 GitHub 账号或 API Key |
| 账本写入 API | 不适用 | Supabase access token 或 `Authorization: Bearer <API_KEY>` |

数据库安全策略：

- `transactions` 开启 RLS，`anon` 和 `authenticated` 只授予 `SELECT`
- 所有账本写入先在服务端验证 GitHub 身份或 API Key
- 通过验证后，服务端使用 Supabase Secret Key 执行写入
- `yudan_dashboards` 的 RLS 同时检查用户 ID、GitHub Provider 和指定邮箱
- Supabase Secret Key 只存在服务端环境变量中，不会发送到浏览器

## 技术栈

| 层面 | 技术 |
| --- | --- |
| 框架 | Astro 6 |
| 交互组件 | React 19 + `@astrojs/react` |
| UI | Tailwind CSS 4、Radix UI、Lucide Icons |
| 图表 | Recharts |
| 数据库与登录 | Supabase PostgreSQL + Auth + RLS |
| 部署 | Vercel + `@astrojs/vercel` |
| 内容 | Astro Content Collections + Markdown |

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

在项目根目录创建 `.env.local`：

```bash
API_KEY=your_secret_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_SECRET_KEY=your_supabase_secret_key
BASE_URL=http://localhost:4321

# 可选，当前为 AI 功能预留
MIMO_BASE_URL=your_mimo_api_base_url
MIMO_API_KEY=your_mimo_api_key
```

`SUPABASE_SECRET_KEY` 必须仅用于服务端，不要添加 `NEXT_PUBLIC_` 前缀，也不要提交到 Git。

### 3. 初始化数据库

新建数据库时，在 Supabase SQL Editor 中依次执行：

1. `schema.sql`：创建账本表、索引和聚合函数。
2. `yudan-schema.sql`：创建疫苗与体重看板表和所有者 RLS。

已有数据库升级权限时执行：

1. `access-control.sql`：开启账本 RLS、限制表权限、更新看板策略并撤销管理函数的公开执行权。

### 4. 配置 GitHub OAuth

1. 在 GitHub 创建 OAuth App。
2. Homepage URL 设为正式域名。
3. Authorization callback URL 设为 `https://<project-ref>.supabase.co/auth/v1/callback`。
4. 在 Supabase Auth 启用 GitHub Provider，填入 Client ID 和 Client Secret。
5. Supabase Site URL 设为 `https://cost.ykn.cm`。
6. Redirect URLs 加入正式域名、Vercel 预览域名和本地地址。

### 5. 启动与构建

```bash
npm run dev
npm run build
npm run start
```

默认本地地址：

- 看板：<http://localhost:4321>
- 账本：<http://localhost:4321/ledger>
- 日志：<http://localhost:4321/blog>
- 开发日记：<http://localhost:4321/about>

## Vercel 部署

项目使用 Astro server output 和 Vercel adapter。Vercel 项目建议配置：

- Framework Preset：`Astro`
- Build Command：`npm run build`
- Output Directory：交给 adapter 管理，不要填 `.next`
- Production Domain：`cost.ykn.cm`
- `BASE_URL`：`https://cost.ykn.cm`
- Production / Preview 都需要 Supabase 相关环境变量

向功能分支推送时，Vercel 自动创建 Preview Deployment；合并到 `main` 后自动发布生产环境。

## API

| 方法 | 路径 | 说明 | 认证 |
| --- | --- | --- | --- |
| `GET` | `/api/list` | 游标分页查询交易记录 | 无 |
| `GET` | `/api/monthly` | 月度聚合数据 | 无 |
| `GET` | `/api/daily` | 某日支出明细 | 无 |
| `POST` | `/api/add` | 新增交易记录 | GitHub token / API Key |
| `PATCH` | `/api/edit` | 编辑交易记录 | GitHub token / API Key |
| `DELETE` | `/api/delete` | 删除交易记录 | GitHub token / API Key |
| `GET` | `/api/yudan` | 读取疫苗与体重云端记录 | API Key |
| `POST` | `/api/yudan/weight` | 按日期新增或更新体重 | API Key |
| `POST` | `/api/yudan/vaccine` | 登记某一剂疫苗的实际接种日期 | API Key |
| `POST` | `/api/telegram` | Telegram Webhook | 现有 Webhook 流程 |
| `POST` | `/api/blog/chat` | 文章 AI 问答，迁移中暂停 | 无 |

### 看板 API 示例

所有看板 API 请求都需要：

```http
Authorization: Bearer <API_KEY>
Content-Type: application/json
```

记录体重（单位：kg）：

```bash
curl -X POST https://cost.ykn.cm/api/yudan/weight \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-08-21","weight":3.4}'
```

同一日期再次调用时会更新原记录，不会新增重复项。

登记疫苗：

```bash
curl -X POST https://cost.ykn.cm/api/yudan/vaccine \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "vaccine":"乙肝疫苗",
    "dose":"第 1 剂",
    "age_label":"出生后 24 小时内",
    "actual_date":"2026-08-21"
  }'
```

“疫苗 + 剂次 + 月龄标签”相同时会更新实际接种日期。日期统一使用 `YYYY-MM-DD`，不接受未来日期。

读取当前云端记录：

```bash
curl https://cost.ykn.cm/api/yudan \
  -H "Authorization: Bearer <API_KEY>"
```

## 项目结构

```text
.
|-- astro.config.mjs
|-- access-control.sql
|-- schema.sql
|-- yudan-schema.sql
|-- content/blog/
|-- lib/
|   |-- auth.ts
|   |-- supabase.ts
|   `-- supabase-browser.ts
`-- src/
    |-- components/
    |   |-- ledger/
    |   `-- yudan/
    |-- layouts/
    |-- lib/
    |   |-- http.ts
    |   `-- yudan-api.ts
    `-- pages/
        |-- api/
        |-- about.astro
        |-- index.astro
        `-- ledger.astro
```

## 更新记录

站点内的开发日记会记录影响较大的变化：[https://cost.ykn.cm/about](https://cost.ykn.cm/about)

## License

MIT
