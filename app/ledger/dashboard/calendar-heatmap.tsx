"use client";

import { useMemo, useState } from "react";
import { Transaction } from "../types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CalendarHeatmapProps {
  transactions: Transaction[];
  year: number;
  month: number; // 1-12
}

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

function getHeatColor(amount: number, max: number): string {
  if (amount === 0) return "bg-muted/50";
  const ratio = amount / max;
  if (ratio < 0.2) return "bg-[#FF6B6B]/15";
  if (ratio < 0.4) return "bg-[#FF6B6B]/30";
  if (ratio < 0.6) return "bg-[#FF6B6B]/50";
  if (ratio < 0.8) return "bg-[#FF6B6B]/70";
  return "bg-[#FF6B6B]/90";
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function CalendarHeatmap({ transactions, year, month }: CalendarHeatmapProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const { dailyAmounts, dailyTransactions, maxAmount, daysInMonth, firstDayOfWeek } = useMemo(() => {
    const amounts: Record<number, number> = {};
    const txMap: Record<number, Transaction[]> = {};

    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const d = new Date(t.transaction_time || t.created_at);
        const day = d.getDate();
        amounts[day] = (amounts[day] || 0) + Number(t.amount);
        if (!txMap[day]) txMap[day] = [];
        txMap[day].push(t);
      });

    const max = Math.max(...Object.values(amounts), 1);
    const totalDays = new Date(year, month, 0).getDate();
    const firstDay = (new Date(year, month - 1, 1).getDay() + 6) % 7;

    return { dailyAmounts: amounts, dailyTransactions: txMap, maxAmount: max, daysInMonth: totalDays, firstDayOfWeek: firstDay };
  }, [transactions, year, month]);

  const today = new Date();
  const isThisMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedDayTx = selectedDay !== null ? (dailyTransactions[selectedDay] || []) : [];
  const selectedDayTotal = selectedDay !== null ? (dailyAmounts[selectedDay] || 0) : 0;

  return (
    <>
      <div className="rounded-2xl bg-card border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-muted-foreground">支出日历</p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-sm bg-muted/50" />
            <span>少</span>
            <span className="w-2.5 h-2.5 rounded-sm bg-[#FF6B6B]/50" />
            <span className="w-2.5 h-2.5 rounded-sm bg-[#FF6B6B]/90" />
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
            const amount = dailyAmounts[day] || 0;
            const isToday = isThisMonth && today.getDate() === day;
            const hasData = amount > 0;
            return (
              <button
                key={day}
                onClick={() => hasData && setSelectedDay(day)}
                disabled={!hasData}
                className={`aspect-square rounded-md flex flex-col items-center justify-center text-xs transition-all ${getHeatColor(amount, maxAmount)} ${
                  isToday ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : ""
                } ${hasData ? "cursor-pointer hover:ring-2 hover:ring-[#FF6B6B]/50 hover:ring-offset-1 hover:ring-offset-card active:scale-95" : "cursor-default"}`}
              >
                <span className={`leading-none ${isToday ? "font-bold text-primary" : "text-foreground/70"}`}>
                  {day}
                </span>
                {hasData && (
                  <span className="text-[8px] leading-none mt-0.5 text-[#FF6B6B] font-medium">
                    {amount >= 1000 ? `${(amount / 1000).toFixed(1)}k` : amount.toFixed(0)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 当日详情弹窗 */}
      <Dialog open={selectedDay !== null} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">
              {month}月{selectedDay}日
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-between text-sm mb-3">
            <span className="text-muted-foreground">{selectedDayTx.length} 笔支出</span>
            <span className="font-semibold text-[#FF6B6B]">¥{selectedDayTotal.toLocaleString()}</span>
          </div>

          {selectedDayTx.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {selectedDayTx
                .sort((a, b) => new Date(a.transaction_time || a.created_at).getTime() - new Date(b.transaction_time || b.created_at).getTime())
                .map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{t.note || t.category || "未分类"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t.category || "未分类"} · {formatTime(t.transaction_time || t.created_at)}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-[#FF6B6B] ml-3 flex-shrink-0">
                      -¥{Number(t.amount).toLocaleString()}
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">当日无支出记录</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
