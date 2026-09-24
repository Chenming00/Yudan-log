"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { AnimatedCounter } from "@/components/animated-counter";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { transactionTitle } from "@/lib/ledger";
import { formatLedgerRelativeDate } from "@/lib/ledger-query-client";
import type { LastTransaction } from "../types";

interface SummaryCardsProps {
  monthLabel: string;
  totalExpense: number;
  allTimeExpense: number;
  prevMonthExpense: number;
  transactionCount: number;
  lastTransaction: LastTransaction | null;
}

export function SummaryCards({
  monthLabel,
  totalExpense,
  allTimeExpense,
  prevMonthExpense,
  transactionCount,
  lastTransaction,
}: SummaryCardsProps) {
  // 环比上月
  const hasDelta = prevMonthExpense > 0;
  const deltaPct = hasDelta ? ((totalExpense - prevMonthExpense) / prevMonthExpense) * 100 : 0;
  const up = deltaPct >= 0;

  return (
    <Card className="p-6 shadow-sm">
      {/* 所选月支出 — 主数字 */}
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-muted-foreground">{monthLabel}</p>
        <span className="text-xs text-muted-foreground">{transactionCount} 笔</span>
      </div>
      <div className="mt-1 text-3xl sm:text-4xl font-bold text-expense tracking-tight">
        <AnimatedCounter value={totalExpense} prefix="¥" decimals={2} />
      </div>

      {/* 环比上月 */}
      {hasDelta && (
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          <Badge
            variant="secondary"
            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium ${
              up ? "bg-expense/10 text-expense" : "bg-primary/10 text-primary"
            }`}
          >
            {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(deltaPct).toFixed(0)}%
          </Badge>
          <span className="text-muted-foreground">较上月 ¥{prevMonthExpense.toLocaleString()}</span>
        </div>
      )}

      {/* 分隔线 */}
      <Separator className="my-4" />

      {/* 累计总支出 */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">累计总支出</span>
        <span className="text-lg font-semibold text-foreground">
          ¥{allTimeExpense.toLocaleString()}
        </span>
      </div>

      {/* 最近一笔 */}
      {lastTransaction && (
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">最近一笔</span>
          <span className="text-xs text-muted-foreground truncate ml-2">
            ¥{lastTransaction.amount.toLocaleString()} · {transactionTitle(lastTransaction)} ·{" "}
            {lastTransaction.transaction_time ? formatLedgerRelativeDate(lastTransaction.transaction_time) : "购买时间未知"}
          </span>
        </div>
      )}
    </Card>
  );
}
