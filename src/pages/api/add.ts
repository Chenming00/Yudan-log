import type { APIRoute } from 'astro';
import { getSupabaseAdminClient } from '../../../lib/supabase';
import { getErrorMessage, json, validateWriteAuth } from '../../lib/http';
import { LedgerInputError, parseLedgerInput } from '../../lib/ledger-input';

export const POST: APIRoute = async ({ request }) => {
  if (!await validateWriteAuth(request)) {
    return json({ error: '请使用授权 GitHub 账号或有效 API Key' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { fields } = parseLedgerInput(await request.json());

    const { data, error } = await supabase
      .from('transactions')
      .insert([fields])
      .select()
      .single();

    if (error) throw error;

    return json({ success: true, data });
  } catch (error: unknown) {
    if (error instanceof LedgerInputError || error instanceof SyntaxError) return json({ error: error.message }, { status: 400 });
    return json({ error: getErrorMessage(error, '新增记录失败') }, { status: 500 });
  }
};
