---
title: 🐟 鱼蛋小账本性能优化：分页加载与月度聚合
date: 2026-05-03
summary: 账本从全量加载改造为游标分页 + 月度服务端聚合，明细列表支持"加载更多"，Dashboard 不再重复过滤数据。
tags:
  - 技术笔记
  - 鱼蛋小账本
  - 性能优化
cover: /logo.png
---

## 为什么要优化

之前鱼蛋小账本的做法很简单粗暴：页面一打开，`fetch("/api/list")` 把数据库里**所有**交易记录一次性拉回来，前端自己过滤、分组、算汇总。

数据少的时候没啥问题，但随着记录越来越多，这个方案的隐患就暴露了：

- API 响应越来越慢，传输体积膨胀
- 前端拿到全量数据后，概览 tab 和明细 tab 各自独立过滤同一份数组，做了大量重复计算
- 明细列表一次性渲染所有记录，DOM 节点爆炸

这次改造的核心思路：**该服务端做的别丢给客户端**。

---

## 改了什么

### 1. 新增 `/api/monthly` 月度汇总接口

这是最大的变化。之前 Dashboard 的四个组件（汇总卡片、趋势图、分类饼图、日历热力图）各自从全量数据里过滤当月记录再计算，现在全部交给服务端一次搞定。

接口接收 `year` 和 `month` 参数，返回预计算好的结构化数据：

```
GET /api/monthly?year=2026&month=5

{
  "success": true,
  "data": {
    "year": 2026,
    "month": 5,
    "totalExpense": 3280.50,
    "totalIncome": 15000,
    "transactionCount": 42,
    "dailyExpenses": [
      { "date": "2026-05-01", "amount": 120 },
      { "date": "2026-05-02", "amount": 0 },
      ...
    ],
    "categoryBreakdown": [
      { "category": "喂养用品", "amount": 1200, "count": 8 },
      { "category": "辅食零食", "amount": 800, "count": 12 },
      ...
    ],
    "calendarData": { "1": 120, "3": 85, ... },
    "prevMonthExpense": 2950.00
  }
}
```

- `dailyExpenses` — 每日支出金额，直接喂给趋势图
- `categoryBreakdown` — 按金额降序的分类汇总，直接喂给饼图
- `calendarData` — 日期到金额的 map，直接喂给日历热力图
- `prevMonthExpense` — 上月总支出，用于环比变化的箭头显示

Dashboard 组件不再需要原始交易数组，拿到数据直接渲染。

### 2. `/api/list` 支持游标分页

之前是无参数的全量查询，现在支持分页：

```
GET /api/list?limit=30&cursor=2026-05-01T12:00:00Z&type=expense
```

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `limit` | 每页条数，最大 100 | 30 |
| `cursor` | 上一页最后一条的 `created_at`，首次加载不传 | - |
| `type` | 筛选类型：`expense` / `income` | 不筛选 |
| `category` | 筛选分类 | 不筛选 |

返回值多了分页信息：

```json
{
  "success": true,
  "data": [...],
  "nextCursor": "2026-04-28T08:30:00Z",
  "hasMore": true
}
```

为什么用游标分页而不是 offset？因为 Telegram Bot 会异步写入新记录，用 offset 分页会出现数据偏移（重复或遗漏），游标分页锚定在 `created_at` 上，不受新插入影响。

### 3. 明细列表"加载更多"

明细 tab 不再一次性渲染全部记录，首屏只加载 30 条，底部有一个"加载更多"按钮，点击后追加下一页数据。搜索和筛选仍然在已加载的数据上做客户端过滤，对个人使用场景够用了。

### 4. 数据流拆分

页面从一条数据流拆成两条独立的数据流：

```
概览 tab  →  GET /api/monthly?year=2026&month=5  →  Dashboard 组件
明细 tab  →  GET /api/list?limit=30              →  DetailList 组件
```

切换月份时只重新请求月度汇总，不影响明细列表。增删改交易后两条数据流同时刷新。

---

## 没改什么

- 搜索和筛选仍然是客户端的，没有搬到服务端。个人账本数据量不大，30 条内的过滤是瞬间完成的
- 没有引入 SWR 或 React Query，保持原有的 `fetch` + 手动刷新模式
- Telegram Bot 写入逻辑不变
- CSV 导出仍然导出当前已加载的数据（不是全量），后续可以加 `/api/export` 端点
- 日历热力图的日期详情弹窗从显示每笔交易简化为只显示当日总额（因为月度接口返回的是聚合数据）

---

## 涉及的文件

| 文件 | 操作 |
|------|------|
| `app/api/monthly/route.ts` | 新建 |
| `app/api/list/route.ts` | 改造 |
| `app/ledger/types.ts` | 新增类型 |
| `app/ledger/page.tsx` | 重构数据流 |
| `app/ledger/dashboard/summary-cards.tsx` | 更新 props |
| `app/ledger/dashboard/trend-chart.tsx` | 更新 props |
| `app/ledger/dashboard/category-breakdown.tsx` | 更新 props |
| `app/ledger/dashboard/calendar-heatmap.tsx` | 更新 props |
| `app/ledger/dashboard/detail-list.tsx` | 加载更多 |
