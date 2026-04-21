"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";

interface Transaction {
  id: string;
  amount: number;
  note: string;
  category: string;
  type: "expense" | "income";
  transaction_time?: string;
  created_at: string;
}

interface TrendChartProps {
  transactions: Transaction[];
  title?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    return (
      <div className="rounded-lg border bg-white p-3 shadow-lg">
        <p className="text-xs font-medium text-stone-500 mb-1">{label}</p>
        <p className="text-sm font-semibold text-amber-600">
          ¥{Number(value).toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

export function TrendChart({ transactions, title = "每日支出趋势" }: TrendChartProps) {
  const [timeRange, setTimeRange] = useState<7 | 30>(7);

  const chartData = useMemo(() => {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (timeRange - 1) * 24 * 60 * 60 * 1000);
    
    // 按日期分组支出
    const dailyData = transactions
      .filter((t) => {
        if (t.type !== "expense") return false;
        const date = new Date(t.transaction_time || t.created_at);
        return date >= cutoffDate;
      })
      .reduce<Record<string, number>>((groups, t) => {
        const date = new Date(t.transaction_time || t.created_at);
        const dateKey = `${date.getMonth() + 1}/${date.getDate()}`;
        groups[dateKey] = (groups[dateKey] || 0) + Number(t.amount);
        return groups;
      }, {});

    // 填充完整日期范围的数据
    const result = [];
    for (let i = timeRange - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = `${date.getMonth() + 1}/${date.getDate()}`;
      result.push({
        date: dateKey,
        value: dailyData[dateKey] || 0,
        fullDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
      });
    }
    return result;
  }, [transactions, timeRange]);

  const totalExpense = chartData.reduce((sum, d) => sum + d.value, 0);
  const avgDaily = totalExpense / timeRange;

  return (
    <Card className="rounded-2xl bg-white shadow-sm border-stone-200/60">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium text-stone-500">{title}</CardTitle>
            <p className="text-xs text-stone-400 mt-0.5">
              平均每日 ¥{avgDaily.toFixed(0)}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-0.5">
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 px-3 text-xs ${
                timeRange === 7
                  ? "bg-white shadow-sm text-stone-900"
                  : "text-stone-500 hover:text-stone-700"
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
                  ? "bg-white shadow-sm text-stone-900"
                  : "text-stone-500 hover:text-stone-700"
              }`}
              onClick={() => setTimeRange(30)}
            >
              30 天
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%" minHeight={180}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(38, 92%, 55%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(38, 92%, 55%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                interval={timeRange === 7 ? 0 : 4}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `¥${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(38, 92%, 55%)"
                strokeWidth={2}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}