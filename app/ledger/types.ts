export type TransactionTypeFilter = 'all' | 'income' | 'expense';
export type DateRangeFilter = 'all' | '7d' | '30d' | 'month';
export type ViewMode = 'list' | 'monthly' | 'chart';

export interface Transaction {
  id: string;
  amount: number;
  note: string;
  category: string;
  type: 'expense' | 'income';
  transaction_time?: string;
  created_at: string;
}

export interface TransactionFormState {
  amount: string;
  note: string;
  category: string;
  type: 'expense' | 'income';
  transaction_time: string;
}