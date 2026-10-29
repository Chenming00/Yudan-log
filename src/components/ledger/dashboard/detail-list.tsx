"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Download, Search, X, ChevronRight, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, categoryEmoji, categoryLabel } from "@/lib/categories";
import { transactionTitle, csvCell } from "@/lib/ledger";
import { buildLedgerListUrl, shanghaiDateKey, type LedgerListQuery } from "@/lib/ledger-query-client";
import { collectLedgerPages, ledgerRequestError } from "@/lib/ledger-request-client";
import type { Transaction } from "../types";

interface DetailListProps {
  transactions: Transaction[];
  categories: string[];
  query: LedgerListQuery;
  search: string;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onTypeChange: (value: LedgerListQuery['type']) => void;
  onSelect: (transaction: Transaction) => void;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  pendingSearch: boolean;
  error: string | null;
  pageError: string | null;
  onLoadMore: () => void;
  onRetry: () => void;
}

function formatDate(value: string, group = false) {
  return new Date(value).toLocaleDateString("zh-CN", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "long", day: "numeric",
    ...(group ? { weekday: "short" as const } : { hour: "2-digit" as const, minute: "2-digit" as const }),
  });
}

export function DetailList({
  transactions, categories, query, search, onSearchChange, onCategoryChange, onTypeChange,
  onSelect, hasMore, loading, loadingMore, pendingSearch, error, pageError, onLoadMore, onRetry,
}: DetailListProps) {
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");
  const exportController = useRef<AbortController | null>(null);
  const queryKey = buildLedgerListUrl(query);
  useEffect(() => () => {
    exportController.current?.abort();
    exportController.current = null;
  }, []);
  useEffect(() => {
    // A downloaded file must always belong to the filters currently on screen.
    exportController.current?.abort();
    exportController.current = null;
    setExporting(false);
    setExportProgress("");
  }, [queryKey, search]);

  const categoryOptions = useMemo(() => {
    const labels = new Set([
      ...CATEGORIES.map((item) => item.label), "未分类", ...categories.map(categoryLabel),
      ...transactions.map((transaction) => categoryLabel(transaction.category)),
    ]);
    if (query.category) labels.add(query.category);
    return [...labels];
  }, [categories, transactions, query.category]);

  // The server owns stable effective-time/ID ordering; grouping preserves that order.
  const grouped = useMemo(() => {
    const groups = new Map<string, { label: string; items: Transaction[] }>();
    for (const transaction of transactions) {
      const date = transaction.transaction_time || transaction.created_at;
      const key = shanghaiDateKey(date);
      const group = groups.get(key) || { label: formatDate(date, true), items: [] };
      group.items.push(transaction);
      groups.set(key, group);
    }
    return [...groups.entries()];
  }, [transactions]);

  const handleExport = useCallback(async () => {
    if (exportController.current) {
      exportController.current.abort();
      exportController.current = null;
      setExporting(false);
      setExportProgress("已取消导出");
      return;
    }
    const controller = new AbortController();
    exportController.current = controller;
    setExporting(true);
    setExportProgress("准备导出…");
    try {
      const rows = await collectLedgerPages<Transaction>(
        (cursor) => buildLedgerListUrl(query, 100, cursor), controller.signal,
        (count) => { if (!controller.signal.aborted) setExportProgress(`已读取 ${count} 条`); },
      );
      if (controller.signal.aborted) return;
      const header = "日期,类型,金额,品牌,商品,分类,备注";
      const csvRows = rows.map((transaction) => [
        transaction.transaction_time ? new Date(transaction.transaction_time).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }) : "",
        transaction.type === "income" ? "收入" : "支出", Number(transaction.amount), transaction.brand || "", transaction.product || "", categoryLabel(transaction.category), transaction.note || "",
      ].map(csvCell).join(","));
      const blob = new Blob(["\uFEFF" + header + "\r\n" + csvRows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `记账导出_${query.year && query.month ? `${query.year}-${String(query.month).padStart(2, "0")}` : "全部"}_${shanghaiDateKey()}.csv`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
      setExportProgress(`已导出 ${rows.length} 条记录`);
    } catch (failure) {
      if (!controller.signal.aborted) setExportProgress(`导出失败：${ledgerRequestError(failure)}`);
    } finally {
      if (exportController.current === controller) {
        exportController.current = null;
        setExporting(false);
      }
    }
  }, [query]);

  const busy = loading || pendingSearch;
  const filtered = Boolean(query.search || query.category || query.type);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="section-title">收支明细</h2><p className="mt-1 text-xs text-muted-foreground">日常的小事，都有迹可循。</p></div>
        {transactions.length > 0 && <span className="rounded-full bg-[#edf0e9] px-3 py-1 text-[11px] text-muted-foreground">已加载 {transactions.length} 条</span>}
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input type="search" aria-label="搜索账单" placeholder="搜索品牌、商品、备注、分类或金额..." value={search} onChange={(event) => onSearchChange(event.target.value)} className="h-12 rounded-xl border-border bg-background/70 pl-10 pr-10" />
        {search && <Button variant="ghost" size="icon" onClick={() => onSearchChange("")} className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label="清除搜索"><X className="h-4 w-4" /></Button>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Select value={query.category || "all"} onValueChange={(value) => onCategoryChange(value === "all" ? "" : value)}>
          <SelectTrigger aria-label="筛选分类" className="h-9 w-auto min-w-28 rounded-lg bg-card text-xs"><SelectValue placeholder="全部分类" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            {categoryOptions.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={query.type || "all"} onValueChange={(value) => onTypeChange(value === "all" ? "" : value as LedgerListQuery['type'])}>
          <SelectTrigger aria-label="筛选收支类型" className="h-9 w-auto min-w-24 rounded-lg bg-card text-xs"><SelectValue placeholder="全部收支" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部收支</SelectItem>
            <SelectItem value="expense">支出</SelectItem>
            <SelectItem value="income">收入</SelectItem>
          </SelectContent>
        </Select>
        {(query.category || query.type) && <Button variant="ghost" size="sm" onClick={() => { onCategoryChange(""); onTypeChange(""); }} className="h-8 text-xs text-muted-foreground">清除筛选</Button>}
        <Button variant="ghost" size="sm" onClick={handleExport} disabled={pendingSearch && !exporting} className="ml-auto h-9 rounded-lg bg-[#edf0e9] px-3 text-xs text-primary"><Download className="h-3.5 w-3.5" />{exporting ? "取消导出" : "导出 CSV"}</Button>
      </div>
      {exportProgress && <p role="status" className="text-xs text-muted-foreground">{exportProgress}</p>}
      {error && <Card className="p-4" role="alert"><p className="text-sm text-destructive">{transactions.length ? "刷新失败：" : "账单加载失败："}{error}</p><Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>重试账单</Button></Card>}
      {busy && <p role="status" className="text-xs text-muted-foreground">{pendingSearch ? "正在更新搜索条件…" : transactions.length ? "正在刷新账单…" : "正在加载账单…"}</p>}
      {loading && transactions.length === 0 ? (
        <div aria-label="账单加载中" className="space-y-3">{[0, 1, 2].map((index) => <Skeleton key={index} className="h-20 rounded-2xl" />)}</div>
      ) : transactions.length === 0 && !error && !pendingSearch ? (
        <Card className="flex flex-col items-center gap-2 border-dashed bg-background/50 px-5 py-14 text-center shadow-none"><span className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e9eee4] text-primary"><ReceiptText className="h-6 w-6" /></span><p className="font-medium text-foreground text-sm">{filtered ? "未找到匹配记录" : "暂无交易记录"}</p><p className="mt-1 text-xs text-muted-foreground">{filtered ? "试试其他关键词或筛选条件" : "点击 + 号开始记账吧"}</p></Card>
      ) : (
        <div className="space-y-6" aria-busy={busy}>
          {grouped.map(([date, group]) => (
            <div key={date} className="space-y-1">
              <div className="flex items-center justify-between gap-3 rounded-lg bg-[#f1f3ed] px-3 py-2.5"><span className="text-xs font-medium text-muted-foreground">{group.label}</span><span className="text-[11px] text-muted-foreground">{group.items.length} 笔</span></div>
              <div className="divide-y divide-border/60">
                {group.items.map((transaction) => (
                  <Button key={transaction.id} variant="outline" onClick={() => onSelect(transaction)} className="h-auto w-full justify-start gap-3 rounded-lg border-0 bg-transparent px-2 py-4 text-left shadow-none hover:bg-[#f5f6f1] sm:gap-4 sm:px-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eff1eb] text-lg">{categoryEmoji(transaction.category)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{transactionTitle(transaction)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{categoryLabel(transaction.category)} · {transaction.transaction_time ? formatDate(transaction.transaction_time) : `购买时间未知 · 录入于 ${formatDate(transaction.created_at)}`}</p>
                    </div>
                    <span className={`shrink-0 text-sm font-semibold tabular-nums ${transaction.type === "income" ? "text-primary" : "text-expense"}`}>{transaction.type === "income" ? "+" : "-"}¥{Number(transaction.amount).toLocaleString()}</span>
                    <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground/60 sm:block" />
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {pageError && <p role="alert" className="text-sm text-destructive">加载更多失败：{pageError}</p>}
      {hasMore && <Button variant="secondary" onClick={onLoadMore} disabled={loadingMore || busy} className="h-11 w-full rounded-xl text-muted-foreground">{loadingMore ? "加载中..." : pageError ? "重试加载更多" : "加载更多"}</Button>}
    </div>
  );
}
