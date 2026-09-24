"use client";

import { useCallback, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  if (amount === 0) return { bg: "bg-muted/50", text: "text-muted-foreground/50" };
  const ratio = amount / max;
  if (ratio < 0.2) return { bg: "bg-expense/10", text: "text-expense" };
  if (ratio < 0.4) return { bg: "bg-expense/20", text: "text-expense" };
  if (ratio < 0.6) return { bg: "bg-expense/40", text: "text-expense" };
  if (ratio < 0.8) return { bg: "bg-expense/60", text: "text-white" };
  return { bg: "bg-expense/80", text: "text-white" };
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
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-muted-foreground">支出日历</p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-sm bg-muted/50" />
            <span>少</span>
            <span className="w-2.5 h-2.5 rounded-sm bg-expense/40" />
            <span className="w-2.5 h-2.5 rounded-sm bg-expense/80" />
            <span>多</span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="text-center text-xs text-muted-foreground py-1">
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
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
                className={`h-auto aspect-square rounded-md p-0 flex flex-col items-center justify-center text-xs ${heat.bg} ${
                  isToday ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : ""
                } cursor-pointer hover:ring-2 hover:ring-expense/30 hover:ring-offset-1 hover:ring-offset-card active:scale-95`}
              >
                <span className={`leading-none ${isToday ? "font-bold text-primary" : heat.text}`}>
                  {day}
                </span>
                {hasData && (
                  <span className={`text-[8px] leading-none mt-0.5 font-medium ${heat.text}`}>
                    {amount >= 1000 ? `${(amount / 1000).toFixed(1)}k` : amount.toFixed(0)}
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      </Card>

      {/* 当日详情弹窗 */}
      <Dialog open={selectedDay !== null} onOpenChange={(open) => { if (!open) setSelectedDate(null); }}>
        <DialogContent className="max-w-sm rounded-2xl max-h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base">
              {year}年{month}月{selectedDay}日
            </DialogTitle>
          </DialogHeader>

          <div className="text-center py-3">
            <p className="text-2xl font-bold text-expense">¥{selectedDayTotal.toLocaleString()}</p>
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
