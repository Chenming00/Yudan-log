import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  shanghaiMonthRange,
  shanghaiParts,
  shanghaiDateKey,
  daysInShanghaiMonth,
  timeRangeOrFilter,
} from '@/lib/timezone';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '获取月度数据失败';
}

// 总支出兜底：当 total_expense() RPC 不存在时，分页累加避免 Supabase 默认 1000 行截断。
async function sumAllExpenseFallback(supabase: SupabaseClient): Promise<number> {
  let sum = 0;
  let from = 0;
  const pageSize = 1000;
  for (;;) {
    const { data, error } = await supabase
      .from('transactions')
      .select('amount')
      .eq('type', 'expense')
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const r of data) sum += Number(r.amount);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return sum;
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

    // 按上海时区计算当月 / 上月边界
    const currentRange = shanghaiMonthRange(year, month);
    const prevRange = shanghaiMonthRange(year, month - 1);

    // 并行查询：当月明细、上月汇总、全部总支出(RPC)
    const [currentRes, prevRes, totalRpc] = await Promise.all([
      supabase
        .from('transactions')
        .select('*')
        .or(timeRangeOrFilter(currentRange))
        .order('created_at', { ascending: false }),
      supabase
        .from('transactions')
        .select('amount,type')
        .or(timeRangeOrFilter(prevRange)),
      supabase.rpc('total_expense'),
    ]);

    if (currentRes.error) throw currentRes.error;
    if (prevRes.error) throw prevRes.error;

    const currentTx = currentRes.data || [];
    const prevTx = prevRes.data || [];

    // 聚合计算（按上海时区分桶）
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
        const when = t.transaction_time || t.created_at;
        // 每日支出
        const dateKey = shanghaiDateKey(when);
        dailyMap[dateKey] = (dailyMap[dateKey] || 0) + amount;
        // 分类
        const cat = t.category || '未分类';
        if (!categoryMap[cat]) categoryMap[cat] = { amount: 0, count: 0 };
        categoryMap[cat].amount += amount;
        categoryMap[cat].count += 1;
        // 日历（上海日历的「日」）
        const day = shanghaiParts(when).day;
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

    // 全部总支出：优先 RPC，回退分页累加
    let allTimeExpense: number;
    if (!totalRpc.error && totalRpc.data != null) {
      allTimeExpense = Number(totalRpc.data);
    } else {
      console.warn('total_expense RPC 不可用，回退分页累加：', totalRpc.error?.message);
      allTimeExpense = await sumAllExpenseFallback(supabase);
    }

    // 构建每日支出数组（填满整月）
    const daysInMonth = daysInShanghaiMonth(year, month);
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
