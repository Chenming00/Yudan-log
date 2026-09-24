import type { APIRoute } from 'astro';
import { readExpectedVersion } from '../../../lib/health-records';
import { getErrorMessage, json, validateApiKey } from '../../../lib/http';
import {
  HealthConflictError,
  getOwnerDashboard,
  readDate,
  upsertWeightRecord,
} from '../../../lib/yudan-api';

export const POST: APIRoute = async ({ request }) => {
  if (!validateApiKey(request)) {
    return json({ error: 'API Key 无效或未提供' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    const value = await request.json();
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    body = value as Record<string, unknown>;
  } catch {
    return json({ error: '请提供有效的 JSON 请求体' }, { status: 400 });
  }

  try {
    const date = readDate(body.date, 'date');
    const weight = Number(body.weight);
    if (!Number.isFinite(weight) || weight < 0.1 || weight > 200) {
      return json({ error: 'weight 必须是 0.1 到 200 之间的公斤数' }, { status: 400 });
    }

    const { supabase, row } = await getOwnerDashboard();
    const saved = await upsertWeightRecord(supabase, row.user_id, date, weight, readExpectedVersion(body));

    return json({ success: true, data: saved });
  } catch (error: unknown) {
    if (error instanceof HealthConflictError) return json({ error: error.message, current: error.current }, { status: 409 });
    const message = getErrorMessage(error, '记录体重失败');
    const status = /expected_updated_at|date|weight|日期/.test(message) ? 400 : 500;
    return json({ error: message }, { status });
  }
};
