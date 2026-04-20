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
