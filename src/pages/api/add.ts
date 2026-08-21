import type { APIRoute } from 'astro';
import { getSupabaseAdminClient } from '../../../lib/supabase';
import { getErrorMessage, json, validateWriteAuth } from '../../lib/http';

export const POST: APIRoute = async ({ request }) => {
  if (!await validateWriteAuth(request)) {
    return json({ error: '请使用授权 GitHub 账号或有效 API Key' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { amount, category, note, type, transaction_time } = await request.json();

    if (amount === undefined || amount === null || !type) {
      return json({ error: '金额和收支类型不能为空' }, { status: 400 });
    }

    if (!['income', 'expense'].includes(type)) {
      return json({ error: '收支类型不合法' }, { status: 400 });
    }

    if (Number.isNaN(Number(amount))) {
      return json({ error: '金额格式不正确' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert([{ amount: Number(amount), category, note, type, transaction_time }])
      .select()
      .single();

    if (error) throw error;

    return json({ success: true, data });
  } catch (error: unknown) {
    return json({ error: getErrorMessage(error, '新增记录失败') }, { status: 500 });
  }
};
