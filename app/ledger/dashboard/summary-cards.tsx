"use client";

import { TrendingUp, TrendingDown, Wallet, CalendarDays, Hash, PiggyBank } from "lucide-react";
import { motion } from "framer-motion";
import { AnimatedCounter } from "@/components/animated-counter";

interface SummaryCardsProps {
  totalExpense: number;
  totalIncome: number;
  transactionCount: number;
  prevMonthExpense: number;
  daysPassed: number;
  allTimeExpense: number;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4, ease: [0.4, 0, 0.2, 1] as const },
  }),
};

export function SummaryCards({ totalExpense, transactionCount, prevMonthExpense, daysPassed, allTimeExpense }: SummaryCardsProps) {
  const currentExpense = totalExpense;
  const lastExpense = prevMonthExpense;
  const diff = lastExpense > 0 ? ((currentExpense - lastExpense) / lastExpense) * 100 : 0;
  const isIncrease = diff > 0;
  const dailyAvg = daysPassed > 0 ? currentExpense / daysPassed : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* 本月支出 */}
        <motion.div
          className="rounded-2xl bg-card border border-border p-5"
          custom={0}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <Wallet className="h-4 w-4" />
            <span className="text-sm">本月支出</span>
          </div>
          <div className="text-xl font-bold text-[#FF6B6B]">
            <AnimatedCounter value={currentExpense} prefix="¥" />
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            {isIncrease ? (
              <>
                <TrendingUp className="h-3 w-3 text-[#FF6B6B]" />
                <span className="text-[#FF6B6B]">+{diff.toFixed(1)}%</span>
              </>
            ) : (
              <>
                <TrendingDown className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-500">{diff.toFixed(1)}%</span>
              </>
            )}
            <span>vs 上月</span>
          </div>
        </motion.div>

        {/* 日均支出 */}
        <motion.div
          className="rounded-2xl bg-card border border-border p-5"
          custom={1}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <CalendarDays className="h-4 w-4" />
            <span className="text-sm">日均支出</span>
          </div>
          <div className="text-xl font-bold text-foreground">
            <AnimatedCounter value={dailyAvg} prefix="¥" decimals={0} />
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Hash className="h-3 w-3" />
            <span>{transactionCount} 笔记录</span>
          </div>
        </motion.div>
      </div>

      {/* 总共支出 */}
      <motion.div
        className="rounded-2xl bg-card border border-border p-5"
        custom={2}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <PiggyBank className="h-4 w-4" />
            <span className="text-sm">总共支出</span>
          </div>
          <div className="text-xl font-bold text-[#FF6B6B]">
            <AnimatedCounter value={allTimeExpense} prefix="¥" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}