# 鱼蛋看板

一个给家庭使用的轻量记录站，把 **体重与疫苗**、**日常账本** 和 **成长日志** 放在一起。

**正式地址：[https://cost.ykn.cm](https://cost.ykn.cm)**

## 现在能做什么

### 体重与疫苗看板 `/`

- 首页优先展示最新体重，并同时对照 WHO 0–2 岁男童标准与中国 `WS/T 423—2022` 男童标准
- 显示同龄百分位、参考区间和中位数，帮助连续观察体重趋势
- 未登录时展示明确标注的示例看板，不读取或公开真实体重和接种记录
- GitHub 授权登录后切换为云端真实记录，并开放体重、疫苗等编辑入口
- 固定以 `2026-08-12` 为出生日期，统一计算年龄、体重标准和疫苗建议日期
- 根据出生日期自动生成建议接种日期
- 按常规接种时间排序，直接对照建议日期与实际日期
- 登录后的疫苗清单由数据库维护；当前更新按用户提供的三张方案图整理，费用为图片参考价
- 记录体重、身高、头围与备注，展示体重趋势
- 手机和 PC 自适应布局
- 通过 Supabase 跨设备同步
- 体重和接种均按独立数据库行保存，不再使用 JSON 数组字段

> 生长标准用于观察位置和连续趋势，单次结果需结合身长、喂养和儿保评估；看板不代替接种门诊、儿科医生或当地卫生部门的个体化建议。

### 鱼蛋小账本 `/ledger`

- 记录、编辑和删除收支
- 月度汇总、趋势图、分类统计和日历热力图
- 按月份、类型、分类和关键词查询
- 游标分页，避免一次加载全部明细
- 网页可使用授权 GitHub 账号或 API Key 写入
- Telegram 记账入口已停用；网页和直接 API 记账仍可用

### 成长日志 `/blog`

- 使用 Markdown + Frontmatter 管理内容
- 支持 GFM、代码高亮和文章详情页
- 按日期倒序展示家庭与成长记录

### AI 工具接入 `/api/mcp`

- 使用官方 MCP TypeScript SDK 提供无状态 Streamable HTTP 接口，适合 Vercel 部署
- 复用 `API_KEY` 认证，所有工具均需 `Authorization: Bearer <API_KEY>`
- 提供账单查询、月度汇总、新增/编辑/删除账单，以及健康档案、疫苗计划、儿保安排和体重/接种登记共 10 个工具
- 写入复用现有 API 校验、幂等回执和并发版本检查，不需要额外数据库迁移
- 在独立的 [MCP 接入指南](https://cost.ykn.cm/mcp)查看 Cursor、Claude Code 配置、对话示例和排错说明；本地指南在 `http://localhost:4321/mcp`。原 `/about#mcp` 入口保留并指向新页面。
- 当前为固定 API Key 接入，客户端需要支持自定义 HTTP 请求头；尚未提供 OAuth

正式 MCP 连接地址是 `https://cost.ykn.cm/api/mcp`，介绍页中的复制按钮和客户端配置均使用此地址。部署时沿用本文的环境变量与数据库迁移步骤即可；开发者调试本地服务时，可手动将连接地址改为 `http://localhost:4321/api/mcp`。直接用浏览器打开端点不会建立 MCP 连接，浏览使用说明请访问 `/mcp`。

## 权限模型

站点默认使用 Supabase GitHub OAuth。

| 区域 | 读取 | 写入 |
| --- | --- | --- |
| 体重与疫苗看板 | 访客仅查看示例数据 | 仅 GitHub 邮箱 `William.chen@utah.edu` 查看真实记录并编辑 |
| 账本页面 | 公开只读 | 授权 GitHub 账号或 API Key |
| 账本写入 API | 不适用 | Supabase access token 或 `Authorization: Bearer <API_KEY>` |

数据库安全策略：

- `transactions` 开启 RLS，`anon` 和 `authenticated` 只授予 `SELECT`
- 所有账本写入先在服务端验证 GitHub 身份或 API Key
- 通过验证后，服务端使用 Supabase Secret Key 执行写入
- `yudan_dashboards`、`yudan_weight_records` 和 `yudan_vaccine_records` 只授予浏览器 `SELECT`；读取 RLS 同时检查用户 ID、GitHub Provider 和指定邮箱，写入由服务端认证后调用专用 RPC
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

# 文章 AI 问答（公开访客功能；启用时必填）
MIMO_BASE_URL=your_mimo_api_base_url
MIMO_API_KEY=your_mimo_api_key
BLOG_CHAT_COOKIE_SECRET=at-least-32-random-characters

# 可选限额（默认：单访客单文章每天 5 次、全站每天 100 次）
BLOG_CHAT_DAILY_LIMIT=5
BLOG_CHAT_GLOBAL_DAILY_LIMIT=100
BLOG_CHAT_RATE_LIMIT=3
BLOG_CHAT_GLOBAL_RATE_LIMIT=20
BLOG_CHAT_MAX_OUTPUT_TOKENS=800
```

`SUPABASE_SECRET_KEY` 必须仅用于服务端，不要添加 `NEXT_PUBLIC_` 前缀，也不要提交到 Git。

### 3. 初始化和升级数据库

空库或结构尚未核实的已有数据库使用下方完整顺序；已核实完成独立行规范化的旧库可使用后面的最小发布流程。SQL 需要数据库所有者权限；先在隔离数据库验证，再在维护窗口执行。**当前应用必须有健康写入 RPC、账本查询/写入 RPC 和问答配额 RPC；仅执行建表文件不够。**

| 顺序 | SQL 文件 | 用途 |
| --- | --- | --- |
| 1 | `schema.sql` | 创建账本基础表和公开只读策略；已有表不重建 |
| 2 | `health-schema.sql` | 创建疫苗目录；仅空目录播种旧计划 ID，重跑保留已有目录 |
| 3 | `yudan-schema.sql` | 创建健康记录表；旧 JSON 记录在事务中转为独立行，校验条数后移除旧列 |
| 4 | `access-control.sql` | 统一读取权限；浏览器不能直接写健康表或账本表 |
| 5 | `supabase/migrations/20260908031942_ledger_brand_product.sql` | 升级旧账本品牌/商品字段，并保留原始记录备份 |
| 6 | `supabase/migrations/202609240001_health_record_mutations.sql` | 必需：健康记录事务写入、版本检查和幂等回执 |
| 7 | `supabase/migrations/202609240002_ledger_queries.sql` | 必需：账本筛选分页、分类来源和月度汇总 |
| 8 | `supabase/migrations/202609240003_blog_chat_limits.sql` | 必需：文章问答原子配额和仅服务端可调用的函数 |
| 9 | `supabase/migrations/20260924073648_ledger_mutations.sql` | 必需：账本版本、原子写入与持久幂等回执；在账本查询迁移之后执行 |
| 10 | `supabase/migrations/20260924081517_ledger_baseline_objects.sql` | 补账本交易时间索引与只读总支出函数；无需重建已有表或权限策略 |
| 11 | `scripts/check-database.sql` | 只读检查必需函数、索引、RLS、浏览器/服务端权限及预期版本/名称清单 |

SQL Editor 每次完整执行一个文件，有错误立即停止。已升级的数据库可重跑上述顺序；重复执行保留业务记录、健康元数据、幂等回执与问答额度，不会重新开放浏览器写权限。旧 JSON 有重复日期、无法匹配的计划等问题时，规范化会中止并保留原始数据，应先核对原记录再重试。

第 11 步的所有 `ok` 必须为 `true`，然后部署对应应用版本。在已包含“显示停用疫苗历史”功能的应用上线后，执行 `vaccine-catalog-update.sql` 更新为用户三张图片中的 30 条剂次（`2026-09-22-user-images`）；再核对旧接种记录和元数据。该目录脚本可重复执行，不删除停用计划或接种历史，图片参考价与待核对的间隔保留在备注中，不作为官方免疫程序。首次新建数据库也按相同顺序执行。

**已完成健康独立行转换的旧库：最小发布流程**

2026-09-24 对 YUDAN 项目的只读结构预检确认：健康表已独立存储、旧 JSON 列已移除，外键与业务唯一键齐全，账本品牌/商品迁移已登记；现有 owner 读取策略和服务端授权有效。旧健康唯一约束名称与新建库不同，预检按表和唯一列语义检查，不要求改名或建立重复索引。

对于满足这些条件、尚未安装下列 RPC 的数据库，依次执行：

1. `20260924081517_ledger_baseline_objects.sql`：只补交易时间索引和 `total_expense()`。
2. `202609240002_ledger_queries.sql`。
3. `202609240003_blog_chat_limits.sql`。
4. `20260924073648_ledger_mutations.sql`。
5. 紧邻应用切换时执行 `202609240001_health_record_mutations.sql`：该文件已在同一事务内建立健康写入 RPC 并收回三个健康表的浏览器增删改权限；上述读取策略与授权已满足要求时，无需再执行整个 `access-control.sql`。
6. 运行 `scripts/check-database.sql`，全部通过后切换对应新应用，并验证网页流程。

此流程不重跑基础建表、旧品牌内容转换、健康 JSON 转换或疫苗目录更新。第 5 步之后，尚未刷新的旧健康网页可能无法保存，应刷新到新版本；新应用依赖 RPC，应先完成迁移再切换。账本新增的 `version` 与更新触发器兼容旧服务端直接写入，并为更新自动递增版本。

**发布记录与验证**

- 每次发布记录应用 Git commit、SQL 文件名、SHA-256、执行时间、执行人、备份位置和检查结果；版本顺序以本表为准，不按零散旧说明补脚本。
- SQL Editor 不会自动写入 Supabase CLI 迁移历史。只读检查会报告 `cli_history_available`、`expected_versions` 和 `expected_names`；若项目由 CLI 管理，再核对 `supabase_migrations.schema_migrations`。Supabase MCP 应用迁移时可能分配不同于本地文件时间戳的服务端版本，应结合迁移名称、发布 SHA-256 与对象检查核对，不能只比较版本数字。对象检查通过不等于证明执行过某个版本的原始文件，仍需保存发布记录。
- 本地运行 `node --test tests/database-upgrade.test.cjs tests/health-database.test.cjs tests/ledger-mutations-database.test.cjs tests/blog-chat-database.test.cjs`。测试使用隔离的内存 PostgreSQL，不读取 `.env` 或连接线上数据库；缺少测试依赖会失败，不静默跳过。
- 在预览环境验证授权账号读取历史、保存单条健康记录、账本跨年查询、匿名只读和问答额度；检查数据库 Advisors。迁移检查通过不替代应用端验证。

**备份和失败回退**

1. 暂停写入，确认 Supabase 可用备份及恢复时间点，另保存完整数据库结构与数据备份（含 Auth 用户关联、旧 JSON、健康元数据、账本备份表和问答配额表），在隔离环境试恢复。仅导出 CSV 不足以恢复权限和函数。
2. 保存升级前记录数、账本金额合计、健康记录及其元数据快照，执行上述文件后逐项比较；只读检查仅读数据库目录，不读取个人记录或消耗问答额度。
3. 每个升级文件均包含事务。单个文件失败时执行 `ROLLBACK`，修复原因后重跑该文件；SQL Editor 显示成功前不要继续。
4. 迁移成功但应用验证失败时先暂停写入，保留现场和检查输出，优先修复兼容问题。新健康写入依赖 RPC，不能通过重授浏览器写表权限回退；需要回退数据库时，恢复已验证备份并同时回退匹配的应用版本，核对备份之后的新增记录再恢复写入。不要用删除表、列或 RPC 充当逆向迁移。

标准化后的数据表：

| 表 | 用途 | 业务唯一键 |
| --- | --- | --- |
| `yudan_dashboards` | 宝宝资料与出生日期 | `user_id` |
| `yudan_weight_records` | 每次体重、身高和头围测量 | `user_id + measured_on` |
| `yudan_vaccine_records` | 每次实际接种记录及批号等元数据 | `user_id + plan_id` |
| `yudan_vaccine_catalog` | 疫苗计划目录，含停用历史计划 | `id` |
| `yudan_health_mutation_receipts` | 健康写入幂等回执，仅服务端访问 | `user_id + request_id` |
| `ledger_mutation_receipts` | 账本写入幂等回执，仅服务端访问；回执在原记录删除后仍保留 | `request_id` |

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

提交前执行 `npm run check`，包含业务代码 ESLint、Astro/TypeScript 类型检查和隔离 PostgreSQL 测试。使用锁文件安装依赖：`npm ci`。测试缺少必需依赖时会失败，不会跳过数据库验证。

浏览器回归使用本地测试服务和模拟 API，不访问线上数据：

```bash
npx playwright install chromium
npm run test:e2e
```

测试覆盖手机端搜索未加载记录、按月导出、空结果恢复、月份响应乱序、失败重试，以及禁用存储仍可保存、丢失响应的安全重试、重新授权、编辑/删除冲突处理，并使用纽约时区验证北京时间账本。若本机已安装 Chrome，可设置 `PLAYWRIGHT_CHANNEL=chrome` 复用浏览器；PowerShell 示例：`$env:PLAYWRIGHT_CHANNEL='chrome'; npm run test:e2e`。Linux CI 会自动安装测试浏览器并运行检查、构建和浏览器回归。

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

完整请求字段、响应结构和错误码见 [API 使用指南](./API.md)。API 继续使用 JSON 作为
HTTP 传输格式，但数据库内部记录已改为标准关系表，不再保存 JSON 数组。

| 方法 | 路径 | 说明 | 认证 |
| --- | --- | --- | --- |
| `GET` | `/api/list` | 游标分页查询交易记录 | 无 |
| `GET` | `/api/monthly` | 月度聚合数据 | 无 |
| `GET` | `/api/daily` | 某日支出明细 | 无 |
| `POST` | `/api/add` | 新增交易记录 | GitHub token / API Key |
| `PATCH` | `/api/edit` | 编辑交易记录 | GitHub token / API Key |
| `DELETE` | `/api/delete` | 删除交易记录 | GitHub token / API Key |
| `GET` | `/api/yudan` | 读取疫苗与体重云端记录 | API Key |
| `GET` | `/api/yudan/vaccines` | 读取标准疫苗目录、建议日期和实际日期 | API Key |
| `POST` | `/api/yudan/weight` | 按日期新增或更新体重 | API Key |
| `POST` | `/api/yudan/vaccine` | 按计划 ID 或疫苗信息登记实际日期 | API Key |
| `POST` | `/api/telegram` | 已停用（返回 `410`） | 无 |
| `GET` | `/api/blog/chat?slug=<slug>` | 查询文章问答可用状态和剩余次数 | 签名访客 Cookie |
| `POST` | `/api/blog/chat` | 文章 AI 问答（流式） | 签名访客 Cookie |

### 健康记录并发保存

网页保存使用 `POST /api/yudan/records`，请求体包含 `request_id`、`kind`、`key`、`action`、`changes` 和读取时的 `expected_updated_at`。省略版本字段时，旧版 API Key 接口继续执行兼容的 upsert；网页请求带版本时，记录被其他设备更新会返回 `409`，响应中的 `current` 提供云端值。重复使用同一个 `request_id` 会返回第一次结果，适合网络超时后的安全重试。

### 账本字段与代理技能

账本使用独立的 `brand`（品牌）、`product`（商品）字段，`note` 保存店铺、订单号和优惠。
完整规范见 [账单 skill](content/blog/bill-skill.md)，可安装版本在 [skills/yudan-bills/SKILL.md](skills/yudan-bills/SKILL.md)。
数据库按上方“初始化和升级数据库”顺序执行。品牌/商品迁移保留原始记录备份，并校验金额、时间和分类不变；新项目也需补齐全部必需 RPC。

新增、编辑、删除均可使用客户端生成的 UUID `request_id` 安全重试；重试必须保持 ID 和内容不变。编辑与删除必须携带所读账单的 `expected_version`，版本冲突返回 `409` 并保留网页输入。原有无版本的编辑/删除脚本需同步更新，不能依靠旧版无条件写入。完整示例与错误码见 [API 说明](API.md#账本保存重试与冲突)。本地存储不可用时，API Key 可在当前会话使用，记住分类失败不影响账单保存。

验证账本规则：`npm test`；验证完整页面流程：`npm run test:e2e`。

### 看板 API 示例

所有看板 API 请求都需要：

```http
Authorization: Bearer <API_KEY>
Content-Type: application/json
```

记录体重（单位：kg）：

```bash
export MEASURED_DATE="YYYY-MM-DD"
export MEASURED_WEIGHT="KG"

curl -X POST https://cost.ykn.cm/api/yudan/weight \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d "{\"date\":\"${MEASURED_DATE}\",\"weight\":${MEASURED_WEIGHT}}"
```

同一日期再次调用时会更新原记录，不会新增重复项。

先读取疫苗目录，取得稳定的 `plan_id`：

```bash
curl https://cost.ykn.cm/api/yudan/vaccines \
  -H "Authorization: Bearer <API_KEY>"
```

推荐使用 `plan_id` 登记疫苗，调用方不再需要填写年龄标签：

```bash
export VACCINATION_DATE="YYYY-MM-DD"

curl -X POST https://cost.ykn.cm/api/yudan/vaccine \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d "{\"plan_id\":\"schedule-001\",\"actual_date\":\"${VACCINATION_DATE}\"}"
```

也可以只传 `vaccine`、`dose` 和 `actual_date`，服务端会先查询数据库中的标准名称与别名（如 `乙肝`、`HepB`、`A群流脑疫苗`），再自动补齐标准名称、剂次和年龄标签。目录响应还包含地区版本、预防疾病、适用人群、程序备注和来源。匹配到多个项目时返回 `409` 和候选 `plan_id`，不会猜测或创建重复标签。相同计划再次调用会更新实际日期。日期统一使用 `YYYY-MM-DD`，不接受未来日期。

读取当前云端记录：

```bash
curl https://cost.ykn.cm/api/yudan \
  -H "Authorization: Bearer <API_KEY>"
```

## 项目结构

```text
.
|-- API.md
|-- astro.config.mjs
|-- access-control.sql
|-- health-schema.sql
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
        |-- health.astro
        |-- index.astro
        `-- ledger.astro
```

## 更新记录

站点内的开发日记会记录影响较大的变化：[https://cost.ykn.cm/about](https://cost.ykn.cm/about)

## License

MIT
