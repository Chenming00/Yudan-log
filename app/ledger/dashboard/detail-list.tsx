"use client";

import { Transaction } from "../types";

interface DetailListProps {
  transactions: Transaction[];
  onSelect: (t: Transaction) => void;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DetailList({ transactions, onSelect }: DetailListProps) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl bg-white shadow-sm p-8 text-center">
        <p className="text-muted-foreground text-sm">暂无交易记录</p>
      </div>
    );
  }

  // 按日期分组
  const grouped = transactions.reduce<Record<string, Transaction[]>>((acc, t) => {
    const date = new Date(t.transaction_time || t.created_at);
    const key = date.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "short" });
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([date, items]) => (
        <div key={date} className="space-y-3">
          <div className="px-1">
            <span className="text-xs font-medium text-muted-foreground">{date}</span>
          </div>
          <div className="space-y-3">
            {items.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelect(t)}
                className="w-full flex items-center justify-between rounded-2xl bg-white shadow-sm p-4 hover:bg-accent transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {t.note || t.category || "未分类"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t.category || "未分类"} · {formatDate(t.transaction_time || t.created_at)}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold ml-2 ${
                    t.type === "income" ? "text-emerald-500" : "text-[#FF6B6B]"
                  }`}
                >
                  {t.type === "income" ? "+" : "-"}¥{Number(t.amount).toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}