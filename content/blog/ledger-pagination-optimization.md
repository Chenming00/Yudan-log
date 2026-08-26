---
title: 🐟 鱼蛋看板 API 使用指南
date: 2026-08-26
summary: 鱼蛋看板 API 的最新调用说明，涵盖 API Key 鉴权、体重记录、疫苗计划与幂等更新。
tags:
  - 技术笔记
  - 鱼蛋看板
  - API 教程
cover: /logo.png
---

## 概览

鱼蛋看板提供一组基于 HTTP JSON 的 API，用于读取和维护宝宝的体重与疫苗记录。正式地址为 `https://cost.ykn.cm`。

数据库内部已经标准化：每条体重记录和每次接种记录都保存为独立的数据行，不再把记录数组存入 JSONB 字段。

## 认证

所有 `/api/yudan` 接口都需要服务端配置的 API Key：

```http
Authorization: Bearer <API_KEY>
Content-Type: application/json
```

缺少或使用错误的 Key 时返回 `401`。真实 API Key 不要写入网页、前端 JavaScript、代码仓库或聊天记录，应保存在调用方的环境变量或密钥管理器中。

## 读取完整看板

```bash
curl https://cost.ykn.cm/api/yudan \
  -H "Authorization: Bearer <API_KEY>"
```

响应结构如下：

```json
{
  "success": true,
  "data": {
    "birthday": "2026-08-12",
    "vaccine_records": [
      {
        "id": "<UUID>",
        "planId": "schedule-001",
        "vaccine": "乙肝疫苗",
        "dose": "第 1 剂",
        "ageLabel": "出生后 24 小时内",
        "doneDate": "2026-08-12"
      }
    ],
    "weight_records": [
      {
        "id": "<UUID>",
        "date": "2026-08-26",
        "weight": 3.08
      }
    ],
    "updated_at": "<ISO 8601 时间>"
  }
}
```

记录 ID 现在由数据库生成 UUID。ID 只用于定位记录，不用于判断业务上的同一条记录。业务去重键保持不变：体重使用“账号 + 测量日期”，接种使用“账号 + `plan_id`”。

## 新增或更新体重

```bash
curl -X POST https://cost.ykn.cm/api/yudan/weight \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-08-26","weight":3.08}'
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `date` | `YYYY-MM-DD` | 是 | 测量日期，不得晚于今天 |
| `weight` | 数字 | 是 | 公斤，范围 `0.1`–`200` |

同一日期重复提交会原子更新现有记录，不会产生重复数据。响应中的 `created` 表示本次是否新增：

```json
{
  "success": true,
  "data": {
    "record": {
      "id": "<UUID>",
      "date": "2026-08-26",
      "weight": 3.08
    },
    "created": false
  }
}
```

## 读取疫苗计划

```bash
curl https://cost.ykn.cm/api/yudan/vaccines \
  -H "Authorization: Bearer <API_KEY>"
```

每个项目包含稳定的 `plan_id`、标准名称、剂次、建议日期和已登记的实际日期。推荐先读取此接口，再使用返回的 `plan_id` 登记接种。

## 读取儿保时间表

### `GET /api/yudan/care`

返回卓正儿童保健时间表及鱼蛋的出生日期：

```bash
curl https://cost.ykn.cm/api/yudan/care \
  -H "Authorization: Bearer <API_KEY>"
```

响应结构：

```json
{
  "success": true,
  "data": {
    "provider": "卓正儿童保健",
    "birthday": "2026-08-12",
    "milestones": [
      { "id": "<ID>", "label": "满月儿保", "date": "2026-09-12", "weekday": "星期六" }
    ]
  }
}
```

此接口需要 API Key；成功响应缓存 1 小时，认证失败返回 `401`。

## 登记接种日期

```bash
curl -X POST https://cost.ykn.cm/api/yudan/vaccine \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"plan_id":"schedule-001","actual_date":"2026-08-12"}'
```

推荐请求字段：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `plan_id` | 字符串 | 是 | `/api/yudan/vaccines` 返回的稳定计划 ID |
| `actual_date` | `YYYY-MM-DD` | 是 | 实际接种日期，不得晚于今天 |

同一个 `plan_id` 重复提交会更新现有接种记录，而不是创建重复行。

兼容调用也可以传 `vaccine`、`dose` 和 `actual_date`。如果名称匹配到多个计划，接口返回 `409` 和候选 `plan_id`，不会猜测。

## 常见状态码

| 状态码 | 说明 |
| --- | --- |
| `200` | 读取、创建或更新成功 |
| `400` | 请求体、日期或数值不合法 |
| `401` | API Key 缺失或无效 |
| `404` | 未找到疫苗计划 |
| `409` | 疫苗信息匹配到多个计划，需要指定 `plan_id` |
| `500` | 数据库或服务端错误 |

## Node.js 调用示例

API Key 应只在服务端脚本、定时任务或可信自动化环境中使用：

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
  date: '2026-08-26',
  weight: 3.08,
});

await callYudanApi('/api/yudan/vaccine', {
  plan_id: 'schedule-001',
  actual_date: '2026-08-12',
});
```

---

## 账本 API

账本查询接口无需认证；写入接口支持两种认证方式：`Authorization: Bearer <API_KEY>`，或授权所有者的 Supabase GitHub access token。服务端会校验授权身份，Supabase Secret Key 不会返回给调用方。

账本记录的通用字段如下：

```typescript
interface Transaction {
  id: string;
  amount: number;
  category: string | null;
  note: string | null;
  type: 'expense' | 'income';
  transaction_time: string | null;
  created_at: string;
}
```

### 查询交易列表：`GET /api/list`

支持游标分页、月份、收支类型和分类筛选：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `limit` | number | 否 | 每页条数，默认 `30`，最大 `100` |
| `cursor` | string | 否 | 上一页 `nextCursor` 返回的 `created_at` |
| `year` | number | 否 | 与 `month` 一起按上海时区筛选月份 |
| `month` | number | 否 | 月份 `1`–`12` |
| `type` | string | 否 | `expense` 或 `income` |
| `category` | string | 否 | 分类名称 |

```bash
# 第一页
curl 'https://cost.ykn.cm/api/list?limit=30'

# 下一页
curl 'https://cost.ykn.cm/api/list?limit=30&cursor=2026-05-01T12:00:00Z'

# 查询 2026 年 5 月的支出
curl 'https://cost.ykn.cm/api/list?year=2026&month=5&type=expense'
```

响应中的 `nextCursor` 在还有下一页时为最后一条记录的 `created_at`，没有更多数据时为 `null`：

```json
{
  "success": true,
  "data": [{
    "id": "<UUID>",
    "amount": 120.5,
    "category": "喂养用品",
    "note": "奶粉",
    "type": "expense",
    "transaction_time": "2026-05-01T10:30:00Z",
    "created_at": "2026-05-01T10:30:05Z"
  }],
  "nextCursor": "2026-04-28T08:30:00Z",
  "hasMore": true
}
```

游标分页使用 `created_at < cursor`，适合 Telegram 等异步写入场景；新记录插入时不会像 offset 分页一样导致重复或遗漏。

### 月度聚合：`GET /api/monthly`

`year` 和 `month` 必填：

```bash
curl 'https://cost.ykn.cm/api/monthly?year=2026&month=5'
```

返回 `totalExpense`、`transactionCount`、`dailyExpenses`、`categoryBreakdown`、`calendarData`、`prevMonthExpense`、`allTimeExpense` 和 `lastTransaction`。这些字段分别可直接用于汇总卡片、趋势图、分类图和日历热力图；查询失败时返回 `500`。

```json
{
  "success": true,
  "data": {
    "year": 2026,
    "month": 5,
    "totalExpense": 3280.5,
    "transactionCount": 42,
    "dailyExpenses": [{ "date": "2026-05-01", "amount": 120 }],
    "categoryBreakdown": [{ "category": "喂养用品", "amount": 1200, "count": 8 }],
    "calendarData": { "1": 120 },
    "prevMonthExpense": 2950,
    "allTimeExpense": 28500,
    "lastTransaction": {
      "amount": 45,
      "category": "辅食零食",
      "note": "酸奶",
      "transaction_time": "2026-05-03T09:00:00Z"
    }
  }
}
```

无支出的日期也会出现在 `dailyExpenses` 中，金额为 `0`；无最近支出时 `lastTransaction` 为 `null`。

### 查询日支出：`GET /api/daily`

`year`、`month`、`day` 均必填，接口只返回 `type=expense` 的记录，并按 `created_at` 倒序排列：

```bash
curl 'https://cost.ykn.cm/api/daily?year=2026&month=5&day=1'
```

成功响应为 `{ "success": true, "data": [...] }`；参数无效返回 `400`。

### 新增交易：`POST /api/add`

请求头：

```http
Authorization: Bearer <API_KEY>
Content-Type: application/json
```

请求体：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `amount` | number | 是 | 金额 |
| `type` | string | 是 | `expense` 或 `income` |
| `category` | string | 否 | 分类 |
| `note` | string | 否 | 备注 |
| `transaction_time` | string | 否 | ISO 8601 交易时间 |

```bash
curl -X POST 'https://cost.ykn.cm/api/add' \
  -H 'Authorization: Bearer <API_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{"amount":120.5,"type":"expense","category":"喂养用品","note":"奶粉"}'
```

成功返回 `{ "success": true, "data": <Transaction> }`；缺少金额或类型、类型不合法、金额无法转换为数字返回 `400`，认证失败返回 `401`。

### 修改交易：`PATCH /api/edit`

必须提供 `id`，其余字段都是可选的，未提供的字段保持原值：

```bash
curl -X PATCH 'https://cost.ykn.cm/api/edit' \
  -H 'Authorization: Bearer <API_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{"id":"<UUID>","amount":150,"note":"更新备注"}'
```

可修改字段为 `amount`、`type`、`category`、`note` 和 `transaction_time`。成功返回更新后的交易记录；缺少 `id`、类型或金额格式不正确返回 `400`。

### 删除交易：`DELETE /api/delete`

```bash
curl -X DELETE 'https://cost.ykn.cm/api/delete' \
  -H 'Authorization: Bearer <API_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{"id":"<UUID>"}'
```

成功返回 `{ "success": true }`；缺少 `id` 返回 `400`，认证失败返回 `401`。

## Telegram Webhook

### `POST /api/telegram`

这是给 Telegram Bot 配置的 Webhook 入口。请求体使用 Telegram Update 格式，接口读取 `message.text`：

```json
{
  "message": { "text": "支出 50 餐饮 午餐" }
}
```

支持的文本格式包括：`支出 50 餐饮 午餐`、`花 50 餐饮`、`收入 1000 工资 本月工资` 和 `收 1000 工资`。解析后会通过服务端 API Key 调用 `/api/add`。

接口会尽量返回 Telegram 可接受的 `200` 响应：没有文本时返回 `{ "ok": true }`；无法解析时返回 `{ "ok": true, "error": "Could not parse message" }`；解析或转发异常也会返回 `ok: true` 并带错误信息，避免 Telegram 反复重试。

## 文章 AI 接口

### `POST /api/blog/chat`

文章详情页使用此接口进行流式问答。请求体：

```json
{
  "slug": "ledger-pagination-optimization",
  "question": "游标分页为什么比 offset 更适合这里？",
  "history": [
    { "role": "user", "content": "我想了解分页方式" },
    { "role": "assistant", "content": "可以从游标分页开始看" }
  ]
}
```

`slug` 和 `question` 必填，`history` 可选且只接受 `user` / `assistant` 消息，服务端最多保留最近 8 条。成功时返回 `text/event-stream` 流；缺少字段返回 `400`，文章不存在返回 `404`，AI 未配置返回 `503`，上游 AI 服务失败返回 `502`。

### `POST /api/blog/summary`

当前处于迁移阶段，接口暂时停用。调用会返回 `503` 以及说明信息，不应把它当作可用的摘要服务。

## API 状态码速查

| 状态码 | 常见含义 |
| --- | --- |
| `200` | 请求成功；Webhook 也会尽量保持成功响应 |
| `400` | 参数、JSON 请求体、日期、金额或类型不合法 |
| `401` | API Key、GitHub token 缺失或无效 |
| `404` | 疫苗计划或文章不存在 |
| `409` | 疫苗名称匹配到多个计划，需要选择 `plan_id` |
| `502` | 文章 AI 上游服务失败 |
| `503` | AI 功能未配置或摘要接口暂时停用 |
| `500` | 数据库或服务端错误 |

除特别说明外，JSON 接口的成功响应都包含 `success: true`；错误响应包含 `error` 字段。所有写入 API 都应在服务端或可信自动化环境中携带密钥，不能把 API Key 打包到浏览器代码中。
