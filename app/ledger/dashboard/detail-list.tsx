"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download } from "lucide-react";
import { Transaction, TransactionTypeFilter } from "../types";

interface DetailListProps {
  transactions: Transaction[];
  onSelect: (t: Transaction) => void;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
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

const TYPE_FILTERS: { value: TransactionTypeFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "expense", label: "支出" },
  { value: "income", label: "收入" },
];

export function DetailList({ transactions, onSelect, hasMore, loadingMore, onLoadMore }: DetailListProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // 动态提取所有分类
  const categories = useMemo(() => {
    const cats = new Set(transactions.map((t) => t.category || "未分类"));
    return Array.from(cats).sort();
  }, [transactions]);

  const filtered = useMemo(() => {
    let result = transactions;

    // 类型筛选
    if (typeFilter !== "all") {
      result = result.filter((t) => t.type === typeFilter);
    }

    // 分类筛选
    if (categoryFilter !== "all") {
      result = result.filter((t) => (t.category || "未分类") === categoryFilter);
    }

    // 搜索筛选
    if (search.trim()) {
      const keyword = search.trim().toLowerCase();
      result = result.filter(
        (t) =>
          (t.note && t.note.toLowerCase().includes(keyword)) ||
          (t.category && t.category.toLowerCase().includes(keyword)) ||
          String(t.amount).includes(keyword)
      );
    }

    return result;
  }, [transactions, search, typeFilter, categoryFilter]);

  const handleExport = useCallback(() => {
    const header = "日期,类型,金额,分类,备注";
    const rows = filtered.map((t) => {
      const date = new Date(t.transaction_time || t.created_at).toLocaleString("zh-CN");
      const type = t.type === "income" ? "收入" : "支出";
      const amount = Number(t.amount);
      const category = (t.category || "未分类").replace(/,/g, "，");
      const note = (t.note || "").replace(/,/g, "，").replace(/\n/g, " ");
      return `${date},${type},${amount},${category},${note}`;
    });
    const csv = "﻿" + header + "\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `记账导出_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

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

      {/* 筛选器 */}
      <div className="flex flex-wrap gap-2">
        {/* 类型筛选 */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          {TYPE_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTypeFilter(value)}
              className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                typeFilter === value
                  ? "bg-white shadow-sm text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 分类筛选 */}
        {categories.length > 1 && (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg bg-muted border-0 text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">全部分类</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        )}

        {/* 清除筛选 */}
        {(typeFilter !== "all" || categoryFilter !== "all") && (
          <button
            onClick={() => { setTypeFilter("all"); setCategoryFilter("all"); }}
            className="px-3 py-1.5 text-xs rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            清除筛选
          </button>
        )}

        {/* 导出按钮 */}
        <button
          onClick={handleExport}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          导出 CSV
        </button>
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
                {items.map((t, index) => (
                  <motion.button
                    key={t.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
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
                  </motion.button>
                ))}
              </div>
            </div>
          ))}

          {/* 加载更多 */}
          {hasMore && (
            <button
              onClick={onLoadMore}
              disabled={loadingMore}
              className="w-full py-3 rounded-xl bg-muted text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {loadingMore ? "加载中..." : "加载更多"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
