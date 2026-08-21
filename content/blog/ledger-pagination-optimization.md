---
title: 🐟 鱼蛋看板与小账本 API 使用教程
date: 2026-08-21
summary: 鱼蛋看板与小账本 API 完整文档，包含 API Key 鉴权、疫苗和体重写入，以及账本增删改查的请求示例与响应结构。
tags:
  - 技术笔记
  - 鱼蛋小账本
  - API 教程
cover: /logo.png
---

## 概览

鱼蛋站点提供 10 个主要 REST API，用于记录疫苗、体重和家庭收支。所有接口返回 JSON；看板接口统一使用 API Key，账本写入接口接受 API Key 或授权的 GitHub 登录令牌。

| 接口 | 方法 | 用途 | 认证 |
|------|------|------|------|
| `/api/list` | GET | 分页查询交易记录 | 否 |
| `/api/monthly` | GET | 月度聚合数据 | 否 |
| `/api/daily` | GET | 某日支出明细 | 否 |
| `/api/add` | POST | 新增交易 | 是 |
| `/api/edit` | PATCH | 修改交易 | 是 |
| `/api/delete` | DELETE | 删除交易 | 是 |
| `/api/yudan` | GET | 读取疫苗和体重记录 | 是 |
| `/api/yudan/vaccines` | GET | 读取标准疫苗目录与计划 ID | 是 |
| `/api/yudan/weight` | POST | 新增或更新体重 | 是 |
| `/api/yudan/vaccine` | POST | 登记实际接种日期 | 是 |

---

## 认证

调用看板接口，或通过 API 写入账本时，需要在请求头中携带 API Key：

```
Authorization: Bearer <API_KEY>
```

API Key 已配置在 Vercel 的 `API_KEY` 环境变量中。不要把真实 Key 写进网页、前端 JavaScript、GitHub 仓库或聊天记录；应把它保存在调用方的环境变量或密钥管理器中。

在终端中可以临时设置一个只在当前会话生效的变量：

```bash
# macOS / Linux
export YUDAN_API_KEY='你的 API Key'
```

```powershell
# Windows PowerShell
$env:YUDAN_API_KEY = '你的 API Key'
```

账本的查询接口 `/api/list`、`/api/monthly` 和 `/api/daily` 仍可公开读取。

---

## 疫苗与体重看板 API

看板 API 的正式地址统一以 `https://cost.ykn.cm` 开头。日期必须使用 `YYYY-MM-DD` 格式，并且不能晚于当天。

### 读取当前看板记录

```http
GET /api/yudan
```

```bash
curl "https://cost.ykn.cm/api/yudan" \
  -H "Authorization: Bearer $YUDAN_API_KEY"
```

成功时返回出生日期、已完成的疫苗记录、体重记录和最后更新时间。字段结构如下，不包含任何真实记录：

```typescript
interface DashboardResponse {
  success: true;
  data: {
    birthday: string | null;
    vaccine_records: Array<{
      id: string;
      vaccine: string;
      dose: string;
      ageLabel: string;
      doneDate: string;
    }>;
    weight_records: Array<{
      id: string;
      date: string;
      weight: number;
    }>;
    updated_at: string;
  };
}
```

### 写入体重

```http
POST /api/yudan/weight
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `date` | string | 是 | 测量日期，格式为 `YYYY-MM-DD` |
| `weight` | number | 是 | 体重，单位为 kg，允许范围 `0.1` 到 `200` |

```bash
MEASURED_DATE='<YYYY-MM-DD>'
WEIGHT_KG='<KG>'

curl -X POST "https://cost.ykn.cm/api/yudan/weight" \
  -H "Authorization: Bearer $YUDAN_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"date\":\"$MEASURED_DATE\",\"weight\":$WEIGHT_KG}"
```

成功时，`data.record` 返回保存后的记录，`data.created` 表示这次是新建还是更新。

同一天再次调用会更新原记录，而不是产生重复数据。此时响应中的 `created` 为 `false`。

### 写入实际接种日期

```http
POST /api/yudan/vaccine
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `plan_id` | string | 推荐 | 标准疫苗目录中的稳定 ID，例如 `schedule-001` |
| `vaccine` | string | 条件必填 | 未提供 `plan_id` 时用于自动查询疫苗 |
| `dose` | string | 否 | 配合 `vaccine` 缩小到具体剂次 |
| `actual_date` | string | 是 | 实际接种日期，格式为 `YYYY-MM-DD` |

先读取数据库中的标准目录：

```bash
curl "https://cost.ykn.cm/api/yudan/vaccines" \
  -H "Authorization: Bearer $YUDAN_API_KEY"
```

目录会返回每一项的 `plan_id`、标准名称、剂次、年龄标签、建议日期、现有实际日期，以及 `region`、`schedule_version`、`prevents`、`audience`、`schedule_note` 和 `source`。当前目录采用浙江省杭州市 `2026-08` 清单，共 46 个稳定计划项。推荐直接使用返回的 `plan_id` 写入：

```bash
VACCINATION_DATE='<YYYY-MM-DD>'

curl -X POST "https://cost.ykn.cm/api/yudan/vaccine" \
  -H "Authorization: Bearer $YUDAN_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"plan_id\":\"schedule-001\",\"actual_date\":\"$VACCINATION_DATE\"}"
```

成功时，`data.record` 返回保存后的接种记录，`data.created` 表示这次是新建还是更新。

不方便提前读取目录时，也可以传 `vaccine` 和 `dose`。服务端会查询标准名称及别名，例如 `乙肝`、`HepB`、`A群流脑疫苗` 都会先归一到数据库中的正式名称，再自动补齐剂次和年龄标签，不再要求调用方填写 `age_label`。如果匹配到多个项目，接口返回 `409` 和 `candidates`，调用方从中选择 `plan_id` 后重试；系统不会猜测或创建重复标签。同一 `plan_id` 再次写入会更新实际日期，`created` 返回 `false`。

### 在 JavaScript 或自动化工具中调用

服务端脚本、定时任务、快捷指令或自动化平台都可以调用这组接口。下面是一个 Node.js 示例：

```javascript
const baseUrl = 'https://cost.ykn.cm';
const apiKey = process.env.YUDAN_API_KEY;

if (!apiKey) throw new Error('缺少 YUDAN_API_KEY');

async function callYudanApi(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `请求失败：${response.status}`);
  return result.data;
}

await callYudanApi('/api/yudan/weight', {
  date: process.env.MEASURED_DATE,
  weight: Number(process.env.WEIGHT_KG),
});

await callYudanApi('/api/yudan/vaccine', {
  plan_id: 'schedule-001',
  actual_date: process.env.VACCINATION_DATE,
});
```

### 看板 API 常见错误

| 状态码 | 原因 |
|--------|------|
| 400 | JSON、日期、体重或疫苗字段不符合要求 |
| 401 | API Key 无效或没有提供 |
| 404 | 标准疫苗目录中没有匹配项目 |
| 409 | 匹配到多个项目，需要从候选项选择 `plan_id` |
| 500 | 数据库连接或服务端更新失败 |

API Key 只决定是否允许 API 调用；真正的数据写入仍由服务端完成，Supabase Secret Key 不会发送给调用方。

---

## 1. 查询交易列表（游标分页）

```
GET /api/list
```

### 请求参数（Query）

| 参数 | 类型 | 必填 | 说明 | 默认值 |
|------|------|------|------|--------|
| `limit` | number | 否 | 每页条数，最大 100 | 30 |
| `cursor` | string | 否 | 上一页最后一条的 `created_at`（ISO 8601），首次加载不传 | - |
| `type` | string | 否 | 筛选类型：`expense` 或 `income` | 不筛选 |
| `category` | string | 否 | 筛选分类名称 | 不筛选 |

### 请求示例

```bash
# 首页加载（无 cursor）
curl "https://cost.ykn.cm/api/list?limit=30"

# 加载下一页
curl "https://cost.ykn.cm/api/list?limit=30&cursor=2026-05-01T12:00:00Z"

# 只查支出
curl "https://cost.ykn.cm/api/list?type=expense&limit=50"

# 按分类筛选
curl "https://cost.ykn.cm/api/list?category=喂养用品"
```

### 响应结构

```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4-...",
      "amount": 120.5,
      "category": "喂养用品",
      "note": "奶粉",
      "type": "expense",
      "transaction_time": "2026-05-01T10:30:00Z",
      "created_at": "2026-05-01T10:30:05Z"
    }
  ],
  "nextCursor": "2026-04-28T08:30:00Z",
  "hasMore": true
}
```

| 字段 | 说明 |
|------|------|
| `data` | 当页交易记录数组 |
| `nextCursor` | 下一页的游标值，传入下次请求的 `cursor` 参数。无更多数据时为 `null` |
| `hasMore` | 是否还有更多数据 |

### 分页流程

```
第 1 页: GET /api/list?limit=30
         → nextCursor: "2026-04-28T08:30:00Z", hasMore: true

第 2 页: GET /api/list?limit=30&cursor=2026-04-28T08:30:00Z
         → nextCursor: "2026-04-15T14:20:00Z", hasMore: true

第 3 页: GET /api/list?limit=30&cursor=2026-04-15T14:20:00Z
         → nextCursor: null, hasMore: false  ← 没有更多了
```

### 为什么用游标分页

数据库索引 `idx_transactions_created_at ON transactions (created_at DESC)` 直接支持此查询。选择游标而非 offset 分页，是因为 Telegram Bot 会异步写入新记录，offset 分页会出现数据偏移（重复或遗漏），游标锚定在 `created_at` 上，不受新插入影响。

---

## 2. 月度聚合数据

```
GET /api/monthly
```

一次请求返回当月所有预计算数据，Dashboard 四个组件（汇总卡片、趋势图、分类饼图、日历热力图）可直接使用，无需前端二次计算。

### 请求参数（Query）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `year` | number | 是 | 年份，如 `2026` |
| `month` | number | 是 | 月份，1-12 |

### 请求示例

```bash
curl "https://cost.ykn.cm/api/monthly?year=2026&month=5"
```

### 响应结构

```json
{
  "success": true,
  "data": {
    "year": 2026,
    "month": 5,
    "totalExpense": 3280.50,
    "transactionCount": 42,
    "dailyExpenses": [
      { "date": "2026-05-01", "amount": 120 },
      { "date": "2026-05-02", "amount": 0 },
      { "date": "2026-05-03", "amount": 85 }
    ],
    "categoryBreakdown": [
      { "category": "喂养用品", "amount": 1200, "count": 8 },
      { "category": "辅食零食", "amount": 800, "count": 12 }
    ],
    "calendarData": { "1": 120, "3": 85, "5": 200 },
    "prevMonthExpense": 2950.00,
    "allTimeExpense": 28500.00,
    "lastTransaction": {
      "amount": 45,
      "category": "辅食零食",
      "note": "酸奶",
      "transaction_time": "2026-05-03T09:00:00Z"
    }
  }
}
```

### 字段说明

| 字段 | 类型 | 用途 |
|------|------|------|
| `totalExpense` | number | 当月总支出 |
| `transactionCount` | number | 当月交易笔数 |
| `dailyExpenses` | array | 每日支出金额，按日期升序，无支出的日期金额为 0。直接喂给趋势图 |
| `categoryBreakdown` | array | 分类汇总，按金额降序排列。直接喂给饼图 |
| `calendarData` | object | 日期（几号）到金额的 map，如 `{ "1": 120, "3": 85 }`。直接喂给日历热力图 |
| `prevMonthExpense` | number | 上月总支出，用于计算环比变化 |
| `allTimeExpense` | number | 历史全部总支出 |
| `lastTransaction` | object/null | 最近一笔支出记录，无记录时为 `null` |

### 内部实现

服务端并行执行三条 Supabase 查询（当月、上月、全部），然后在内存中聚合：

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  当月交易记录    │  │  上月交易记录    │  │  全部交易记录    │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         ▼                    ▼                    ▼
   dailyExpenses        prevMonthExpense     allTimeExpense
   categoryBreakdown
   calendarData
   lastTransaction
```

---

## 3. 日支出明细

```
GET /api/daily
```

返回某一天的全部支出记录，用于日历热力图点击某天后的详情弹窗。

### 请求参数（Query）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `year` | number | 是 | 年份 |
| `month` | number | 是 | 月份，1-12 |
| `day` | number | 是 | 日期，1-31 |

### 请求示例

```bash
curl "https://cost.ykn.cm/api/daily?year=2026&month=5&day=1"
```

### 响应结构

```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4-...",
      "amount": 120,
      "category": "喂养用品",
      "note": "奶粉",
      "type": "expense",
      "transaction_time": "2026-05-01T10:30:00Z",
      "created_at": "2026-05-01T10:30:05Z"
    }
  ]
}
```

只返回 `type=expense` 的记录，按 `created_at` 降序排列。

---

## 4. 新增交易

```
POST /api/add
```

### 请求头

```
Content-Type: application/json
Authorization: Bearer <API_KEY>
```

### 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `amount` | number | 是 | 金额 |
| `type` | string | 是 | `expense`（支出）或 `income`（收入） |
| `category` | string | 否 | 分类名称 |
| `note` | string | 否 | 备注 |
| `transaction_time` | string | 否 | 交易时间（ISO 8601），不传则使用服务端当前时间 |

### 请求示例

```bash
curl -X POST "https://cost.ykn.cm/api/add" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $YUDAN_API_KEY" \
  -d '{
    "amount": 120.5,
    "type": "expense",
    "category": "喂养用品",
    "note": "奶粉",
    "transaction_time": "2026-05-01T10:30:00Z"
  }'
```

### 响应结构

```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-...",
    "amount": 120.5,
    "category": "喂养用品",
    "note": "奶粉",
    "type": "expense",
    "transaction_time": "2026-05-01T10:30:00Z",
    "created_at": "2026-05-01T10:30:05Z"
  }
}
```

### 错误响应

| 状态码 | 原因 |
|--------|------|
| 400 | 缺少 amount 或 type、type 值非法、amount 格式错误 |
| 401 | API Key 无效或未提供 |
| 500 | 服务端错误 |

---

## 5. 修改交易

```
PATCH /api/edit
```

### 请求头

```
Content-Type: application/json
Authorization: Bearer <API_KEY>
```

### 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 交易记录 UUID |
| `amount` | number | 否 | 新金额 |
| `type` | string | 否 | 新类型 |
| `category` | string | 否 | 新分类 |
| `note` | string | 否 | 新备注 |
| `transaction_time` | string | 否 | 新交易时间 |

只需传入要修改的字段，未传的字段保持不变。

### 请求示例

```bash
curl -X PATCH "https://cost.ykn.cm/api/edit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $YUDAN_API_KEY" \
  -d '{
    "id": "a1b2c3d4-...",
    "amount": 150,
    "note": "更新备注"
  }'
```

### 响应结构

```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-...",
    "amount": 150,
    "category": "喂养用品",
    "note": "更新备注",
    "type": "expense",
    "transaction_time": "2026-05-01T10:30:00Z",
    "created_at": "2026-05-01T10:30:05Z"
  }
}
```

### 错误响应

| 状态码 | 原因 |
|--------|------|
| 400 | 缺少 id、type 值非法、amount 格式错误 |
| 401 | API Key 无效或未提供 |
| 500 | 服务端错误 |

---

## 6. 删除交易

```
DELETE /api/delete
```

### 请求头

```
Content-Type: application/json
Authorization: Bearer <API_KEY>
```

### 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 交易记录 UUID |

### 请求示例

```bash
curl -X DELETE "https://cost.ykn.cm/api/delete" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $YUDAN_API_KEY" \
  -d '{ "id": "a1b2c3d4-..." }'
```

### 响应结构

```json
{
  "success": true
}
```

### 错误响应

| 状态码 | 原因 |
|--------|------|
| 400 | 缺少 id |
| 401 | API Key 无效或未提供 |
| 500 | 服务端错误 |

---

## 完整使用流程

### 场景：构建一个服务端记账工具

下面涉及 API Key 的 JavaScript 必须运行在服务端脚本或可信自动化环境中，不能打包进浏览器页面。

**第 1 步：加载首页数据**

```javascript
const apiBaseUrl = 'https://cost.ykn.cm';
const apiKey = process.env.YUDAN_API_KEY;

if (!apiKey) throw new Error('缺少 YUDAN_API_KEY');

// 概览 Tab：请求月度聚合
const monthly = await fetch(`${apiBaseUrl}/api/monthly?year=2026&month=5`).then(r => r.json());
console.log(`本月支出: ¥${monthly.data.totalExpense}`);
console.log(`上月支出: ¥${monthly.data.prevMonthExpense}`);
console.log(`交易笔数: ${monthly.data.transactionCount}`);

// 明细 Tab：请求第一页
const list = await fetch(`${apiBaseUrl}/api/list?limit=30`).then(r => r.json());
console.log(`加载了 ${list.data.length} 条记录`);
console.log(`还有更多: ${list.hasMore}`);
```

**第 2 步：加载更多明细**

```javascript
async function loadMore() {
  if (!list.hasMore) return;
  const next = await fetch(`${apiBaseUrl}/api/list?limit=30&cursor=${list.nextCursor}`).then(r => r.json());
  list.data.push(...next.data);
  list.nextCursor = next.nextCursor;
  list.hasMore = next.hasMore;
}
```

**第 3 步：新增一笔记录**

```javascript
const res = await fetch(`${apiBaseUrl}/api/add`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    amount: 45,
    type: 'expense',
    category: '辅食零食',
    note: '酸奶',
  }),
}).then(r => r.json());
console.log(`新增成功，ID: ${res.data.id}`);
```

**第 4 步：修改记录**

```javascript
await fetch(`${apiBaseUrl}/api/edit`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    id: 'a1b2c3d4-...',
    amount: 50,
  }),
});
```

**第 5 步：删除记录**

```javascript
await fetch(`${apiBaseUrl}/api/delete`, {
  method: 'DELETE',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  },
  body: JSON.stringify({ id: 'a1b2c3d4-...' }),
});
```

**第 6 步：查看某日详情**

```javascript
const daily = await fetch(`${apiBaseUrl}/api/daily?year=2026&month=5&day=1`).then(r => r.json());
daily.data.forEach(t => {
  console.log(`${t.category}: ¥${t.amount} - ${t.note}`);
});
```

---

## 数据库结构

所有接口操作同一张 `transactions` 表：

```sql
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  amount DECIMAL NOT NULL,
  category TEXT,
  note TEXT,
  type TEXT CHECK (type IN ('expense', 'income')) NOT NULL,
  transaction_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX idx_transactions_created_at ON transactions (created_at DESC);
```

- `id` — 自动生成的 UUID 主键
- `amount` — 金额，DECIMAL 类型
- `category` — 分类名称，可为空
- `note` — 备注，可为空
- `type` — `expense`（支出）或 `income`（收入）
- `transaction_time` — 用户指定的交易时间，可为空（为空时用 `created_at` 兜底）
- `created_at` — 记录创建时间，自动填充，分页索引字段

---

## TypeScript 类型定义

```typescript
interface Transaction {
  id: string;
  amount: number;
  note: string;
  category: string;
  type: 'expense' | 'income';
  transaction_time?: string;
  created_at: string;
}

interface DailyExpense {
  date: string;    // "2026-05-01"
  amount: number;
}

interface CategorySummary {
  category: string;
  amount: number;
  count: number;
}

interface MonthlyData {
  year: number;
  month: number;
  totalExpense: number;
  transactionCount: number;
  dailyExpenses: DailyExpense[];
  categoryBreakdown: CategorySummary[];
  calendarData: Record<number, number>;  // { 1: 120, 3: 85 }
  prevMonthExpense: number;
  allTimeExpense: number;
  lastTransaction: {
    amount: number;
    category: string;
    note: string;
    transaction_time: string;
  } | null;
}
```
