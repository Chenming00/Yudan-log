"use client";

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
      <div className="rounded-lg bg-white p-3 shadow-sm border border-gray-100">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-sm font-medium text-[#FF6B6B]">
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
    <div className="rounded-2xl bg-white shadow-sm p-5">
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
                ? "bg-white shadow-sm text-foreground"
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
                ? "bg-white shadow-sm text-foreground"
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
                <stop offset="5%" stopColor="#FF6B6B" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#FF6B6B" stopOpacity={0} />
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
              stroke="#FF6B6B"
              strokeWidth={1.5}
              fill="url(#colorValue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}