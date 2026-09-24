import { categoryLabel } from '../../lib/categories';

export class LedgerInputError extends Error {
  constructor(message: string, public status = 400, public code = 'INVALID_INPUT') { super(message); }
}

export type LedgerMutationAction = 'add' | 'edit' | 'delete';
export const LEDGER_UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const MAX_AMOUNT = 999999999.99;

export function ledgerObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new LedgerInputError('请提供有效的 JSON 对象');
  return value as Record<string, unknown>;
}

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
  const input = ledgerObject(value);
  const fields: LedgerWrite = {};
  if (editing && (typeof input.id !== 'string' || !LEDGER_UUID.test(input.id))) throw new LedgerInputError('请提供有效的交易记录 ID');
  if (!editing || input.amount !== undefined) {
    if ((typeof input.amount !== 'number' && typeof input.amount !== 'string') || !String(input.amount).trim()) throw new LedgerInputError('请输入实付金额');
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0 || !/^\d+(?:\.\d{1,2})?$/.test(String(input.amount).trim())) throw new LedgerInputError('金额必须大于 0，且最多保留两位小数');
    if (amount > MAX_AMOUNT) throw new LedgerInputError('金额不得超过 999999999.99 元');
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
      const match = typeof time === 'string' ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,6})?)?(?:Z|[+-](\d{2}):(\d{2}))$/.exec(time) : null;
      if (!match || typeof time !== 'string' || !Number.isFinite(Date.parse(time))) throw new LedgerInputError('时间须为包含时区的 ISO 8601 格式或 null');
      const [year, month, day, hour, minute, second, offsetHour, offsetMinute] = match.slice(1).map((part) => Number(part || 0));
      if (year < 1000 || year > 9998 || month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate() || hour > 23 || minute > 59 || second > 59 || offsetHour > 23 || offsetMinute > 59) throw new LedgerInputError('交易日期或时间不合法');
      fields.transaction_time = new Date(time).toISOString();
    }
  }
  if (editing && Object.keys(fields).length === 0) throw new LedgerInputError('请提供要修改的字段');
  return { id: typeof input.id === 'string' ? input.id : undefined, fields };
}

export function parseLedgerMutation(value: unknown, action: LedgerMutationAction) {
  const input = ledgerObject(value);
  const allowed = new Set(action === 'delete'
    ? ['id', 'expected_version', 'request_id']
    : ['amount', 'type', 'brand', 'product', 'category', 'note', 'transaction_time', 'request_id', ...(action === 'edit' ? ['id', 'expected_version'] : [])]);
  if (Object.keys(input).some((key) => !allowed.has(key))) throw new LedgerInputError('请求包含不支持的字段');
  if (action === 'add') return { id: null, expectedVersion: null, fields: parseLedgerInput(input).fields };
  if (typeof input.id !== 'string' || !LEDGER_UUID.test(input.id)) throw new LedgerInputError('请提供有效的交易记录 ID');
  if (typeof input.expected_version !== 'number' || !Number.isInteger(input.expected_version) || input.expected_version < 1 || input.expected_version > 2147483647) throw new LedgerInputError('请先读取最新账单，并提供有效的 expected_version 正整数');
  return { id: input.id, expectedVersion: input.expected_version, fields: action === 'delete' ? {} : parseLedgerInput(input, true).fields };
}
