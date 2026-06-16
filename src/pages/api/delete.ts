import type { APIRoute } from 'astro';
import { getSupabaseClient } from '../../../lib/supabase';
import { getErrorMessage, json, validateAuth } from '../../lib/http';

export const DELETE: APIRoute = async ({ request }) => {
  if (!validateAuth(request)) {
    return json({ error: 'API Key 无效或未提供' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseClient();
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
