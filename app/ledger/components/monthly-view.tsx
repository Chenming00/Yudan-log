"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Transaction } from '../types';

interface MonthlyViewProps {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  onSelect: (t: Transaction) => void;
}

function getTransactionDate(transaction: Transaction) {
  return new Date(transaction.transaction_time || transaction.created_at);
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-');
  return `${year}年${Number(month)}月`;
}

export function MonthlyView({
  transactions,
  loading,
  error,
  onSelect,
}: MonthlyViewProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="mx-4 sm:mx-6 lg:mx-8 mb-6 max-w-4xl border-stone-200/70 shadow-none">
        <CardContent className="text-center py-8 text-rose-400 text-sm">
          {error}
        </CardContent>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card className="mx-4 sm:mx-6 lg:mx-8 mb-6 max-w-4xl border-stone-200/70 shadow-none">
        <CardContent className="text-center py-8 text-stone-400 text-sm">
          暂无任何记录。
        </CardContent>
      </Card>
    );
  }

  const groupedTransactions = transactions.reduce<Record<string, Transaction[]>>(
    (groups, transaction) => {
      const monthKey = getMonthKey(getTransactionDate(transaction));
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(transaction);
      return groups;
    },
    {}
  );

  const sortedMonthKeys = Object.keys(groupedTransactions).sort((a, b) =>
    b.localeCompare(a)
  );

  return (
    <div className="mx-4 sm:mx-6 lg:mx-8 mb-6 max-w-4xl space-y-4">
      {sortedMonthKeys.map((monthKey) => {
        const monthTransactions = groupedTransactions[monthKey];
        const income = monthTransactions
          .filter((transaction) => transaction.type === 'income')
          .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
        const expense = monthTransactions
          .filter((transaction) => transaction.type === 'expense')
          .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
        const balance = income - expense;

        return (
          <Card key={monthKey} className="border-stone-200/70 shadow-none">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-stone-800">
                    {formatMonthLabel(monthKey)}
                  </h3>
                  <p className="text-xs text-stone-400">
                    {monthTransactions.length} 条记录
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-stone-400">结余</p>
                  <p
                    className={`text-sm font-semibold ${
                      balance >= 0 ? 'text-emerald-600' : 'text-stone-700'
                    }`}
                  >
                    ¥
                    {balance.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-emerald-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-emerald-600">收入</p>
                  <p className="text-sm font-semibold text-emerald-700">
                    ¥{income.toLocaleString()}
                  </p>
                </div>
                <div className="bg-amber-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-amber-600">支出</p>
                  <p className="text-sm font-semibold text-amber-700">
                    ¥{expense.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                {monthTransactions.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-stone-50 cursor-pointer transition-colors"
                    onClick={() => onSelect(t)}
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm text-stone-700 truncate">
                        {t.note || '未命名'}
                      </span>
                      <span className="text-xs text-stone-400 truncate">
                        {t.category || '未分类'}
                      </span>
                    </div>
                    <span
                      className={`text-sm font-medium shrink-0 ${
                        t.type === 'income'
                          ? 'text-emerald-600'
                          : 'text-stone-700'
                      }`}
                    >
                      {t.type === 'income' ? '+' : '-'}
                      ¥{Number(t.amount).toLocaleString()}
                    </span>
                  </div>
                ))}
                {monthTransactions.length > 5 && (
                  <button
                    onClick={() => {}}
                    className="w-full text-center text-xs text-stone-400 py-2 hover:text-stone-600 transition-colors"
                  >
                    查看全部 {monthTransactions.length} 条记录
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}