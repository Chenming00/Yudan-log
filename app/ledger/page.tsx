"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SummaryCards, TrendChart, CategoryBreakdown, DetailList, CalendarHeatmap } from "./dashboard";
import { TransactionDialog } from "./components/transaction-dialog";
import { AddDialog } from "./components/add-dialog";
import { SettingsDialog } from "./components/settings-dialog";
import { Transaction, MonthlyData } from "./types";

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
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
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);
  const [detailTransactions, setDetailTransactions] = useState<Transaction[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedMonth, setSelectedMonth] = useState(() => getMonthKey(new Date()));
  const [viewAll, setViewAll] = useState(false);

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

  // 月份天数信息
  const monthInfo = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const now = new Date();
    const isThisMonth = selectedMonth === getMonthKey(now);
    const daysPassed = isThisMonth ? now.getDate() : daysInMonth;
    return { daysInMonth, daysPassed };
  }, [selectedMonth]);

  // 按月过滤明细列表（客户端过滤）
  const filteredDetailTransactions = useMemo(() => {
    if (viewAll) return detailTransactions;
    const [y, m] = selectedMonth.split("-").map(Number);
    return detailTransactions.filter((t) => {
      const d = new Date(t.transaction_time || t.created_at);
      return d.getFullYear() === y && d.getMonth() + 1 === m;
    });
  }, [detailTransactions, selectedMonth, viewAll]);

  // 获取月度汇总数据
  const fetchMonthlyData = useCallback(async (monthKey: string) => {
    setLoadingMonthly(true);
    try {
      const [y, m] = monthKey.split("-").map(Number);
      const res = await fetch(`/api/monthly?year=${y}&month=${m}`);
      const data = await res.json();
      if (data.success) {
        setMonthlyData(data.data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingMonthly(false);
    }
  }, []);

  // 获取明细列表（分页）
  const fetchDetailTransactions = useCallback(async (cursor?: string) => {
    if (cursor) {
      setLoadingMore(true);
    } else {
      setLoadingDetail(true);
    }
    try {
      const params = new URLSearchParams({ limit: "30" });
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`/api/list?${params}`);
      const data = await res.json();
      if (data.success) {
        setDetailTransactions((prev) => cursor ? [...prev, ...data.data] : data.data);
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      }
    } catch {
      // ignore
    } finally {
      setLoadingDetail(false);
      setLoadingMore(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchMonthlyData(selectedMonth);
      void fetchDetailTransactions();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 月份切换时重新获取月度数据
  useEffect(() => {
    void fetchMonthlyData(selectedMonth);
  }, [selectedMonth, fetchMonthlyData]);

  // 加载更多
  const handleLoadMore = useCallback(() => {
    if (nextCursor) {
      void fetchDetailTransactions(nextCursor);
    }
  }, [nextCursor, fetchDetailTransactions]);

  // 增删改后刷新
  const handleRefresh = useCallback(() => {
    void fetchMonthlyData(selectedMonth);
    setDetailTransactions([]);
    setNextCursor(null);
    setHasMore(false);
    void fetchDetailTransactions();
  }, [selectedMonth, fetchMonthlyData, fetchDetailTransactions]);

  // 切换全部/按月
  const handleToggleViewAll = useCallback(() => {
    setViewAll((prev) => !prev);
  }, []);

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
          <div className="flex items-center justify-between mb-6">
            <TabsList className="bg-muted rounded-xl p-1">
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

            {/* 月份导航 */}
            <div className="flex items-center gap-1">
              {!(activeTab === "detail" && viewAll) && (
                <>
                  <button
                    onClick={() => navigateMonth(-1)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-medium text-foreground min-w-[72px] text-center">{monthLabel}</span>
                  <button
                    onClick={() => navigateMonth(1)}
                    disabled={isCurrentMonth}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isCurrentMonth
                        ? "text-muted-foreground/30 cursor-not-allowed"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}
              {activeTab === "detail" && (
                <button
                  onClick={handleToggleViewAll}
                  className={`ml-1 px-2.5 py-1 text-xs rounded-lg transition-all ${
                    viewAll
                      ? "bg-[#FF6B6B]/10 text-[#FF6B6B] font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {viewAll ? "按月" : "全部"}
                </button>
              )}
            </div>
          </div>

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
                {loadingMonthly || !monthlyData ? (
                  <LoadingSkeleton />
                ) : (
                  <>
                    <SummaryCards
                      totalExpense={monthlyData.totalExpense}
                      totalIncome={monthlyData.totalIncome}
                      transactionCount={monthlyData.transactionCount}
                      prevMonthExpense={monthlyData.prevMonthExpense}
                      daysPassed={monthInfo.daysPassed}
                      allTimeExpense={monthlyData.allTimeExpense}
                    />

                    <TrendChart dailyExpenses={monthlyData.dailyExpenses} />

                    <CategoryBreakdown categoryBreakdown={monthlyData.categoryBreakdown} />

                    <CalendarHeatmap
                      calendarData={monthlyData.calendarData}
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
              {loadingDetail && detailTransactions.length === 0 ? (
                <LoadingSkeleton />
              ) : (
                <DetailList
                  transactions={filteredDetailTransactions}
                  onSelect={(t) => {
                    setSelectedTransaction(t);
                    setDialogOpen(true);
                  }}
                  hasMore={hasMore}
                  loadingMore={loadingMore}
                  onLoadMore={handleLoadMore}
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
        onUpdated={handleRefresh}
      />

      {/* 新增对话框 */}
      <AddDialog
        key={addOpen ? "add-open" : "add-closed"}
        open={addOpen}
        onOpenChange={setAddOpen}
        apiKey={apiKey}
        onAdded={handleRefresh}
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
