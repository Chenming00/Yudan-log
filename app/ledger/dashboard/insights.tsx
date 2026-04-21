"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, TrendingUp, AlertCircle, Calendar } from "lucide-react";
import { useMemo } from "react";

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
  currentMonth: {
    income: number;
    expense: number;
    balance: number;
  };
}

interface Insight {
  icon: "lightbulb" | "trend" | "alert" | "calendar";
  title: string;
  description: string;
  severity?: "normal" | "warning" | "info";
}

export function Insights({ transactions, currentMonth }: InsightsProps) {
  const insights = useMemo(() => {
    const result: Insight[] = [];
    const now = new Date();

    // 只分析本月支出
    const expenseTransactions = transactions.filter(
      (t) => t.type === "expense"
    );

    if (expenseTransactions.length === 0) {
      return [
        {
          icon: "lightbulb" as const,
          title: "暂无支出数据",
          description: "本月还没有任何支出记录",
          severity: "info" as const,
        },
      ];
    }

    // 1. 分类占比分析
    const categoryData = expenseTransactions.reduce<Record<string, number>>(
      (groups, t) => {
        const category = t.category || "未分类";
        groups[category] = (groups[category] || 0) + Number(t.amount);
        return groups;
      },
      {}
    );

    const totalExpense = Object.values(categoryData).reduce(
      (sum, val) => sum + val,
      0
    );
    const sortedCategories = Object.entries(categoryData).sort(
      (a, b) => b[1] - a[1]
    );

    if (sortedCategories.length > 0) {
      const [topCategory, topValue] = sortedCategories[0];
      const percentage = ((topValue / totalExpense) * 100).toFixed(0);
      
      if (Number(percentage) >= 30) {
        result.push({
          icon: "alert" as const,
          title: `${topCategory}占比过高`,
          description: `${topCategory}支出 ¥${topValue.toLocaleString()}，占总支出的 ${percentage}%`,
          severity: "warning",
        });
      } else {
        result.push({
          icon: "lightbulb" as const,
          title: "支出分布均衡",
          description: `${topCategory}是最大支出项，占比 ${percentage}%`,
          severity: "normal",
        });
      }
    }

    // 2. 每日平均支出分析
    const dailyData = expenseTransactions.reduce<Record<string, number>>(
      (groups, t) => {
        const date = new Date(t.transaction_time || t.created_at);
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        groups[dateKey] = (groups[dateKey] || 0) + Number(t.amount);
        return groups;
      },
      {}
    );

    const daysWithExpense = Object.keys(dailyData).length;
    const avgDaily = totalExpense / Math.max(daysWithExpense, 1);
    const currentDay = now.getDate();
    const expectedExpense = avgDaily * currentDay;

    if (totalExpense > expectedExpense * 1.2 && currentDay > 5) {
      result.push({
        icon: "trend" as const,
        title: "支出高于预期",
        description: `本月支出比预期高出 ${Math.round(((totalExpense - expectedExpense) / expectedExpense) * 100)}%`,
        severity: "warning",
      });
    } else if (totalExpense < expectedExpense * 0.8 && currentDay > 5) {
      result.push({
        icon: "lightbulb" as const,
        title: "支出控制良好",
        description: `本月支出比预期低 ${Math.round(((expectedExpense - totalExpense) / expectedExpense) * 100)}%`,
        severity: "info",
      });
    }

    // 3. 周末 vs 工作日分析
    let weekendExpense = 0;
    let weekdayExpense = 0;
    let weekendDays = 0;
    let weekdayDays = 0;

    Object.entries(dailyData).forEach(([date, amount]) => {
      const dateObj = new Date(date);
      const dayOfWeek = dateObj.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekendExpense += amount;
        weekendDays++;
      } else {
        weekdayExpense += amount;
        weekdayDays++;
      }
    });

    const weekendAvg = weekendDays > 0 ? weekendExpense / weekendDays : 0;
    const weekdayAvg = weekdayDays > 0 ? weekdayExpense / weekdayDays : 0;

    if (weekendDays > 0 && weekdayDays > 0) {
      if (weekendAvg > weekdayAvg * 1.5) {
        result.push({
          icon: "calendar" as const,
          title: "周末消费高峰",
          description: `周末平均支出是工作日的 ${(weekendAvg / weekdayAvg).toFixed(1)} 倍`,
          severity: "normal",
        });
      } else if (weekdayAvg > weekendAvg * 1.5) {
        result.push({
          icon: "calendar" as const,
          title: "工作日消费为主",
          description: `工作日平均支出是周末的 ${(weekdayAvg / weekendAvg).toFixed(1)} 倍`,
          severity: "normal",
        });
      }
    }

    // 4. 最大单笔支出
    const maxTransaction = expenseTransactions.reduce(
      (max, t) => (Number(t.amount) > Number(max.amount) ? t : max),
      expenseTransactions[0]
    );

    if (maxTransaction && Number(maxTransaction.amount) > totalExpense * 0.3) {
      result.push({
        icon: "alert" as const,
        title: "大额支出提醒",
        description: `最大单笔支出 ¥${Number(maxTransaction.amount).toLocaleString()} (${maxTransaction.category})`,
        severity: "warning",
      });
    }

    // 5. 结余率分析
    if (currentMonth.income > 0) {
      const savingsRate = ((currentMonth.balance / currentMonth.income) * 100).toFixed(0);
      if (Number(savingsRate) >= 30) {
        result.push({
          icon: "lightbulb" as const,
          title: "结余率优秀",
          description: `本月结余率为 ${savingsRate}%，继续保持！`,
          severity: "info",
        });
      } else if (Number(savingsRate) < 10) {
        result.push({
          icon: "alert" as const,
          title: "结余率偏低",
          description: `本月结余率仅 ${savingsRate}%，建议控制支出`,
          severity: "warning",
        });
      }
    }

    // 确保至少有 3 条洞察
    if (result.length < 3) {
      if (!result.find((r) => r.title.includes("支出笔数"))) {
        result.push({
          icon: "lightbulb" as const,
          title: "记账习惯良好",
          description: `本月共有 ${expenseTransactions.length} 笔支出记录`,
          severity: "info",
        });
      }
    }

    return result.slice(0, 5); // 最多显示 5 条
  }, [transactions, currentMonth]);

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case "lightbulb":
        return <Lightbulb className="h-4 w-4" />;
      case "trend":
        return <TrendingUp className="h-4 w-4" />;
      case "alert":
        return <AlertCircle className="h-4 w-4" />;
      case "calendar":
        return <Calendar className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getSeverityStyles = (severity?: string) => {
    switch (severity) {
      case "warning":
        return "bg-amber-50 border-amber-200";
      case "info":
        return "bg-blue-50 border-blue-200";
      default:
        return "bg-stone-50 border-stone-200";
    }
  };

  const getIconColor = (severity?: string) => {
    switch (severity) {
      case "warning":
        return "text-amber-600";
      case "info":
        return "text-blue-600";
      default:
        return "text-stone-600";
    }
  };

  return (
    <Card className="rounded-2xl bg-white shadow-sm border-stone-200/60">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-medium text-stone-700">本月洞察</h3>
        </div>
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={`rounded-xl border p-3 ${getSeverityStyles(insight.severity)}`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${getIconColor(insight.severity)}`}>
                  {getIcon(insight.icon)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800">
                    {insight.title}
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5">
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