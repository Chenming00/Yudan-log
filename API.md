# 鱼蛋看板 API 使用指南

正式地址：`https://cost.ykn.cm`

看板 API 使用 HTTP JSON 传输，但数据库内部已标准化：每条体重记录保存于
`yudan_weight_records` 的独立行，每次接种保存于 `yudan_vaccine_records` 的独立行，
不再把记录数组存入 JSONB 字段。

## 认证

所有 `/api/yudan` 接口都需要服务端配置的 API Key：

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
