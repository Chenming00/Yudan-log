"use client";

import { useCallback, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { transactionTitle } from "@/lib/ledger";
import { categoryLabel } from "@/lib/categories";
import { shanghaiDateKey } from "@/lib/ledger-query-client";
import { fetchLedgerPage, mergeLedgerPages, type LedgerPageResult } from "@/lib/ledger-request-client";
import { useLedgerResource } from "../use-ledger-resource";
import type { Transaction } from "../types";

interface CalendarHeatmapProps {
  calendarData: Record<number, number>;
  year: number;
  month: number;
}

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

function getHeatStyle(amount: number, max: number): { bg: string; text: string } {
  if (amount === 0) return { bg: "bg-[#f3f5ef]", text: "text-muted-foreground" };
  const ratio = amount / max;
  if (ratio < 0.2) return { bg: "bg-[#e4ebdd]", text: "text-[#426047]" };
  if (ratio < 0.4) return { bg: "bg-[#cedcbe]", text: "text-[#3e573c]" };
  if (ratio < 0.6) return { bg: "bg-[#a9c194]", text: "text-[#304c32]" };
  if (ratio < 0.8) return { bg: "bg-[#67885c]", text: "text-white" };
  return { bg: "bg-[#3f6348]", text: "text-white" };
}

function compactAmount(amount: number) {
  if (amount >= 100000000) return `${(amount / 100000000).toFixed(1)}亿`;
  if (amount >= 10000) return `${(amount / 10000).toFixed(amount >= 1000000 ? 0 : 1)}万`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}k`;
  return amount.toFixed(0);
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("zh-CN", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

export function CalendarHeatmap({ calendarData, year, month }: CalendarHeatmapProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  const selectedDay = selectedDate?.startsWith(`${monthKey}-`) ? Number(selectedDate.slice(-2)) : null;
  const dailyUrl = selectedDay ? `/api/daily?year=${year}&month=${month}&day=${selectedDay}&limit=30` : null;
  const dayLoader = useCallback((signal: AbortSignal) => fetchLedgerPage<Transaction>(dailyUrl || "", signal), [dailyUrl]);
  const daily = useLedgerResource<LedgerPageResult<Transaction>>(dailyUrl, dayLoader);
  const dayTransactions = daily.data?.data ?? [];
  const loadingDay = daily.status === "loading";

  const { maxAmount, daysInMonth, firstDayOfWeek } = useMemo(() => {
    const max = Math.max(...Object.values(calendarData), 1);
    const totalDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const firstDay = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
    return { maxAmount: max, daysInMonth: totalDays, firstDayOfWeek: firstDay };
  }, [calendarData, year, month]);

  const today = shanghaiDateKey();
  const isThisMonth = today.slice(0, 7) === monthKey;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedDayTotal = selectedDay !== null ? (calendarData[selectedDay] || 0) : 0;

  const handleLoadMore = () => {
    const cursor = daily.data?.nextCursor;
    if (cursor && dailyUrl) daily.loadPage(cursor, (signal) => fetchLedgerPage<Transaction>(`${dailyUrl}&cursor=${encodeURIComponent(cursor)}`, signal, cursor), mergeLedgerPages);
  };

  return (
    <>
      <Card className="grid gap-6 p-5 shadow-none sm:p-6 lg:grid-cols-[190px_1fr] lg:gap-8">
        <div className="flex flex-col items-start">
          <span className="mb-4 hidden h-12 w-12 items-center justify-center rounded-2xl bg-[#e9eee4] text-primary lg:flex"><CalendarDays className="h-6 w-6" /></span>
          <h2 className="section-title">支出日历</h2>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">{year} 年 {month} 月的生活足迹。<br className="hidden lg:block" />点击日期，回看当天的花费。</p>
          <div className="mt-5 flex items-center gap-1.5 text-[11px] text-muted-foreground lg:mt-auto lg:pt-6" aria-label="颜色越深，支出越多">
            <span className="mr-1">少</span>
            {["#f3f5ef", "#e4ebdd", "#cedcbe", "#a9c194", "#67885c", "#3f6348"].map((color) => <span key={color} className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />)}
            <span className="ml-1">多</span>
          </div>
        </div>
        <div className="min-w-0">
        <div className="mb-2 grid grid-cols-7 gap-1.5 sm:gap-2">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="text-center text-xs text-muted-foreground py-1">
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {cells.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} />;
            const amount = calendarData[day] || 0;
            const isToday = isThisMonth && Number(today.slice(-2)) === day;
            const hasData = amount > 0;
            const heat = getHeatStyle(amount, maxAmount);
            return (
              <Button
                key={day}
                variant="ghost"
                onClick={() => setSelectedDate(`${monthKey}-${String(day).padStart(2, "0")}`)}
                aria-label={`${year}年${month}月${day}日，支出${amount}元`}
                className={`h-12 rounded-lg p-0 flex flex-col items-center justify-center gap-1 text-xs sm:h-14 ${heat.bg} ${
                  isToday ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : ""
                } cursor-pointer hover:ring-2 hover:ring-primary/30 hover:ring-offset-1 hover:ring-offset-card active:scale-95`}
              >
                <span className={`leading-none ${isToday ? `font-bold ${heat.text}` : heat.text}`}>
                  {day}
                </span>
                {hasData && (
                  <span className={`max-w-full truncate text-[9px] leading-none font-medium sm:text-[10px] ${heat.text}`}>
                    {compactAmount(amount)}
                  </span>
                )}
              </Button>
            );
          })}
        </div>
        </div>
      </Card>

      {/* 当日详情弹窗 */}
      <Dialog open={selectedDay !== null} onOpenChange={(open) => { if (!open) setSelectedDate(null); }}>
        <DialogContent className="max-w-md rounded-3xl max-h-[80dvh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base">
              {year}年{month}月{selectedDay}日
            </DialogTitle>
            <DialogDescription>这一天，为生活添置的小小心意。</DialogDescription>
          </DialogHeader>

          <div className="rounded-2xl bg-[#edf0e9] py-5 text-center">
            <p className="break-words text-3xl font-semibold text-primary">¥{selectedDayTotal.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">当日总支出</p>
          </div>

          {/* 具体记录列表 */}
          <div className="flex-1 overflow-y-auto -mx-2 px-2 space-y-2 min-h-0">
            {daily.error && <div role="alert"><p className="text-sm text-destructive">日明细加载失败：{daily.error}</p><Button variant="outline" size="sm" className="mt-2" onClick={daily.reload}>重试日明细</Button></div>}
            {loadingDay ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl bg-muted p-3">
                    <div className="space-y-1">
                      <Skeleton className="h-3 w-20 bg-muted-foreground/20" />
                      <Skeleton className="h-2 w-14 bg-muted-foreground/20" />
                    </div>
                    <Skeleton className="h-3 w-12 bg-muted-foreground/20" />
                  </div>
                ))}
              </div>
            ) : dayTransactions.length > 0 ? (
              dayTransactions.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {transactionTitle(t)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {categoryLabel(t.category)} · {t.transaction_time ? formatTime(t.transaction_time) : `购买时间未知 · 录入于 ${formatTime(t.created_at)}`}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-expense ml-2 flex-shrink-0">
                    -¥{Number(t.amount).toLocaleString()}
                  </span>
                </div>
              ))
            ) : !daily.error ? (
              <p className="text-center text-xs text-muted-foreground py-4">当日无支出</p>
            ) : null}
            {daily.pageError && <p role="alert" className="text-sm text-destructive">加载更多失败：{daily.pageError}</p>}
            {daily.data?.hasMore && <Button variant="secondary" className="w-full" disabled={daily.loadingMore || loadingDay} onClick={handleLoadMore}>{daily.loadingMore ? "加载中..." : daily.pageError ? "重试加载更多" : "加载更多日明细"}</Button>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
