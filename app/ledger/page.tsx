"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SummaryCards, TrendChart, CategoryBreakdown, DetailList, CalendarHeatmap } from "./dashboard";
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

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {/* 卡片骨架 */}
      <div className="grid grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-2xl bg-card border border-border p-5 animate-pulse">
            <div className="h-3 w-16 bg-muted rounded mb-3" />
            <div className="h-6 w-24 bg-muted rounded mb-2" />
            <div className="h-2 w-20 bg-muted rounded" />
          </div>
        ))}
      </div>
      {/* 图表骨架 */}
      <div className="rounded-2xl bg-card border border-border p-5 animate-pulse">
        <div className="h-3 w-24 bg-muted rounded mb-4" />
        <div className="h-44 bg-muted rounded" />
      </div>
      {/* 饼图骨架 */}
      <div className="rounded-2xl bg-card border border-border p-5 animate-pulse">
        <div className="h-3 w-20 bg-muted rounded mb-4" />
        <div className="h-40 bg-muted rounded" />
      </div>
    </div>
  );
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
  const [selectedMonth, setSelectedMonth] = useState(() => getMonthKey(new Date()));

  const navigateMonth = (delta: number) => {
    setSelectedMonth((prev) => {
      const [y, m] = prev.split("-").map(Number);
      const d = new Date(y, m - 1 + delta, 1);
      return getMonthKey(d);
    });
  };

  const monthLabel = (() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    return `${y}年${m}月`;
  })();

  const isCurrentMonth = selectedMonth === getMonthKey(new Date());

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

  // 选中月份数据
  const selectedMonthData = useMemo(() => {
    const monthTransactions = transactions.filter(
      (t) => getMonthKey(getTransactionDate(t)) === selectedMonth
    );
    const expense = monthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    return { expense, transactions: monthTransactions };
  }, [transactions, selectedMonth]);

  // 上月数据
  const lastMonthData = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const lastMonth = new Date(y, m - 2, 1);
    const lastMonthKey = getMonthKey(lastMonth);
    const monthTransactions = transactions.filter(
      (t) => getMonthKey(getTransactionDate(t)) === lastMonthKey
    );
    const expense = monthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    return { expense };
  }, [transactions, selectedMonth]);

  // 月份天数信息
  const monthInfo = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const now = new Date();
    const isThisMonth = selectedMonth === getMonthKey(now);
    const daysPassed = isThisMonth ? now.getDate() : daysInMonth;
    return { daysInMonth, daysPassed };
  }, [selectedMonth]);

  // 按时间排序的交易（用于明细列表）
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      const timeA = new Date(a.transaction_time || a.created_at).getTime();
      const timeB = new Date(b.transaction_time || b.created_at).getTime();
      return timeB - timeA;
    });
  }, [transactions]);

  return (
    <main className="min-h-screen px-5 py-6 bg-background" style={{ paddingBottom: "var(--nav-height)" }}>
      {/* Hero Banner */}
      <div className="relative mb-6 pt-safe">
        <div className="flex items-center justify-between py-2">
          <div>
            <h1 className="text-[26px] sm:text-3xl font-bold tracking-tight text-foreground">
              🐟 鱼蛋小账本
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              记录每一笔收支
            </p>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2.5 rounded-xl bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            aria-label="设置"
          >
            <Settings className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      {/* 主要内容区 */}
      <div className="mt-4 space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted rounded-xl p-1 mb-6">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-gray-100 data-[state=active]:text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all text-muted-foreground"
            >
              概览
            </TabsTrigger>
            <TabsTrigger
              value="detail"
              className="data-[state=active]:bg-gray-100 data-[state=active]:text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all text-muted-foreground"
            >
              明细
            </TabsTrigger>
          </TabsList>

          {/* 概览 Tab */}
          <TabsContent value="overview" className="space-y-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedMonth}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="space-y-4"
              >
                {/* 月份导航 */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => navigateMonth(-1)}
                    className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="text-sm font-medium text-foreground">{monthLabel}</span>
                  <button
                    onClick={() => navigateMonth(1)}
                    disabled={isCurrentMonth}
                    className={`p-2 rounded-lg transition-colors ${
                      isCurrentMonth
                        ? "text-muted-foreground/30 cursor-not-allowed"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                {loading ? (
                  <LoadingSkeleton />
                ) : (
                  <>
                    <SummaryCards
                      currentMonth={selectedMonthData}
                      lastMonth={lastMonthData}
                      daysPassed={monthInfo.daysPassed}
                    />

                    <TrendChart transactions={selectedMonthData.transactions} />

                    <CategoryBreakdown transactions={selectedMonthData.transactions} />

                    <CalendarHeatmap
                      transactions={selectedMonthData.transactions}
                      year={Number(selectedMonth.split("-")[0])}
                      month={Number(selectedMonth.split("-")[1])}
                    />
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          {/* 明细 Tab */}
          <TabsContent value="detail" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              {loading ? (
                <LoadingSkeleton />
              ) : (
                <DetailList
                  transactions={sortedTransactions}
                  onSelect={(t) => {
                    setSelectedTransaction(t);
                    setDialogOpen(true);
                  }}
                />
              )}
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* 新增按钮（固定在页面中间靠右） */}
        <div className="fixed right-6 top-[45%] z-30">
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
