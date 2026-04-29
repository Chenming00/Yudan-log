"use client";

import { useState, useMemo } from "react";
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
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return transactions;
    const keyword = search.trim().toLowerCase();
    return transactions.filter(
      (t) =>
        (t.note && t.note.toLowerCase().includes(keyword)) ||
        (t.category && t.category.toLowerCase().includes(keyword)) ||
        String(t.amount).includes(keyword)
    );
  }, [transactions, search]);

  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl bg-card border border-dashed border-border p-10 text-center">
        <div className="w-14 h-14 rounded-full bg-[#FF6B6B]/10 mx-auto flex items-center justify-center mb-4">
          <span className="text-2xl">📭</span>
        </div>
        <p className="font-medium text-foreground text-sm">暂无交易记录</p>
        <p className="mt-1 text-xs text-muted-foreground">
          点击右下角 + 号开始记账吧
        </p>
      </div>
    );
  }

  // 按日期分组
  const grouped = filtered.reduce<Record<string, Transaction[]>>((acc, t) => {
    const date = new Date(t.transaction_time || t.created_at);
    const key = date.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "short" });
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* 搜索栏 */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="搜索备注、分类或金额..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/30 focus:border-[#FF6B6B]/50 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg
              className="w-4 h-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* 搜索结果为空 */}
      {search.trim() && filtered.length === 0 ? (
        <div className="rounded-2xl bg-card border border-dashed border-border p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-muted-foreground"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <p className="font-medium text-foreground text-sm">未找到匹配记录</p>
          <p className="mt-1 text-xs text-muted-foreground">
            试试其他关键词吧
          </p>
        </div>
      ) : (
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
                    className="w-full flex items-center justify-between rounded-2xl bg-card border border-border p-4 hover:bg-accent transition-colors text-left"
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
      )}
    </div>
  );
}
