"use client";

import { Suspense, lazy, useState, useEffect, useCallback, useMemo } from "react";
import { Settings, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { isGitHubProvider, isOwnerEmail } from "@/lib/auth";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";
import { buildLedgerListUrl, shanghaiMonthKey, type LedgerListQuery } from "@/lib/ledger-query-client";
import { fetchLedgerPage, fetchLedgerPayload, mergeLedgerPages, type LedgerPageResult } from "@/lib/ledger-request-client";
import { readLedgerStorage, writeLedgerStorage } from "@/lib/ledger-mutation-client";
import { useLedgerDebouncedValue, useLedgerResource } from "./use-ledger-resource";
import { SummaryCards } from "./dashboard/summary-cards";
import { DetailList } from "./dashboard/detail-list";
import { TransactionDialog } from "./components/transaction-dialog";
import { AddDialog } from "./components/add-dialog";
import { SettingsDialog } from "./components/settings-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import type { Transaction, MonthlyData } from "./types";

const TrendChart = lazy(() =>
  import("./dashboard/trend-chart").then((module) => ({ default: module.TrendChart }))
);
const CategoryBreakdown = lazy(() =>
  import("./dashboard/category-breakdown").then((module) => ({ default: module.CategoryBreakdown }))
);
const CalendarHeatmap = lazy(() =>
  import("./dashboard/calendar-heatmap").then((module) => ({ default: module.CalendarHeatmap }))
);

interface LedgerPageProps {
  supabaseUrl?: string;
  supabasePublishableKey?: string;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Card className="p-6">
        <Skeleton className="mb-3 h-3 w-16" />
        <Skeleton className="mb-4 h-8 w-36" />
        <Skeleton className="mb-4 h-px" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-4 w-20" />
        </div>
      </Card>
      <Card className="p-5">
        <Skeleton className="mb-4 h-3 w-20" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      </Card>
    </div>
  );
}

function ChartSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Card className="p-5">
      <Skeleton className="mb-4 h-3 w-24" />
      <Skeleton className={compact ? "h-40 rounded-xl" : "h-44 rounded-xl"} />
    </Card>
  );
}

export default function LedgerPage({
  supabaseUrl = "",
  supabasePublishableKey = "",
}: LedgerPageProps) {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [storageNotice, setStorageNotice] = useState<string | null>(null);
  useEffect(() => {
    setApiKey(readLedgerStorage("api_key"));
  }, []);
  const [session, setSession] = useState<Session | null>(null);
  const githubAuthorized =
    isOwnerEmail(session?.user.email) && isGitHubProvider(session?.user.app_metadata);
  const writeToken = githubAuthorized ? session?.access_token || null : apiKey;
  const canManageTransactions = Boolean(writeToken);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [activeView, setActiveView] = useState<"home" | "history">("home");
  const [selectedMonth, setSelectedMonth] = useState(() => shanghaiMonthKey());
  const [viewAll, setViewAll] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState<LedgerListQuery['type']>("");
  const debouncedSearch = useLedgerDebouncedValue(search.trim());

  useEffect(() => {
    let active = true;
    void getBrowserSupabaseClient(supabaseUrl, supabasePublishableKey).then((client) => {
      if (active) setSupabase(client);
    }).catch(() => {
      if (active) setSupabase(null);
    });
    return () => {
      active = false;
    };
  }, [supabasePublishableKey, supabaseUrl]);

  useEffect(() => {
    if (!supabase) return;

    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    }).catch(() => {
      if (active) setSession(null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signInWithGitHub = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: window.location.href.split("#")[0] },
    });
  }, [supabase]);

  const signOutGitHub = useCallback(async () => {
    await supabase?.auth.signOut();
  }, [supabase]);

  const navigateMonth = (delta: number) => {
    setSelectedMonth((prev) => {
      const [y, m] = prev.split("-").map(Number);
      const d = new Date(Date.UTC(y, m - 1 + delta, 1));
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    });
  };

  const [year, month] = selectedMonth.split("-").map(Number);
  const monthLabel = `${year}年${month}月`;
  const isCurrentMonth = selectedMonth === shanghaiMonthKey();
  const query = useMemo<LedgerListQuery>(() => ({
    ...(viewAll ? {} : { year, month }), search: debouncedSearch, category, type,
  }), [viewAll, year, month, debouncedSearch, category, type]);
  const queryUrl = buildLedgerListUrl(query);
  const monthlyUrl = `/api/monthly?year=${year}&month=${month}`;
  const monthlyLoader = useCallback(async (signal: AbortSignal) => {
    const payload = await fetchLedgerPayload<{ data: MonthlyData }>(monthlyUrl, signal);
    return payload.data;
  }, [monthlyUrl]);
  const detailLoader = useCallback((signal: AbortSignal) => fetchLedgerPage<Transaction>(queryUrl, signal), [queryUrl]);
  const monthly = useLedgerResource<MonthlyData>(monthlyUrl, monthlyLoader);
  const detail = useLedgerResource<LedgerPageResult<Transaction>>(activeView === "history" ? queryUrl : null, detailLoader);
  const monthlyData = monthly.data;
  const { reload: reloadMonthly } = monthly;
  const { reload: reloadDetail, loadPage } = detail;
  const nextCursor = detail.data?.nextCursor;
  const handleLoadMore = useCallback(() => {
    if (nextCursor) loadPage(nextCursor, (signal) => fetchLedgerPage<Transaction>(buildLedgerListUrl(query, 30, nextCursor), signal, nextCursor), mergeLedgerPages);
  }, [nextCursor, query, loadPage]);
  const handleRefresh = useCallback(() => {
    reloadMonthly();
    reloadDetail();
  }, [reloadMonthly, reloadDetail]);

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
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSettingsOpen(true)}
                className="bg-muted/60 text-muted-foreground"
                aria-label="设置"
                title={githubAuthorized ? "GitHub 已授权" : canManageTransactions ? "API Key 已授权" : "设置写入权限"}
              >
                <Settings className="h-[18px] w-[18px]" />
              </Button>
            </div>
          </div>
        </div>

        {storageNotice && <p role="status" className="mb-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">{storageNotice}</p>}

        {/* 视图切换 + 月份导航 */}
        <div className="flex items-center justify-between mb-5">
          <Tabs value={activeView} onValueChange={(value) => setActiveView(value as "home" | "history")}>
            <TabsList className="h-9 rounded-lg p-0.5">
              <TabsTrigger value="home" className="h-8 rounded-md px-3 text-xs">
                首页
              </TabsTrigger>
              <TabsTrigger value="history" className="h-8 rounded-md px-3 text-xs">
                历史
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-1">
            {!(activeView === "history" && viewAll) && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigateMonth(-1)}
                  className="h-8 w-8 text-muted-foreground"
                  aria-label="上个月"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-foreground min-w-[72px] text-center">
                  {monthLabel}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigateMonth(1)}
                  disabled={isCurrentMonth}
                  className="h-8 w-8 text-muted-foreground"
                  aria-label="下个月"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
            {activeView === "history" && (
              <Button
                variant={viewAll ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewAll((v) => !v)}
                className={viewAll ? "h-8 bg-expense/10 text-xs text-expense" : "h-8 text-xs text-muted-foreground"}
              >
                {viewAll ? "按月" : "全部"}
              </Button>
            )}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="space-y-4">
          {activeView === "home" ? (
              <div key={`home-${selectedMonth}`} className="space-y-4 animate-in fade-in-0 slide-in-from-right-2 duration-200">
                {monthly.error && (
                  <Card className="p-4" role="alert">
                    <p className="text-sm text-destructive">{monthlyData ? "刷新失败：" : "月度汇总加载失败："}{monthly.error}</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={reloadMonthly}>重试月度汇总</Button>
                  </Card>
                )}
                {monthly.status === "loading" && monthlyData && <p role="status" className="text-xs text-muted-foreground">正在刷新月度汇总…</p>}
                {!monthlyData ? (
                  monthly.status !== "error" ? <LoadingSkeleton /> : null
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
                    <Suspense
                      fallback={
                        monthlyData.categoryBreakdown.length > 1 ? (
                          <div className="grid gap-4 lg:grid-cols-2">
                            <ChartSkeleton />
                            <ChartSkeleton compact />
                          </div>
                        ) : (
                          <ChartSkeleton />
                        )
                      }
                    >
                      {monthlyData.categoryBreakdown.length > 1 ? (
                        <div className="grid gap-4 lg:grid-cols-2">
                          <TrendChart dailyExpenses={monthlyData.dailyExpenses} />
                          <CategoryBreakdown categoryBreakdown={monthlyData.categoryBreakdown} />
                        </div>
                      ) : (
                        <TrendChart dailyExpenses={monthlyData.dailyExpenses} />
                      )}
                    </Suspense>

                    <Suspense fallback={<ChartSkeleton />}>
                      <CalendarHeatmap
                        calendarData={monthlyData.calendarData}
                        year={year}
                        month={month}
                      />
                    </Suspense>
                  </>
                )}
              </div>
            ) : (
              <div key="history" className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
                  <DetailList
                    transactions={detail.data?.data ?? []}
                    categories={detail.data?.categories ?? []}
                    query={query}
                    search={search}
                    onSearchChange={setSearch}
                    onCategoryChange={setCategory}
                    onTypeChange={setType}
                    pendingSearch={search.trim() !== debouncedSearch}
                    loading={detail.status === "loading"}
                    error={detail.error}
                    pageError={detail.pageError}
                    onRetry={reloadDetail}
                    onSelect={(t) => {
                      setSelectedTransaction(t);
                      setDialogOpen(true);
                    }}
                    hasMore={detail.data?.hasMore ?? false}
                    loadingMore={detail.loadingMore}
                    onLoadMore={handleLoadMore}
                  />
              </div>
            )}
        </div>
      </div>

      {/* 悬浮记账按钮 — 右下角，底部导航上方 */}
      <div className="fixed right-5 bottom-[calc(var(--nav-height)+16px)] z-30 sm:right-8">
        <Button
          size="icon"
          onClick={() => {
            if (!canManageTransactions) {
              setSettingsOpen(true);
              return;
            }
            setAddOpen(true);
          }}
          className={`h-14 w-14 rounded-full shadow-lg hover:shadow-xl ${
            canManageTransactions
              ? "bg-expense text-expense-foreground"
              : "bg-muted text-muted-foreground"
          }`}
          aria-label={canManageTransactions ? "记一笔" : "需要登录或 API Key"}
          title={canManageTransactions ? "记一笔" : "使用 GitHub 登录或填写 API Key 后记账"}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* 交易详情对话框 */}
      <TransactionDialog
        key={`${selectedTransaction?.id ?? "empty"}-${dialogOpen ? "open" : "closed"}`}
        transaction={selectedTransaction}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        authToken={writeToken}
        onUpdated={handleRefresh}
        onAuthorize={() => setSettingsOpen(true)}
      />

      {/* 新增对话框 */}
      <AddDialog
        key={addOpen ? "add-open" : "add-closed"}
        open={addOpen}
        onOpenChange={setAddOpen}
        authToken={writeToken}
        onAdded={handleRefresh}
        onAuthorize={() => setSettingsOpen(true)}
      />

      {/* 设置对话框 */}
      <SettingsDialog
        key={`${settingsOpen ? "settings-open" : "settings-closed"}-${apiKey ?? ""}-${session?.user.email ?? ""}`}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        currentKey={apiKey}
        githubEmail={session?.user.email}
        githubAuthorized={githubAuthorized}
        githubAvailable={Boolean(supabase)}
        onGitHubSignIn={signInWithGitHub}
        onGitHubSignOut={signOutGitHub}
        onSave={(key) => {
          // Session authorization must succeed even when browser storage is blocked/full.
          setApiKey(key);
          const persisted = writeLedgerStorage("api_key", key);
          setStorageNotice(persisted ? null : key
            ? "当前浏览器无法保存 API Key，本次会话仍可正常记账；关闭页面后需要重新填写。"
            : "本次会话已清除 API Key；浏览器存储不可用，历史保存的 Key 可能需要在浏览器设置中清除。");
        }}
      />
    </main>
  );
}
