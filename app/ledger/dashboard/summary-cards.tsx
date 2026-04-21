"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface SummaryCardsProps {
  currentMonth: {
    expense: number;
  };
  lastMonth: {
    expense: number;
  };
}

function calculateChange(current: number, last: number): number {
  if (last === 0) return current > 0 ? 100 : 0;
  return ((current - last) / last) * 100;
}

function TrendIndicator({ value }: { value: number }) {
  const isPositive = value >= 0;
  const absValue = Math.abs(value);
  
  // 对于支出，负数是好的（减少）
  const isGood = !isPositive;
  
  const colorClass = isGood 
    ? "text-emerald-600" 
    : "text-amber-600";
  
  return (
    <div className={`flex items-center gap-1 text-xs font-medium ${colorClass}`}>
      {isPositive ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )}
      <span>{absValue.toFixed(1)}%</span>
    </div>
  );
}

export function SummaryCards({ currentMonth, lastMonth }: SummaryCardsProps) {
  const expenseChange = calculateChange(currentMonth.expense, lastMonth.expense);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      <Card className="group relative overflow-hidden rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">本月支出</span>
            <TrendIndicator value={expenseChange} />
          </div>
          <div className="text-2xl font-semibold text-amber-600">
            ¥{currentMonth.expense.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </CardContent>
      </Card>
      <Card className="group relative overflow-hidden rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">上月支出</span>
            <div className="text-xs font-medium text-muted-foreground/60">对比基准</div>
          </div>
          <div className="text-2xl font-semibold text-foreground">
            ¥{lastMonth.expense.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}