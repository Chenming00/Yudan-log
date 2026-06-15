import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { shanghaiMonthRange, timeRangeOrFilter } from '@/lib/timezone';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '获取记录失败';
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor');
    const limit = Math.min(Number(searchParams.get('limit')) || 30, 100);
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const year = Number(searchParams.get('year'));
    const month = Number(searchParams.get('month'));

    const supabase = getSupabaseClient();
    let query = supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    // 可选：按上海时区的某个月过滤（历史「按月」视图用）
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

    const hasMore = data.length === limit;
    const nextCursor = hasMore ? data[data.length - 1].created_at : null;

    return NextResponse.json({ success: true, data, nextCursor, hasMore });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
