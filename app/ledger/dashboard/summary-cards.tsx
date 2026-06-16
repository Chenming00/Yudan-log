"use client";

import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";
import { AnimatedCounter } from "@/components/animated-counter";
import { categoryLabel } from "@/lib/categories";
import type { LastTransaction } from "../types";

interface SummaryCardsProps {
  monthLabel: string;
  totalExpense: number;
  allTimeExpense: number;
  prevMonthExpense: number;
  transactionCount: number;
  lastTransaction: LastTransaction | null;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "今天";
  if (diffDays === 1) return "昨天";
  if (diffDays < 7) return `${diffDays}天前`;
  return `${date.getMonth() + 1}/${date.getDate()}`;
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
    <motion.div
      className="rounded-2xl bg-card border border-border p-6 shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
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
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium ${
              up ? "bg-expense/10 text-expense" : "bg-primary/10 text-primary"
            }`}
          >
            {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(deltaPct).toFixed(0)}%
          </span>
          <span className="text-muted-foreground">较上月 ¥{prevMonthExpense.toLocaleString()}</span>
        </div>
      )}

      {/* 分隔线 */}
      <div className="h-px bg-border my-4" />

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
            ¥{lastTransaction.amount.toLocaleString()} · {categoryLabel(lastTransaction.category)} ·{" "}
            {formatRelativeDate(lastTransaction.transaction_time)}
          </span>
        </div>
      )}
    </motion.div>
  );
}
