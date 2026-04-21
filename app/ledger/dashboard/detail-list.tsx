"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useState } from "react";

interface Transaction {
  id: string;
  amount: number;
  note: string;
  category: string;
  type: "expense" | "income";
  transaction_time?: string;
  created_at: string;
}

interface DetailListProps {
  transactions: Transaction[];
  onSelect?: (transaction: Transaction) => void;
}

function formatDateGroup(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const transactionDate = new Date(date.getTime());
  transactionDate.setHours(0, 0, 0, 0);

  if (transactionDate.getTime() === today.getTime()) {
    return "今天";
  } else if (transactionDate.getTime() === yesterday.getTime()) {
    return "昨天";
  }

  const daysDiff = Math.floor((today.getTime() - transactionDate.getTime()) / (24 * 60 * 60 * 1000));
  if (daysDiff < 7) {
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return weekdays[date.getDay()];
  }

  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
}

function formatFullDate(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][date.getDay()];
  return `${month}月${day}日 ${weekday}`;
}

interface TransactionItemProps {
  transaction: Transaction;
  onClick?: () => void;
}

function TransactionItem({ transaction, onClick }: TransactionItemProps) {
  const date = new Date(transaction.transaction_time || transaction.created_at);
  const timeStr = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  const isExpense = transaction.type === "expense";

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 py-3 px-2 rounded-xl hover:bg-stone-50 cursor-pointer transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium text-foreground">
            {transaction.category}
          </span>
          {transaction.note && (
            <span className="text-xs text-muted-foreground break-all">
              {transaction.note}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {formatFullDate(date)} {timeStr}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`text-sm font-semibold ${
            isExpense ? "text-rose-500" : "text-emerald-500"
          }`}
        >
          {isExpense ? "-" : "+"}¥{Number(transaction.amount).toLocaleString()}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}

export function DetailList({ transactions, onSelect }: DetailListProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // 按日期分组
  const groupedTransactions = transactions.reduce<Record<string, Transaction[]>>((groups, t) => {
    const date = new Date(t.transaction_time || t.created_at);
    const groupKey = formatDateGroup(date);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(t);
    return groups;
  }, {});

  // 定义日期组的顺序
  const groupOrder = ["今天", "昨天", "周一", "周二", "周三", "周四", "周五", "周六"];

  const sortedGroups = Object.entries(groupedTransactions).sort((a, b) => {
    const aIndex = groupOrder.indexOf(a[0]);
    const bIndex = groupOrder.indexOf(b[0]);

    // 如果都在预定义顺序中
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    // 如果只有 a 在预定义顺序中
    if (aIndex !== -1) {
      return -1;
    }
    // 如果只有 b 在预定义顺序中
    if (bIndex !== -1) {
      return 1;
    }

    // 都不在预定义顺序中，按日期字符串排序（新的在前）
    return b[0].localeCompare(a[0], "zh-CN");
  });

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  if (transactions.length === 0) {
    return (
          <Card className="rounded-2xl shadow-sm border-stone-200">
        <CardContent className="p-8">
          <p className="text-center text-muted-foreground text-sm">暂无交易记录</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sortedGroups.map(([groupKey, items]) => {
        const isExpanded = expandedGroups[groupKey] !== undefined 
          ? expandedGroups[groupKey] 
          : true; // 默认展开
        const groupTotal = items
          .filter((t) => t.type === "expense")
          .reduce((sum, t) => sum + Number(t.amount), 0);

        return (
          <Card
            key={groupKey}
            className="rounded-2xl shadow-sm overflow-hidden border-stone-200"
          >
            <CardContent className="p-0">
              {/* 组头 */}
              <div
                onClick={() => toggleGroup(groupKey)}
                className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-stone-50 to-stone-100 cursor-pointer hover:from-stone-100 hover:to-stone-200 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{groupKey}</span>
                  <span className="text-xs text-muted-foreground">
                    {items.length} 笔交易
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    支出 ¥{groupTotal.toLocaleString()}
                  </span>
                  <ChevronRight
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                  />
                </div>
              </div>

              {/* 交易列表 */}
              {isExpanded && (
                <div className="divide-y divide-border px-4">
                  {items.map((transaction) => (
                    <TransactionItem
                      key={transaction.id}
                      transaction={transaction}
                      onClick={() => onSelect?.(transaction)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}