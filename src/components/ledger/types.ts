export interface Transaction {
  id: string;
  amount: number;
  brand?: string | null;
  product?: string | null;
  note: string | null;
  category: string | null;
  type: 'expense';
  transaction_time?: string | null;
  created_at: string;
}

export interface TransactionFormState {
  amount: string;
  brand: string;
  product: string;
  note: string;
  category: string;
  transaction_time: string;
}

export interface LastTransaction {
  amount: number;
  brand?: string | null;
  product?: string | null;
  category: string;
  note: string;
  transaction_time: string;
}

export interface DailyExpense {
  date: string;
  amount: number;
}

export interface CategorySummary {
  category: string;
  amount: number;
  count: number;
}

export interface MonthlyData {
  year: number;
  month: number;
  totalExpense: number;
  transactionCount: number;
  dailyExpenses: DailyExpense[];
  categoryBreakdown: CategorySummary[];
  calendarData: Record<number, number>;
  prevMonthExpense: number;
  allTimeExpense: number;
  lastTransaction: LastTransaction | null;
}
