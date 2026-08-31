"use client";

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
            <Input
              ref={amountRef}
              type="number"
              step="0.01"
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              placeholder="0.00"
              className="h-14 w-full rounded-none border-x-0 border-t-0 bg-transparent pb-2 text-center text-3xl font-bold shadow-none focus-visible:border-expense focus-visible:ring-0"
            />
          </div>

          {/* 分类胶囊标签 */}
          <div className="flex flex-wrap gap-2 justify-center">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat.value}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setForm((prev) => ({ ...prev, category: prev.category === cat.value ? '' : cat.value }))}
                className={`rounded-full ${
                  form.category === cat.value
                    ? 'bg-expense/10 text-expense border border-expense/30'
                    : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80'
                }`}
              >
                {cat.emoji} {cat.label}
              </Button>
            ))}
          </div>

          {/* 可选字段展开/收起 */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowOptional(!showOptional)}
            className="mx-auto h-8 text-xs text-muted-foreground"
          >
            {showOptional ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showOptional ? '收起' : '更多选项'}
          </Button>

          {showOptional && (
            <div className="space-y-3">
              {/* 备注 */}
              <Textarea
                rows={2}
                value={form.note}
                onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="备注（可选）"
                className="min-h-[50px] resize-none bg-muted"
              />

              {/* 时间 */}
              <Input
                type="datetime-local"
                value={transactionTime}
                onChange={(e) => setTransactionTime(e.target.value)}
                className="bg-muted"
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
