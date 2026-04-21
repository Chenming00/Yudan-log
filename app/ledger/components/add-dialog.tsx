"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Transaction, TransactionFormState } from '../types';

const CATEGORIES = [
  { label: '喂养用品', value: 'feeding' },
  { label: '护理清洁', value: 'care' },
  { label: '辅食零食', value: 'food' },
  { label: '医疗健康', value: 'medical' },
  { label: '衣物穿戴', value: 'clothing' },
  { label: '大件用品', value: 'gear' },
  { label: '外出相关', value: 'outing' },
  { label: '其他', value: 'other' },
];

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
      // 将分类代码转换为中文标签
      const categoryLabel = CATEGORIES.find(c => c.value === form.category)?.label || form.category;
      const res = await fetch('/api/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          ...form,
          category: categoryLabel,
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
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {(['expense', 'income'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setForm((prev) => ({ ...prev, type }))}
                className={`flex-1 py-1.5 text-sm rounded-md font-medium transition-all ${
                  form.type === type 
                    ? type === 'income' 
                      ? 'bg-emerald-50 text-emerald-600 shadow-sm' 
                      : 'bg-rose-50 text-rose-500 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {type === 'income' ? '收入' : '支出'}
              </button>
            ))}
          </div>

          {/* 金额 */}
          <div className="space-y-1">
            <Label>金额</Label>
            <Input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              placeholder="例如 88.80"
            />
          </div>

          {/* 备注 */}
          <div className="space-y-1">
            <Label>备注</Label>
            <textarea
              rows={2}
              value={form.note}
              onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
              placeholder="这笔钱花在了哪里？"
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>

          {/* 分类 */}
          <div className="space-y-1">
            <Label>分类</Label>
            <Select value={form.category} onValueChange={(value) => setForm((prev) => ({ ...prev, category: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 时间 */}
          <div className="space-y-1">
            <Label>时间</Label>
            <Input
              type="datetime-local"
              value={form.transaction_time}
              onChange={(e) => setForm((prev) => ({ ...prev, transaction_time: e.target.value }))}
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* 按钮 */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={saving} className="flex-1">
              {saving ? '保存中...' : '确认新增'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}