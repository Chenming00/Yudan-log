import type { APIRoute } from 'astro';
import { getSupabaseClient } from '../../../lib/supabase';
import { LedgerQueryError, readLedgerList } from '../../lib/ledger-query';
import { json } from '../../lib/http';

export const GET: APIRoute = async ({ url }) => {
  try {
    return json(await readLedgerList(getSupabaseClient(), url.searchParams, true));
  } catch (error: unknown) {
    return json({ error: error instanceof LedgerQueryError ? error.message : '获取日明细失败', code: error instanceof LedgerQueryError ? error.code : 'LEDGER_QUERY_FAILED' }, { status: error instanceof LedgerQueryError ? error.status : 500 });
  }
};
