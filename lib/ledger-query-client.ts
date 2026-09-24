export function toShanghaiDatetimeInput(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(date).replace(' ', 'T');
}

export function fromShanghaiDatetimeInput(value: string): string | null {
  return value ? new Date(`${value}:00+08:00`).toISOString() : null;
}

export function shanghaiMonthKey(value: Date | string = new Date()): string {
  return toShanghaiDatetimeInput(value).slice(0, 7);
}

export function shanghaiDateKey(value: Date | string = new Date()): string {
  return toShanghaiDatetimeInput(value).slice(0, 10);
}

export function formatLedgerRelativeDate(value: Date | string, now = new Date()): string {
  const day = shanghaiDateKey(value);
  const today = shanghaiDateKey(now);
  const elapsed = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) / 86400000);
  if (elapsed === 0) return '今天';
  if (elapsed === 1) return '昨天';
  if (elapsed > 1 && elapsed < 7) return `${elapsed}天前`;
  return `${Number(day.slice(0, 4))}年${Number(day.slice(5, 7))}月${Number(day.slice(8, 10))}日`;
}

export interface LedgerListQuery {
  year?: number;
  month?: number;
  search: string;
  category: string;
  type: '' | 'expense' | 'income';
}

// One query contract for visible rows, subsequent pages, and the complete CSV export.
export function buildLedgerListUrl(query: LedgerListQuery, limit = 30, cursor?: string | null): string {
  const params = new URLSearchParams({ limit: String(limit) });
  if (query.year && query.month) {
    params.set('year', String(query.year));
    params.set('month', String(query.month));
  }
  if (query.search.trim()) params.set('q', query.search.trim());
  if (query.category) params.set('category', query.category);
  if (query.type) params.set('type', query.type);
  if (cursor) params.set('cursor', cursor);
  return `/api/list?${params}`;
}

export function visibleLedgerDays<T extends { date: string }>(dailyExpenses: T[], range: 7 | 'month', now = new Date()): T[] {
  if (!dailyExpenses.length) return [];
  const today = toShanghaiDatetimeInput(now).slice(0, 10);
  const selectedMonth = dailyExpenses[0].date.slice(0, 7);
  const elapsed = selectedMonth === today.slice(0, 7)
    ? dailyExpenses.filter((row) => row.date <= today)
    : dailyExpenses;
  return range === 7 ? elapsed.slice(-7) : dailyExpenses;
}
