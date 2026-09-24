# 鱼蛋看板 API 使用指南

账本的品牌、商品、备注与录入规则见 [账单 skill](content/blog/bill-skill.md)。
新版账本写接口支持 `brand`、`product`，`POST /api/add` 每次接收一条交易对象，
`PATCH /api/edit` 使用 `id`、读取时的 `expected_version` 和变更字段；省略业务字段保留原值，可选字段传 `null` 可清空。

正式地址：`https://cost.ykn.cm`

看板 API 使用 HTTP JSON 传输，但数据库内部已标准化：每条体重记录保存于
`yudan_weight_records` 的独立行，每次接种保存于 `yudan_vaccine_records` 的独立行，
不再把记录数组存入 JSONB 字段。

## 数据库前置条件

新建与升级统一按照 [README 的数据库顺序](README.md#3-初始化和升级数据库) 执行，包括品牌/商品迁移和下面四个必需迁移：

| 迁移 | 必需能力 | 可调用角色 |
| --- | --- | --- |
| `202609240001_health_record_mutations.sql` | `mutate_yudan_health_record`，事务保存、版本检查与幂等回执 | 仅 `service_role` |
| `202609240002_ledger_queries.sql` | `ledger_list`、`ledger_monthly_summary`，统一筛选、稳定分页及汇总 | `anon`、`authenticated`、`service_role`，遵守调用者 RLS |
| `202609240003_blog_chat_limits.sql` | `blog_chat_status`、`blog_chat_reserve`、`blog_chat_finish`，原子限额 | 仅 `service_role` |
| `20260924073648_ledger_mutations.sql` | `ledger_mutate`，账本版本条件、原子写入及幂等回执 | 仅 `service_role` |

先应用迁移，再运行只读的 `scripts/check-database.sql`，所有 `ok` 为 `true` 后部署对应应用。该检查不写记录或消耗问答额度；SQL Editor 的执行记录需另外保存，不能把对象存在当作迁移历史。备份、版本追踪、隔离验证和失败回退步骤见 README。

浏览器对健康表仅有所有者 `SELECT` 权限，写入必须通过服务端认证与 RPC；不能直接调用健康写入或问答配额 RPC。RPC 缺失是部署不完整，不应通过重新授予浏览器写表权限解决。

## 账本查询与导出

`GET /api/list` 公开只读，查询条件由数据库对全部记录执行。默认按购买时间（缺失时用录入时间）降序，再按 ID 降序分页。日期边界统一采用北京时间。

| 参数 | 说明 |
| --- | --- |
| `year`、`month` | 同时提供时限定月份；年份为整数 1000–9998，月份为整数 1–12，导出也应传入当前月份 |
| `type` | `expense` 或 `income`，未提供时不过滤类型 |
| `category` | 分类；中文、英文或 emoji 别名统一匹配，`all` 表示全部，`未分类` 包含 NULL 和空分类 |
| `q` | 品牌、商品、备注、分类关键词，以及去掉末尾小数零后的金额文本部分匹配（如 `29.90` 作为 `29.9` 搜索） |
| `limit` | 每页条数，默认 30，必须为 1–100 的整数 |
| `cursor` | 上一页返回的 `nextCursor`；修改筛选条件后清空 |

响应提供 `data`、`hasMore`、`nextCursor` 和 `version: 2`，首屏额外提供完整分类来源 `categories`。客户端把游标当作不透明字符串，不能自行构造；旧版 v1 或 ISO 时间游标返回 `400` / `CURSOR_EXPIRED`，需要从首屏重新查询。CSV 导出持续使用同一筛选条件和返回游标，直到 `hasMore=false`。

`GET /api/monthly?year=2026&month=9` 返回所选月份汇总；`dailyExpenses` 包含当月每个自然日，没有支出的日期为零。`GET /api/daily` 使用 `year`、`month`、`day` 查询当天支出，日期必须真实有效；支持 `limit`、`cursor`，同样返回 `nextCursor`、`hasMore` 和 `version: 2`。

查询参数不合法返回 `400`。必需账本 RPC 缺失时返回 `503` / `LEDGER_MIGRATION_REQUIRED`；其他数据库错误返回 `500`。月度接口不会在 RPC 失败后自动扫描全部历史记录。

## 账本保存、重试与冲突

`POST /api/add`、`PATCH /api/edit` 和 `DELETE /api/delete` 都使用 `Authorization: Bearer <授权 GitHub access token 或 API Key>`，请求体为单个 JSON 对象。

| 字段 | 说明 |
| --- | --- |
| `request_id` | 客户端为每次逻辑操作生成的 UUID。响应不明确时复用相同 ID 和内容；相同 ID 改换内容会返回 `409` / `IDEMPOTENCY_CONFLICT` |
| `id` | 编辑、删除必填，账单 UUID |
| `expected_version` | 编辑、删除必填，查询结果中该账单的 `version` 正整数。不是分页响应顶层的 `version: 2` |
| `amount` | 新增必填；大于 0、最多两位小数、最大 `999999999.99`；编辑可省略 |
| `type` | 新增必填 `expense` 或 `income`；编辑可省略 |
| `brand`、`product`、`category`、`note` | 可选文本，长度上限分别为 200、2000、200、10000；空文本或 `null` 清空，编辑省略则保留 |
| `transaction_time` | 可选带时区 ISO 8601 时间，必须为真实日期和合法时刻；空字符串或 `null` 表示未知 |

新增示例：

```json
{
  "request_id": "f850b722-bebd-442c-a139-9f17203dfce1",
  "amount": 29.9,
  "type": "expense",
  "product": "奶瓶",
  "transaction_time": "2026-09-24T09:00:00+08:00"
}
```

编辑或删除前先读取目标账单。假设返回 `version: 3`，编辑请求为：

```json
{
  "id": "bdad71d7-2725-46eb-9f53-536826ba4f3e",
  "request_id": "3245fbdd-b070-4139-a7f6-7e824bd891c4",
  "expected_version": 3,
  "note": "补充备注"
}
```

删除请求只包含 `id`、`request_id`、`expected_version`。成功响应包含 `success: true`、`data`、`request_id`、`replayed`。首次新增版本为 1；每次编辑递增版本。重复请求返回第一次成功结果，即使账单后来又被修改或删除，也不会再次执行原操作；重放后需要查询当前状态。

旧调用可以省略 `request_id`，服务端会生成并返回，但响应丢失时调用方不知道原 ID，无法获得可靠重试保证。**编辑/删除的 `expected_version` 必须提供**，旧脚本需先读取版本再更新调用。字段不合法、未知字段、坏 JSON、缺少版本返回 `400`；无有效认证返回 `401`；账单不存在返回 `404` / `LEDGER_NOT_FOUND`；版本过期返回 `409` / `LEDGER_CONFLICT` 并附 `current`。不要自动用新版本覆盖：保留草稿、展示差异，由用户决定后用新请求 ID 和最新版本提交。

请求体最大 64 KiB，超限返回 `413` / `PAYLOAD_TOO_LARGE`。所有写入响应提供 `trace_id` 和 `X-Trace-Id`，可用于定位问题；日志只记录操作、错误码和追踪编号，不记录账单内容、凭据或原始数据库错误。

必需写入 RPC 缺失返回 `503` / `LEDGER_MIGRATION_REQUIRED`；认证服务异常为 `500` / `LEDGER_AUTH_FAILED`，其他服务端异常为 `500` / `LEDGER_WRITE_FAILED`，不回传数据库内部信息。网络错误、5xx 或成功响应无法解析时，保留原始请求并重试确认，不能改 ID 重新新增。幂等回执只防同一逻辑请求重放，不检查不同请求是否来自同一购物订单。

## 认证

所有旧版 `/api/yudan` 接口都需要服务端配置的 API Key：

```http
Authorization: Bearer <API_KEY>
Content-Type: application/json
```

缺少或使用错误的 Key 时返回 `401`。

## 读取完整看板

```bash
curl https://cost.ykn.cm/api/yudan \
  -H "Authorization: Bearer <API_KEY>"
```

响应：

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

记录 ID 现在由数据库生成 UUID。业务去重键不变：体重使用“账号 + 测量日期”，
接种使用“账号 + `plan_id`”。调用方不应根据 ID 判断是否为同一条业务记录。

## 新增或更新体重

```bash
curl -X POST https://cost.ykn.cm/api/yudan/weight \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-08-26","weight":3.08}'
```

请求字段：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `date` | `YYYY-MM-DD` | 是 | 测量日期，不得晚于今天 |
| `weight` | 数字 | 是 | 公斤，范围 `0.1`–`200` |

同一日期重复提交会原子更新现有行。响应中的 `created` 表示本次是否新增：

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

每个项目包含稳定的 `plan_id`、标准名称、剂次、建议日期和已登记的实际日期。
推荐先读取此接口，再用 `plan_id` 登记。

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

兼容调用也可以传 `vaccine`、`dose` 和 `actual_date`。如果名称匹配到多个计划，
接口返回 `409` 和候选 `plan_id`，不会猜测。

同一个 `plan_id` 重复提交会更新现有接种行。

## 常见状态码

| 状态码 | 说明 |
| --- | --- |
| `200` | 读取、创建或更新成功 |
| `400` | 请求体、日期或数值不合法 |
| `401` | API Key 缺失或无效 |
| `404` | 未找到疫苗计划 |
| `409` | 疫苗信息匹配到多个计划，需要指定 `plan_id` |
| `500` | 数据库或服务端错误 |

## 健康记录并发写入

网页使用 `POST /api/yudan/records` 逐条保存体重或接种记录。请求示例：

```json
{
  "request_id": "11111111-1111-1111-1111-111111111111",
  "kind": "weight",
  "key": "2026-08-26",
  "action": "save",
  "expected_updated_at": "2026-09-24T03:00:00.123Z",
  "changes": { "weight_kg": 3.08 }
}
```

`action` 可为 `save` 或 `delete`；`kind=weight` 的 `key` 是测量日期，`kind=vaccine` 的 `key` 是 `plan_id`。`expected_updated_at` 是读取记录时的版本；新记录使用 `null`，已存在记录必须传回原值。版本不匹配返回 `409` 并附带 `current`，客户端应重新读取并让用户选择保留哪一份。相同账号和 `request_id` 重试会返回首次结果，不会重复写入。

旧版 `/api/yudan/weight` 和 `/api/yudan/vaccine` 请求格式保持兼容；传入可选的 `expected_updated_at` 时同样启用版本校验。

`/api/telegram` 已停用并返回 `410`。
