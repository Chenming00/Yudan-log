"use client";

import { useState, type FormEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TransactionFields } from "./transaction-fields";
import { validateLedgerForm } from "@/lib/ledger";
import { Badge } from "@/components/ui/badge";
import { categoryLabel } from "@/lib/categories";
import { toLocalDatetimeInput } from "@/lib/utils";
import type { Transaction } from "../types";

interface TransactionDetailProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authToken: string | null;
  onUpdated: () => void;
}

function createEditForm(transaction: Transaction | null) {
  if (!transaction) {
    return { amount: "", brand: "", product: "", note: "", category: "", transaction_time: "" };
  }
  const dt = transaction.transaction_time;
  return {
    amount: String(transaction.amount),
    brand: transaction.brand || "",
    product: transaction.product || "",
    note: transaction.note || "",
    category: transaction.category ? categoryLabel(transaction.category) : "",
    transaction_time: dt ? toLocalDatetimeInput(new Date(dt)) : "",
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
  authToken,
  onUpdated,
}: TransactionDetailProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [editForm, setEditForm] = useState(() => createEditForm(transaction));

  if (!transaction) return null;

  const dateStr = transaction.transaction_time ? new Date(transaction.transaction_time).toLocaleString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }) : "未知（未填写购买时间）";

  const canEdit = Boolean(authToken);

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!authToken || saving) return;
    const validation = validateLedgerForm(editForm, Boolean(transaction.product));
    if (validation) { setActionError(validation); return; }
    setSaving(true);
    setActionError(null);
    try {
      const res = await fetch("/api/edit", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          id: transaction.id,
          amount: Number(editForm.amount),
          brand: editForm.brand,
          product: editForm.product,
          note: editForm.note,
          category: editForm.category,
          type: 'expense',
          transaction_time: editForm.transaction_time ? new Date(editForm.transaction_time).toISOString() : null,
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
    if (!authToken) return;
    setDeleting(true);
    setActionError(null);
    try {
      const res = await fetch("/api/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
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
      {actionError && !editing && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-destructive/10 border border-destructive text-destructive text-sm px-4 py-2 rounded-xl shadow-sm text-center">
          {actionError}
        </div>
      )}

      {/* 确认删除对话框 */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">确认删除</DialogTitle>
            <DialogDescription>删除后无法在账本中恢复这条记录。</DialogDescription>
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
      <Dialog open={open} onOpenChange={(next) => { if (!saving && !deleting) onOpenChange(next); }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader className="pt-4 pb-4">
            <DialogTitle className="text-center">
              {editing ? "编辑账单" : (
                <span className="text-2xl font-bold text-expense">
                  -¥{Number(transaction.amount).toFixed(2)}
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="text-center">品牌、商品与订单信息</DialogDescription>
            <Badge variant="secondary" className="mx-auto mt-3 w-fit bg-expense/10 text-expense">
              支出
            </Badge>
          </DialogHeader>

          {editing ? (
            <form onSubmit={handleSave} className="space-y-4 pt-2">
              <fieldset disabled={saving} className="min-w-0 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-amount">实付金额（元） *</Label>
                  <Input id="edit-amount" type="number" min="0.01" step="0.01" inputMode="decimal" required
                    value={editForm.amount} onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))} />
                </div>
                <TransactionFields form={editForm} onChange={setEditForm} requireProduct={Boolean(transaction.product)} />
              </fieldset>
              {actionError && <p role="alert" className="text-sm text-destructive">{actionError}</p>}
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="ghost" disabled={saving} onClick={() => { setEditForm(createEditForm(transaction)); setEditing(false); setActionError(null); }} className="flex-1">取消</Button>
                <Button type="submit" disabled={saving} className="flex-1">{saving ? "保存中..." : "保存账单"}</Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 pt-2">
              <DetailRow label="品牌" value={transaction.brand || "未填写"} />
              <DetailRow label="商品" value={transaction.product || "未填写"} multiline />
              <DetailRow label="分类" value={categoryLabel(transaction.category)} />
              <DetailRow label="时间" value={dateStr} />
              <DetailRow label="备注" value={transaction.note || "无"} multiline />
              {canEdit && (
                <div className="flex gap-2 pt-3">
                  <Button variant="ghost" onClick={() => setConfirmDeleteOpen(true)} disabled={deleting} className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10">
                    {deleting ? "删除中..." : "删除"}
                  </Button>
                  <Button onClick={() => { setEditForm(createEditForm(transaction)); setActionError(null); setEditing(true); }} className="flex-1">
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
