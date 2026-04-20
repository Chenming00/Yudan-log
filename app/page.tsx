'use client';

import Image from 'next/image';
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
  const [apiKey, setApiKey] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    return localStorage.getItem('api_key');
  });
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

  return (
    <main className="container app-shell animate-fade-in">
      <section className="hero glass">
        <header className="hero-header">
          <div className="hero-brand-wrap">
            <Image src="/logo.svg" alt="Logo" className="hero-logo" width={48} height={48} priority />
            <div className="hero-copy">
              <p className="eyebrow">openclaw Finance</p>
              <h1 className="brand hero-title">Your money, clearer at a glance</h1>
              <p className="hero-subtitle">A compact overview of recent income, spending, and account balance.</p>
            </div>
          </div>

          <button
            className="btn glass hero-action"
            onClick={() => {
              localStorage.removeItem('api_key');
              setApiKey(null);
            }}
          >
            Disconnect
          </button>
        </header>

        <div className="grid grid-cols-3 stats-grid">
          <div className="glass card stat-card stat-card-primary">
            <p className="stat-label">Current Balance</p>
            <h2 className="stat-value">¥{balance.toLocaleString()}</h2>
          </div>
          <div className="glass card stat-card">
            <p className="stat-label">Total Income</p>
            <h2 className="stat-value amount-income">+¥{totalIncome.toLocaleString()}</h2>
          </div>
          <div className="glass card stat-card">
            <p className="stat-label">Total Expenses</p>
            <h2 className="stat-value amount-expense">-¥{totalExpense.toLocaleString()}</h2>
          </div>
        </div>
      </section>

      <section className="glass card transactions-panel">
        <div className="transactions-header">
          <div>
            <h3 className="section-title">Recent Transactions</h3>
            <p className="section-subtitle">Designed for quick checking on your phone.</p>
          </div>
          <button className="btn btn-ghost refresh-btn" onClick={() => fetchTransactions(apiKey || '')}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {error && <div className="status-message status-error">{error}</div>}

        <div className="transactions-list">
          {transactions.length === 0 && !loading && !error && (
            <div className="status-message status-empty">
              No transactions yet. Try sending a message to your Bot!
            </div>
          )}

          {transactions.map((t) => (
            <article key={t.id} className="transaction-item">
              <div className="transaction-main">
                <div className={`transaction-icon ${t.type === 'income' ? 'is-income' : 'is-expense'}`}>
                  {t.type === 'income' ? '↑' : '↓'}
                </div>

                <div className="transaction-copy">
                  <div className="transaction-topline">
                    <p className="transaction-note">{t.note}</p>
                    <p className={t.type === 'income' ? 'transaction-amount amount-income' : 'transaction-amount amount-expense'}>
                      {t.type === 'income' ? '+' : '-'}¥{Number(t.amount).toLocaleString()}
                    </p>
                  </div>

                  <div className="transaction-meta-row">
                    <p className="transaction-meta">{new Date(t.created_at).toLocaleDateString()}</p>
                    <span className="transaction-dot" aria-hidden="true" />
                    <p className="transaction-meta">{t.category}</p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
