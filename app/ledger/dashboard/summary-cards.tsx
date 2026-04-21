"use client";

import { TrendingUp, TrendingDown, Wallet } from "lucide-react";

interface SummaryCardsProps {
  currentMonth: {
    expense: number;
    transactions: { type: "expense" | "income"; amount: number }[];
  };
  lastMonth: {
    expense: number;
  };
}

export function SummaryCards({ currentMonth, lastMonth }: SummaryCardsProps) {
  const currentExpense = currentMonth.expense;
  const lastExpense = lastMonth.expense;
  const diff = lastExpense > 0 ? ((currentExpense - lastExpense) / lastExpense) * 100 : 0;
  const isIncrease = diff > 0;

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* 本月支出 */}
      <div className="rounded-2xl bg-white shadow-sm p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <Wallet className="h-4 w-4" />
          <span className="text-xs font-medium">本月支出</span>
        </div>
        <div className="text-2xl font-bold text-rose-500">
          ¥{currentExpense.toLocaleString()}
        </div>
        <div className="mt-1 flex items-center gap-1 text-xs">
          {isIncrease ? (
            <>
              <TrendingUp className="h-3 w-3 text-rose-500" />
              <span className="text-rose-500">+{diff.toFixed(1)}%</span>
            </>
          ) : (
            <>
              <TrendingDown className="h-3 w-3 text-emerald-500" />
              <span className="text-emerald-500">{diff.toFixed(1)}%</span>
            </>
          )}
          <span className="text-muted-foreground">vs 上月</span>
        </div>
      </div>

      {/* 交易笔数 */}
      <div className="rounded-2xl bg-white shadow-sm p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <Wallet className="h-4 w-4" />
          <span className="text-xs font-medium">交易笔数</span>
        </div>
        <div className="text-2xl font-bold text-foreground">
          {currentMonth.transactions.length}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          本月记录
        </div>
      </div>
    </div>
  );
}
