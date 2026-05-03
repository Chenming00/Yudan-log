"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CalendarHeatmapProps {
  calendarData: Record<number, number>;
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

export function CalendarHeatmap({ calendarData, year, month }: CalendarHeatmapProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

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
            const amount = calendarData[day] || 0;
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

          <div className="text-center py-6">
            <p className="text-3xl font-bold text-[#FF6B6B]">¥{selectedDayTotal.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-2">当日总支出</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
