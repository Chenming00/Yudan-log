"use client";

import { motion } from "framer-motion";
import { AnimatedCounter } from "@/components/animated-counter";
import { LastTransaction } from "../types";

interface SummaryCardsProps {
  allTimeExpense: number;
  totalExpense: number;
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

export function SummaryCards({ allTimeExpense, totalExpense, lastTransaction }: SummaryCardsProps) {
  return (
    <motion.div
      className="rounded-2xl bg-card border border-border p-6 shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* 总累计支出 — 最大字体 */}
      <p className="text-sm text-muted-foreground mb-1">总支出</p>
      <div className="text-3xl sm:text-4xl font-bold text-[#FF6B6B] tracking-tight">
        <AnimatedCounter value={allTimeExpense} prefix="¥" />
      </div>

      {/* 分隔线 */}
      <div className="h-px bg-border my-4" />

      {/* 本月支出 */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">本月</span>
        <span className="text-lg font-semibold text-foreground">
          ¥{totalExpense.toLocaleString()}
        </span>
      </div>

      {/* 最近一笔 */}
      {lastTransaction && (
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">最近一笔</span>
          <span className="text-xs text-muted-foreground">
            ¥{lastTransaction.amount.toLocaleString()} · {lastTransaction.category} · {formatRelativeDate(lastTransaction.transaction_time)}
          </span>
        </div>
      )}
    </motion.div>
  );
}
