"use client";

import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import type { DailyExpense } from "../types";
import { visibleLedgerDays } from "@/lib/ledger-query-client";

interface TrendChartProps {
  dailyExpenses: DailyExpense[];
  title?: string;
}

interface TooltipPayloadItem {
  value: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    return (
      <div className="rounded-lg bg-popover p-3 shadow-md border border-border">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-sm font-medium text-primary">
          ¥{Number(value).toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

export function TrendChart({ dailyExpenses, title = "每日支出趋势" }: TrendChartProps) {
  const [timeRange, setTimeRange] = useState<7 | 'month'>(7);

  const chartData = useMemo(() => {
    // 按北京时间取本月最近的自然日；月视图保留完整日历。
    const sliced = visibleLedgerDays(dailyExpenses, timeRange);
    return sliced.map((d) => {
      const [, month, day] = d.date.split('-').map(Number);
      return {
        date: `${month}/${day}`,
        value: d.amount,
        fullDate: d.date,
      };
    });
  }, [dailyExpenses, timeRange]);

  const totalExpense = chartData.reduce((sum, d) => sum + d.value, 0);
  const avgDaily = chartData.length ? totalExpense / chartData.length : 0;

  return (
    <div className="surface-card min-w-0 p-5 sm:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="section-title">{title}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            平均每日 ¥{avgDaily.toFixed(0)}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-[#eff1eb] p-1">
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 px-3 text-xs ${
              timeRange === 7
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTimeRange(7)}
            aria-pressed={timeRange === 7}
          >
            7 天
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 px-3 text-xs ${
              timeRange === 'month'
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTimeRange('month')}
            aria-pressed={timeRange === 'month'}
          >
            整月
          </Button>
        </div>
      </div>
      <div className="h-56 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minHeight={224}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 5" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              interval={timeRange === 7 ? 0 : 4}
            />
            <YAxis
              width={52}
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `¥${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--color-primary)"
              strokeWidth={2.5}
              fill="#e9eee4"
              activeDot={{ r: 5, fill: "var(--color-primary)", stroke: "white", strokeWidth: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
