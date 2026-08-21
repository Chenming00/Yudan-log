"use client";

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { CATEGORIES } from '@/lib/categories';
import { toLocalDatetimeInput } from '@/lib/utils';
import type { TransactionFormState } from '../types';

interface AddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authToken: string | null;
  onAdded: () => void;
}

function createDefaultForm(): TransactionFormState {
  return {
    amount: '',
    note: '',
    category: typeof window !== 'undefined' ? (localStorage.getItem('last_category') || '') : '',
  };
}

export function AddDialog({ open, onOpenChange, authToken, onAdded }: AddDialogProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(createDefaultForm);
  const [showOptional, setShowOptional] = useState(false);
  const [transactionTime, setTransactionTime] = useState('');
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setForm(createDefaultForm());
      setError(null);
      setShowOptional(false);
      setTransactionTime(toLocalDatetimeInput(new Date()));
      // 自动聚焦金额输入
      setTimeout(() => amountRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!authToken) {
      setError('请先使用 GitHub 登录或填写 API Key');
      return;
    }

    if (!form.amount.trim()) {
      setError('请输入金额');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const categoryLabel = CATEGORIES.find(c => c.value === form.category)?.label || form.category;
      const res = await fetch('/api/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          amount: Number(form.amount),
          category: categoryLabel,
          note: form.note,
          type: 'expense',
          transaction_time: transactionTime ? new Date(transactionTime).toISOString() : undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || '新增失败');
        return;
      }
      // 记住上次分类
      if (form.category) {
        localStorage.setItem('last_category', form.category);
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
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center text-base">记一笔</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* 金额输入 — 大字体居中 */}
          <div className="relative">
            <span className="absolute left-1/2 -translate-x-full top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground pr-1">¥</span>
            <input
              ref={amountRef}
              type="number"
              step="0.01"
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              placeholder="0.00"
              className="w-full text-center text-3xl font-bold text-foreground bg-transparent border-b border-border pb-2 focus:outline-none focus:border-expense transition-colors placeholder:text-muted-foreground/40"
            />
          </div>

          {/* 分类胶囊标签 */}
          <div className="flex flex-wrap gap-2 justify-center">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, category: prev.category === cat.value ? '' : cat.value }))}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 ${
                  form.category === cat.value
                    ? 'bg-expense/10 text-expense border border-expense/30'
                    : 'bg-muted text-muted-foreground border border-transparent hover:bg-muted/80'
                }`}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>

          {/* 可选字段展开/收起 */}
          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
          >
            {showOptional ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showOptional ? '收起' : '更多选项'}
          </button>

          {showOptional && (
            <div className="space-y-3">
              {/* 备注 */}
              <textarea
                rows={2}
                value={form.note}
                onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="备注（可选）"
                className="flex min-h-[50px] w-full rounded-xl bg-muted px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />

              {/* 时间 */}
              <input
                type="datetime-local"
                value={transactionTime}
                onChange={(e) => setTransactionTime(e.target.value)}
                className="w-full rounded-xl bg-muted px-3 py-2 text-sm border border-border focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* 按钮 */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 bg-expense hover:bg-expense/90 text-expense-foreground"
            >
              {saving ? '保存中...' : '确认'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
