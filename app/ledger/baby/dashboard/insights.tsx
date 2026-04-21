"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from "lucide-react";

interface Transaction {
  id: string;
  amount: number;
  note: string;
  category: string;
  type: "expense" | "income";
  transaction_time?: string;
  created_at: string;
}

interface InsightsProps {
  transactions: Transaction[];
  currentMonthExpense: number;
  lastMonthExpense: number;
}

interface Insight {
  type: "positive" | "warning" | "info";
  title: string;
  description: string;
}

export function Insights({ transactions, currentMonthExpense, lastMonthExpense }: InsightsProps) {
  const insights: Insight[] = [];

  // 1. 计算月度变化
  if (lastMonthExpense > 0) {
    const change = ((currentMonthExpense - lastMonthExpense) / lastMonthExpense) * 100;
    if (change > 20) {
      insights.push({
        type: "warning",
        title: "支出增长较快",
        description: `本月支出比上月增长了 ${change.toFixed(1)}%，可以适当关注一下大额支出哦。`,
      });
    } else if (change > 0) {
      insights.push({
        type: "info",
        title: "支出略有增加",
        description: `本月支出比上月增长了 ${change.toFixed(1)}%，属于正常波动范围。`,
      });
    } else if (change < -20) {
      insights.push({
        type: "positive",
        title: "支出明显减少",
        description: `本月支出比上月减少了 ${Math.abs(change).toFixed(1)}%，理财有道！`,
      });
    } else {
      insights.push({
        type: "positive",
        title: "支出稳定",
        description: `本月支出与上月基本持平，控制在 ${Math.abs(change).toFixed(1)}% 的波动范围内。`,
      });
    }
  }

  // 2. 检测异常单日支出
  const dailyExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce<Record<string, number>>((groups, t) => {
      const date = new Date(t.transaction_time || t.created_at);
      const dateKey = `${date.getMonth() + 1}/${date.getDate()}`;
      groups[dateKey] = (groups[dateKey] || 0) + Number(t.amount);
      return groups;
    }, {});

  const dailyValues = Object.values(dailyExpenses);
  if (dailyValues.length > 0) {
    const avgDaily = dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length;
    const maxDaily = Math.max(...dailyValues);
    
    if (maxDaily > avgDaily * 3 && maxDaily > 100) {
      const maxDate = Object.entries(dailyExpenses).find(([_, v]) => v === maxDaily)?.[0] || "";
      insights.push({
        type: "info",
        title: "发现大额支出日",
        description: `${maxDate} 的支出 (¥${maxDaily.toLocaleString()}) 是日均的 ${(maxDaily / avgDaily).toFixed(1)} 倍，可能是集中采购或特殊情况。`,
      });
    }
  }

  // 3. 分类分析 - 检查是否有单一分类占比过高
  const categoryData = transactions
    .filter((t) => t.type === "expense")
    .reduce<Record<string, number>>((groups, t) => {
      const category = t.category || "未分类";
      groups[category] = (groups[category] || 0) + Number(t.amount);
      return groups;
    }, {});

  const totalExpense = Object.values(categoryData).reduce((a, b) => a + b, 0);
  if (totalExpense > 0) {
    const topCategory = Object.entries(categoryData).sort((a, b) => b[1] - a[1])[0];
    if (topCategory) {
      const percentage = (topCategory[1] / totalExpense) * 100;
      if (percentage > 50) {
        insights.push({
          type: "info",
          title: `${topCategory[0]} 占比突出`,
          description: `${topCategory[0]} 占总支出的 ${percentage.toFixed(0)}%，是本月的主要开销。`,
        });
      }
    }
  }

  // 如果没有特别洞察，显示默认鼓励
  if (insights.length === 0) {
    insights.push({
      type: "positive",
      title: "账本记录良好",
      description: "本月的养娃支出记录完整，继续保持记账好习惯！",
    });
  }

  const getIcon = (type: Insight["type"]) => {
    switch (type) {
      case "positive":
        return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      default:
        return <TrendingUp className="h-5 w-5 text-gray-400" />;
    }
  };

  const getBgColor = (type: Insight["type"]) => {
    switch (type) {
      case "positive":
        return "bg-emerald-50";
      case "warning":
        return "bg-amber-50";
      default:
        return "bg-gray-50";
    }
  };

  return (
    <Card className="rounded-2xl bg-white shadow-sm border-0">
      <CardContent className="pt-4">
        <h3 className="text-sm font-medium text-gray-900 mb-4">智能分析</h3>
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={`rounded-xl p-4 ${getBgColor(insight.type)}`}
            >
              <div className="flex items-start gap-3">
                {getIcon(insight.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {insight.title}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {insight.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}