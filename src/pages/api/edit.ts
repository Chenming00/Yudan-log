import type { APIRoute } from 'astro';
import { getSupabaseAdminClient } from '../../../lib/supabase';
import { getErrorMessage, json, validateWriteAuth } from '../../lib/http';
import { LedgerInputError, parseLedgerInput } from '../../lib/ledger-input';

export const PATCH: APIRoute = async ({ request }) => {
  if (!await validateWriteAuth(request)) {
    return json({ error: '请使用授权 GitHub 账号或有效 API Key' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { id, fields } = parseLedgerInput(await request.json(), true);

    const { data, error } = await supabase
      .from('transactions')
      .update(fields)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) return json({ error: '账单不存在' }, { status: 404 });

    return json({ success: true, data });
  } catch (error: unknown) {
    if (error instanceof LedgerInputError || error instanceof SyntaxError) return json({ error: error.message }, { status: 400 });
    return json({ error: getErrorMessage(error, '更新记录失败') }, { status: 500 });
  }
};
