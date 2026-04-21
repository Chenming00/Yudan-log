"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

  const inputClass =
    'w-full bg-stone-50 border border-stone-200/70 rounded-lg px-3 py-2 text-sm outline-none focus:border-stone-400 text-stone-700';

  return (
    <>
      {actionError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-rose-50 border border-rose-200 text-rose-600 text-sm px-4 py-2 rounded-xl shadow-sm">
          {actionError}
        </div>
      )}

      {/* 确认删除对话框 */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center">确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-stone-500 text-center py-2">
            确定要删除这条记录吗？此操作不可撤销。
          </p>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setConfirmDeleteOpen(false)}
              className="flex-1 py-2.5 text-sm rounded-xl font-medium border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 py-2.5 text-sm rounded-xl font-medium bg-rose-500 text-white hover:bg-rose-600 transition-colors disabled:opacity-50"
            >
              {deleting ? '删除中...' : '确认删除'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 交易详情对话框 */}
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
                <span
                  className={`text-3xl font-semibold tracking-tight ${
                    isIncome ? 'text-emerald-600' : 'text-stone-800'
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
              <div className="flex gap-1 bg-stone-100 rounded-lg p-0.5 mt-2">
                {(['expense', 'income'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setEditForm((f) => ({ ...f, type: t }))}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                      editForm.type === t ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'
                    }`}
                  >
                    {t === 'income' ? '收入' : '支出'}
                  </button>
                ))}
              </div>
            ) : (
              <span
                className={`mt-2 text-xs px-2.5 py-0.5 rounded-full font-medium ${
                  isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-600'
                }`}
              >
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
                  className={inputClass + ' resize-none'}
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