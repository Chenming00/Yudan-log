'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback, useMemo } from 'react';

interface Transaction {
  id: string;
  amount: number;
  note: string;
  category: string;
  type: 'expense' | 'income';
  transaction_time?: string;
  created_at: string;
}

const SearchIcon = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export default function Home() {
  const [apiKey, setApiKey] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('api_key');
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

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

  // Derived state for filtering
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const noteStr = t.note || '';
      const matchesSearch = noteStr.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || t.type === typeFilter;
      const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
      return matchesSearch && matchesType && matchesCategory;
    });
  }, [transactions, searchTerm, typeFilter, categoryFilter]);

  // Derived categories from ALL fetched transactions
  const availableCategories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category));
    return Array.from(cats).filter(Boolean);
  }, [transactions]);

  // Stats - dynamically update based on filtered data
  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
  const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;

  return (
    <main className="container app-shell animate-fade-in">
      <section className="hero">
        <header className="hero-header">
          <div className="hero-brand-wrap">
            <Image src="/logo.svg" alt="Logo" className="hero-logo" width={48} height={48} priority />
            <div className="hero-copy">
              <h1 className="brand hero-title">鱼蛋小账本</h1>
            </div>
          </div>
          <button
            className="btn btn-ghost hero-action"
            onClick={() => {
              localStorage.removeItem('api_key');
              setApiKey(null);
            }}
          >
            Disconnect
          </button>
        </header>

        <div className="grid grid-cols-3 stats-grid dashboard-metrics">
          <div className="card stat-card stat-card-primary">
            <p className="stat-label">
              {typeFilter === 'all' && categoryFilter === 'all' && !searchTerm ? 'Total Balance' : 'Filtered Balance'}
            </p>
            <h2 className="stat-value">¥{balance.toLocaleString()}</h2>
          </div>
          <div className="card stat-card">
            <p className="stat-label">Income (Filtered)</p>
            <h2 className="stat-value amount-income">+¥{totalIncome.toLocaleString()}</h2>
          </div>
          <div className="card stat-card">
            <p className="stat-label">Expenses (Filtered)</p>
            <h2 className="stat-value amount-expense">-¥{totalExpense.toLocaleString()}</h2>
          </div>
        </div>
      </section>

      <section className="card transactions-panel">
        <div className="transactions-header">
          <div>
            <h3 className="section-title">Transactions</h3>
            <p className="section-subtitle">Use filters to analyze your data easily.</p>
          </div>
          <button className="btn btn-ghost refresh-btn" onClick={() => fetchTransactions(apiKey || '')}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Filters Toolbar */}
        <div className="filters-toolbar">
          <div className="search-wrapper">
            <SearchIcon className="search-icon" />
            <input 
              type="text" 
              placeholder="Search by note..." 
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filters-row">
            <button 
              className={`pill-btn ${typeFilter === 'all' ? 'pill-active' : ''}`}
              onClick={() => setTypeFilter('all')}
            >
              All Types
            </button>
            <button 
              className={`pill-btn ${typeFilter === 'income' ? 'pill-active pill-income' : ''}`}
              onClick={() => setTypeFilter('income')}
            >
              Income
            </button>
            <button 
              className={`pill-btn ${typeFilter === 'expense' ? 'pill-active pill-expense' : ''}`}
              onClick={() => setTypeFilter('expense')}
            >
              Expense
            </button>
          </div>
        </div>

        {availableCategories.length > 0 && (
          <div className="filters-toolbar-bottom">
            <div className="categories-scroll">
              <button 
                className={`pill-btn ${categoryFilter === 'all' ? 'pill-active' : ''}`}
                onClick={() => setCategoryFilter('all')}
              >
                All Categories
              </button>
              {availableCategories.map(cat => (
                <button 
                  key={cat}
                  className={`pill-btn ${categoryFilter === cat ? 'pill-active' : ''}`}
                  onClick={() => setCategoryFilter(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <div className="status-message status-error">{error}</div>}

        <div className="transactions-list">
          {transactions.length === 0 && !loading && !error && (
            <div className="status-message status-empty">
              No transactions yet. Try sending a message to your Bot!
            </div>
          )}

          {transactions.length > 0 && filteredTransactions.length === 0 && !loading && !error && (
            <div className="status-message status-empty">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 1rem', opacity: 0.5, display: 'block' }}>
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.3-4.3"></path>
              </svg>
              No transactions match your current filters.
            </div>
          )}

          {filteredTransactions.map((t) => (
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
                    <p className="transaction-meta">
                      {new Date(t.transaction_time || t.created_at).toLocaleString([], {
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    {t.category && (
                      <>
                        <span className="transaction-dot" aria-hidden="true" />
                        <p className="transaction-meta">{t.category}</p>
                      </>
                    )}
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
