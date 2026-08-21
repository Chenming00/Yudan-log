import type { APIRoute } from 'astro';
import { getSupabaseAdminClient } from '../../../lib/supabase';
import { getErrorMessage, json, validateWriteAuth } from '../../lib/http';

export const PATCH: APIRoute = async ({ request }) => {
  if (!await validateWriteAuth(request)) {
    return json({ error: '请使用授权 GitHub 账号或有效 API Key' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { id, amount, category, note, type, transaction_time } = await request.json();

    if (!id) {
      return json({ error: '缺少交易记录 ID' }, { status: 400 });
    }

    if (type && !['income', 'expense'].includes(type)) {
      return json({ error: '收支类型不合法' }, { status: 400 });
    }

    if (amount !== undefined && Number.isNaN(Number(amount))) {
      return json({ error: '金额格式不正确' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('transactions')
      .update({ amount: amount === undefined ? amount : Number(amount), category, note, type, transaction_time })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return json({ success: true, data });
  } catch (error: unknown) {
    return json({ error: getErrorMessage(error, '更新记录失败') }, { status: 500 });
  }
};
