// 账本按「中国标准时间 Asia/Shanghai (UTC+8)」归属日/月。
// 上海自 1991 年起无夏令时，固定 +8 偏移，因此用常量偏移即可精确换算，
// 不依赖服务器本地时区（Vercel 为 UTC），避免跨零点记账被归错日/月。

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;

export interface DateRange {
  startISO: string;
  endISO: string;
}

/** 取某 UTC 瞬间对应的上海日历 年/月(1-12)/日 */
export function shanghaiParts(date: Date | string): { year: number; month: number; day: number } {
  const d = typeof date === 'string' ? new Date(date) : date;
  const shifted = new Date(d.getTime() + SHANGHAI_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

/** `YYYY-MM-DD`（上海日历） */
export function shanghaiDateKey(date: Date | string): string {
  const { year, month, day } = shanghaiParts(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** 上海某月 [start, end) 的 UTC ISO 边界。month 可越界（如 0 / 13），自动归一。 */
export function shanghaiMonthRange(year: number, month: number): DateRange {
  const start = new Date(Date.UTC(year, month - 1, 1) - SHANGHAI_OFFSET_MS);
  const end = new Date(Date.UTC(year, month, 1) - SHANGHAI_OFFSET_MS);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

/** 上海某日 [start, end) 的 UTC ISO 边界。 */
export function shanghaiDayRange(year: number, month: number, day: number): DateRange {
  const start = new Date(Date.UTC(year, month - 1, day) - SHANGHAI_OFFSET_MS);
  const end = new Date(Date.UTC(year, month - 1, day + 1) - SHANGHAI_OFFSET_MS);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

/** 上海某月的天数 */
export function daysInShanghaiMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * 构造「时间落在某 UTC 区间」的 Supabase `.or()` 过滤串：
 * transaction_time 在区间内；或 transaction_time 为空时用 created_at 兜底。
 */
export function timeRangeOrFilter(range: DateRange): string {
  return `and(transaction_time.gte.${range.startISO},transaction_time.lt.${range.endISO}),and(transaction_time.is.null,created_at.gte.${range.startISO},created_at.lt.${range.endISO})`;
}
