"use client";

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { PencilLine, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TransactionFields } from './transaction-fields';
import { transactionTitle, validateLedgerForm } from '@/lib/ledger';
import { categoryLabel } from '@/lib/categories';
import { toShanghaiDatetimeInput, fromShanghaiDatetimeInput } from '@/lib/ledger-query-client';
import { LedgerMutationClient, validLedgerVersion } from '@/lib/ledger-mutation-client';
import type { Transaction } from '../types';

interface TransactionDetailProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authToken: string | null;
  onUpdated: () => void;
  onAuthorize: () => void;
}
function createEditForm(transaction: Transaction | null) {
  return {
    amount: transaction ? String(transaction.amount) : '', brand: transaction?.brand || '',
    product: transaction?.product || '', note: transaction?.note || '',
    category: transaction?.category ? categoryLabel(transaction.category) : '',
    transaction_time: transaction?.transaction_time ? toShanghaiDatetimeInput(transaction.transaction_time) : '',
  };
}
function TransactionDetails({ transaction, compact = false }: { transaction: Transaction; compact?: boolean }) {
  const income = transaction.type === 'income';
  const amount = Number(transaction.amount).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const when = transaction.transaction_time ? new Date(transaction.transaction_time).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Shanghai',
  }) : '未填写购买时间';

  return (
    <div className="min-w-0">
      <div className={compact ? 'mb-4' : 'mb-6 text-center'}>
        <p className="text-xs text-muted-foreground">{income ? '收入金额' : '支出金额'}</p>
        <p className={`${compact ? 'mt-1 text-2xl' : 'mt-1.5 text-[34px] sm:text-[38px]'} break-words font-semibold leading-tight tracking-tight tabular-nums ${income ? 'text-primary' : 'text-foreground'}`}>
          {income ? '+' : '−'}¥{amount}
        </p>
      </div>

      <div className="min-w-0 space-y-1.5">
        <p className="whitespace-pre-wrap text-base font-semibold leading-relaxed text-foreground [overflow-wrap:anywhere]">
          {transaction.product || '商品未填写'}
        </p>
        <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
          {transaction.brand ? <><span className="mr-2 text-muted-foreground/70">品牌</span>{transaction.brand}</> : '品牌未填写'}
        </p>
      </div>

      <dl className="mt-5 space-y-3 text-xs">
        <div className="flex items-start justify-between gap-5">
          <dt className="shrink-0 text-muted-foreground">分类</dt>
          <dd className="min-w-0 text-right font-medium text-foreground [overflow-wrap:anywhere]">{categoryLabel(transaction.category)}</dd>
        </div>
        <div className="flex items-start justify-between gap-5">
          <dt className="shrink-0 text-muted-foreground">时间</dt>
          <dd className="min-w-0 text-right leading-relaxed text-foreground [overflow-wrap:anywhere]">{when}</dd>
        </div>
      </dl>

      {transaction.note && (
        <div className="mt-4 rounded-xl bg-[#f2f4ee] px-3.5 py-3">
          <p className="mb-1 text-[11px] text-muted-foreground">备注</p>
          <p tabIndex={0} aria-label="备注内容" className="max-h-36 overflow-y-auto overscroll-contain whitespace-pre-wrap rounded-sm text-xs leading-6 text-foreground [overflow-wrap:anywhere] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{transaction.note}</p>
        </div>
      )}
    </div>
  );
}

export function TransactionDialog({ transaction, open, onOpenChange, authToken, onUpdated, onAuthorize }: TransactionDetailProps) {
  const [current, setCurrent] = useState(transaction);
  const [editing, setEditing] = useState(false);
  const [action, setAction] = useState<'edit' | 'delete' | null>(null);
  const [uncertain, setUncertain] = useState<'edit' | 'delete' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [editForm, setEditForm] = useState(() => createEditForm(transaction));
  const [conflict, setConflict] = useState<Transaction | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const client = useRef(new LedgerMutationClient<Transaction>());
  const submitting = useRef(false);
  const locked = action !== null || uncertain !== null;

  useEffect(() => {
    if (!locked) return;
    const preventExit = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', preventExit);
    return () => window.removeEventListener('beforeunload', preventExit);
  }, [locked]);

  if (!current) return null;
  const versionAvailable = validLedgerVersion(current.version);
  const writable = Boolean(authToken) && versionAvailable && !notFound;

  const mutate = async (operation: 'edit' | 'delete', target = current) => {
    if (submitting.current || !target) return;
    if (!authToken) { setNeedsAuth(true); setActionError('请先使用 GitHub 登录或填写 API Key'); return; }
    if (!validLedgerVersion(target.version)) { setActionError('这条账单缺少有效版本，请刷新账单后再操作'); return; }
    if (operation === 'edit') {
      const validation = validateLedgerForm(editForm, Boolean(target.product));
      if (validation) { setActionError(validation); return; }
    }
    const payload = operation === 'delete' ? { id: target.id, expected_version: target.version } : {
      id: target.id, expected_version: target.version, amount: Number(editForm.amount),
      brand: editForm.brand, product: editForm.product, note: editForm.note,
      category: editForm.category ? categoryLabel(editForm.category) : null, type: target.type,
      transaction_time: fromShanghaiDatetimeInput(editForm.transaction_time),
    };
    submitting.current = true;
    setAction(operation);
    setActionError(null);
    setConflict(null);
    setConfirmOverwrite(false);
    setCurrent(target);
    const result = await client.current.submit(operation, payload, authToken);
    submitting.current = false;
    setAction(null);
    if (result.kind === 'busy') return;
    if (result.kind !== 'success') {
      setUncertain(result.kind === 'uncertain' || result.kind === 'blocked' ? operation : null);
      setNeedsAuth(result.kind === 'uncertain' && (result.status === 401 || result.status === 403));
      setActionError(result.error);
      if (result.kind === 'rejected') {
        if (result.code === 'LEDGER_CONFLICT' && result.current?.id === current.id && validLedgerVersion(result.current.version)) {
          setConflict(result.current);
          setActionError('这条账单已在其他设备更新。你的输入已保留，请核对云端版本后选择下一步。');
        }
        if (result.code === 'LEDGER_NOT_FOUND') {
          setNotFound(true);
          setActionError('这条账单已被删除；当前输入仍保留在此处。请刷新账单查看最新记录。');
        }
      }
      return;
    }
    setUncertain(null);
    setNeedsAuth(false);
    // The request is committed. Refresh callbacks are deliberately outside mutation error handling.
    onOpenChange(false);
    onUpdated();
  };
  const handleSave = (event: FormEvent) => {
    event.preventDefault();
    if (!conflict) void mutate('edit');
  };
  const loadConflict = () => {
    if (!conflict) return;
    setCurrent(conflict);
    setEditForm(createEditForm(conflict));
    setConflict(null);
    setConfirmOverwrite(false);
    setActionError(null);
  };
  const refresh = () => { onOpenChange(false); onUpdated(); };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!locked && !submitting.current) onOpenChange(next); }}>
      <DialogContent
        onOpenAutoFocus={(event) => { event.preventDefault(); titleRef.current?.focus({ preventScroll: true }); }}
        className={`w-[calc(100%-2rem)] max-w-[448px] max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto rounded-3xl p-5 sm:p-6 ${locked ? '[&>button:last-child]:hidden' : ''}`}
      >
        <DialogHeader className="space-y-1">
          <DialogTitle ref={titleRef} tabIndex={-1} className="text-left text-sm font-medium text-muted-foreground focus:outline-none">{confirmDeleteOpen ? '确认删除' : editing ? '编辑账单' : '账单详情'}</DialogTitle>
          <DialogDescription className={confirmDeleteOpen ? 'text-left text-xs' : 'sr-only'}>{confirmDeleteOpen ? '请核对将要删除的账单，删除后无法恢复。' : '查看金额、商品和购买信息。'}</DialogDescription>
        </DialogHeader>

        {!versionAvailable && authToken && <div role="alert" className="space-y-2 text-sm text-destructive"><p>这条账单缺少有效版本，请刷新账单后再操作。</p><Button variant="outline" onClick={refresh}>刷新账单</Button></div>}

        {editing && !confirmDeleteOpen ? (
          <form onSubmit={handleSave} className="min-w-0 space-y-4">
            <fieldset disabled={locked} className="min-w-0 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-amount">实付金额（元） *</Label>
                <Input id="edit-amount" autoFocus type="number" min="0.01" step="0.01" inputMode="decimal" required value={editForm.amount} onChange={(e) => setEditForm((form) => ({ ...form, amount: e.target.value }))} />
              </div>
              <TransactionFields form={editForm} onChange={setEditForm} requireProduct={Boolean(current.product)} />
            </fieldset>
            {actionError && <p role="alert" className="text-sm text-destructive">{actionError}</p>}
            {(needsAuth || !authToken) && <Button type="button" variant="outline" onClick={onAuthorize}>更新写入权限</Button>}
            {notFound && <Button type="button" variant="outline" onClick={refresh}>刷新账单</Button>}
            {!conflict && <div className="flex gap-2 pt-2">
              <Button type="button" variant="ghost" disabled={locked} onClick={() => { setEditForm(createEditForm(current)); setEditing(false); setActionError(null); }} className="flex-1">取消</Button>
              <Button type="submit" disabled={Boolean(action) || !writable} className="flex-1">{action === 'edit' ? '保存中...' : uncertain === 'edit' ? '重试确认保存' : '保存账单'}</Button>
            </div>}
          </form>
        ) : (
          <div className="min-w-0 space-y-4">
            <TransactionDetails transaction={current} />
            {actionError && <p role="alert" className="text-sm text-destructive">{actionError}</p>}
            {(needsAuth || confirmDeleteOpen && !authToken) && <Button variant="outline" onClick={onAuthorize}>更新写入权限</Button>}
            {notFound && <Button variant="outline" onClick={refresh}>刷新账单</Button>}
            {confirmDeleteOpen ? <div className="flex gap-2 border-t border-border/70 pt-4">
              <Button variant="ghost" disabled={locked} onClick={() => { setConfirmDeleteOpen(false); setConflict(null); setActionError(null); }} className="flex-1">取消</Button>
              <Button variant="destructive" disabled={Boolean(action) || Boolean(conflict) || !writable} onClick={() => void mutate('delete')} className="flex-1">{action === 'delete' ? '删除中...' : uncertain === 'delete' ? '重试确认删除' : '确认删除'}</Button>
            </div> : authToken && <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-4">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteOpen(true)} disabled={!writable} className="h-10 px-2 text-muted-foreground hover:bg-destructive/5 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" />删除</Button>
              <Button onClick={() => { setEditForm(createEditForm(current)); setActionError(null); setEditing(true); }} disabled={!writable} className="h-10 min-w-28 px-5"><PencilLine className="h-3.5 w-3.5" aria-hidden="true" />编辑</Button>
            </div>}
          </div>
        )}

        {conflict && <section aria-label="云端最新账单" className="min-w-0 space-y-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
          <h3 className="text-sm font-semibold">云端最新版本（版本 {conflict.version}）</h3>
          <TransactionDetails transaction={conflict} compact />
          {confirmDeleteOpen ? <>
            <p className="text-sm text-muted-foreground">云端内容与原先不同。采用最新版本后，还需要再次确认删除。</p>
            <Button variant="destructive" className="w-full" onClick={loadConflict}>删除云端最新版本</Button>
          </> : <>
            <Button type="button" variant="outline" onClick={loadConflict} className="w-full">载入云端版本</Button>
            {confirmOverwrite ? <div className="space-y-2">
              <p className="text-sm [overflow-wrap:anywhere]">确认以你的输入覆盖「{transactionTitle(conflict)}」的云端最新版本？</p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setConfirmOverwrite(false)} className="flex-1">返回核对</Button>
                <Button type="button" onClick={() => void mutate('edit', conflict)} className="flex-1">确认覆盖</Button>
              </div>
            </div> : <Button type="button" onClick={() => setConfirmOverwrite(true)} className="w-full">使用我的输入覆盖云端</Button>}
          </>}
        </section>}
      </DialogContent>
    </Dialog>
  );
}
