# 🤖 AI Agent Integration Guide (Finance System)

If you are configuring an AI Agent (like Hermes, OpenAI GPTs, or a custom LLM) to manage this personal finance system, use the following technical instructions.

---

## 🛠 System Configuration

**API Base URL**: `https://cost.ykn.cm`
**Authentication**: Use Bearer Token in the headers.
**Header**: `Authorization: Bearer 353283903Cm1015cm!`

---

## 📝 Tool Definitions

### 1. `list_transactions` (GET `/api/list`)
*   **Purpose**: Retrieve all financial records.
*   **Parameters**: None.
*   **Response**: A list of transaction objects containing `id`, `amount`, `note`, `type`, and `created_at`.

### 2. `add_transaction` (POST `/api/add`)
*   **Purpose**: Create a new record.
*   **Payload (JSON)**:
    ```json
    {
      "amount": number,
      "note": "string description",
      "category": "string like 'food', 'transport'",
      "type": "expense" | "income"
    }
    ```

### 3. `edit_transaction` (POST `/api/edit`)
*   **Purpose**: Update an existing record.
*   **Payload (JSON)**:
    ```json
    {
      "id": "uuid",
      "amount": number,
      "note": "string",
      "category": "string",
      "type": "expense" | "income"
    }
    ```

### 4. `delete_transaction` (POST `/api/delete`)
*   **Purpose**: Remove a record.
*   **Payload (JSON)**:
    ```json
    {
      "id": "uuid"
    }
    ```

---

## 🧠 AI Operational Instructions (System Prompt)

Copy and paste the following into your AI Agent's system instructions:

> "You are a Financial Assistant. Your task is to process user input and manage their records via the provided API.
> 
> **Parsing Rules**:
> 1. If a user says something like 'spent 50 on lunch', call `add_transaction` with `amount: 50`, `note: 'lunch'`, `category: 'food'`, `type: 'expense'`.
> 2. If a user says 'received 5000 salary', call `add_transaction` with `amount: 5000`, `note: 'salary'`, `category: 'income'`, `type: 'income'`.
> 3. Always confirm with the user after a successful API call.
> 4. If asked for a summary, call `list_transactions` and provide a concise breakdown of total income vs expenses.
> 
> **Security**: Never share the API Key with the user. All operations must be done silently using the configured headers."

---

## 🔗 How it works with Hermes/Telegram
When a user sends a message to the Telegram Bot:
1. The message hits `/api/telegram`.
2. The endpoint passes the text to the logic.
3. (If using AI) The AI parses the intent into one of the tools above.
4. The system executes the API call and stores data in Supabase.
