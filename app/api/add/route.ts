import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { validateAuth } from '@/lib/auth';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '新增记录失败';
}

export async function POST(req: NextRequest) {
  if (!validateAuth(req)) {
    return NextResponse.json({ error: 'API Key 无效或未提供' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseClient();
    const { amount, category, note, type, transaction_time } = await req.json();

    if (amount === undefined || amount === null || !type) {
      return NextResponse.json({ error: '金额和收支类型不能为空' }, { status: 400 });
    }

    if (!['income', 'expense'].includes(type)) {
      return NextResponse.json({ error: '收支类型不合法' }, { status: 400 });
    }

    if (Number.isNaN(Number(amount))) {
      return NextResponse.json({ error: '金额格式不正确' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert([{ amount: Number(amount), category, note, type, transaction_time }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
