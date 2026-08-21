import type { APIRoute } from 'astro';
import { getSupabaseAdminClient } from '../../../lib/supabase';
import { getErrorMessage, json, validateWriteAuth } from '../../lib/http';

export const DELETE: APIRoute = async ({ request }) => {
  if (!await validateWriteAuth(request)) {
    return json({ error: '请使用授权 GitHub 账号或有效 API Key' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { id } = await request.json();

    if (!id) {
      return json({ error: '缺少交易记录 ID' }, { status: 400 });
    }

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return json({ success: true });
  } catch (error: unknown) {
    return json({ error: getErrorMessage(error, '删除记录失败') }, { status: 500 });
  }
};
