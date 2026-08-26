import type { SupabaseClient } from '@supabase/supabase-js';
import { isGitHubProvider, isOwnerEmail } from '../../lib/auth';
import { getSupabaseAdminClient } from '../../lib/supabase';
import { YUDAN_BIRTHDAY } from './yudan-profile';

export type YudanVaccineRecord = {
  id: string;
  planId: string;
  vaccine: string;
  dose: string;
  ageLabel: string;
  doneDate: string;
};

export type YudanVaccinePlan = {
  id: string;
  sort_order: number;
  age_months: number;
  age_label: string;
  vaccine: string;
  dose: string;
  funding: 'free' | 'paid';
  date_rule: 'flu-season' | null;
  date_offset_days: number;
  region: string;
  schedule_version: string;
  prevents: string;
  aliases: string[];
  audience: string | null;
  schedule_note: string | null;
  source: string;
};

export type VaccinePlanCandidate = YudanVaccinePlan & {
  suggested_date: string;
};

export class VaccineCatalogMatchError extends Error {
  status: number;
  candidates: VaccinePlanCandidate[];

  constructor(message: string, status: number, candidates: VaccinePlanCandidate[] = []) {
    super(message);
    this.name = 'VaccineCatalogMatchError';
    this.status = status;
    this.candidates = candidates;
  }
}

export type YudanWeightRecord = {
  id: string;
  date: string;
  weight: number;
};

export type YudanDashboardRow = {
  user_id: string;
  birthday: string;
  updated_at: string;
};

type YudanWeightDatabaseRow = {
  id: string;
  measured_on: string;
  weight_kg: number | string;
};

type YudanVaccineDatabaseRow = {
  id: string;
  plan_id: string;
  administered_on: string;
};

let ownerUserIdPromise: Promise<string> | null = null;

export async function getVaccineCatalog(supabase?: SupabaseClient) {
  const client = supabase || getSupabaseAdminClient();
  const { data, error } = await client
    .from('yudan_vaccine_catalog')
    .select('id, sort_order, age_months, age_label, vaccine, dose, funding, date_rule, date_offset_days, region, schedule_version, prevents, aliases, audience, schedule_note, source')
    .eq('active', true)
    .order('sort_order');

  if (error) throw error;
  return (data || []) as YudanVaccinePlan[];
}

function normalizeVaccineName(value: string) {
  return value
    .toLocaleLowerCase('zh-CN')
    .replace(/疫苗/g, '')
    .replace(/[\s（）()·+＋/\\_—-]/g, '');
}

function normalizeDose(value: string) {
  return value
    .toLocaleLowerCase('zh-CN')
    .replace(/[\s（）()]/g, '')
    .replace(/^第/, '')
    .replace(/剂$/, '');
}

function addMonthsToDate(dateString: string, months: number) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, day));
  if (date.getUTCDate() < day) date.setUTCDate(0);
  return date;
}

function formatDateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function suggestedDateForPlan(birthday: string, plan: YudanVaccinePlan) {
  const date = addMonthsToDate(birthday, plan.age_months);
  if (plan.date_rule === 'flu-season') {
    const month = date.getUTCMonth() + 1;
    if (month >= 4 && month <= 8) date.setUTCMonth(8, 15);
  }
  if (plan.date_offset_days) date.setUTCDate(date.getUTCDate() + plan.date_offset_days);
  return formatDateValue(date);
}

export async function resolveVaccinePlan({
  birthday,
  planId,
  vaccine,
  dose,
}: {
  birthday: string;
  planId?: string;
  vaccine?: string;
  dose?: string;
}) {
  const catalog = await getVaccineCatalog();
  const withDates = (items: YudanVaccinePlan[]): VaccinePlanCandidate[] =>
    items.map((item) => ({ ...item, suggested_date: suggestedDateForPlan(birthday, item) }));

  if (planId) {
    const exact = catalog.find((item) => item.id === planId);
    if (!exact) throw new VaccineCatalogMatchError(`未找到疫苗计划 ID：${planId}`, 404);
    return exact;
  }

  if (!vaccine) {
    throw new VaccineCatalogMatchError('请提供 plan_id，或提供 vaccine 进行自动匹配。', 400);
  }

  const vaccineQuery = normalizeVaccineName(vaccine);
  const doseQuery = dose ? normalizeDose(dose) : '';
  const exactMatches = catalog.filter((item) => {
    const names = [item.vaccine, ...(item.aliases || [])].map(normalizeVaccineName);
    const vaccineMatches = names.includes(vaccineQuery);
    const doseMatches = !doseQuery || normalizeDose(item.dose) === doseQuery;
    return vaccineMatches && doseMatches;
  });

  if (exactMatches.length === 1) return exactMatches[0];
  if (exactMatches.length > 1) {
    throw new VaccineCatalogMatchError(
      '该疫苗包含多个剂次，请从 candidates 中选择 plan_id 后重试。',
      409,
      withDates(exactMatches)
    );
  }

  const matches = catalog.filter((item) => {
    const names = [item.vaccine, ...(item.aliases || [])].map(normalizeVaccineName);
    const vaccineMatches = names.some(
      (candidate) => candidate.includes(vaccineQuery) || vaccineQuery.includes(candidate)
    );
    const doseMatches = !doseQuery || normalizeDose(item.dose) === doseQuery;
    return vaccineMatches && doseMatches;
  });

  if (matches.length === 1) return matches[0];
  if (!matches.length) {
    throw new VaccineCatalogMatchError('标准疫苗计划中没有找到匹配项目。请先读取目录并使用 plan_id。', 404);
  }

  throw new VaccineCatalogMatchError(
    '匹配到多个疫苗项目，请从 candidates 中选择 plan_id 后重试。',
    409,
    withDates(matches)
  );
}

async function findOwnerUserId(supabase: SupabaseClient) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;

    const owner = data.users.find(
      (user) =>
        isOwnerEmail(user.email) &&
        isGitHubProvider(user.app_metadata as Record<string, unknown>)
    );
    if (owner) return owner.id;
    if (data.users.length < 1000) break;
  }

  throw new Error('未找到已授权的 GitHub 所有者账号。');
}

async function getOwnerUserId(supabase: SupabaseClient) {
  if (!ownerUserIdPromise) {
    ownerUserIdPromise = findOwnerUserId(supabase).catch((error) => {
      ownerUserIdPromise = null;
      throw error;
    });
  }

  return ownerUserIdPromise;
}

export async function getOwnerDashboard() {
  const supabase = getSupabaseAdminClient();
  const userId = await getOwnerUserId(supabase);
  const { data, error } = await supabase
    .from('yudan_dashboards')
    .select('user_id, birthday, updated_at')
    .eq('user_id', userId)
    .maybeSingle<YudanDashboardRow>();

  if (error) throw error;
  if (!data) throw new Error('看板尚未初始化，请先在网页使用 GitHub 登录。');

  return { supabase, row: { ...data, birthday: YUDAN_BIRTHDAY } };
}

export async function getWeightRecords(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('yudan_weight_records')
    .select('id, measured_on, weight_kg')
    .eq('user_id', userId)
    .order('measured_on');

  if (error) throw error;
  return ((data || []) as YudanWeightDatabaseRow[]).map((record) => ({
    id: record.id,
    date: record.measured_on,
    weight: Number(record.weight_kg),
  } satisfies YudanWeightRecord));
}

export async function getVaccineRecords(supabase: SupabaseClient, userId: string) {
  const [recordsResult, catalog] = await Promise.all([
    supabase
      .from('yudan_vaccine_records')
      .select('id, plan_id, administered_on')
      .eq('user_id', userId)
      .order('administered_on'),
    getVaccineCatalog(supabase),
  ]);

  if (recordsResult.error) throw recordsResult.error;
  return ((recordsResult.data || []) as YudanVaccineDatabaseRow[])
    .map((record) => {
      const plan = catalog.find((item) => item.id === record.plan_id);
      if (!plan) return null;
      return {
        id: record.id,
        planId: record.plan_id,
        vaccine: plan.vaccine,
        dose: plan.dose,
        ageLabel: plan.age_label,
        doneDate: record.administered_on,
      } satisfies YudanVaccineRecord;
    })
    .filter((record): record is YudanVaccineRecord => Boolean(record));
}

export async function upsertWeightRecord(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  weight: number
) {
  const updatedAt = new Date().toISOString();
  const { data: existing, error: lookupError } = await supabase
    .from('yudan_weight_records')
    .select('id')
    .eq('user_id', userId)
    .eq('measured_on', date)
    .maybeSingle<{ id: string }>();
  if (lookupError) throw lookupError;

  const { data, error } = await supabase
    .from('yudan_weight_records')
    .upsert(
      { user_id: userId, measured_on: date, weight_kg: weight, updated_at: updatedAt },
      { onConflict: 'user_id,measured_on' }
    )
    .select('id, measured_on, weight_kg')
    .single<YudanWeightDatabaseRow>();

  if (error) throw error;
  const { error: dashboardError } = await supabase
    .from('yudan_dashboards')
    .update({ updated_at: updatedAt })
    .eq('user_id', userId);
  if (dashboardError) throw dashboardError;
  return {
    record: { id: data.id, date: data.measured_on, weight: Number(data.weight_kg) },
    created: !existing,
  };
}

export async function upsertVaccineRecord(
  supabase: SupabaseClient,
  userId: string,
  plan: YudanVaccinePlan,
  doneDate: string
) {
  const updatedAt = new Date().toISOString();
  const { data: existing, error: lookupError } = await supabase
    .from('yudan_vaccine_records')
    .select('id')
    .eq('user_id', userId)
    .eq('plan_id', plan.id)
    .maybeSingle<{ id: string }>();
  if (lookupError) throw lookupError;

  const { data, error } = await supabase
    .from('yudan_vaccine_records')
    .upsert(
      { user_id: userId, plan_id: plan.id, administered_on: doneDate, updated_at: updatedAt },
      { onConflict: 'user_id,plan_id' }
    )
    .select('id, plan_id, administered_on')
    .single<YudanVaccineDatabaseRow>();

  if (error) throw error;
  const { error: dashboardError } = await supabase
    .from('yudan_dashboards')
    .update({ updated_at: updatedAt })
    .eq('user_id', userId);
  if (dashboardError) throw dashboardError;
  return {
    record: {
      id: data.id,
      planId: data.plan_id,
      vaccine: plan.vaccine,
      dose: plan.dose,
      ageLabel: plan.age_label,
      doneDate: data.administered_on,
    } satisfies YudanVaccineRecord,
    plan,
    created: !existing,
  };
}

export function readDate(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${fieldName} 必须是 YYYY-MM-DD 格式。`);
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`${fieldName} 不是有效日期。`);
  }

  const todayParts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const todayValues = Object.fromEntries(todayParts.map((part) => [part.type, part.value]));
  const todayInShanghai = `${todayValues.year}-${todayValues.month}-${todayValues.day}`;
  if (value > todayInShanghai) {
    throw new Error(`${fieldName} 不能晚于今天。`);
  }

  return value;
}

export function readText(value: unknown, fieldName: string, maxLength: number) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} 不能为空。`);
  }

  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new Error(`${fieldName} 不能超过 ${maxLength} 个字符。`);
  }

  return normalized;
}
