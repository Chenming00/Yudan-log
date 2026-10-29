import type { SupabaseClient } from '@supabase/supabase-js';
import { isGitHubProvider, isOwnerEmail } from '../../lib/auth';
import { getSupabaseAdminClient } from '../../lib/supabase';
import { validateHealthDate, type HealthMutation } from './health-records';
import { YUDAN_BIRTHDAY } from './yudan-profile';

export type YudanVaccineRecord = {
  id: string;
  planId: string;
  vaccine: string;
  dose: string;
  ageLabel: string;
  doneDate: string;
  updated_at: string;
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
  updated_at: string;
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
  updated_at: string;
};

type YudanVaccineDatabaseRow = {
  id: string;
  plan_id: string;
  administered_on: string;
  updated_at: string;
};

let ownerUserIdPromise: Promise<string> | null = null;

type VaccineCatalogRow = YudanVaccinePlan & { active: boolean };

async function readVaccineCatalog(supabase: SupabaseClient, includeRetired: boolean) {
  let query = supabase
    .from('yudan_vaccine_catalog')
    .select('id, sort_order, age_months, age_label, vaccine, dose, funding, date_rule, date_offset_days, region, schedule_version, prevents, aliases, audience, schedule_note, source, active')
    .order('sort_order');
  if (!includeRetired) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as VaccineCatalogRow[];
}

function catalogPlan({ active: _active, ...plan }: VaccineCatalogRow): YudanVaccinePlan {
  return plan;
}

export async function getVaccineCatalog(supabase?: SupabaseClient, includeRetired = false) {
  return (await readVaccineCatalog(supabase || getSupabaseAdminClient(), includeRetired)).map(catalogPlan);
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
  const catalog = await getVaccineCatalog(undefined, Boolean(planId));
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

export async function getOwnerContext() {
  const supabase = getSupabaseAdminClient();
  const userId = await getOwnerUserId(supabase);
  return { supabase, userId, birthday: YUDAN_BIRTHDAY };
}

export async function getOwnerDashboard() {
  const { supabase, userId, birthday } = await getOwnerContext();
  const { data, error } = await supabase
    .from('yudan_dashboards')
    .select('user_id, birthday, updated_at')
    .eq('user_id', userId)
    .maybeSingle<YudanDashboardRow>();

  if (error) throw error;
  if (!data) return { supabase, row: { user_id: userId, birthday, updated_at: '' } };

  return { supabase, row: { ...data, birthday } };
}

async function readAllHealthRows(supabase: SupabaseClient, table: string, columns: string, userId: string, order: string) {
  const rows: unknown[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabase.from(table).select(columns).eq('user_id', userId).order(order).range(from, from + 499);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 500) return rows;
  }
}

export async function getWeightRecords(supabase: SupabaseClient, userId: string) {
  const rows = await readAllHealthRows(supabase, 'yudan_weight_records', 'id, measured_on, weight_kg, updated_at', userId, 'measured_on');
  return (rows as YudanWeightDatabaseRow[]).map((record) => ({ id: record.id, date: record.measured_on, weight: Number(record.weight_kg), updated_at: record.updated_at } satisfies YudanWeightRecord));
}

function vaccineRecords(rows: YudanVaccineDatabaseRow[], catalog: YudanVaccinePlan[]) {
  const plansById = new Map(catalog.map((plan) => [plan.id, plan]));
  return rows.map((record) => {
    const plan = plansById.get(record.plan_id);
    return { id: record.id, planId: record.plan_id, vaccine: plan?.vaccine || record.plan_id, dose: plan?.dose || '', ageLabel: plan?.age_label || '', doneDate: record.administered_on, updated_at: record.updated_at } satisfies YudanVaccineRecord;
  });
}

function readVaccineRecords(supabase: SupabaseClient, userId: string) {
  return readAllHealthRows(supabase, 'yudan_vaccine_records', 'id, plan_id, administered_on, updated_at', userId, 'plan_id') as Promise<YudanVaccineDatabaseRow[]>;
}

export async function getVaccineRecords(supabase: SupabaseClient, userId: string) {
  const [rows, catalog] = await Promise.all([
    readVaccineRecords(supabase, userId),
    getVaccineCatalog(supabase, true),
  ]);
  return vaccineRecords(rows, catalog);
}

/** One catalog read supplies active plans and the names of retired recorded plans. */
export async function getVaccineScheduleData(supabase: SupabaseClient, userId: string) {
  const [rows, catalog] = await Promise.all([
    readVaccineRecords(supabase, userId),
    readVaccineCatalog(supabase, true),
  ]);
  return {
    catalog: catalog.filter((plan) => plan.active).map(catalogPlan),
    records: vaccineRecords(rows, catalog),
  };
}

export class HealthConflictError extends Error {
  status = 409;
  constructor(public current: unknown) { super('记录已被其他设备修改。输入已保留，请重新读取后确认。'); }
}

export async function mutateHealthRecord(supabase: SupabaseClient, userId: string, mutation: HealthMutation) {
  const { data, error } = await supabase.rpc('mutate_yudan_health_record', {
    p_user_id: userId, p_kind: mutation.kind, p_key: mutation.key, p_action: mutation.action,
    p_changes: mutation.changes, p_check_version: mutation.expected_updated_at !== undefined,
    p_expected_updated_at: mutation.expected_updated_at ?? null, p_request_id: mutation.request_id,
  });
  if (error) throw new Error(error.message);
  if (data.conflict) throw new HealthConflictError(data.current);
  return data as { created: boolean; record: Record<string, unknown> | null };
}

export async function upsertWeightRecord(supabase: SupabaseClient, userId: string, date: string, weight: number, expectedUpdatedAt?: string | null) {
  const saved = await mutateHealthRecord(supabase, userId, {
    request_id: crypto.randomUUID(), kind: 'weight', key: date, action: 'save',
    expected_updated_at: expectedUpdatedAt, changes: { weight_kg: weight },
  });
  const row = saved.record as unknown as YudanWeightDatabaseRow;
  return { created: saved.created, record: { id: row.id, date: row.measured_on, weight: Number(row.weight_kg), updated_at: row.updated_at } };
}

export async function upsertVaccineRecord(supabase: SupabaseClient, userId: string, plan: YudanVaccinePlan, doneDate: string, expectedUpdatedAt?: string | null) {
  const saved = await mutateHealthRecord(supabase, userId, {
    request_id: crypto.randomUUID(), kind: 'vaccine', key: plan.id, action: 'save',
    expected_updated_at: expectedUpdatedAt, changes: { administered_on: doneDate },
  });
  const row = saved.record as unknown as YudanVaccineDatabaseRow;
  return { created: saved.created, plan, record: { id: row.id, planId: row.plan_id, vaccine: plan.vaccine, dose: plan.dose, ageLabel: plan.age_label, doneDate: row.administered_on, updated_at: row.updated_at } };
}

export function readDate(value: unknown, fieldName: string) {
  return validateHealthDate(value, fieldName);
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
