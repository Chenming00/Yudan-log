"use client";

import { useState, useMemo, useCallback } from "react";
import { Download, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { categoryEmoji, categoryLabel } from "@/lib/categories";
import type { Transaction } from "../types";

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

export function DetailList({ transactions, onSelect, hasMore, loadingMore, onLoadMore }: DetailListProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const categories = useMemo(() => {
    const cats = new Set(transactions.map((t) => t.category || "未分类"));
    return Array.from(cats).sort();
  }, [transactions]);

  const filtered = useMemo(() => {
    let result = transactions;

    if (categoryFilter !== "all") {
      result = result.filter((t) => (t.category || "未分类") === categoryFilter);
    }

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
  }, [transactions, search, categoryFilter]);

  // 按交易时间降序（在任何条件 return 之前，避免 Hooks 顺序错乱）
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.transaction_time || a.created_at).getTime();
      const dateB = new Date(b.transaction_time || b.created_at).getTime();
      return dateB - dateA;
    });
  }, [filtered]);

  const handleExport = useCallback(() => {
    const header = "日期,类型,金额,分类,备注";
    const rows = filtered.map((t) => {
      const date = new Date(t.transaction_time || t.created_at).toLocaleString("zh-CN");
      const amount = Number(t.amount);
      const category = (t.category || "未分类").replace(/,/g, "，");
      const note = (t.note || "").replace(/,/g, "，").replace(/\n/g, " ");
      return `${date},支出,${amount},${category},${note}`;
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
      <Card className="border-dashed p-10 text-center">
        <div className="w-14 h-14 rounded-full bg-expense/10 mx-auto flex items-center justify-center mb-4">
          <span className="text-2xl">📭</span>
        </div>
        <p className="font-medium text-foreground text-sm">暂无交易记录</p>
        <p className="mt-1 text-xs text-muted-foreground">
          点击 + 号开始记账吧
        </p>
      </Card>
    );
  }

  const grouped = sorted.reduce<Record<string, Transaction[]>>((acc, t) => {
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
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="搜索备注、分类或金额..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-10 focus-visible:border-expense/50 focus-visible:ring-expense/30"
        />
        {search && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearch("")}
            className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-label="清除搜索"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* 筛选器 */}
      <div className="flex flex-wrap gap-2">
        {categories.length > 1 && (
          <Select
            value={categoryFilter}
            onValueChange={setCategoryFilter}
          >
            <SelectTrigger className="h-8 w-auto min-w-28 bg-muted text-xs">
              <SelectValue placeholder="全部分类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部分类</SelectItem>
              {categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {categoryFilter !== "all" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCategoryFilter("all")}
            className="h-8 text-xs text-muted-foreground"
          >
            清除筛选
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={handleExport}
          className="ml-auto h-8 text-xs text-muted-foreground"
        >
          <Download className="h-3.5 w-3.5" />
          导出 CSV
        </Button>
      </div>

      {/* 搜索结果为空 */}
      {search.trim() && filtered.length === 0 ? (
        <Card className="border-dashed p-10 text-center">
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
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date} className="space-y-3">
              <div className="px-1">
                <span className="text-xs font-medium text-muted-foreground">{date}</span>
              </div>
              <div className="space-y-3">
                {items.map((t) => (
                  <Button
                    key={t.id}
                    variant="outline"
                    onClick={() => onSelect(t)}
                    className="h-auto w-full justify-start rounded-2xl p-4 text-left"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-lg">
                      {categoryEmoji(t.category)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {t.note || categoryLabel(t.category)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {categoryLabel(t.category)} · {formatDate(t.transaction_time || t.created_at)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-expense">
                      -¥{Number(t.amount).toLocaleString()}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          ))}

          {/* 加载更多 */}
          {hasMore && (
            <Button
              variant="secondary"
              onClick={onLoadMore}
              disabled={loadingMore}
              className="w-full text-muted-foreground"
            >
              {loadingMore ? "加载中..." : "加载更多"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
