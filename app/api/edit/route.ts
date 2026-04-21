import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateAuth } from '@/lib/auth';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '更新记录失败';
}

export async function PATCH(req: NextRequest) {
  if (!validateAuth(req)) {
    return NextResponse.json({ error: 'API Key 无效或未提供' }, { status: 401 });
  }

  try {
    const { id, amount, category, note, type, transaction_time } = await req.json();

    if (!id) {
      return NextResponse.json({ error: '缺少交易记录 ID' }, { status: 400 });
    }

    if (type && !['income', 'expense'].includes(type)) {
      return NextResponse.json({ error: '收支类型不合法' }, { status: 400 });
    }

    if (amount !== undefined && Number.isNaN(Number(amount))) {
      return NextResponse.json({ error: '金额格式不正确' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('transactions')
      .update({ amount: amount === undefined ? amount : Number(amount), category, note, type, transaction_time })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
