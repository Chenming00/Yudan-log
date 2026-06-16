import type { APIRoute } from 'astro';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../../lib/supabase';
import {
  daysInShanghaiMonth,
  shanghaiDateKey,
  shanghaiMonthRange,
  shanghaiParts,
  timeRangeOrFilter,
} from '../../../lib/timezone';
import { getErrorMessage, json } from '../../lib/http';

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
    for (const row of data) sum += Number(row.amount);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return sum;
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const year = Number(url.searchParams.get('year'));
    const month = Number(url.searchParams.get('month'));

    if (!year || !month || month < 1 || month > 12) {
      return json({ error: '请提供有效的 year 和 month 参数' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const currentRange = shanghaiMonthRange(year, month);
    const prevRange = shanghaiMonthRange(year, month - 1);

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

    let totalExpense = 0;
    const dailyMap: Record<string, number> = {};
    const categoryMap: Record<string, { amount: number; count: number }> = {};
    const calendarMap: Record<number, number> = {};
    let lastExpenseTx: typeof currentTx[0] | null = null;

    for (const transaction of currentTx) {
      const amount = Number(transaction.amount);
      if (transaction.type === 'expense') {
        totalExpense += amount;
        if (!lastExpenseTx) lastExpenseTx = transaction;

        const when = transaction.transaction_time || transaction.created_at;
        const dateKey = shanghaiDateKey(when);
        dailyMap[dateKey] = (dailyMap[dateKey] || 0) + amount;

        const category = transaction.category || '未分类';
        if (!categoryMap[category]) categoryMap[category] = { amount: 0, count: 0 };
        categoryMap[category].amount += amount;
        categoryMap[category].count += 1;

        const day = shanghaiParts(when).day;
        calendarMap[day] = (calendarMap[day] || 0) + amount;
      }
    }

    const lastTransaction = lastExpenseTx ? {
      amount: Number(lastExpenseTx.amount),
      category: lastExpenseTx.category || '未分类',
      note: lastExpenseTx.note || '',
      transaction_time: lastExpenseTx.transaction_time || lastExpenseTx.created_at,
    } : null;

    const prevMonthExpense = prevTx
      .filter((transaction) => transaction.type === 'expense')
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    let allTimeExpense: number;
    if (!totalRpc.error && totalRpc.data != null) {
      allTimeExpense = Number(totalRpc.data);
    } else {
      console.warn('total_expense RPC 不可用，回退分页累加：', totalRpc.error?.message);
      allTimeExpense = await sumAllExpenseFallback(supabase);
    }

    const daysInMonth = daysInShanghaiMonth(year, month);
    const dailyExpenses = [];
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      dailyExpenses.push({ date: dateKey, amount: dailyMap[dateKey] || 0 });
    }

    const categoryBreakdown = Object.entries(categoryMap)
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.amount - a.amount);

    return json({
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
    return json({ error: getErrorMessage(error, '获取月度数据失败') }, { status: 500 });
  }
};
