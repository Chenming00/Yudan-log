"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface SummaryCardsProps {
  currentMonth: {
    income: number;
    expense: number;
    balance: number;
  };
  lastMonth: {
    income: number;
    expense: number;
    balance: number;
  };
}

function calculateChange(current: number, last: number): number {
  if (last === 0) return current > 0 ? 100 : 0;
  return ((current - last) / last) * 100;
}

function TrendIndicator({ value, isPositiveGood }: { value: number; isPositiveGood?: boolean }) {
  const isPositive = value >= 0;
  const absValue = Math.abs(value);
  
  // 对于支出，负数是好的（减少）；对于收入/结余，正数是好的
  const isGood = isPositiveGood !== undefined 
    ? (isPositiveGood ? isPositive : !isPositive)
    : isPositive;
  
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

interface StatCardProps {
  title: string;
  value: number;
  change: number;
  isPositiveGood?: boolean;
  colorClass: string;
}

function StatCard({ title, value, change, isPositiveGood, colorClass }: StatCardProps) {
  return (
    <Card className="group relative overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-stone-200/60">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <span className="text-xs font-medium text-stone-500 tracking-wide uppercase">{title}</span>
          <TrendIndicator value={change} isPositiveGood={isPositiveGood} />
        </div>
        <div className={`text-2xl font-semibold ${colorClass}`}>
          ¥{value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </div>
      </CardContent>
    </Card>
  );
}

export function SummaryCards({ currentMonth, lastMonth }: SummaryCardsProps) {
  const incomeChange = calculateChange(currentMonth.income, lastMonth.income);
  const expenseChange = calculateChange(currentMonth.expense, lastMonth.expense);
  const balanceChange = calculateChange(currentMonth.balance, lastMonth.balance);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <StatCard
        title="本月支出"
        value={currentMonth.expense}
        change={expenseChange}
        isPositiveGood={false}
        colorClass="text-amber-600"
      />
      <StatCard
        title="本月收入"
        value={currentMonth.income}
        change={incomeChange}
        isPositiveGood={true}
        colorClass="text-emerald-600"
      />
      <StatCard
        title="本月结余"
        value={currentMonth.balance}
        change={balanceChange}
        isPositiveGood={true}
        colorClass="text-blue-600"
      />
    </div>
  );
}