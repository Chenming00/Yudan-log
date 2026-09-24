-- Shared baseline for both empty databases and upgrades; apply all numbered
-- migrations afterwards in the order documented in README.md.
BEGIN;
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  amount DECIMAL NOT NULL,
  brand TEXT,
  product TEXT,
  category TEXT,
  note TEXT,
  type TEXT CHECK (type IN ('expense', 'income')) NOT NULL,
  transaction_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions (created_at DESC);
-- Index for time-range (month/day) lookups by transaction_time
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_time ON public.transactions (transaction_time DESC);

-- Public reads are allowed. Writes must go through the server API after
-- GitHub-owner or API-key verification.
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE transactions FROM public, anon;
REVOKE ALL ON TABLE transactions FROM authenticated;
GRANT SELECT ON TABLE transactions TO anon;
GRANT SELECT ON TABLE transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE transactions TO service_role;

DROP POLICY IF EXISTS "Public can read transactions" ON transactions;
CREATE POLICY "Public can read transactions"
ON transactions
FOR SELECT
TO anon, authenticated
USING (true);

-- 全部支出总额聚合：避免前端/接口受 Supabase 默认 1000 行返回上限影响而少算「总支出」。
-- 用法：supabase.rpc('total_expense')
CREATE OR REPLACE FUNCTION public.total_expense()
RETURNS NUMERIC
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'expense';
$$;
REVOKE ALL ON FUNCTION public.total_expense() FROM public;
GRANT EXECUTE ON FUNCTION public.total_expense() TO anon, authenticated, service_role;
COMMIT;
