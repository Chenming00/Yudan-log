"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Transaction } from "../types";

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
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function CalendarHeatmap({ calendarData, year, month }: CalendarHeatmapProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [dayTransactions, setDayTransactions] = useState<Transaction[]>([]);
  const [loadingDay, setLoadingDay] = useState(false);

  const { maxAmount, daysInMonth, firstDayOfWeek } = useMemo(() => {
    const max = Math.max(...Object.values(calendarData), 1);
    const totalDays = new Date(year, month, 0).getDate();
    const firstDay = (new Date(year, month - 1, 1).getDay() + 6) % 7;
    return { maxAmount: max, daysInMonth: totalDays, firstDayOfWeek: firstDay };
  }, [calendarData, year, month]);

  const today = new Date();
  const isThisMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedDayTotal = selectedDay !== null ? (calendarData[selectedDay] || 0) : 0;

  const handleDayClick = async (day: number) => {
    setSelectedDay(day);
    setDayTransactions([]);
    if (!calendarData[day]) return;

    setLoadingDay(true);
    try {
      const res = await fetch(`/api/daily?year=${year}&month=${month}&day=${day}`);
      const data = await res.json();
      if (data.success) {
        setDayTransactions(data.data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingDay(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl bg-card border border-border p-5">
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
            const isToday = isThisMonth && today.getDate() === day;
            const hasData = amount > 0;
            const heat = getHeatStyle(amount, maxAmount);
            return (
              <button
                key={day}
                onClick={() => handleDayClick(day)}
                className={`aspect-square rounded-md flex flex-col items-center justify-center text-xs transition-all ${heat.bg} ${
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
              </button>
            );
          })}
        </div>
      </div>

      {/* 当日详情弹窗 */}
      <Dialog open={selectedDay !== null} onOpenChange={(open) => { if (!open) { setSelectedDay(null); setDayTransactions([]); } }}>
        <DialogContent className="max-w-sm rounded-2xl max-h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base">
              {month}月{selectedDay}日
            </DialogTitle>
          </DialogHeader>

          <div className="text-center py-3">
            <p className="text-2xl font-bold text-expense">¥{selectedDayTotal.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">当日总支出</p>
          </div>

          {/* 具体记录列表 */}
          <div className="flex-1 overflow-y-auto -mx-2 px-2 space-y-2 min-h-0">
            {loadingDay ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted animate-pulse">
                    <div className="space-y-1">
                      <div className="h-3 w-20 bg-muted-foreground/20 rounded" />
                      <div className="h-2 w-14 bg-muted-foreground/20 rounded" />
                    </div>
                    <div className="h-3 w-12 bg-muted-foreground/20 rounded" />
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
                      {t.note || t.category || "未分类"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.category || "未分类"} · {formatTime(t.transaction_time || t.created_at)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-expense ml-2 flex-shrink-0">
                    -¥{Number(t.amount).toLocaleString()}
                  </span>
                </div>
              ))
            ) : selectedDayTotal > 0 ? (
              <p className="text-center text-xs text-muted-foreground py-4">加载中...</p>
            ) : (
              <p className="text-center text-xs text-muted-foreground py-4">当日无支出</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
