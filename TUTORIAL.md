# 🚀 Minimal Personal Finance System - 完整教学指南

本指南将带你从零开始配置并运行这一套极简个人记账系统。

---

## 📺 系统架构

1.  **Telegram Bot**: 作为输入端，接收自然语言（如 "午餐 35"）。
2.  **Next.js (Vercel)**: 处理逻辑、解析语言、提供 API。
3.  **Supabase**: 存储所有交易数据。

---

## 🛠 第一步：Supabase 数据库配置

1.  登录 [Supabase 控制台](https://supabase.com/)。
2.  创建一个新项目（Project）。
3.  进入 **SQL Editor**，创建一个新查询。
4.  将项目根目录下的 `schema.sql` 内容粘贴并运行。
    *   这将为你创建 `transactions` 表。
5.  前往 **Project Settings -> API**，获取：
    *   `Project URL`
    *   `anon public` Key

---

## 🤖 第二步：Telegram Bot 配置 (Hermes)

1.  在 Telegram 找到 [@BotFather](https://t.me/botfather)。
2.  发送 `/newbot`，按照提示创建一个机器人，获取 **API Token**。
3.  记住你的机器人用户名。

---

## ☁️ 第三步：环境变量配置 (Vercel)

在 Vercel 部署时，请配置以下环境变量：

| 变量名 | 描述 | 示例 |
| :--- | :--- | :--- |
| `API_KEY` | 自定义 API 密钥（用于安全访问） | `my_secret_key_123` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | `https://xyz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase Anon Key | `eyJhb...` |
| `BASE_URL` | 你的 Vercel 部署域名 (必须以 https:// 开头) | `https://your-app.vercel.app` |

---

## 📊 第四步：可视化看板 (Dashboard)

系统内置了一个精美的可视化看板。
1.  启动项目后，访问 `http://localhost:3000`。
2.  输入你设置的 `API_KEY` 即可解锁。
3.  在此你可以实时查看：
    *   **当前余额**：自动计算收支差额。
    *   **收支统计**：按分类汇总的收入与支出。
    *   **交易历史**：按时间倒序排列的详细记录。

---

## 🔗 第五步：激活 Telegram Webhook

你需要告诉 Telegram 将消息发送到你的服务器。

在浏览器访问以下 URL（替换为你自己的信息）：

```text
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=<YOUR_BASE_URL>/api/telegram
```

*   `<YOUR_BOT_TOKEN>`: 第二步获取的 Bot Token。
*   `<YOUR_BASE_URL>`: 第三步配置的 Vercel 域名。

---

## 📝 第五步：使用方法

### 1. 通过可视化页面 (推荐)
打开网页直接查看你的财务概况。

### 2. 通过聊天记账
直接给机器人发送消息：
*   `午餐 35` -> 自动存为支出 35，备注为 "午餐"。
*   `工资 5000 income` -> 自动存为收入 5000，备注为 "工资"。

### 2. 通过 API 管理
所有 API 请求需携带 Header: `Authorization: Bearer <API_KEY>`

*   **查看列表**: `GET /api/list`
*   **添加记录**: `POST /api/add`
    ```json
    {
      "amount": 100,
      "note": "测试",
      "type": "expense"
    }
    ```
*   **删除记录**: `POST /api/delete` `{ "id": "uuid" }`

---

## 💡 开发提示
*   **本地测试**: 使用 `npm run dev` 启动，并配合 `ngrok` 或 `localpulse` 暴露本地端口到外网进行 Webhook 测试。
*   **扩展 AI**: 如果需要更智能的解析，可以修改 `lib/parser.ts` 接入 OpenAI 或其他 LLM。

祝记账愉快！
