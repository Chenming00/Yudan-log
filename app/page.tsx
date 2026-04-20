'use client';

import { useState, useEffect, useCallback } from 'react';

type TransactionTypeFilter = 'all' | 'income' | 'expense';

// Reuse Transaction Interface
interface Transaction {
  id: string;
  amount: number;
  note: string;
  category: string;
  type: 'expense' | 'income';
  transaction_time?: string;
  created_at: string;
}

// Subcomponents
function BalanceHeader({ balance, income, expense }: { balance: number, income: number, expense: number }) {
  return (
    <div className="pt-8 pb-10 px-6">
      <p className="text-center text-[0.85rem] font-medium text-gray-500 mb-1 tracking-wide">Total Balance</p>
      <h1 className="text-center text-5xl leading-tight font-semibold text-black tracking-tight mb-8">
        ¥{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </h1>
      <div className="flex items-center justify-center space-x-10 text-sm font-medium">
        <div className="flex flex-col items-center">
          <span className="text-gray-400 text-xs mb-1 uppercase tracking-wider font-semibold">Income</span>
          <span className="text-emerald-500 text-base font-semibold">+¥{income.toLocaleString()}</span>
        </div>
        <div className="h-8 w-[1px] bg-gray-200"></div>
        <div className="flex flex-col items-center">
          <span className="text-gray-400 text-xs mb-1 uppercase tracking-wider font-semibold">Expense</span>
          <span className="text-red-500 text-base font-semibold">-¥{expense.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

function TransactionItem({ t }: { t: Transaction }) {
  const isIncome = t.type === 'income';
  const displayDate = new Date(t.transaction_time || t.created_at).toLocaleDateString([], {
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className="flex items-center justify-between py-3.5 px-5 mx-1">
      <div className="flex flex-col">
        <span className="font-medium text-gray-900 text-base leading-snug">{t.note || 'Untitled'}</span>
        <span className="text-[0.8rem] text-gray-400 font-medium mt-0.5">
          {displayDate} {t.category ? `• ${t.category}` : ''}
        </span>
      </div>
      <div className={`font-semibold text-base ${isIncome ? 'text-emerald-500' : 'text-gray-900'}`}>
        {isIncome ? '+' : '-'}¥{Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
    </div>
  );
}

function TransactionList({ transactions, loading, error }: { transactions: Transaction[], loading: boolean, error: string | null }) {
  if (loading) {
    return <div className="p-8 text-center text-sm text-gray-400 font-medium">Loading transactions...</div>;
  }
  
  if (error) {
    return <div className="p-8 text-center text-sm text-red-500 font-medium">{error}</div>;
  }

  if (transactions.length === 0) {
    return <div className="p-8 text-center text-sm text-gray-400 font-medium">没有匹配的记录，试试换个关键词或筛选条件。</div>;
  }

  return (
    <div className="bg-white rounded-2xl mx-5 mb-28 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
      <div className="divide-y divide-gray-100">
        {transactions.map(t => (
          <TransactionItem key={t.id} t={t} />
        ))}
      </div>
    </div>
  );
}

function SearchAndFilterBar({
  searchTerm,
  onSearchChange,
  selectedType,
  onTypeChange,
  categories,
  selectedCategory,
  onCategoryChange,
}: {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedType: TransactionTypeFilter;
  onTypeChange: (value: TransactionTypeFilter) => void;
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
}) {
  const filters: Array<{ label: string; value: TransactionTypeFilter }> = [
    { label: '全部', value: 'all' },
    { label: '收入', value: 'income' },
    { label: '支出', value: 'expense' },
  ];

  const categoryFilters = ['全部分类', ...categories];

  return (
    <div className="px-5 mb-5 space-y-3">
      <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-100 px-4 py-3 flex items-center gap-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-gray-400 shrink-0"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.3-4.3"></path>
        </svg>
        <input
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="搜索备注或分类"
          className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((filter) => {
          const isActive = selectedType === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => onTypeChange(filter.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors whitespace-nowrap ${isActive
                ? 'bg-[#007AFF] text-white border-[#007AFF]'
                : 'bg-white text-gray-600 border-gray-200'
                }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categoryFilters.map((category) => {
          const value = category === '全部分类' ? '' : category;
          const isActive = selectedCategory === value;

          return (
            <button
              key={category}
              type="button"
              onClick={() => onCategoryChange(value)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors whitespace-nowrap ${isActive
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200'
                }`}
            >
              {category}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Main Page
export default function Home() {
  const [apiKey, setApiKey] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('api_key');
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<TransactionTypeFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState('');

  const fetchTransactions = useCallback(async (key: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/list', {
        headers: { Authorization: `Bearer ${key}` },
      });
      const data = await res.json();
      if (data.success) {
        setTransactions(data.data);
      } else {
        setError(data.error || 'Failed to fetch');
        if (res.status === 401) {
          localStorage.removeItem('api_key');
          setApiKey(null);
        }
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchTransactions(apiKey || '');
    }, 0);
    return () => window.clearTimeout(timer);
  }, [apiKey, fetchTransactions]);

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const categories = Array.from(
    new Set(
      transactions
        .map((t) => t.category?.trim())
        .filter((category): category is string => Boolean(category))
    )
  );

  const filteredTransactions = transactions.filter((t) => {
    const matchesType = selectedType === 'all' || t.type === selectedType;
    const matchesCategory = !selectedCategory || t.category === selectedCategory;
    const matchesSearch = !normalizedSearch
      || t.note?.toLowerCase().includes(normalizedSearch)
      || t.category?.toLowerCase().includes(normalizedSearch);

    return matchesType && matchesCategory && matchesSearch;
  });

  return (
    <main className="max-w-xl mx-auto min-h-[100dvh] relative pb-6 antialiased">
      {/* Minimal Header */}
      <header className="px-6 pt-safe pb-2">
        <h1 className="text-[1.35rem] font-semibold tracking-tight text-black pt-4">鱼蛋小账本</h1>
      </header>

      {/* Balance Section */}
      <BalanceHeader balance={balance} income={totalIncome} expense={totalExpense} />

      <SearchAndFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      {/* Transaction List */}
      <TransactionList transactions={filteredTransactions} loading={loading} error={error} />
    </main>
  );
}
