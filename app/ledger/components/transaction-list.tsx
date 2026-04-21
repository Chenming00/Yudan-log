"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { Transaction } from '../types';

interface TransactionListProps {
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

function TransactionItem({ t, onClick }: { t: Transaction; onClick: () => void }) {
  const isIncome = t.type === 'income';
  const displayDate = getTransactionDate(t).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className="flex items-center justify-between py-3 px-4 cursor-pointer hover:bg-stone-50 transition-colors active:bg-stone-100"
      onClick={onClick}
    >
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <span className="font-medium text-sm text-stone-800 truncate">
          {t.note || 'Untitled'}
        </span>
        <span className="text-xs text-stone-400 truncate">
          {displayDate} {t.category ? `· ${t.category}` : ''}
        </span>
      </div>
      <span
        className={`font-medium text-sm shrink-0 ${
          isIncome ? 'text-emerald-600/80' : 'text-stone-700'
        }`}
      >
        {isIncome ? '+' : '-'}
        ¥{Number(t.amount).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </span>
    </div>
  );
}

export function TransactionList({
  transactions,
  loading,
  error,
  onSelect,
}: TransactionListProps) {
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
          没有匹配的记录，试试换个关键词或筛选条件。
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

        return (
          <Card key={monthKey} className="border-stone-200/70 shadow-none">
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
                <div>
                  <h3 className="text-sm font-semibold text-stone-800">
                    {formatMonthLabel(monthKey)}
                  </h3>
                  <p className="mt-1 text-xs text-stone-400">
                    {monthTransactions.length} 条记录
                  </p>
                </div>
                <div className="text-right text-xs">
                  <p className="text-emerald-600">
                    +¥{income.toLocaleString()}
                  </p>
                  <p className="mt-1 text-stone-500">
                    -¥{expense.toLocaleString()}
                  </p>
                </div>
              </div>
              {monthTransactions.map((t, index) => (
                <div key={t.id}>
                  <TransactionItem t={t} onClick={() => onSelect(t)} />
                  {index < monthTransactions.length - 1 && (
                    <Separator className="bg-stone-100" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}