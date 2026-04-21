"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Transaction } from '../types';

interface TransactionDetailProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiKey: string | null;
  onUpdated: () => void;
}

function createTransactionEditForm(transaction: Transaction | null) {
  if (!transaction) {
    return { amount: '', note: '', category: '', type: 'expense' as const, transaction_time: '' };
  }
  const dt = transaction.transaction_time || transaction.created_at;
  const date = new Date(dt);
  const localString = date.toLocaleString('sv-SE').replace(',', '');
  return {
    amount: String(transaction.amount),
    note: transaction.note || '',
    category: transaction.category || '',
    type: transaction.type,
    transaction_time: localString,
  };
}

function DetailRow({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  if (multiline) {
    return (
      <div className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground text-xs">{label}</span>
        <span className="text-foreground font-medium whitespace-pre-wrap break-words leading-relaxed">
          {value}
        </span>
      </div>
    );
  }
  return (
    <div className="flex justify-between items-start gap-4 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground font-medium text-right break-words min-w-0">{value}</span>
    </div>
  );
}

export function TransactionDialog({
  transaction,
  open,
  onOpenChange,
  apiKey,
  onUpdated,
}: TransactionDetailProps) {
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

  return (
    <>
      {actionError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-destructive/10 border border-destructive text-destructive text-sm px-4 py-2 rounded-xl shadow-sm">
          {actionError}
        </div>
      )}

      {/* 确认删除对话框 */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center">确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground text-center py-2">
            确定要删除这条记录吗？此操作不可撤销。
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)} className="flex-1">
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="flex-1">
              {deleting ? '删除中...' : '确认删除'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 交易详情对话框 */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader className="flex flex-col items-center pt-2 pb-2">
            <DialogTitle className="text-center">
              {editing ? (
              <Input
                type="number"
                step="0.01"
                value={editForm.amount}
                onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
                className="text-3xl font-semibold tracking-tight text-center w-full bg-transparent border-b border-border pb-1 text-foreground rounded-none"
              />
              ) : (
                <span
                  className={`text-3xl font-semibold tracking-tight ${
                    isIncome ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {isIncome ? '+' : '-'}
                  ¥
                  {Number(transaction.amount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              )}
            </DialogTitle>
            {editing ? (
              <div className="flex gap-1 bg-muted rounded-lg p-0.5 mt-2">
                {(['expense', 'income'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setEditForm((f) => ({ ...f, type: t }))}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                      editForm.type === t ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                    }`}
                  >
                    {t === 'income' ? '收入' : '支出'}
                  </button>
                ))}
              </div>
            ) : (
              <span
                className={`mt-2 text-xs px-2.5 py-0.5 rounded-full font-medium ${
                  isIncome ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'
                }`}
              >
                {isIncome ? '收入' : '支出'}
              </span>
            )}
          </DialogHeader>

          {editing ? (
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label>备注</Label>
                <textarea
                  value={editForm.note}
                  onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))}
                  rows={2}
                  className="flex min-h-[60px] w-full rounded-xl bg-muted px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
              </div>
              <div className="space-y-1">
                <Label>分类</Label>
                <Input
                  type="text"
                  value={editForm.category}
                  onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>时间</Label>
                <Input
                  type="datetime-local"
                  value={editForm.transaction_time}
                  onChange={(e) => setEditForm((f) => ({ ...f, transaction_time: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditing(false)} className="flex-1">
                  取消
                </Button>
                <Button onClick={handleSave} disabled={saving} className="flex-1">
                  {saving ? '保存中...' : '保存'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <DetailRow label="备注" value={transaction.note || '无'} multiline />
              <Separator />
              <DetailRow label="分类" value={transaction.category || '未分类'} />
              <Separator />
              <DetailRow label="时间" value={dateStr} />
              {canEdit && (
                <div className="flex gap-2 pt-3">
                  <Button variant="outline" onClick={() => setConfirmDeleteOpen(true)} disabled={deleting} className="flex-1 border-destructive text-destructive hover:bg-destructive/10">
                    {deleting ? '删除中...' : '删除'}
                  </Button>
                  <Button onClick={() => setEditing(true)} className="flex-1">
                    编辑
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}