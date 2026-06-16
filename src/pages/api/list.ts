import type { APIRoute } from 'astro';
import { getSupabaseClient } from '../../../lib/supabase';
import { shanghaiMonthRange, timeRangeOrFilter } from '../../../lib/timezone';
import { getErrorMessage, json } from '../../lib/http';

export const GET: APIRoute = async ({ url }) => {
  try {
    const cursor = url.searchParams.get('cursor');
    const limit = Math.min(Number(url.searchParams.get('limit')) || 30, 100);
    const type = url.searchParams.get('type');
    const category = url.searchParams.get('category');
    const year = Number(url.searchParams.get('year'));
    const month = Number(url.searchParams.get('month'));

    const supabase = getSupabaseClient();
    let query = supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (year && month && month >= 1 && month <= 12) {
      query = query.or(timeRangeOrFilter(shanghaiMonthRange(year, month)));
    }

    if (cursor) {
      query = query.lt('created_at', cursor);
    }
    if (type === 'expense' || type === 'income') {
      query = query.eq('type', type);
    }
    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = data || [];
    const hasMore = rows.length === limit;
    const nextCursor = hasMore ? rows[rows.length - 1].created_at : null;

    return json({ success: true, data: rows, nextCursor, hasMore });
  } catch (error: unknown) {
    return json({ error: getErrorMessage(error, '获取记录失败') }, { status: 500 });
  }
};
