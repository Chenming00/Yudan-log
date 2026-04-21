"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Settings, ArrowLeft, Plus, CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { BalanceCard } from './components/balance-card';
import { FilterBar } from './components/filter-bar';
import { FilterSummary } from './components/filter-summary';
import { ViewSwitcher } from './components/view-switcher';
import { TransactionList } from './components/transaction-list';
import { MonthlyView } from './components/monthly-view';
import { CategoryPieChart, CategoryBarChart, DailyTrendChart, MonthlyComparisonChart } from './chart-components';
import { TransactionDialog } from './components/transaction-dialog';
import { AddDialog } from './components/add-dialog';
import { SettingsDialog } from './components/settings-dialog';
import { Transaction, TransactionTypeFilter, DateRangeFilter, ViewMode } from './types';

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getTransactionDate(transaction: Transaction) {
  return new Date(transaction.transaction_time || transaction.created_at);
}

export default function LedgerPage() {
  const [apiKey, setApiKey] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('api_key');
  });
  const canManageTransactions = Boolean(apiKey);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<TransactionTypeFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRangeFilter>('all');
  const [selectedMonth, setSelectedMonth] = useState(() => getMonthKey(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const fetchTransactions = useCallback(async (key: string) => {
    setLoading(true);
    setError(null);
    try {
      const headers = key ? { Authorization: `Bearer ${key}` } : undefined;
      const res = await fetch('/api/list', headers ? { headers } : undefined);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.data);
      } else {
        setError(data.error || '获取账本失败');
        if (res.status === 401) {
          localStorage.removeItem('api_key');
          setApiKey(null);
        }
      }
    } catch {
      setError('网络异常，请稍后重试');
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

  const totalIncome = useMemo(
    () => transactions.filter((t) => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0),
    [transactions]
  );
  const totalExpense = useMemo(
    () => transactions.filter((t) => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0),
    [transactions]
  );
  const balance = totalIncome - totalExpense;

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const availableMonths = useMemo(
    () =>
      Array.from(
        new Set(transactions.map((transaction) => getMonthKey(getTransactionDate(transaction))))
      ).sort((a, b) => b.localeCompare(a)),
    [transactions]
  );

  const isWithinDateRange = useCallback(
    (transaction: Transaction) => {
      if (selectedMonth) {
        return getMonthKey(getTransactionDate(transaction)) === selectedMonth;
      }
      if (selectedDateRange === 'all') return true;
      const current = getTransactionDate(transaction).getTime();
      const now = new Date();

      if (selectedDateRange === '7d') {
        return current >= now.getTime() - 7 * 24 * 60 * 60 * 1000;
      }

      if (selectedDateRange === '30d') {
        return current >= now.getTime() - 30 * 24 * 60 * 60 * 1000;
      }

      return (
        new Date(current).getMonth() === now.getMonth() &&
        new Date(current).getFullYear() === now.getFullYear()
      );
    },
    [selectedDateRange, selectedMonth]
  );

  const filteredTransactions = useMemo(
    () =>
      transactions
        .filter((t) => {
          const matchesType = selectedType === 'all' || t.type === selectedType;
          const matchesCategory = !selectedCategory || t.category === selectedCategory;
          const matchesSearch =
            !normalizedSearch ||
            t.note?.toLowerCase().includes(normalizedSearch) ||
            t.category?.toLowerCase().includes(normalizedSearch);
          return matchesType && matchesCategory && matchesSearch && isWithinDateRange(t);
        })
        .sort((a, b) => {
          const timeA = new Date(a.transaction_time || a.created_at).getTime();
          const timeB = new Date(b.transaction_time || b.created_at).getTime();
          return timeB - timeA;
        }),
    [transactions, selectedType, selectedCategory, normalizedSearch, isWithinDateRange]
  );

  const filteredCategories = useMemo(
    () =>
      Array.from(
        new Set(
          transactions
            .filter(
              (t) =>
                (selectedType === 'all' || t.type === selectedType) &&
                (!selectedMonth || getMonthKey(getTransactionDate(t)) === selectedMonth)
            )
            .map((t) => t.category?.trim())
            .filter((category): category is string => Boolean(category))
        )
      ),
    [transactions, selectedType, selectedMonth]
  );

  const filteredIncome = useMemo(
    () =>
      filteredTransactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0),
    [filteredTransactions]
  );
  const filteredExpense = useMemo(
    () =>
      filteredTransactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0),
    [filteredTransactions]
  );

  const hasActiveFilters =
    selectedType !== 'all' ||
    selectedCategory !== '' ||
    normalizedSearch !== '' ||
    selectedDateRange !== 'all' ||
    selectedMonth !== '';

  // 图表数据
  const monthlyData = useMemo(() => {
    const grouped = transactions.reduce<Record<string, { income: number; expense: number; year: number; month: number }>>(
      (groups, t) => {
        const monthKey = getMonthKey(getTransactionDate(t));
        if (!groups[monthKey]) {
          const [year, month] = monthKey.split('-').map(Number);
          groups[monthKey] = { income: 0, expense: 0, year, month };
        }
        if (t.type === 'income') {
          groups[monthKey].income += Number(t.amount);
        } else {
          groups[monthKey].expense += Number(t.amount);
        }
        return groups;
      },
      {}
    );

    return Object.values(grouped)
      .map((data) => ({
        month: `${data.year}年${data.month}月`,
        income: data.income,
        expense: data.expense,
      }))
      .sort((a, b) => {
        const [aYear, aMonthNum] = a.month.replace('年', '-').replace('月', '').split('-').map(Number);
        const [bYear, bMonthNum] = b.month.replace('年', '-').replace('月', '').split('-').map(Number);
        return new Date(bYear, bMonthNum - 1).getTime() - new Date(aYear, aMonthNum - 1).getTime();
      })
      .slice(0, 12);
  }, [transactions]);

  return (
    <main className="page-shell relative pb-6 lg:pb-10">
      {/* 头部 */}
      <header className="page-padding flex items-center justify-between pt-safe pb-2">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="pt-4 text-stone-500 hover:text-stone-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-medium tracking-tight pt-4 text-stone-700">
            🐟 鱼蛋小账本
          </h1>
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          className="pt-4 text-stone-500 hover:text-stone-700 transition-colors"
          aria-label="设置"
        >
          <Settings className="h-5 w-5" />
        </button>
      </header>

      {/* 余额卡片 */}
      <BalanceCard balance={balance} income={totalIncome} expense={totalExpense} />

      {/* 新增和重置按钮 */}
      <div className="page-padding mx-auto mb-4 flex max-w-4xl flex-col gap-3 sm:flex-row">
        <button
          onClick={() => {
            if (!canManageTransactions) {
              setSettingsOpen(true);
              return;
            }
            setAddOpen(true);
          }}
          className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            canManageTransactions
              ? 'bg-stone-800 text-white hover:bg-stone-700'
              : 'bg-stone-300 text-stone-500 cursor-not-allowed'
          }`}
          aria-disabled={!canManageTransactions}
          title={canManageTransactions ? '新增记录' : '填写 API Key 后才可新增记录'}
        >
          <Plus className="h-4 w-4" />
          {canManageTransactions ? '新增记录' : '新增需 API Key'}
        </button>
        <button
          onClick={() => {
            setSearchTerm('');
            setSelectedType('all');
            setSelectedCategory('');
            setSelectedDateRange('all');
            setSelectedMonth(getMonthKey(new Date()));
          }}
          className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-600 flex items-center justify-center gap-2 transition-colors hover:bg-stone-50 sm:w-auto"
        >
          重置
        </button>
      </div>

      {/* 筛选栏 */}
      <FilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedType={selectedType}
        onTypeChange={(type) => {
          setSelectedType(type);
          setSelectedCategory('');
        }}
        categories={filteredCategories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedDateRange={selectedDateRange}
        onDateRangeChange={(value) => {
          setSelectedDateRange(value);
          if (value !== 'all') {
            setSelectedMonth('');
          }
        }}
        availableMonths={availableMonths}
        selectedMonth={selectedMonth}
        onMonthChange={(value) => {
          setSelectedMonth(value);
          if (value) {
            setSelectedDateRange('all');
          }
        }}
        resultCount={filteredTransactions.length}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => {
          setSearchTerm('');
          setSelectedType('all');
          setSelectedCategory('');
          setSelectedDateRange('all');
          setSelectedMonth('');
        }}
      />

      {/* 筛选结果汇总 */}
      <FilterSummary count={filteredTransactions.length} income={filteredIncome} expense={filteredExpense} />

      {/* 视图切换 */}
      <ViewSwitcher viewMode={viewMode} onViewModeChange={setViewMode} />

      {/* 列表视图 */}
      {viewMode === 'list' && (
        <TransactionList
          transactions={filteredTransactions}
          loading={loading}
          error={error}
          onSelect={(t) => {
            setSelectedTransaction(t);
            setDialogOpen(true);
          }}
        />
      )}

      {/* 月度视图 */}
      {viewMode === 'monthly' && (
        <MonthlyView
          transactions={transactions}
          loading={loading}
          error={error}
          onSelect={(t) => {
            setSelectedTransaction(t);
            setDialogOpen(true);
          }}
        />
      )}

      {/* 图表视图 */}
      {viewMode === 'chart' && (
        <div className="mx-4 sm:mx-6 lg:mx-8 max-w-4xl space-y-4">
          {filteredTransactions.filter((t) => t.type === 'expense').length > 0 && (
            <>
              <CategoryPieChart transactions={filteredTransactions.filter((t) => t.type === 'expense')} title="支出分类分布" />
              <CategoryBarChart transactions={filteredTransactions.filter((t) => t.type === 'expense')} title="支出分类排行" />
            </>
          )}
          {filteredTransactions.length > 0 && (
            <DailyTrendChart transactions={filteredTransactions} title="每日收支趋势" />
          )}
          {transactions.length > 0 && (
            <MonthlyComparisonChart monthlyData={monthlyData} title="月度收支对比" />
          )}
          {filteredTransactions.length === 0 && (
            <Card className="border-stone-200/70 bg-white/80 shadow-none">
              <CardContent className="p-6">
                <p className="text-center text-stone-400 text-sm py-8">
                  暂无数据，请先添加筛选条件或记账记录。
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 交易详情对话框 */}
      <TransactionDialog
        key={`${selectedTransaction?.id ?? 'empty'}-${dialogOpen ? 'open' : 'closed'}`}
        transaction={selectedTransaction}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        apiKey={apiKey}
        onUpdated={() => fetchTransactions(apiKey || '')}
      />

      {/* 新增对话框 */}
      <AddDialog
        key={addOpen ? 'add-open' : 'add-closed'}
        open={addOpen}
        onOpenChange={setAddOpen}
        apiKey={apiKey}
        onAdded={() => fetchTransactions(apiKey || '')}
      />

      {/* 设置对话框 */}
      <SettingsDialog
        key={`${settingsOpen ? 'settings-open' : 'settings-closed'}-${apiKey ?? ''}`}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        currentKey={apiKey}
        onSave={(key) => {
          if (key) {
            localStorage.setItem('api_key', key);
            setApiKey(key);
          } else {
            localStorage.removeItem('api_key');
            setApiKey(null);
          }
        }}
      />

      {/* 无 API Key 提示 */}
      {!apiKey && !loading && (
        <Card className="mx-4 sm:mx-6 lg:mx-8 mx-auto mt-4 max-w-4xl border-dashed border-stone-300 bg-white/70 shadow-none">
          <CardContent className="py-5 px-4 text-sm text-stone-500">
            <div className="flex items-start gap-3">
              <CalendarDays className="h-4 w-4 mt-0.5 text-stone-400" />
              <div>
                <p className="font-medium text-stone-700 mb-1">当前为只读模式</p>
                <p>未填写 API Key 时，你仍然可以查看、搜索和筛选账本记录；填写后才可以新增、编辑和删除。</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}