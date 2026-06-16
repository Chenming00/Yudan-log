import type { APIRoute } from 'astro';
import { getSupabaseClient } from '../../../lib/supabase';
import { shanghaiDayRange, timeRangeOrFilter } from '../../../lib/timezone';
import { getErrorMessage, json } from '../../lib/http';

export const GET: APIRoute = async ({ url }) => {
  try {
    const year = Number(url.searchParams.get('year'));
    const month = Number(url.searchParams.get('month'));
    const day = Number(url.searchParams.get('day'));

    if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
      return json({ error: '请提供有效的 year、month 和 day 参数' }, { status: 400 });
    }

    const range = shanghaiDayRange(year, month, day);

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'expense')
      .or(timeRangeOrFilter(range))
      .order('created_at', { ascending: false });

    if (error) throw error;

    return json({ success: true, data: data || [] });
  } catch (error: unknown) {
    return json({ error: getErrorMessage(error, '获取日明细失败') }, { status: 500 });
  }
};
