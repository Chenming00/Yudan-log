"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { SummaryCards, CategoryBreakdown, DetailList, CalendarHeatmap, TrendChart } from "./dashboard";
import { TransactionDialog } from "./components/transaction-dialog";
import { AddDialog } from "./components/add-dialog";
import { SettingsDialog } from "./components/settings-dialog";
import type { Transaction, MonthlyData } from "./types";

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

interface MonthParams {
  year: number;
  month: number;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-card border border-border p-6 animate-pulse">
        <div className="h-3 w-16 bg-muted rounded mb-3" />
        <div className="h-8 w-36 bg-muted rounded mb-4" />
        <div className="h-px bg-muted mb-4" />
        <div className="flex justify-between">
          <div className="h-3 w-10 bg-muted rounded" />
          <div className="h-4 w-20 bg-muted rounded" />
        </div>
      </div>
      <div className="rounded-2xl bg-card border border-border p-5 animate-pulse">
        <div className="h-3 w-20 bg-muted rounded mb-4" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="aspect-square bg-muted rounded-md" />
          ))}
        </div>
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
  const [activeView, setActiveView] = useState<"home" | "history">("home");
  const [selectedMonth, setSelectedMonth] = useState(() => getMonthKey(new Date()));
  const [viewAll, setViewAll] = useState(false);

  const navigateMonth = (delta: number) => {
    setSelectedMonth((prev) => {
      const [y, m] = prev.split("-").map(Number);
      const d = new Date(y, m - 1 + delta, 1);
      return getMonthKey(d);
    });
  };

  const [year, month] = selectedMonth.split("-").map(Number);
  const monthLabel = `${year}年${month}月`;
  const isCurrentMonth = selectedMonth === getMonthKey(new Date());

  // 历史「按月」时传月份参数；「全部」时为 null
  const historyParams = useMemo<MonthParams | null>(
    () => (viewAll ? null : { year, month }),
    [viewAll, year, month]
  );

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

  // 历史列表取数：cursor 为空=重置首屏；params=null 表示「全部」，否则按月
  const fetchDetail = useCallback(
    async (opts: { cursor?: string | null; params: MonthParams | null }) => {
      const { cursor, params } = opts;
      if (cursor) {
        setLoadingMore(true);
      } else {
        // 首屏/重置：清空旧数据以展示骨架屏
        setLoadingDetail(true);
        setDetailTransactions([]);
        setNextCursor(null);
        setHasMore(false);
      }
      try {
        const sp = new URLSearchParams({ limit: "30" });
        if (cursor) sp.set("cursor", cursor);
        if (params) {
          sp.set("year", String(params.year));
          sp.set("month", String(params.month));
        }
        const res = await fetch(`/api/list?${sp}`);
        const data = await res.json();
        if (data.success) {
          setDetailTransactions((prev) => (cursor ? [...prev, ...data.data] : data.data));
          setNextCursor(data.nextCursor);
          setHasMore(data.hasMore);
        }
      } catch {
        // ignore
      } finally {
        setLoadingDetail(false);
        setLoadingMore(false);
      }
    },
    []
  );

  // 首页月度数据：随所选月变化重新拉取
  useEffect(() => {
    void fetchMonthlyData(selectedMonth);
  }, [selectedMonth, fetchMonthlyData]);

  // 历史列表：进入历史 / 切月 / 切「按月·全部」时，按当前范围重新取数（fetchDetail 内部会重置）
  useEffect(() => {
    if (activeView !== "history") return;
    void fetchDetail({ params: viewAll ? null : { year, month } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, viewAll, viewAll ? "all" : selectedMonth, fetchDetail]);

  const handleLoadMore = useCallback(() => {
    if (nextCursor) {
      void fetchDetail({ cursor: nextCursor, params: historyParams });
    }
  }, [nextCursor, fetchDetail, historyParams]);

  const handleRefresh = useCallback(() => {
    void fetchMonthlyData(selectedMonth);
    if (activeView === "history") {
      void fetchDetail({ params: historyParams });
    }
  }, [selectedMonth, activeView, historyParams, fetchMonthlyData, fetchDetail]);

  return (
    <main className="min-h-screen bg-background px-5 py-6" style={{ paddingBottom: "var(--nav-height)" }}>
      <div className="mx-auto w-full max-w-2xl lg:max-w-4xl">
        {/* 头部 */}
        <div className="relative mb-4 pt-safe">
          <div className="flex items-center justify-between py-2">
            <div>
              <h1 className="text-[26px] sm:text-3xl font-bold tracking-tight text-foreground">
                🐟 鱼蛋小账本
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">记录每一笔支出</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSettingsOpen(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95"
                aria-label="设置"
              >
                <Settings className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>
        </div>

        {/* 视图切换 + 月份导航 */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setActiveView("home")}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
                activeView === "home"
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              首页
            </button>
            <button
              onClick={() => setActiveView("history")}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
                activeView === "history"
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              历史
            </button>
          </div>

          <div className="flex items-center gap-1">
            {!(activeView === "history" && viewAll) && (
              <>
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  aria-label="上个月"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-medium text-foreground min-w-[72px] text-center">
                  {monthLabel}
                </span>
                <button
                  onClick={() => navigateMonth(1)}
                  disabled={isCurrentMonth}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isCurrentMonth
                      ? "text-muted-foreground/30 cursor-not-allowed"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                  aria-label="下个月"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
            {activeView === "history" && (
              <button
                onClick={() => setViewAll((v) => !v)}
                className={`px-2.5 py-1 text-xs rounded-lg transition-all ${
                  viewAll
                    ? "bg-expense/10 text-expense font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {viewAll ? "按月" : "全部"}
              </button>
            )}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {activeView === "home" ? (
              <motion.div
                key={`home-${selectedMonth}`}
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
                      monthLabel={isCurrentMonth ? "本月支出" : `${month}月支出`}
                      totalExpense={monthlyData.totalExpense}
                      allTimeExpense={monthlyData.allTimeExpense}
                      prevMonthExpense={monthlyData.prevMonthExpense}
                      transactionCount={monthlyData.transactionCount}
                      lastTransaction={monthlyData.lastTransaction}
                    />

                    {/* lg 双列仪表盘：趋势 + 分类（无分类时趋势独占整行） */}
                    {monthlyData.categoryBreakdown.length > 1 ? (
                      <div className="grid gap-4 lg:grid-cols-2">
                        <TrendChart dailyExpenses={monthlyData.dailyExpenses} />
                        <CategoryBreakdown categoryBreakdown={monthlyData.categoryBreakdown} />
                      </div>
                    ) : (
                      <TrendChart dailyExpenses={monthlyData.dailyExpenses} />
                    )}

                    <CalendarHeatmap
                      calendarData={monthlyData.calendarData}
                      year={year}
                      month={month}
                    />
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              >
                {loadingDetail && detailTransactions.length === 0 ? (
                  <LoadingSkeleton />
                ) : (
                  <DetailList
                    transactions={detailTransactions}
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
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 悬浮记账按钮 — 右下角，底部导航上方 */}
      <div className="fixed right-5 bottom-[calc(var(--nav-height)+16px)] z-30 sm:right-8">
        <button
          onClick={() => {
            if (!canManageTransactions) {
              setSettingsOpen(true);
              return;
            }
            setAddOpen(true);
          }}
          className={`rounded-full p-4 shadow-lg transition-all hover:shadow-xl active:scale-95 ${
            canManageTransactions
              ? "bg-expense text-expense-foreground"
              : "bg-muted text-muted-foreground"
          }`}
          aria-label={canManageTransactions ? "记一笔" : "需要 API Key"}
          title={canManageTransactions ? "记一笔" : "填写 API Key 后才可记账"}
        >
          <Plus className="h-6 w-6" />
        </button>
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
