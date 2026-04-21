import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { validateAuth } from '@/lib/auth';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '删除记录失败';
}

export async function DELETE(req: NextRequest) {
  if (!validateAuth(req)) {
    return NextResponse.json({ error: 'API Key 无效或未提供' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseClient();
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: '缺少交易记录 ID' }, { status: 400 });
    }

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
