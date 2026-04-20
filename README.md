# Minimal Personal Finance System

A minimal, single-user personal finance system built with Next.js, Supabase, and Telegram integration.

## 🚀 Key Features

- **Single User Access**: Controlled via a single `API_KEY` Bearer token.
- **Telegram Native**: Built-in webhook handling for Telegram messages.
- **Natural Language Parsing**: Automatically parse messages like "lunch 35" into structured transactions.
- **Clear Separation**: Parsing logic is separated from data insertion for stability and reuse.
- **TypeScript**: Type-safe code throughout.

## 🧱 Stack

- **Framework**: Next.js (App Router)
- **Database**: Supabase (PostgreSQL)
- **Security**: Bearer Token Auth
- **Bot Integration**: Hermes / Telegram Webhook

## 🛠 Setup

### 1. Supabase
Run the `schema.sql` in your Supabase SQL Editor to create the `transactions` table.

### 2. Environment Variables
Create a `.env.local` file based on `.env.local.example`:

```bash
API_KEY=your_secret_key
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
BASE_URL=http://localhost:3000
```

### 3. Install & Run
```bash
npm install
npm run dev
```

## ⚙️ API Endpoints

All endpoints (except `/api/telegram`) require `Authorization: Bearer <API_KEY>`.

- `POST /api/add`: Add a transaction (JSON).
- `POST /api/edit`: Edit a transaction (JSON).
- `POST /api/delete`: Delete a transaction (JSON).
- `GET /api/list`: List all transactions.
- `POST /api/telegram`: Telegram webhook for natural language input.

## 🤖 Bot Example
Send `"lunch 35"` to your bot configured with the `/api/telegram` webhook. 
It will be parsed and saved as an expense of 35 with the note "lunch".
