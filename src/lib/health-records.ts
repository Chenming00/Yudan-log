export type HealthMutation = {
  request_id: string;
  kind: 'weight' | 'vaccine';
  key: string;
  action: 'save' | 'delete';
  expected_updated_at?: string | null;
  changes: { weight_kg?: number; administered_on?: string };
};

export function shanghaiToday(now = new Date()) {
  const values = Object.fromEntries(new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now).map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

/** Fractional horizontal positions on a calendar-time axis. */
export function healthDatePositions(dates: string[]) {
  const times = dates.map((date) => Date.parse(`${date}T00:00:00Z`));
  const first = Math.min(...times);
  const range = Math.max(...times) - first;
  return times.map((time) => range === 0 ? 0.5 : (time - first) / range);
}

export function validateHealthDate(value: unknown, field = '日期', now = new Date()): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${field} 必须是 YYYY-MM-DD 格式。`);
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error(`${field} 不是有效日期。`);
  if (value > shanghaiToday(now)) throw new Error(`${field} 不能晚于今天。`);
  return value;
}

export function validateHealthWeight(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0.1 || value > 200) throw new Error('体重必须是 0.1 到 200 之间的公斤数。');
  return value;
}

export function readExpectedVersion(body: Record<string, unknown>): string | null | undefined {
  if (!Object.hasOwn(body, 'expected_updated_at')) return undefined;
  const value = body.expected_updated_at;
  if (value === null) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error('expected_updated_at 必须是有效时间戳或 null。');
  return value;
}

export function validateHealthMutation(value: unknown): HealthMutation {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('请提供有效的记录操作。');
  const body = value as Record<string, unknown>;
  if (typeof body.request_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.request_id)) throw new Error('request_id 必须是 UUID。');
  if (body.kind !== 'weight' && body.kind !== 'vaccine') throw new Error('记录类型无效。');
  if (body.action !== 'save' && body.action !== 'delete') throw new Error('记录操作无效。');
  if (typeof body.key !== 'string' || !body.key.trim() || body.key.length > 120) throw new Error('记录标识无效。');
  if (body.kind === 'weight') validateHealthDate(body.key);
  const raw = body.changes && typeof body.changes === 'object' && !Array.isArray(body.changes) ? body.changes as Record<string, unknown> : {};
  const changes: HealthMutation['changes'] = {};
  if (body.action === 'save') {
    if (body.kind === 'weight') changes.weight_kg = validateHealthWeight(raw.weight_kg);
    else changes.administered_on = validateHealthDate(raw.administered_on, '接种日期');
  }
  return { request_id: body.request_id, kind: body.kind, key: body.key, action: body.action, expected_updated_at: readExpectedVersion(body), changes };
}

/** Keep every explicit operation in order: later operations depend on earlier receipts. */
export function enqueueHealthMutation(queue: HealthMutation[], mutation: HealthMutation) {
  return [...queue, mutation];
}

export function advanceHealthQueue(queue: HealthMutation[], completed: HealthMutation, updatedAt: string | null) {
  return queue.filter((item) => item.request_id !== completed.request_id).map((item) =>
    item.kind === completed.kind && item.key === completed.key && item.expected_updated_at === completed.expected_updated_at
      ? { ...item, expected_updated_at: updatedAt }
      : item
  );
}
