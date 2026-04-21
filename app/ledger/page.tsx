"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Search, Settings, ArrowLeft, Plus, CalendarDays, FunnelX } from 'lucide-react';
import Link from 'next/link';

type TransactionTypeFilter = 'all' | 'income' | 'expense';
type DateRangeFilter = 'all' | '7d' | '30d' | 'month';

interface Transaction {
  id: string;
  amount: number;
  note: string;
  category: string;
  type: 'expense' | 'income';
  transaction_time?: string;
  created_at: string;
}

interface TransactionFormState {
  amount: string;
  note: string;
  category: string;
  type: 'expense' | 'income';
  transaction_time: string;
}

function toLocalDateTimeInputValue(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function createTransactionEditForm(transaction: Transaction | null): TransactionFormState {
  if (!transaction) {
    return { amount: '', note: '', category: '', type: 'expense' as const, transaction_time: '' };
  }

  const dt = transaction.transaction_time || transaction.created_at;
  return {
    amount: String(transaction.amount),
    note: transaction.note || '',
    category: transaction.category || '',
    type: transaction.type,
    transaction_time: toLocalDateTimeInputValue(dt),
  };
}

function createDefaultTransactionForm(): TransactionFormState {
  return {
    amount: '',
    note: '',
    category: '',
    type: 'expense' as const,
    transaction_time: toLocalDateTimeInputValue(new Date().toISOString()),
  };
}

function BalanceHeader({ balance, income, expense }: { balance: number; income: number; expense: number }) {
  return (
    <Card className="mx-5 mb-5 bg-stone-50 border-stone-200/70 shadow-none">
      <CardContent className="py-8 px-6 text-center">
        <p className="text-[11px] font-medium text-stone-400 mb-1.5 tracking-[0.2em] uppercase">余额</p>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-800 mb-6">
          ¥{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h1>
        <div className="flex items-center justify-center gap-8">
          <div className="flex flex-col items-center">
            <span className="text-[11px] text-stone-400 tracking-wider mb-1">收入</span>
            <span className="text-sm font-medium text-stone-700">+¥{income.toLocaleString()}</span>
          </div>
          <Separator orientation="vertical" className="h-8 bg-stone-200" />
          <div className="flex flex-col items-center">
            <span className="text-[11px] text-stone-400 tracking-wider mb-1">支出</span>
            <span className="text-sm font-medium text-stone-700">-¥{expense.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FilterSummary({
  count,
  income,
  expense,
}: {
  count: number;
  income: number;
  expense: number;
}) {
  return (
    <Card className="mx-5 mb-4 border-stone-200/70 shadow-none bg-white/80">
      <CardContent className="px-4 py-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[11px] text-stone-400 tracking-wide">筛选结果</p>
            <p className="mt-1 text-base font-semibold text-stone-800">{count}</p>
          </div>
          <div>
            <p className="text-[11px] text-stone-400 tracking-wide">收入合计</p>
            <p className="mt-1 text-base font-semibold text-emerald-600">¥{income.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[11px] text-stone-400 tracking-wide">支出合计</p>
            <p className="mt-1 text-base font-semibold text-stone-700">¥{expense.toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TransactionItem({ t, onClick }: { t: Transaction; onClick?: () => void }) {
  const isIncome = t.type === 'income';
  const displayDate = new Date(t.transaction_time || t.created_at).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="flex items-center justify-between py-3 px-4 cursor-pointer hover:bg-stone-50 transition-colors active:bg-stone-100" onClick={onClick}>
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-sm text-stone-800">{t.note || 'Untitled'}</span>
        <span className="text-xs text-stone-400">
          {displayDate} {t.category ? `· ${t.category}` : ''}
        </span>
      </div>
      <span className={`font-medium text-sm ${isIncome ? 'text-emerald-600/80' : 'text-stone-700'}`}>
        {isIncome ? '+' : '-'}¥{Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  );
}

function TransactionDetail({
  transaction,
  open,
  onOpenChange,
  apiKey,
  onUpdated,
}: {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiKey: string | null;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [editForm, setEditForm] = useState(() => createTransactionEditForm(transaction));

  if (!transaction) return null;
  const isIncome = transaction.type === 'income';
  const dateStr = new Date(transaction.transaction_time || transaction.created_at).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const canEdit = Boolean(apiKey);

  const handleSave = async () => {
    if (!apiKey) return;
    setSaving(true);
    setActionError(null);
    try {
      const res = await fetch('/api/edit', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          id: transaction.id,
          amount: parseFloat(editForm.amount),
          note: editForm.note,
          category: editForm.category,
          type: editForm.type,
          transaction_time: editForm.transaction_time ? new Date(editForm.transaction_time).toISOString() : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onOpenChange(false);
        onUpdated();
      } else {
        setActionError(data.error || '保存失败');
      }
    } catch {
      setActionError('网络错误，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!apiKey) return;
    setDeleting(true);
    setActionError(null);
    try {
      const res = await fetch('/api/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ id: transaction.id }),
      });
      const data = await res.json();
      if (data.success) {
        setConfirmDeleteOpen(false);
        onOpenChange(false);
        onUpdated();
      } else {
        setActionError(data.error || '删除失败');
      }
    } catch {
      setActionError('网络错误，请重试');
    } finally {
      setDeleting(false);
    }
  };

  const inputClass = "w-full bg-stone-50 border border-stone-200/70 rounded-lg px-3 py-2 text-sm outline-none focus:border-stone-400 text-stone-700";

  return (
    <>
    {actionError && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-rose-50 border border-rose-200 text-rose-600 text-sm px-4 py-2 rounded-xl shadow-sm">{actionError}</div>}
    <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle className="text-center">确认删除</DialogTitle></DialogHeader>
        <p className="text-sm text-stone-500 text-center py-2">确定要删除这条记录吗？此操作不可撤销。</p>
        <div className="flex gap-2 pt-2">
          <button onClick={() => setConfirmDeleteOpen(false)} className="flex-1 py-2.5 text-sm rounded-xl font-medium border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors">取消</button>
          <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 text-sm rounded-xl font-medium bg-rose-500 text-white hover:bg-rose-600 transition-colors disabled:opacity-50">{deleting ? '删除中...' : '确认删除'}</button>
        </div>
      </DialogContent>
    </Dialog>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader className="flex flex-col items-center pt-2 pb-2">
          <DialogTitle className="text-center">
            {editing ? (
              <input
                type="number"
                step="0.01"
                value={editForm.amount}
                onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
                className="text-3xl font-semibold tracking-tight text-center w-full bg-transparent outline-none border-b border-stone-200 pb-1 text-stone-800"
              />
            ) : (
              <span className={`text-3xl font-semibold tracking-tight ${isIncome ? 'text-emerald-600' : 'text-stone-800'}`}>
                {isIncome ? '+' : '-'}¥{Number(transaction.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
          </DialogTitle>
          {editing ? (
            <div className="flex gap-1 bg-stone-100 rounded-lg p-0.5 mt-2">
              {(['expense', 'income'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setEditForm((f) => ({ ...f, type: t }))}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${editForm.type === t ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'}`}
                >
                  {t === 'income' ? '收入' : '支出'}
                </button>
              ))}
            </div>
          ) : (
            <span className={`mt-2 text-xs px-2.5 py-0.5 rounded-full font-medium ${isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-600'}`}>
              {isIncome ? '收入' : '支出'}
            </span>
          )}
        </DialogHeader>

        {editing ? (
          <div className="space-y-3 pt-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-stone-400">备注</label>
              <textarea
                value={editForm.note}
                onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))}
                rows={2}
                className={inputClass + " resize-none"}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-stone-400">分类</label>
              <input
                type="text"
                value={editForm.category}
                onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-stone-400">时间</label>
              <input
                type="datetime-local"
                value={editForm.transaction_time}
                onChange={(e) => setEditForm((f) => ({ ...f, transaction_time: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 py-2.5 text-sm rounded-xl font-medium border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 text-sm rounded-xl font-medium bg-stone-800 text-stone-50 hover:bg-stone-700 transition-colors disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <DetailRow label="备注" value={transaction.note || '无'} multiline />
            <Separator className="bg-stone-100" />
            <DetailRow label="分类" value={transaction.category || '未分类'} />
            <Separator className="bg-stone-100" />
            <DetailRow label="时间" value={dateStr} />
            {canEdit && (
              <div className="flex gap-2 pt-3">
                <button
                  onClick={() => setConfirmDeleteOpen(true)}
                  disabled={deleting}
                  className="flex-1 py-2.5 text-sm rounded-xl font-medium border border-rose-200 text-rose-500 hover:bg-rose-50 transition-colors disabled:opacity-50"
                >
                  {deleting ? '删除中...' : '删除'}
                </button>
                <button
                  onClick={() => setEditing(true)}
                  className="flex-1 py-2.5 text-sm rounded-xl font-medium bg-stone-800 text-stone-50 hover:bg-stone-700 transition-colors"
                >
                  编辑
                </button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}

function AddTransactionDialog({
  open,
  onOpenChange,
  apiKey,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiKey: string | null;
  onAdded: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(createDefaultTransactionForm);

  const inputClass = "w-full bg-stone-50 border border-stone-200/70 rounded-lg px-3 py-2 text-sm outline-none focus:border-stone-400 text-stone-700";

  const handleSubmit = async () => {
    if (!apiKey) {
      setError('请先在设置中填写 API Key');
      return;
    }

    if (!form.amount.trim()) {
      setError('请输入金额');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
          transaction_time: form.transaction_time ? new Date(form.transaction_time).toISOString() : undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || '新增失败');
        return;
      }
      onOpenChange(false);
      onAdded();
    } catch {
      setError('网络错误，请稍后再试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-center">新增记账记录</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="flex gap-1 bg-stone-100 rounded-lg p-1">
            {(['expense', 'income'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setForm((prev) => ({ ...prev, type }))}
                className={`flex-1 py-1.5 text-sm rounded-md font-medium transition-all ${
                  form.type === type ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'
                }`}
              >
                {type === 'income' ? '收入' : '支出'}
              </button>
            ))}
          </div>
          <div className="space-y-1">
            <label className="text-xs text-stone-400">金额</label>
            <input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              placeholder="例如 88.80"
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-stone-400">备注</label>
            <textarea
              rows={2}
              value={form.note}
              onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
              placeholder="这笔钱花在了哪里？"
              className={`${inputClass} resize-none`}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-stone-400">分类</label>
            <input
              type="text"
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              placeholder="如：餐饮 / 通勤 / 工资"
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-stone-400">时间</label>
            <input
              type="datetime-local"
              value={form.transaction_time}
              onChange={(e) => setForm((prev) => ({ ...prev, transaction_time: e.target.value }))}
              className={inputClass}
            />
          </div>
          {error && <p className="text-sm text-rose-500 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => onOpenChange(false)}
              className="flex-1 py-2.5 text-sm rounded-xl font-medium border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 py-2.5 text-sm rounded-xl font-medium bg-stone-800 text-stone-50 hover:bg-stone-700 transition-colors disabled:opacity-50"
            >
              {saving ? '保存中...' : '确认新增'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  if (multiline) {
    return (
      <div className="flex flex-col gap-1 text-sm">
        <span className="text-stone-400 text-xs">{label}</span>
        <span className="text-stone-700 font-medium whitespace-pre-wrap break-words leading-relaxed">
          {value}
        </span>
      </div>
    );
  }
  return (
    <div className="flex justify-between items-start gap-4 text-sm">
      <span className="text-stone-400 shrink-0">{label}</span>
      <span className="text-stone-700 font-medium text-right break-words min-w-0">{value}</span>
    </div>
  );
}

function SettingsDialog({
  open,
  onOpenChange,
  currentKey,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentKey: string | null;
  onSave: (key: string) => void;
}) {
  const [value, setValue] = useState(() => currentKey || '');

  const handleSave = () => {
    const trimmed = value.trim();
    onSave(trimmed);
    onOpenChange(false);
  };

  const handleClear = () => {
    setValue('');
    onSave('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-center">设置 API Key</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="flex flex-col gap-2">
            <label className="text-xs text-stone-400">API Key</label>
            <input
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="输入你的 API Key"
              className="w-full bg-stone-50 border border-stone-200/70 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-stone-400 text-stone-700 placeholder:text-stone-400"
            />
            <p className="text-xs text-stone-400 leading-relaxed">
              API Key 将保存在浏览器本地，仅在当前设备可用。
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleClear}
              className="flex-1 py-2.5 text-sm rounded-xl font-medium border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
            >
              清除
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 text-sm rounded-xl font-medium bg-stone-800 text-stone-50 hover:bg-stone-700 transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TransactionList({ transactions, loading, error, onSelect }: { transactions: Transaction[]; loading: boolean; error: string | null; onSelect: (t: Transaction) => void }) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="mx-5 mb-6 border-stone-200/70 shadow-none">
        <CardContent className="text-center py-8 text-rose-400 text-sm">{error}</CardContent>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card className="mx-5 mb-6 border-stone-200/70 shadow-none">
        <CardContent className="text-center py-8 text-stone-400 text-sm">
          没有匹配的记录，试试换个关键词或筛选条件。
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-5 mb-28 border-stone-200/70 shadow-none">
      <CardContent className="p-0">
        {transactions.map((t, index) => (
          <div key={t.id}>
            <TransactionItem t={t} onClick={() => onSelect(t)} />
            {index < transactions.length - 1 && <Separator className="bg-stone-100" />}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SearchAndFilterBar({
  searchTerm,
  onSearchChange,
  selectedType,
  onTypeChange,
  categories,
  selectedCategory,
  onCategoryChange,
  selectedDateRange,
  onDateRangeChange,
  resultCount,
  hasActiveFilters,
  onClearFilters,
}: {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedType: TransactionTypeFilter;
  onTypeChange: (value: TransactionTypeFilter) => void;
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  selectedDateRange: DateRangeFilter;
  onDateRangeChange: (value: DateRangeFilter) => void;
  resultCount: number;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}) {
  const categoryFilters = ['全部分类', ...categories];

  return (
    <div className="px-5 mb-5 space-y-3">
      <div className="flex items-center gap-3 bg-stone-50 rounded-xl border border-stone-200/70 px-4 py-2.5">
        <Search className="h-4 w-4 text-stone-400 shrink-0" />
        <input
          type="text"
          placeholder="搜索备注或分类"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400 text-stone-700"
        />
        {searchTerm && (
          <button onClick={() => onSearchChange('')} className="text-stone-400 hover:text-stone-600 text-xs shrink-0">✕</button>
        )}
      </div>

      <div className="flex gap-1 bg-stone-100 rounded-lg p-1">
        {([['all', '全部'], ['income', '收入'], ['expense', '支出']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => onTypeChange(key)}
            className={`flex-1 py-1.5 text-sm rounded-md font-medium transition-all ${
              selectedType === key
                ? 'bg-white text-stone-800 shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {categoryFilters.map((category) => {
            const value = category === '全部分类' ? '' : category;
            const isActive = selectedCategory === value;
            return (
              <button
                key={category}
                onClick={() => onCategoryChange(value)}
                className={`shrink-0 px-3 py-1 text-xs rounded-full border font-medium transition-all ${
                  isActive
                    ? 'bg-stone-800 text-stone-50 border-stone-800'
                    : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {([
          ['all', '全部时间'],
          ['7d', '近 7 天'],
          ['30d', '近 30 天'],
          ['month', '本月'],
        ] as const).map(([key, label]) => {
          const isActive = selectedDateRange === key;
          return (
            <button
              key={key}
              onClick={() => onDateRangeChange(key)}
              className={`shrink-0 px-3 py-1 text-xs rounded-full border font-medium transition-all ${
                isActive
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-stone-400">共 {resultCount} 条记录</span>
        {hasActiveFilters && (
          <button onClick={onClearFilters} className="text-xs text-stone-500 hover:text-stone-700 transition-colors">
            清除筛选
          </button>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [apiKey, setApiKey] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('api_key');
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<TransactionTypeFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRangeFilter>('all');

  const fetchTransactions = useCallback(async (key: string) => {
    if (!key) {
      setTransactions([]);
      setError('请先点击右上角设置，输入 API Key 后再查看账本数据');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/list', {
        headers: { Authorization: `Bearer ${key}` },
      });
      const data = await res.json();
      if (data.success) {
        setTransactions(data.data);
      } else {
        setError(data.error || '获取账本失败');
        if (res.status === 401) {
          localStorage.removeItem('api_key');
          setApiKey(null);
        }
      }
    } catch {
      setError('网络异常，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchTransactions(apiKey || '');
    }, 0);
    return () => window.clearTimeout(timer);
  }, [apiKey, fetchTransactions]);

  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const isWithinDateRange = useCallback((transaction: Transaction) => {
    if (selectedDateRange === 'all') return true;
    const current = new Date(transaction.transaction_time || transaction.created_at).getTime();
    const now = new Date();

    if (selectedDateRange === '7d') {
      return current >= now.getTime() - 7 * 24 * 60 * 60 * 1000;
    }

    if (selectedDateRange === '30d') {
      return current >= now.getTime() - 30 * 24 * 60 * 60 * 1000;
    }

    return new Date(current).getMonth() === now.getMonth() && new Date(current).getFullYear() === now.getFullYear();
  }, [selectedDateRange]);

  const filteredTransactions = useMemo(() => transactions
    .filter((t) => {
      const matchesType = selectedType === 'all' || t.type === selectedType;
      const matchesCategory = !selectedCategory || t.category === selectedCategory;
      const matchesSearch =
        !normalizedSearch ||
        t.note?.toLowerCase().includes(normalizedSearch) ||
        t.category?.toLowerCase().includes(normalizedSearch);
      return matchesType && matchesCategory && matchesSearch && isWithinDateRange(t);
    })
    .sort((a, b) => {
      const timeA = new Date(a.transaction_time || a.created_at).getTime();
      const timeB = new Date(b.transaction_time || b.created_at).getTime();
      return timeB - timeA;
    }), [transactions, selectedType, selectedCategory, normalizedSearch, isWithinDateRange]);

  const filteredCategories = Array.from(
    new Set(
      transactions
        .filter((t) => selectedType === 'all' || t.type === selectedType)
        .map((t) => t.category?.trim())
        .filter((category): category is string => Boolean(category))
    )
  );

  const filteredIncome = filteredTransactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
  const filteredExpense = filteredTransactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
  const hasActiveFilters = selectedType !== 'all' || selectedCategory !== '' || normalizedSearch !== '' || selectedDateRange !== 'all';

  return (
    <main className="max-w-xl mx-auto min-h-[100dvh] relative pb-6 antialiased bg-stone-100/60">
      <header className="px-6 pt-safe pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="pt-4 text-stone-500 hover:text-stone-700 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-medium tracking-tight pt-4 text-stone-700">🐟 鱼蛋小账本</h1>
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          className="pt-4 text-stone-500 hover:text-stone-700 transition-colors"
          aria-label="设置"
        >
          <Settings className="h-5 w-5" />
        </button>
      </header>

      <BalanceHeader balance={balance} income={totalIncome} expense={totalExpense} />

      <div className="px-5 mb-4 flex gap-3">
        <button
          onClick={() => setAddOpen(true)}
          className="flex-1 rounded-xl bg-stone-800 text-white px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 hover:bg-stone-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          新增记录
        </button>
        <button
          onClick={() => {
            setSearchTerm('');
            setSelectedType('all');
            setSelectedCategory('');
            setSelectedDateRange('all');
          }}
          className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-600 flex items-center justify-center gap-2 hover:bg-stone-50 transition-colors"
        >
          <FunnelX className="h-4 w-4" />
          重置
        </button>
      </div>

      <SearchAndFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedType={selectedType}
        onTypeChange={(type) => {
          setSelectedType(type);
          setSelectedCategory(''); // 切换类型时重置分类
        }}
        categories={filteredCategories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedDateRange={selectedDateRange}
        onDateRangeChange={setSelectedDateRange}
        resultCount={filteredTransactions.length}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => {
          setSearchTerm('');
          setSelectedType('all');
          setSelectedCategory('');
          setSelectedDateRange('all');
        }}
      />

      <FilterSummary count={filteredTransactions.length} income={filteredIncome} expense={filteredExpense} />

      <TransactionList
        transactions={filteredTransactions}
        loading={loading}
        error={error}
        onSelect={(t) => {
          setSelectedTransaction(t);
          setDialogOpen(true);
        }}
      />

      <TransactionDetail
        key={`${selectedTransaction?.id ?? 'empty'}-${dialogOpen ? 'open' : 'closed'}`}
        transaction={selectedTransaction}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        apiKey={apiKey}
        onUpdated={() => fetchTransactions(apiKey || '')}
      />

      <AddTransactionDialog
        key={addOpen ? 'add-open' : 'add-closed'}
        open={addOpen}
        onOpenChange={setAddOpen}
        apiKey={apiKey}
        onAdded={() => fetchTransactions(apiKey || '')}
      />

      <SettingsDialog
        key={`${settingsOpen ? 'settings-open' : 'settings-closed'}-${apiKey ?? ''}`}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        currentKey={apiKey}
        onSave={(key) => {
          if (key) {
            localStorage.setItem('api_key', key);
            setApiKey(key);
          } else {
            localStorage.removeItem('api_key');
            setApiKey(null);
          }
        }}
      />

      {!apiKey && !loading && (
        <Card className="mx-5 mt-4 border-dashed border-stone-300 shadow-none bg-white/70">
          <CardContent className="py-5 px-4 text-sm text-stone-500">
            <div className="flex items-start gap-3">
              <CalendarDays className="h-4 w-4 mt-0.5 text-stone-400" />
              <div>
                <p className="font-medium text-stone-700 mb-1">还没连接账本数据</p>
                <p>点右上角设置填写 API Key 后，就可以新增、编辑、删除以及筛选统计账本记录。</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
