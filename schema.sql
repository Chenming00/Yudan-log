-- Transactions table for personal finance
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  amount DECIMAL NOT NULL,
  category TEXT,
  note TEXT,
  type TEXT CHECK (type IN ('expense', 'income')) NOT NULL,
  transaction_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index for faster queries
CREATE INDEX idx_transactions_created_at ON transactions (created_at DESC);
-- Index for time-range (month/day) lookups by transaction_time
CREATE INDEX idx_transactions_transaction_time ON transactions (transaction_time DESC);

-- 全部支出总额聚合：避免前端/接口受 Supabase 默认 1000 行返回上限影响而少算「总支出」。
-- 用法：supabase.rpc('total_expense')
CREATE OR REPLACE FUNCTION total_expense()
RETURNS NUMERIC
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'expense';
$$;
