'use client';

import { useState, useEffect, useCallback } from 'react';

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
    return <div className="p-8 text-center text-sm text-gray-400 font-medium">No transactions yet. Try sending a message to your Bot!</div>;
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

function FloatingAddButton() {
  return (
    <button className="fixed bottom-8 right-6 w-14 h-14 bg-[#007AFF] rounded-full flex items-center justify-center shadow-[0_4px_14px_rgba(0,122,255,0.3)] active:scale-90 transition-transform z-50">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    </button>
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

  return (
    <main className="max-w-xl mx-auto min-h-[100dvh] relative pb-6 antialiased">
      {/* Minimal Header */}
      <header className="flex items-center justify-between px-6 pt-safe pb-2">
        <h1 className="text-[1.35rem] font-semibold tracking-tight text-black pt-4">鱼蛋小账本</h1>
        <button 
          onClick={() => {
            localStorage.removeItem('api_key');
            setApiKey(null);
          }}
          className="text-[1.05rem] font-medium text-[#007AFF] active:opacity-50 transition-opacity pt-4"
        >
          Disconnect
        </button>
      </header>

      {/* Balance Section */}
      <BalanceHeader balance={balance} income={totalIncome} expense={totalExpense} />

      {/* Transaction List */}
      <TransactionList transactions={transactions} loading={loading} error={error} />

      {/* Floating Action Button */}
      <FloatingAddButton />
    </main>
  );
}
