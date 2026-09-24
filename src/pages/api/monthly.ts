import type { APIRoute } from 'astro';
import { getSupabaseClient } from '../../../lib/supabase';
import { assertLedgerRpc, LedgerQueryError, parseLedgerMonth } from '../../lib/ledger-query';
import { json } from '../../lib/http';

export const GET: APIRoute = async ({ url }) => {
  try {
    const { year, month } = parseLedgerMonth(url.searchParams)!;
    const { data, error } = await getSupabaseClient().rpc('ledger_monthly_summary', { p_year: year, p_month: month });
    assertLedgerRpc(error, 'ledger_monthly_summary');
    if (!data || !Array.isArray(data.dailyExpenses)) throw new LedgerQueryError('账本查询返回无效数据', 500, 'LEDGER_QUERY_FAILED');
    return json({ success: true, data });
  } catch (error: unknown) {
    return json({ error: error instanceof LedgerQueryError ? error.message : '获取月度数据失败', code: error instanceof LedgerQueryError ? error.code : 'LEDGER_QUERY_FAILED' }, { status: error instanceof LedgerQueryError ? error.status : 500 });
  }
};
