import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '获取月度数据失败';
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get('year'));
    const month = Number(searchParams.get('month'));

    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json({ error: '请提供有效的 year 和 month 参数' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // 当月起止时间
    const monthStart = new Date(year, month - 1, 1).toISOString();
    const monthEnd = new Date(year, month, 1).toISOString();

    // 上月起止时间
    const prevMonthStart = new Date(year, month - 2, 1).toISOString();
    const prevMonthEnd = new Date(year, month - 1, 1).toISOString();

    // 并行查询当月、上月、全部数据
    const [currentRes, prevRes, allTimeRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('*')
        .or(`and(transaction_time.gte.${monthStart},transaction_time.lt.${monthEnd}),and(transaction_time.is.null,created_at.gte.${monthStart},created_at.lt.${monthEnd})`)
        .order('created_at', { ascending: false }),
      supabase
        .from('transactions')
        .select('amount,type')
        .or(`and(transaction_time.gte.${prevMonthStart},transaction_time.lt.${prevMonthEnd}),and(transaction_time.is.null,created_at.gte.${prevMonthStart},created_at.lt.${prevMonthEnd})`),
      supabase
        .from('transactions')
        .select('amount,type')
    ]);

    if (currentRes.error) throw currentRes.error;
    if (prevRes.error) throw prevRes.error;
    if (allTimeRes.error) throw allTimeRes.error;

    const currentTx = currentRes.data || [];
    const prevTx = prevRes.data || [];

    // 聚合计算
    let totalExpense = 0;
    const dailyMap: Record<string, number> = {};
    const categoryMap: Record<string, { amount: number; count: number }> = {};
    const calendarMap: Record<number, number> = {};
    let lastExpenseTx: typeof currentTx[0] | null = null;

    for (const t of currentTx) {
      const amount = Number(t.amount);
      if (t.type === 'expense') {
        totalExpense += amount;
        if (!lastExpenseTx) lastExpenseTx = t;
        // 每日支出
        const d = new Date(t.transaction_time || t.created_at);
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        dailyMap[dateKey] = (dailyMap[dateKey] || 0) + amount;
        // 分类
        const cat = t.category || '未分类';
        if (!categoryMap[cat]) categoryMap[cat] = { amount: 0, count: 0 };
        categoryMap[cat].amount += amount;
        categoryMap[cat].count += 1;
        // 日历
        const day = d.getDate();
        calendarMap[day] = (calendarMap[day] || 0) + amount;
      }
    }

    // 最近一笔支出
    const lastTransaction = lastExpenseTx ? {
      amount: Number(lastExpenseTx.amount),
      category: lastExpenseTx.category || '未分类',
      note: lastExpenseTx.note || '',
      transaction_time: lastExpenseTx.transaction_time || lastExpenseTx.created_at,
    } : null;

    // 上月总支出
    const prevMonthExpense = prevTx
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // 全部总支出
    const allTimeExpense = (allTimeRes.data || [])
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // 构建每日支出数组（填满整月）
    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyExpenses = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      dailyExpenses.push({ date: dateKey, amount: dailyMap[dateKey] || 0 });
    }

    // 分类排行（按金额降序）
    const categoryBreakdown = Object.entries(categoryMap)
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.amount - a.amount);

    return NextResponse.json({
      success: true,
      data: {
        year,
        month,
        totalExpense,
        transactionCount: currentTx.length,
        dailyExpenses,
        categoryBreakdown,
        calendarData: calendarMap,
        prevMonthExpense,
        allTimeExpense,
        lastTransaction,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
