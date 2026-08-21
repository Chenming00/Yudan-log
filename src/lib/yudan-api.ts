import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isGitHubProvider, isOwnerEmail } from '../../lib/auth';
import { getSupabaseAdminClient } from '../../lib/supabase';

export type YudanVaccineRecord = {
  id: string;
  vaccine: string;
  dose: string;
  ageLabel: string;
  doneDate: string;
};

export type YudanWeightRecord = {
  id: string;
  date: string;
  weight: number;
};

export type YudanDashboardRow = {
  user_id: string;
  birthday: string;
  vaccine_records: unknown;
  weight_records: unknown;
  updated_at: string;
};

let ownerUserIdPromise: Promise<string> | null = null;

function readVaccineRecords(value: unknown): YudanVaccineRecord[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is YudanVaccineRecord => {
    if (!item || typeof item !== 'object') return false;
    const record = item as Record<string, unknown>;
    return (
      typeof record.id === 'string' &&
      typeof record.vaccine === 'string' &&
      typeof record.dose === 'string' &&
      typeof record.ageLabel === 'string' &&
      typeof record.doneDate === 'string'
    );
  });
}

function readWeightRecords(value: unknown): YudanWeightRecord[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is YudanWeightRecord => {
    if (!item || typeof item !== 'object') return false;
    const record = item as Record<string, unknown>;
    return (
      typeof record.id === 'string' &&
      typeof record.date === 'string' &&
      typeof record.weight === 'number' &&
      Number.isFinite(record.weight)
    );
  });
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
    .select('user_id, birthday, vaccine_records, weight_records, updated_at')
    .eq('user_id', userId)
    .maybeSingle<YudanDashboardRow>();

  if (error) throw error;
  if (!data) throw new Error('看板尚未初始化，请先在网页使用 GitHub 登录。');

  return { supabase, row: data };
}

type DashboardChanges = Partial<
  Pick<YudanDashboardRow, 'vaccine_records' | 'weight_records'>
>;

export async function updateOwnerDashboard<T>(
  mutate: (row: YudanDashboardRow) => { changes: DashboardChanges; result: T }
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { supabase, row } = await getOwnerDashboard();
    const { changes, result } = mutate(row);
    const updatedAt = new Date(Date.now() + attempt).toISOString();
    const { data, error } = await supabase
      .from('yudan_dashboards')
      .update({ ...changes, updated_at: updatedAt })
      .eq('user_id', row.user_id)
      .eq('updated_at', row.updated_at)
      .select('updated_at')
      .maybeSingle();

    if (error) throw error;
    if (data) return result;
  }

  throw new Error('看板数据同时被修改，请重试。');
}

export function getVaccineRecords(row: YudanDashboardRow) {
  return readVaccineRecords(row.vaccine_records);
}

export function getWeightRecords(row: YudanDashboardRow) {
  return readWeightRecords(row.weight_records);
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

export function vaccineRecordId(vaccine: string, dose: string, ageLabel: string) {
  const digest = createHash('sha256')
    .update(`${vaccine}\u0000${dose}\u0000${ageLabel}`)
    .digest('hex')
    .slice(0, 16);
  return `vaccine-api-${digest}`;
}
