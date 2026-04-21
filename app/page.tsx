'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Spinner,
  Separator,
} from '@heroui/react';

type TransactionTypeFilter = 'all' | 'income' | 'expense';

interface Transaction {
  id: string;
  amount: number;
  note: string;
  category: string;
  type: 'expense' | 'income';
  transaction_time?: string;
  created_at: string;
}

function BalanceHeader({ balance, income, expense }: { balance: number; income: number; expense: number }) {
  return (
    <Card className="mx-5 mb-5 bg-stone-50 border border-stone-200/70 shadow-none">
      <CardContent className="py-8 px-6 text-center">
        <p className="text-[11px] font-medium text-stone-400 mb-1.5 tracking-[0.2em] uppercase">余额</p>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-800 mb-6">
          ¥{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h1>
        <div className="flex items-center justify-center gap-8">
          <div className="flex flex-col items-center">
            <span className="text-[11px] text-stone-400 tracking-wider mb-1">收入</span>
            <span className="text-sm font-medium text-stone-700">+¥{income.toLocaleString()}</span>
          </div>
          <Separator orientation="vertical" className="h-8 bg-stone-200" />
          <div className="flex flex-col items-center">
            <span className="text-[11px] text-stone-400 tracking-wider mb-1">支出</span>
            <span className="text-sm font-medium text-stone-700">-¥{expense.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TransactionItem({ t }: { t: Transaction }) {
  const isIncome = t.type === 'income';
  const displayDate = new Date(t.transaction_time || t.created_at).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="flex items-center justify-between py-3 px-4">
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-sm text-stone-800">{t.note || 'Untitled'}</span>
        <span className="text-xs text-stone-400">
          {displayDate} {t.category ? `· ${t.category}` : ''}
        </span>
      </div>
      <span className={`font-medium text-sm ${isIncome ? 'text-emerald-600/80' : 'text-stone-700'}`}>
        {isIncome ? '+' : '-'}¥{Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  );
}

function TransactionList({ transactions, loading, error }: { transactions: Transaction[]; loading: boolean; error: string | null }) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="mx-5 mb-6 border border-stone-200/70 shadow-none">
        <CardContent className="text-center py-8 text-rose-400 text-sm">{error}</CardContent>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card className="mx-5 mb-6 border border-stone-200/70 shadow-none">
        <CardContent className="text-center py-8 text-stone-400 text-sm">
          没有匹配的记录，试试换个关键词或筛选条件。
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-5 mb-28 border border-stone-200/70 shadow-none">
      <CardContent className="p-0">
        {transactions.map((t, index) => (
          <div key={t.id}>
            <TransactionItem t={t} />
            {index < transactions.length - 1 && <Separator className="bg-stone-100" />}
          </div>
        ))}
      </CardContent>
    </Card>
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
  const categoryFilters = ['全部分类', ...categories];

  return (
    <div className="px-5 mb-5 space-y-3">
      <div className="flex items-center gap-3 bg-stone-50 rounded-xl border border-stone-200/70 px-4 py-2.5">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400 shrink-0">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          placeholder="搜索备注或分类"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400 text-stone-700"
        />
      </div>

      <div className="flex gap-1 bg-stone-100 rounded-lg p-1">
        {([['all', '全部'], ['income', '收入'], ['expense', '支出']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => onTypeChange(key)}
            className={`flex-1 py-1.5 text-sm rounded-md font-medium transition-all ${
              selectedType === key
                ? 'bg-white text-stone-800 shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categoryFilters.map((category) => {
          const value = category === '全部分类' ? '' : category;
          const isActive = selectedCategory === value;
          return (
            <button
              key={category}
              onClick={() => onCategoryChange(value)}
              className={`shrink-0 px-3 py-1 text-xs rounded-full border font-medium transition-all ${
                isActive
                  ? 'bg-stone-800 text-stone-50 border-stone-800'
                  : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100'
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

  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
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
    const matchesSearch =
      !normalizedSearch ||
      t.note?.toLowerCase().includes(normalizedSearch) ||
      t.category?.toLowerCase().includes(normalizedSearch);
    return matchesType && matchesCategory && matchesSearch;
  });

  return (
    <main className="max-w-xl mx-auto min-h-[100dvh] relative pb-6 antialiased bg-stone-100/60">
      <header className="px-6 pt-safe pb-2">
        <h1 className="text-lg font-medium tracking-tight pt-4 text-stone-700">🐟 鱼蛋小账本</h1>
      </header>

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

      <TransactionList transactions={filteredTransactions} loading={loading} error={error} />
    </main>
  );
}
