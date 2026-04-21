"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface Transaction {
  id: string;
  amount: number;
  note: string;
  category: string;
  type: "expense" | "income";
  transaction_time?: string;
  created_at: string;
}

interface CategoryBreakdownProps {
  transactions: Transaction[];
  title?: string;
}

// 协调的配色方案 - 从 rose 到 stone 的渐变
const CHART_COLORS = [
  "hsl(350, 85%, 60%)",  // rose - 主色（支出）
  "hsl(340, 75%, 55%)",  // darker rose
  "hsl(25, 85%, 60%)",   // coral/orange
  "hsl(45, 90%, 55%)",   // amber
  "hsl(160, 70%, 45%)",  // emerald - 收入
  "hsl(200, 80%, 55%)",  // sky blue
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const entry = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-3 shadow-lg">
        <p className="text-sm font-medium text-foreground mb-1">{entry.name}</p>
        <p className="text-xs text-muted-foreground">
          ¥{Number(entry.value).toLocaleString()} ({entry.percentage}%)
        </p>
      </div>
    );
  }
  return null;
};

export function CategoryBreakdown({ transactions, title = "支出分类" }: CategoryBreakdownProps) {
  const categoryData = transactions
    .filter((t) => t.type === "expense")
    .reduce<Record<string, number>>((groups, t) => {
      const category = t.category || "未分类";
      groups[category] = (groups[category] || 0) + Number(t.amount);
      return groups;
    }, {});

  const data = Object.entries(categoryData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const top3 = data.slice(0, 3);

  if (data.length === 0) {
    return (
      <Card className="rounded-2xl shadow-sm border-stone-100/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground text-sm py-8">暂无数据</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-sm border-stone-100/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* 饼图 */}
          <div className="flex-1 flex items-center justify-center">
            <div className="h-40 w-full min-h-[160px]">
              <ResponsiveContainer width="100%" height="100%" minHeight={160}>
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top 3 列表 */}
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
              Top 3 分类
            </h4>
            <div className="space-y-3">
              {top3.map((item, index) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="text-sm text-foreground flex-1 truncate">{item.name}</span>
                  <div className="text-right">
                    <div className="text-sm font-medium text-foreground">
                      ¥{item.value.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {((item.value / total) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {data.length > 3 && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  其他 {data.length - 3} 个分类
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}