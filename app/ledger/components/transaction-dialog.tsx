"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { toLocalDatetimeInput } from "@/lib/utils";
import { Transaction } from "../types";

interface TransactionDetailProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiKey: string | null;
  onUpdated: () => void;
}

function createEditForm(transaction: Transaction | null) {
  if (!transaction) {
    return { amount: "", note: "", category: "", transaction_time: "" };
  }
  const dt = transaction.transaction_time || transaction.created_at;
  return {
    amount: String(transaction.amount),
    note: transaction.note || "",
    category: transaction.category || "",
    transaction_time: toLocalDatetimeInput(new Date(dt)),
  };
}

function DetailRow({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className={`text-foreground font-medium break-words min-w-0 ${multiline ? "whitespace-pre-wrap leading-relaxed" : ""}`}>
        {value}
      </span>
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
  const [editForm, setEditForm] = useState(() => createEditForm(transaction));

  if (!transaction) return null;

  const dateStr = new Date(transaction.transaction_time || transaction.created_at).toLocaleString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const canEdit = Boolean(apiKey);

  const handleSave = async () => {
    if (!apiKey) return;
    setSaving(true);
    setActionError(null);
    try {
      const res = await fetch("/api/edit", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          id: transaction.id,
          amount: parseFloat(editForm.amount),
          note: editForm.note,
          category: editForm.category,
          type: 'expense',
          transaction_time: editForm.transaction_time ? new Date(editForm.transaction_time).toISOString() : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onOpenChange(false);
        onUpdated();
      } else {
        setActionError(data.error || "保存失败");
      }
    } catch {
      setActionError("网络错误，请重试");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!apiKey) return;
    setDeleting(true);
    setActionError(null);
    try {
      const res = await fetch("/api/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ id: transaction.id }),
      });
      const data = await res.json();
      if (data.success) {
        setConfirmDeleteOpen(false);
        onOpenChange(false);
        onUpdated();
      } else {
        setActionError(data.error || "删除失败");
      }
    } catch {
      setActionError("网络错误，请重试");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {actionError && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-destructive/10 border border-destructive text-destructive text-sm px-4 py-2 rounded-xl shadow-sm text-center">
          {actionError}
        </div>
      )}

      {/* 确认删除对话框 */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-center">确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground text-center py-2">
            确定要删除这条记录吗？此操作不可撤销。
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="ghost" onClick={() => setConfirmDeleteOpen(false)} className="flex-1">
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="flex-1">
              {deleting ? "删除中..." : "确认删除"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 交易详情对话框 */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">Close</span>
          </button>

          <DialogHeader className="pt-4 pb-4">
            <DialogTitle className="text-center">
              {editing ? (
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
                  className="text-2xl font-bold tracking-tight text-center w-full bg-transparent border-b border-border pb-1 text-foreground rounded-none"
                />
              ) : (
                <span className="text-2xl font-bold text-expense">
                  -¥{Number(transaction.amount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              )}
            </DialogTitle>
            <span className="mt-3 text-xs px-3 py-1.5 rounded-full font-medium bg-expense/10 text-expense mx-auto w-fit">
              支出
            </span>
          </DialogHeader>

          {editing ? (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">备注</Label>
                <textarea
                  value={editForm.note}
                  onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))}
                  rows={2}
                  className="flex min-h-[60px] w-full rounded-xl bg-muted px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">分类</Label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() =>
                        setEditForm((f) => ({
                          ...f,
                          category: f.category === cat.label ? "" : cat.label,
                        }))
                      }
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 ${
                        editForm.category === cat.label
                          ? "bg-expense/10 text-expense border border-expense/30"
                          : "bg-muted text-muted-foreground border border-transparent hover:bg-muted/80"
                      }`}
                    >
                      {cat.emoji} {cat.label}
                    </button>
                  ))}
                </div>
                <Input
                  type="text"
                  value={editForm.category}
                  onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="自定义分类"
                  className="rounded-xl px-4 py-3"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">时间</Label>
                <Input
                  type="datetime-local"
                  value={editForm.transaction_time}
                  onChange={(e) => setEditForm((f) => ({ ...f, transaction_time: e.target.value }))}
                  className="rounded-xl px-4 py-3"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="ghost" onClick={() => setEditing(false)} className="flex-1">
                  取消
                </Button>
                <Button onClick={handleSave} disabled={saving} className="flex-1">
                  {saving ? "保存中..." : "保存"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <DetailRow label="备注" value={transaction.note || "无"} multiline />
              <DetailRow label="分类" value={transaction.category || "未分类"} />
              <DetailRow label="时间" value={dateStr} />
              {canEdit && (
                <div className="flex gap-2 pt-3">
                  <Button variant="ghost" onClick={() => setConfirmDeleteOpen(true)} disabled={deleting} className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10">
                    {deleting ? "删除中..." : "删除"}
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
