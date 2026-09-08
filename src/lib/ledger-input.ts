import { categoryLabel } from '../../lib/categories';

export class LedgerInputError extends Error {}

export interface LedgerWrite {
  amount?: number;
  type?: 'income' | 'expense';
  brand?: string | null;
  product?: string | null;
  category?: string | null;
  note?: string | null;
  transaction_time?: string | null;
}

export function parseLedgerInput(value: unknown, editing = false): { id?: string; fields: LedgerWrite } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new LedgerInputError('请提供有效的 JSON 对象');
  const input = value as Record<string, unknown>;
  const fields: LedgerWrite = {};
  if (editing && (typeof input.id !== 'string' || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(input.id))) throw new LedgerInputError('请提供有效的交易记录 ID');
  if (!editing || input.amount !== undefined) {
    if ((typeof input.amount !== 'number' && typeof input.amount !== 'string') || !String(input.amount).trim()) throw new LedgerInputError('请输入实付金额');
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0 || !/^\d+(?:\.\d{1,2})?$/.test(String(input.amount).trim())) throw new LedgerInputError('金额必须大于 0，且最多保留两位小数');
    fields.amount = amount;
  }
  if (!editing || input.type !== undefined) {
    if (input.type !== 'expense' && input.type !== 'income') throw new LedgerInputError('收支类型不合法');
    fields.type = input.type;
  }
  for (const key of ['brand', 'product', 'category', 'note'] as const) {
    if (input[key] === undefined) continue;
    if (input[key] !== null && typeof input[key] !== 'string') throw new LedgerInputError(`${key} 必须是文本或 null`);
    const text = typeof input[key] === 'string' ? input[key].trim() : null;
    const limit = key === 'note' ? 10000 : key === 'product' ? 2000 : 200;
    if (text && text.length > limit) throw new LedgerInputError(`${key} 内容过长`);
    fields[key] = key === 'category' && text ? categoryLabel(text) : text || null;
  }
  if (input.transaction_time !== undefined) {
    if (input.transaction_time === null || input.transaction_time === '') fields.transaction_time = null;
    else {
      const time = input.transaction_time;
      if (typeof time !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(time) || !Number.isFinite(Date.parse(time))) throw new LedgerInputError('时间须为包含时区的 ISO 8601 格式或 null');
      const [year, month, day] = time.slice(0, 10).split('-').map(Number);
      if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) throw new LedgerInputError('交易日期不合法');
      fields.transaction_time = new Date(time).toISOString();
    }
  }
  if (editing && Object.keys(fields).length === 0) throw new LedgerInputError('请提供要修改的字段');
  return { id: typeof input.id === 'string' ? input.id : undefined, fields };
}
