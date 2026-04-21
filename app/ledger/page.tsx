"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Settings, ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SummaryCards, TrendChart, CategoryBreakdown, DetailList } from "./dashboard";
import { TransactionDialog } from "./components/transaction-dialog";
import { AddDialog } from "./components/add-dialog";
import { SettingsDialog } from "./components/settings-dialog";
import { Transaction } from "./types";

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getTransactionDate(transaction: Transaction) {
  return new Date(transaction.transaction_time || transaction.created_at);
}

export default function LedgerPage() {
  const [apiKey, setApiKey] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("api_key");
  });
  const canManageTransactions = Boolean(apiKey);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchTransactions = useCallback(async (key: string) => {
    setLoading(true);
    setError(null);
    try {
      const headers = key ? { Authorization: `Bearer ${key}` } : undefined;
      const res = await fetch("/api/list", headers ? { headers } : undefined);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.data);
      } else {
        setError(data.error || "获取账本失败");
        if (res.status === 401) {
          localStorage.removeItem("api_key");
          setApiKey(null);
        }
      }
    } catch {
      setError("网络异常，请稍后重试");
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
    const monthTransactions = transactions.filter(
      (t) => getMonthKey(getTransactionDate(t)) === currentMonthKey
    );
    const expense = monthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    return { expense, transactions: monthTransactions };
  }, [transactions, currentMonthKey]);

  // 上月数据
  const lastMonthData = useMemo(() => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = getMonthKey(lastMonth);
    const monthTransactions = transactions.filter(
      (t) => getMonthKey(getTransactionDate(t)) === lastMonthKey
    );
    const expense = monthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    return { expense };
  }, [transactions]);

  // 按时间排序的交易（用于明细列表）
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      const timeA = new Date(a.transaction_time || a.created_at).getTime();
      const timeB = new Date(b.transaction_time || b.created_at).getTime();
      return timeB - timeA;
    });
  }, [transactions]);

  return (
    <main className="min-h-screen px-4 py-6 pb-[calc(env(safe-area-inset-bottom)+84px)]">
      {/* 头部 */}
      <header className="flex items-center justify-between pt-safe pb-2">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="pt-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-medium tracking-tight pt-4 text-foreground">
            🐟 鱼蛋小账本
          </h1>
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          className="pt-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="设置"
        >
          <Settings className="h-5 w-5" />
        </button>
      </header>

      {/* 主要内容区 */}
      <div className="mt-4 space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted rounded-xl p-1 mb-6">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-rose-500 rounded-lg px-4 py-2 text-sm font-medium transition-all text-muted-foreground"
            >
              概览
            </TabsTrigger>
            <TabsTrigger
              value="detail"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-rose-500 rounded-lg px-4 py-2 text-sm font-medium transition-all text-muted-foreground"
            >
              明细
            </TabsTrigger>
          </TabsList>

          {/* 概览 Tab */}
          <TabsContent value="overview" className="space-y-4">
            <SummaryCards
              currentMonth={currentMonthData}
              lastMonth={lastMonthData}
            />

            <TrendChart transactions={currentMonthData.transactions} />

            <CategoryBreakdown transactions={currentMonthData.transactions} />
          </TabsContent>

          {/* 明细 Tab */}
          <TabsContent value="detail" className="space-y-4">
            <DetailList
              transactions={sortedTransactions}
              onSelect={(t) => {
                setSelectedTransaction(t);
                setDialogOpen(true);
              }}
            />
          </TabsContent>
        </Tabs>

        {/* 新增按钮（固定在页面中间靠右） */}
        <div className="fixed right-6 top-1/2 -translate-y-1/2 z-30">
          <button
            onClick={() => {
              if (!canManageTransactions) {
                setSettingsOpen(true);
                return;
              }
              setAddOpen(true);
            }}
            className={`rounded-full p-4 shadow-lg transition-all hover:shadow-xl ${
              canManageTransactions
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
            aria-label={canManageTransactions ? "新增记录" : "新增需 API Key"}
            title={canManageTransactions ? "新增记录" : "填写 API Key 后才可新增记录"}
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* 交易详情对话框 */}
      <TransactionDialog
        key={`${selectedTransaction?.id ?? "empty"}-${dialogOpen ? "open" : "closed"}`}
        transaction={selectedTransaction}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        apiKey={apiKey}
        onUpdated={() => fetchTransactions(apiKey || "")}
      />

      {/* 新增对话框 */}
      <AddDialog
        key={addOpen ? "add-open" : "add-closed"}
        open={addOpen}
        onOpenChange={setAddOpen}
        apiKey={apiKey}
        onAdded={() => fetchTransactions(apiKey || "")}
      />

      {/* 设置对话框 */}
      <SettingsDialog
        key={`${settingsOpen ? "settings-open" : "settings-closed"}-${apiKey ?? ""}`}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        currentKey={apiKey}
        onSave={(key) => {
          if (key) {
            localStorage.setItem("api_key", key);
            setApiKey(key);
          } else {
            localStorage.removeItem("api_key");
            setApiKey(null);
          }
        }}
      />
    </main>
  );
}
