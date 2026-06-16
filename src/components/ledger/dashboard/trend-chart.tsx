"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import type { DailyExpense } from "../types";

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
        <p className="text-sm font-medium text-expense">
          ¥{Number(value).toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

export function TrendChart({ dailyExpenses, title = "每日支出趋势" }: TrendChartProps) {
  const [timeRange, setTimeRange] = useState<7 | 30>(7);

  const chartData = useMemo(() => {
    // 取最后 timeRange 天的数据
    const sliced = dailyExpenses.slice(-timeRange);
    return sliced.map((d) => {
      const date = new Date(d.date);
      return {
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        value: d.amount,
        fullDate: d.date,
      };
    });
  }, [dailyExpenses, timeRange]);

  const totalExpense = chartData.reduce((sum, d) => sum + d.value, 0);
  const avgDaily = totalExpense / timeRange;

  return (
    <div className="rounded-2xl bg-card border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-1">
            平均每日 ¥{avgDaily.toFixed(0)}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 px-3 text-xs ${
              timeRange === 7
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTimeRange(7)}
          >
            7 天
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 px-3 text-xs ${
              timeRange === 30
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTimeRange(30)}
          >
            30 天
          </Button>
        </div>
      </div>
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%" minHeight={176}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-expense)" stopOpacity={0.18} />
                <stop offset="95%" stopColor="var(--color-expense)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              interval={timeRange === 7 ? 0 : 4}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `¥${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--color-expense)"
              strokeWidth={2}
              fill="url(#colorValue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
