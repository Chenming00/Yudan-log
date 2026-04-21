"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

interface Transaction {
  id: string;
  amount: number;
  note: string;
  category: string;
  type: "expense" | "income";
  transaction_time?: string;
  created_at: string;
}

interface RecentExpensesProps {
  transactions: Transaction[];
  onSelect?: (transaction: Transaction) => void;
  limit?: number;
}

function formatTime(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const transactionDate = new Date(date.getTime());
  transactionDate.setHours(0, 0, 0, 0);

  if (transactionDate.getTime() === today.getTime()) {
    return `今天 ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  } else if (transactionDate.getTime() === yesterday.getTime()) {
    return `昨天 ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
}

export function RecentExpenses({ transactions, onSelect, limit = 5 }: RecentExpensesProps) {
  const recentExpenses = transactions
    .filter((t) => t.type === "expense")
    .sort((a, b) => {
      const timeA = new Date(a.transaction_time || a.created_at).getTime();
      const timeB = new Date(b.transaction_time || b.created_at).getTime();
      return timeB - timeA;
    })
    .slice(0, limit);

  if (recentExpenses.length === 0) {
    return (
      <Card className="rounded-2xl bg-white shadow-sm border-0">
        <CardContent className="p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">最近支出</h3>
          <p className="text-center text-gray-400 text-sm py-8">暂无支出记录</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl bg-white shadow-sm border-0">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-900">最近支出</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {recentExpenses.map((transaction) => {
            const date = new Date(transaction.transaction_time || transaction.created_at);
            return (
              <div
                key={transaction.id}
                onClick={() => onSelect?.(transaction)}
                className="flex items-center justify-between py-3 px-1 first:pt-0 last:pb-0 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">
                      {transaction.category}
                    </span>
                    {transaction.note && (
                      <span className="text-xs text-gray-400 break-all">
                        {transaction.note}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {formatTime(date)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">
                    -¥{Number(transaction.amount).toLocaleString()}
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}