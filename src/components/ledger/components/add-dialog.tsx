"use client";

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { categoryLabel } from '@/lib/categories';
import { toShanghaiDatetimeInput, fromShanghaiDatetimeInput } from '@/lib/ledger-query-client';
import { validateLedgerForm } from '@/lib/ledger';
import { LedgerMutationClient, readLedgerStorage, writeLedgerStorage } from '@/lib/ledger-mutation-client';
import { TransactionFields } from './transaction-fields';
import type { Transaction, TransactionFormState } from '../types';

interface AddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authToken: string | null;
  onAdded: () => void;
  onAuthorize: () => void;
}
function createDefaultForm(): TransactionFormState {
  const lastCategory = readLedgerStorage('last_category');
  return {
    amount: '', brand: '', product: '', note: '',
    category: lastCategory ? categoryLabel(lastCategory) : '',
    transaction_time: toShanghaiDatetimeInput(new Date()),
  };
}

export function AddDialog({ open, onOpenChange, authToken, onAdded, onAuthorize }: AddDialogProps) {
  const [saving, setSaving] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(createDefaultForm);
  const client = useRef(new LedgerMutationClient<Transaction>());
  const submitting = useRef(false);
  const locked = saving || uncertain;

  useEffect(() => {
    if (!locked) return;
    const preventExit = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', preventExit);
    return () => window.removeEventListener('beforeunload', preventExit);
  }, [locked]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    if (!authToken) { setNeedsAuth(true); setError('请先使用 GitHub 登录或填写 API Key'); return; }
    const validation = validateLedgerForm(form, true);
    if (validation) { setError(validation); return; }
    submitting.current = true;
    setSaving(true);
    setError(null);
    const result = await client.current.submit('add', {
      ...form, amount: Number(form.amount), category: form.category ? categoryLabel(form.category) : null,
      type: 'expense', transaction_time: fromShanghaiDatetimeInput(form.transaction_time),
    }, authToken);
    submitting.current = false;
    setSaving(false);
    if (result.kind === 'busy') return;
    if (result.kind !== 'success') {
      setUncertain(result.kind === 'uncertain' || result.kind === 'blocked');
      setNeedsAuth(result.kind === 'uncertain' && (result.status === 401 || result.status === 403));
      setError(result.error);
      return;
    }
    setUncertain(false);
    setNeedsAuth(false);
    // Remembering a preference and refreshing the view cannot turn a committed write into a failure.
    writeLedgerStorage('last_category', form.category);
    setForm(createDefaultForm());
    onOpenChange(false);
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!locked && !submitting.current) onOpenChange(next); }}>
      <DialogContent className={`w-[calc(100%-2rem)] max-w-lg max-h-[90dvh] overflow-y-auto rounded-3xl ${locked ? '[&>button:last-child]:hidden' : ''}`}>
        <DialogHeader className="border-b border-border pb-5 text-left">
          <DialogTitle className="text-xl">记一笔</DialogTitle>
          <DialogDescription>记录商品和实付金额，方便以后查找。</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="min-w-0 space-y-5">
          <fieldset disabled={locked} className="min-w-0 space-y-5">
            <div className="space-y-2 rounded-2xl bg-[#edf0e9] p-4">
              <Label htmlFor="add-amount">实付金额（元） *</Label>
              <Input id="add-amount" autoFocus type="number" min="0.01" step="0.01" inputMode="decimal" required
                value={form.amount} onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00" className="h-14 border-0 bg-transparent px-0 text-3xl font-semibold text-primary shadow-none focus-visible:ring-0 sm:text-3xl" />
            </div>
            <TransactionFields form={form} onChange={setForm} />
          </fieldset>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {(needsAuth || !authToken) && <Button type="button" variant="outline" onClick={onAuthorize}>更新写入权限</Button>}
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={locked} onClick={() => onOpenChange(false)} className="flex-1">取消</Button>
            <Button type="submit" disabled={saving} className="h-11 flex-1">{saving ? '保存中...' : uncertain ? '重试确认保存' : '保存账单'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
