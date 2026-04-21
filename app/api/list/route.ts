import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '获取记录失败';
}

export async function GET(_req: NextRequest) {

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
