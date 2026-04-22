"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, Wallet } from "lucide-react";
import { Transaction } from "./ledger/types";

function getTransactionDate(transaction: Transaction) {
  return new Date(transaction.transaction_time || transaction.created_at);
}

function calculateDaysBetween(startDate: Date, endDate: Date) {
  const oneDay = 24 * 60 * 60 * 1000;
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / oneDay));
}

export default function HomePage() {
  const [apiKey, setApiKey] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("api_key");
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

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

  const averageCost = useMemo(() => {
    const today = new Date();
    const expenses = transactions.filter((t) => t.type === "expense");
    
    return expenses.reduce((sum, transaction) => {
      const transactionDate = getTransactionDate(transaction);
      const days = calculateDaysBetween(transactionDate, today);
      const dailyCost = Number(transaction.amount) / days;
      return sum + dailyCost;
    }, 0);
  }, [transactions]);

  const modules = [
    {
      title: "鱼蛋小账本",
      description: "记录日常收支",
      href: "/ledger",
      icon: Wallet,
    },
    {
      title: "成长 Log",
      description: "记录成长的每一步",
      href: "/blog",
      icon: BookOpen,
    },
  ];

  return (
    <main className="min-h-screen px-5 py-8 pb-[calc(env(safe-area-inset-bottom)+84px)]">
      {/* Profile Section */}
      <div className="flex flex-col items-center pt-safe pb-16">
        <div className="mb-6 mt-8 sm:mt-12">
          <Image
            src="/apple-home-logo.png"
            alt="头像"
            width={80}
            height={80}
            sizes="80px"
            className="h-20 w-20 rounded-full object-cover shadow-sm"
            priority
          />
        </div>
        <h1 className="text-center text-xl font-medium tracking-tight text-foreground sm:text-2xl">鱼蛋宝宝</h1>
      </div>

      {/* Average Cost Section */}
      <div className="flex flex-col items-center justify-center mb-20">
        <p className="text-sm text-muted-foreground mb-2">今日平均成本</p>
        <div className="flex items-baseline gap-1">
          <span className="text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
            ¥{loading ? "--" : averageCost.toFixed(2)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-4">每一天的价值</p>
      </div>

      {/* Module Cards */}
      <div className="space-y-4">
        {modules.map((mod) => (
          <Link key={mod.href} href={mod.href}>
            <div className="rounded-2xl bg-white shadow-sm transition-all hover:bg-accent active:bg-accent/80 cursor-pointer p-5 flex items-center gap-4">
              <div className="rounded-xl p-3 bg-muted">
                <mod.icon className="h-5 w-5 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-medium text-base text-foreground">{mod.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{mod.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}