import type { APIRoute } from 'astro';
import { readExpectedVersion } from '../../../lib/health-records';
import { getErrorMessage, json, validateApiKey } from '../../../lib/http';
import {
  HealthConflictError,
  getOwnerContext,
  readDate,
  resolveVaccinePlan,
  upsertVaccineRecord,
  VaccineCatalogMatchError,
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
    const doneDate = readDate(body.actual_date, 'actual_date');
    const planId = typeof body.plan_id === 'string' ? body.plan_id.trim() : undefined;
    const vaccine = typeof body.vaccine === 'string' ? body.vaccine.trim() : undefined;
    const dose = typeof body.dose === 'number'
      ? String(body.dose)
      : typeof body.dose === 'string'
        ? body.dose.trim()
        : undefined;
    const { supabase, userId, birthday } = await getOwnerContext();
    const plan = await resolveVaccinePlan({ birthday, planId, vaccine, dose });
    const saved = await upsertVaccineRecord(supabase, userId, plan, doneDate, readExpectedVersion(body));

    return json({ success: true, data: saved });
  } catch (error: unknown) {
    if (error instanceof HealthConflictError) return json({ error: error.message, current: error.current }, { status: 409 });
    if (error instanceof VaccineCatalogMatchError) {
      return json(
        { error: error.message, candidates: error.candidates },
        { status: error.status }
      );
    }
    const message = getErrorMessage(error, '记录疫苗失败');
    const status = /expected_updated_at|plan_id|vaccine|dose|actual_date|日期|字符|为空/.test(message)
      ? 400
      : 500;
    return json({ error: message }, { status });
  }
};
