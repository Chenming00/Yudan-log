import { categoryLabel } from './categories';

export interface LedgerDescription {
  brand?: string | null;
  product?: string | null;
  note?: string | null;
  category?: string | null;
}

export function transactionTitle(transaction: LedgerDescription): string {
  return [transaction.brand, transaction.product].filter(Boolean).join(' · ')
    || transaction.note || categoryLabel(transaction.category);
}

export function matchesTransaction(transaction: LedgerDescription & { amount: number }, search: string): boolean {
  const keyword = search.trim().toLowerCase();
  return [transaction.brand, transaction.product, transaction.note, categoryLabel(transaction.category), String(transaction.amount)]
    .some((value) => value?.toLowerCase().includes(keyword));
}

// Preserve commas/newlines and prevent spreadsheet formula execution in exported text.
export function csvCell(value: string | number): string {
  const text = String(value);
  const safe = typeof value === 'string' && /^\s*[=+@-]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function validateLedgerForm(form: { amount: string; product: string; transaction_time: string }, requireProduct: boolean): string | null {
  if (!form.amount.trim() || !Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) return '请输入大于 0 的实付金额';
  if (!/^\d+(?:\.\d{1,2})?$/.test(form.amount.trim())) return '金额最多保留两位小数';
  if (requireProduct && !form.product.trim()) return '请输入商品名称';
  if (form.transaction_time && !Number.isFinite(new Date(form.transaction_time).getTime())) return '请选择有效的时间';
  return null;
}
