"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SummaryCards, TrendChart, CategoryBreakdown, Insights, RecentExpenses } from "./dashboard";
import { Transaction } from "../types";
import { QuickAdd, QuickAddData } from "./components/quick-add";

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getTransactionDate(transaction: Transaction) {
  return new Date(transaction.transaction_time || transaction.created_at);
}

export default function BabyDashboardPage() {
  const [apiKey, setApiKey] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("api_key");
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  const handleAdd = async (data: QuickAddData) => {
    if (!apiKey) {
      alert("请先设置 API Key");
      return;
    }

    const res = await fetch("/api/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        note: data.note,
        amount: data.amount,
        category: data.category,
        type: "expense",
        transaction_time: data.date,
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "添加失败" }));
      alert(error.error || "添加失败");
      return;
    }

    // 刷新数据
    await fetchTransactions(apiKey);
  };

  const fetchTransactions = useCallback(async (key: string) => {
    setLoading(true);
    try {
      const headers = key ? { Authorization: `Bearer ${key}` } : undefined;
      const res = await fetch("/api/list", headers ? { headers } : undefined);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.data);
      }
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchTransactions(apiKey || "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [apiKey, fetchTransactions]);

  // 本月数据
  const currentMonthKey = getMonthKey(new Date());
  const currentMonthData = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    
    const monthTransactions = transactions.filter(
      (t) => getMonthKey(getTransactionDate(t)) === currentMonthKey
    );
    const expense = monthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    return { expense, days: currentDay, transactions: monthTransactions };
  }, [transactions, currentMonthKey]);

  // 上月数据
  const lastMonthExpense = useMemo(() => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = getMonthKey(lastMonth);
    const monthTransactions = transactions.filter(
      (t) => getMonthKey(getTransactionDate(t)) === lastMonthKey
    );
    return monthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);
  }, [transactions]);

  // 最大单日支出
  const maxSingleDay = useMemo(() => {
    const dailyExpenses = currentMonthData.transactions
      .filter((t) => t.type === "expense")
      .reduce<Record<string, { date: string; amount: number }>>((groups, t) => {
        const date = getTransactionDate(t);
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        const displayDate = `${date.getMonth() + 1}月${date.getDate()}日`;
        if (!groups[dateKey]) {
          groups[dateKey] = { date: displayDate, amount: 0 };
        }
        groups[dateKey].amount += Number(t.amount);
        return groups;
      }, {});

    let maxAmount = 0;
    let maxDate = "";
    Object.entries(dailyExpenses).forEach(([_, data]) => {
      if (data.amount > maxAmount) {
        maxAmount = data.amount;
        maxDate = data.date;
      }
    });

    return maxAmount > 0 ? { date: maxDate, amount: maxAmount } : null;
  }, [currentMonthData.transactions]);

  if (loading) {
    return (
      <main className="page-shell relative pb-6 lg:pb-10">
        <header className="page-padding flex items-center gap-3 pt-safe pb-2">
          <Link href="/ledger" className="pt-4 text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-medium tracking-tight pt-4 text-gray-900">
            宝宝养育成本看板
          </h1>
        </header>
        <div className="page-padding mx-auto max-w-4xl mt-8">
          <p className="text-center text-gray-400">加载中...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell relative pb-6 lg:pb-10 bg-[#FAFAFA] min-h-screen">
      {/* 头部 */}
      <header className="page-padding flex items-center gap-3 pt-safe pb-2">
        <Link href="/ledger" className="pt-4 text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-medium tracking-tight pt-4 text-gray-900">
          宝宝养育成本看板
        </h1>
      </header>

      {/* 主要内容区 */}
      <div className="page-padding mx-auto max-w-4xl mt-4 space-y-4">
        {/* Summary Cards */}
        <SummaryCards
          currentMonth={{ expense: currentMonthData.expense, days: currentMonthData.days }}
          maxSingleDay={maxSingleDay}
        />

        {/* Trend Chart */}
        <TrendChart transactions={currentMonthData.transactions} />

        {/* Category Breakdown */}
        <CategoryBreakdown transactions={currentMonthData.transactions} />

        {/* Insights */}
        <Insights
          transactions={currentMonthData.transactions}
          currentMonthExpense={currentMonthData.expense}
          lastMonthExpense={lastMonthExpense}
        />

        {/* Quick Add - 手动补录 */}
        <div className="pt-2">
          <QuickAdd apiKey={apiKey} onAdd={handleAdd} />
        </div>

        {/* Recent Expenses */}
        <RecentExpenses transactions={transactions} />
      </div>
    </main>
  );
}