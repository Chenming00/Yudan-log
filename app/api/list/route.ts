import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateAuth } from '@/lib/auth';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '获取记录失败';
}

export async function GET(req: NextRequest) {
  if (!validateAuth(req)) {
    return NextResponse.json({ error: 'API Key 无效或未提供' }, { status: 401 });
  }

  try {
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
