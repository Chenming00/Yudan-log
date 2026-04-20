'use client';

import { useState, useEffect, useCallback } from 'react';

interface Transaction {
  id: string;
  amount: number;
  note: string;
  category: string;
  type: 'expense' | 'income';
  created_at: string;
}

export default function Home() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stats
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;

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
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedKey = localStorage.getItem('api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
    // Always fetch, since list is now public
    fetchTransactions(savedKey || '');
  }, [fetchTransactions]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey.trim()) {
      localStorage.setItem('api_key', inputKey);
      setApiKey(inputKey);
      fetchTransactions(''); // Key is no longer strictly needed for list, but we can pass it if we want
    }
  };

  return (
    <div className="container animate-fade-in">
      <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="brand" style={{ fontSize: '1.75rem' }}>Personal Finance</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>Overview of your recent activities</p>
        </div>
        <button className="btn glass" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }} onClick={() => {
          localStorage.removeItem('api_key');
          setApiKey(null);
        }}>Disconnect</button>
      </header>

      <div className="grid grid-cols-3" style={{ marginBottom: '3rem' }}>
        <div className="glass card">
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Current Balance</p>
          <h2 style={{ fontSize: '1.5rem', marginTop: '0.5rem' }}>¥{balance.toLocaleString()}</h2>
        </div>
        <div className="glass card">
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Total Income</p>
          <h2 className="amount-income" style={{ fontSize: '1.5rem', marginTop: '0.5rem' }}>+¥{totalIncome.toLocaleString()}</h2>
        </div>
        <div className="glass card">
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Total Expenses</p>
          <h2 className="amount-expense" style={{ fontSize: '1.5rem', marginTop: '0.5rem' }}>-¥{totalExpense.toLocaleString()}</h2>
        </div>
      </div>

      <div className="glass card" style={{ padding: '0' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '1.125rem' }}>Recent Transactions</h3>
          <button className="btn" style={{ background: 'transparent', color: 'var(--primary)', padding: '0' }} onClick={() => fetchTransactions(apiKey)}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        
        {error && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--rose)' }}>{error}</div>}
        
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {transactions.length === 0 && !loading && !error && (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
              No transactions yet. Try sending a message to your Bot!
            </div>
          )}
          
          {transactions.map((t) => (
            <div key={t.id} className="transaction-item">
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  background: t.type === 'income' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem'
                }}>
                  {t.type === 'income' ? '↑' : '↓'}
                </div>
                <div>
                  <p style={{ fontWeight: 500 }}>{t.note}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                    {new Date(t.created_at).toLocaleDateString()} · {t.category}
                  </p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className={t.type === 'income' ? 'amount-income' : 'amount-expense'} style={{ fontWeight: 600 }}>
                  {t.type === 'income' ? '+' : '-'}¥{Number(t.amount).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
