"use client";

import { ArrowDownRight, ArrowUpRight, ReceiptText, Wallet, Clock3 } from "lucide-react";
import { AnimatedCounter } from "@/components/animated-counter";
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

export function SummaryCards({ monthLabel, totalExpense, allTimeExpense, prevMonthExpense, transactionCount, lastTransaction }: SummaryCardsProps) {
  const hasDelta = prevMonthExpense > 0;
  const deltaPct = hasDelta ? ((totalExpense - prevMonthExpense) / prevMonthExpense) * 100 : 0;
  const up = deltaPct >= 0;

  return (
    <div className="space-y-4">
      <div className="grid min-w-0 grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-[1.25fr_1fr_1fr]">
        <section className="relative col-span-2 min-w-0 overflow-hidden rounded-[22px] bg-primary p-6 text-primary-foreground sm:p-7 xl:col-span-1" aria-label="月度支出">
          <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full border-[24px] border-white/5" aria-hidden="true" />
          <div className="relative flex items-center justify-between gap-2">
            <p className="text-sm text-white/80">{monthLabel}</p>
            <Wallet className="h-5 w-5 text-white/55" />
          </div>
          <p className="relative mt-5 break-words text-[34px] font-semibold tracking-tight tabular-nums sm:text-[38px]">
            <AnimatedCounter value={totalExpense} prefix="¥" decimals={2} />
          </p>
          <div className="mt-4 flex min-h-6 flex-wrap items-center gap-2 text-xs text-white/75">
            {hasDelta ? <>
              <span className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-1 text-white">
                {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {Math.abs(deltaPct).toFixed(0)}%
              </span>
              <span>较上月 ¥{prevMonthExpense.toLocaleString()}</span>
            </> : <span>每一笔，都是成长的注脚</span>}
          </div>
        </section>
        <section className="surface-card min-w-0 p-4 sm:p-7" aria-label="累计支出">
          <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5eadc] text-[#a67c4e]"><Wallet className="h-[19px] w-[19px]" /></span>
          <p className="text-xs text-muted-foreground sm:text-sm">累计总支出</p>
          <p className="mt-2 break-words text-xl font-semibold tracking-tight tabular-nums text-foreground sm:text-[28px]">¥{allTimeExpense.toLocaleString()}</p>
          <p className="mt-2 text-[11px] text-muted-foreground sm:text-xs">从第一笔开始，慢慢积累</p>
        </section>
        <section className="surface-card min-w-0 p-4 sm:p-7" aria-label="月度账单数量">
          <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#e9eee4] text-primary"><ReceiptText className="h-[19px] w-[19px]" /></span>
          <p className="text-xs text-muted-foreground sm:text-sm">月度记录</p>
          <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums text-foreground sm:text-[28px]">{transactionCount}<span className="ml-1.5 text-xs font-normal text-muted-foreground">笔</span></p>
          <p className="mt-2 text-[11px] text-muted-foreground sm:text-xs">一份花费，一份小小的爱</p>
        </section>
      </div>
      {lastTransaction && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-[#edf0e9] px-4 py-3 text-xs text-muted-foreground sm:px-5">
          <span className="flex items-center gap-2"><Clock3 className="h-3.5 w-3.5" />最近一笔</span>
          <span className="min-w-0 flex-1 truncate text-foreground">{transactionTitle(lastTransaction)}</span>
          <span className="font-medium tabular-nums text-foreground">¥{lastTransaction.amount.toLocaleString()}</span>
          <span>{lastTransaction.transaction_time ? formatLedgerRelativeDate(lastTransaction.transaction_time) : "购买时间未知"}</span>
        </div>
      )}
    </div>
  );
}
