import type { SupabaseClient } from '@supabase/supabase-js';
import { categoryLabel } from '../../lib/categories';
import { daysInShanghaiMonth, shanghaiDayRange, shanghaiMonthRange } from '../../lib/timezone';

export class LedgerQueryError extends Error {
  constructor(message: string, public status = 400, public code = 'INVALID_QUERY') { super(message); }
}
export interface LedgerCursor { v: 2; time: string; id: string }
const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const ISO_TIME = /^(\d{4})-(\d{2})-(\d{2})T([0-2]\d):([0-5]\d):([0-5]\d)(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;

function validCursorTime(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const match = ISO_TIME.exec(value);
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  const [, y, m, d, hour] = match.map(Number);
  return y >= 1000 && y <= 9998 && m >= 1 && m <= 12 && d >= 1 && d <= daysInShanghaiMonth(y, m) && hour < 24;
}
export function encodeLedgerCursor(cursor: LedgerCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}
export function decodeLedgerCursor(value: string | null): LedgerCursor | null {
  if (value === null) return null;
  if (validCursorTime(value)) throw new LedgerQueryError('分页已更新，请从第一页重新加载', 400, 'CURSOR_EXPIRED');
  if (!value || value.length > 1024 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new LedgerQueryError('分页游标不合法');
  let parsed: { v?: number; time?: unknown; id?: unknown };
  try { parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')); }
  catch { throw new LedgerQueryError('分页游标不合法'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new LedgerQueryError('分页游标不合法');
  if (parsed.v === 1 && validCursorTime(parsed.time) && typeof parsed.id === 'string' && UUID.test(parsed.id)) {
    throw new LedgerQueryError('分页已更新，请从第一页重新加载', 400, 'CURSOR_EXPIRED');
  }
  if (parsed.v !== 2 || typeof parsed.time !== 'string' || !validCursorTime(parsed.time) || typeof parsed.id !== 'string' || !UUID.test(parsed.id)) throw new LedgerQueryError('分页游标不合法');
  // Preserve PostgreSQL microseconds: converting through Date would lose rows at page boundaries.
  return { v: 2, time: parsed.time, id: parsed.id };
}
function integerParam(value: string | null, name: string, min: number, max: number): number {
  if (value === null || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < min || Number(value) > max) {
    throw new LedgerQueryError(`${name} 必须是 ${min}–${max} 范围内的整数`);
  }
  return Number(value);
}
function singleParam(params: URLSearchParams, name: string): string | null {
  if (params.getAll(name).length > 1) throw new LedgerQueryError(`${name} 不可重复`);
  return params.get(name);
}
export function parseLedgerMonth(params: URLSearchParams, required = true): { year: number; month: number } | null {
  const year = singleParam(params, 'year');
  const month = singleParam(params, 'month');
  if (!required && year === null && month === null) return null;
  return { year: integerParam(year, 'year', 1000, 9998), month: integerParam(month, 'month', 1, 12) };
}
export function normalizeLedgerLimit(value: string | null): number {
  return value === null ? 30 : integerParam(value, 'limit', 1, 100);
}
export function parseLedgerListQuery(params: URLSearchParams, daily = false) {
  const month = parseLedgerMonth(params, daily);
  const day = daily && month ? integerParam(singleParam(params, 'day'), 'day', 1, daysInShanghaiMonth(month.year, month.month)) : null;
  const range = month ? day === null ? shanghaiMonthRange(month.year, month.month) : shanghaiDayRange(month.year, month.month, day) : null;
  const cursor = decodeLedgerCursor(singleParam(params, 'cursor'));
  const type = singleParam(params, 'type');
  if (type && !['all', 'expense', 'income'].includes(type)) throw new LedgerQueryError('收支类型不合法');
  const rawCategory = singleParam(params, 'category')?.trim();
  const search = singleParam(params, 'q')?.trim() || null;
  if ((rawCategory?.length || 0) > 200 || (search?.length || 0) > 200) throw new LedgerQueryError('查询条件不得超过 200 个字符');
  return {
    p_limit: normalizeLedgerLimit(singleParam(params, 'limit')),
    p_cursor_time: cursor?.time || null, p_cursor_id: cursor?.id || null,
    p_start: range?.startISO || null, p_end: range?.endISO || null,
    p_type: daily ? 'expense' : type && type !== 'all' ? type : null,
    p_category: rawCategory && rawCategory !== 'all' ? categoryLabel(rawCategory) : null,
    p_search: search, p_include_categories: !daily && !cursor,
  };
}
export function isMissingLedgerFunction(error: unknown, name: string): boolean {
  if (!error || typeof error !== 'object') return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  return (code === 'PGRST202' || code === '42883') && typeof message === 'string' && message.includes(name);
}
export function assertLedgerRpc(error: unknown, name: string): void {
  if (!error) return;
  const code = typeof error === 'object' && error !== null ? (error as { code?: string }).code : undefined;
  // Never log search terms, records, credentials, or database error details.
  console.error('ledger_query_failed', { function: name, code: code || 'UNKNOWN' });
  if (isMissingLedgerFunction(error, name)) throw new LedgerQueryError('账本数据库需要升级，请完成账本查询迁移后重试', 503, 'LEDGER_MIGRATION_REQUIRED');
  throw new LedgerQueryError('获取账本数据失败，请稍后重试', 500, 'LEDGER_QUERY_FAILED');
}
export async function readLedgerList(supabase: Pick<SupabaseClient, 'rpc'>, params: URLSearchParams, daily = false) {
  const query = parseLedgerListQuery(params, daily);
  const { data, error } = await supabase.rpc('ledger_list', query);
  assertLedgerRpc(error, 'ledger_list');
  if (!data || !Array.isArray(data.data)) throw new LedgerQueryError('账本查询返回无效数据', 500, 'LEDGER_QUERY_FAILED');
  const rows = data.data.slice(0, query.p_limit) as { id: string; transaction_time: string | null; created_at: string }[];
  const hasMore = data.data.length > query.p_limit;
  const last = rows.at(-1);
  const nextCursor = hasMore && last ? encodeLedgerCursor({ v: 2, time: last.transaction_time || last.created_at, id: last.id }) : null;
  return { success: true, data: rows, hasMore, nextCursor, version: 2, ...(Array.isArray(data.categories) ? { categories: data.categories as string[] } : {}) };
}
