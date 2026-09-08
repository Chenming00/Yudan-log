"use client";

import { useState, type FormEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { categoryLabel } from '@/lib/categories';
import { toLocalDatetimeInput } from '@/lib/utils';
import { validateLedgerForm } from '@/lib/ledger';
import { TransactionFields } from './transaction-fields';
import type { TransactionFormState } from '../types';

interface AddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authToken: string | null;
  onAdded: () => void;
}

function createDefaultForm(): TransactionFormState {
  const lastCategory = typeof window !== 'undefined' ? localStorage.getItem('last_category') : null;
  return {
    amount: '', brand: '', product: '', note: '',
    category: lastCategory ? categoryLabel(lastCategory) : '',
    transaction_time: toLocalDatetimeInput(new Date()),
  };
}

export function AddDialog({ open, onOpenChange, authToken, onAdded }: AddDialogProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(createDefaultForm);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (!authToken) { setError('请先使用 GitHub 登录或填写 API Key'); return; }
    const validation = validateLedgerForm(form, true);
    if (validation) { setError(validation); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ ...form, amount: Number(form.amount), category: form.category ? categoryLabel(form.category) : null,
          type: 'expense', transaction_time: form.transaction_time ? new Date(form.transaction_time).toISOString() : null }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setError(data.error || '新增失败'); return; }
      localStorage.setItem('last_category', form.category);
      onOpenChange(false);
      onAdded();
    } catch { setError('网络错误，请稍后再试'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next); }}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>记一笔</DialogTitle>
          <DialogDescription>记录商品和实付金额，方便以后查找。</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <fieldset disabled={saving} className="min-w-0 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="add-amount">实付金额（元） *</Label>
              <Input id="add-amount" autoFocus type="number" min="0.01" step="0.01" inputMode="decimal" required
                value={form.amount} onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00" className="h-14 text-3xl font-semibold text-expense" />
            </div>
            <TransactionFields form={form} onChange={setForm} />
          </fieldset>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)} className="flex-1">取消</Button>
            <Button type="submit" disabled={saving} className="flex-1 bg-expense text-expense-foreground hover:bg-expense/90">{saving ? '保存中...' : '保存账单'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
