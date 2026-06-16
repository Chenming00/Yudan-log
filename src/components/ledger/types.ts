export interface Transaction {
  id: string;
  amount: number;
  note: string;
  category: string;
  type: 'expense';
  transaction_time?: string;
  created_at: string;
}

export interface TransactionFormState {
  amount: string;
  note: string;
  category: string;
}

export interface LastTransaction {
  amount: number;
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