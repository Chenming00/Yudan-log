"use client";

import { Card, CardContent } from "@/components/ui/card";

interface SummaryCardsProps {
  currentMonth: {
    expense: number;
    days: number;
  };
  maxSingleDay: {
    date: string;
    amount: number;
  } | null;
}

export function SummaryCards({ currentMonth, maxSingleDay }: SummaryCardsProps) {
  const dailyAverage = currentMonth.days > 0 
    ? currentMonth.expense / currentMonth.days 
    : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* 本月养娃成本 */}
      <Card className="rounded-2xl bg-white shadow-sm border-0">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 tracking-wide">
              本月养娃成本
            </span>
          </div>
          <div className="text-2xl font-semibold text-gray-900">
            ¥{currentMonth.expense.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            本月已过了 {currentMonth.days} 天
          </div>
        </CardContent>
      </Card>

      {/* 日均成本 */}
      <Card className="rounded-2xl bg-white shadow-sm border-0">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 tracking-wide">
              日均成本
            </span>
          </div>
          <div className="text-2xl font-semibold text-gray-900">
            ¥{dailyAverage.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            每天平均花费
          </div>
        </CardContent>
      </Card>

      {/* 最大单日支出 */}
      <Card className="rounded-2xl bg-white shadow-sm border-0">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 tracking-wide">
              最大单日支出
            </span>
          </div>
          {maxSingleDay ? (
            <>
              <div className="text-2xl font-semibold text-gray-900">
                ¥{maxSingleDay.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {maxSingleDay.date}
              </div>
            </>
          ) : (
            <>
              <div className="text-2xl font-semibold text-gray-300">
                -
              </div>
              <div className="text-xs text-gray-400 mt-1">
                暂无数据
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}