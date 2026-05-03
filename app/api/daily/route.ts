import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get('year'));
    const month = Number(searchParams.get('month'));
    const day = Number(searchParams.get('day'));

    if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
      return NextResponse.json({ error: '请提供有效的 year、month 和 day 参数' }, { status: 400 });
    }

    const dayStart = new Date(year, month - 1, day).toISOString();
    const dayEnd = new Date(year, month - 1, day + 1).toISOString();

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'expense')
      .or(`and(transaction_time.gte.${dayStart},transaction_time.lt.${dayEnd}),and(transaction_time.is.null,created_at.gte.${dayStart},created_at.lt.${dayEnd})`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '获取日明细失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
