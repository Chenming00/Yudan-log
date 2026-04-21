"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Transaction, TransactionFormState } from '../types';

interface AddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiKey: string | null;
  onAdded: () => void;
}

function createDefaultTransactionForm(): TransactionFormState {
  const now = new Date();
  const localString = now.toLocaleString('sv-SE').replace(',', '');
  return {
    amount: '',
    note: '',
    category: '',
    type: 'expense' as const,
    transaction_time: localString,
  };
}

export function AddDialog({ open, onOpenChange, apiKey, onAdded }: AddDialogProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(createDefaultTransactionForm);

  const inputClass =
    'w-full bg-stone-50 border border-stone-200/70 rounded-lg px-3 py-2 text-sm outline-none focus:border-stone-400 text-stone-700';

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
          {/* 类型切换 */}
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

          {/* 金额 */}
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

          {/* 备注 */}
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

          {/* 分类 */}
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

          {/* 时间 */}
          <div className="space-y-1">
            <label className="text-xs text-stone-400">时间</label>
            <input
              type="datetime-local"
              value={form.transaction_time}
              onChange={(e) => setForm((prev) => ({ ...prev, transaction_time: e.target.value }))}
              className={inputClass}
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <p className="text-sm text-rose-500 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* 按钮 */}
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