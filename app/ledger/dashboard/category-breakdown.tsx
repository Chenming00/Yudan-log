"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Transaction } from "../types";

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

interface TooltipPayloadEntry {
  payload: { name: string; value: number; percentage: number };
}

interface PieTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}

const CustomTooltip = ({ active, payload }: PieTooltipProps) => {
  if (active && payload && payload.length) {
    const entry = payload[0].payload;
    return (
      <div className="rounded-lg bg-white p-3 shadow-lg">
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
  const [expanded, setExpanded] = useState(false);

  const { groups, countByCategory } = transactions
    .filter((t) => t.type === "expense")
    .reduce<{ groups: Record<string, number>; countByCategory: Record<string, number> }>(
      (acc, t) => {
        const category = t.category || "未分类";
        acc.groups[category] = (acc.groups[category] || 0) + Number(t.amount);
        acc.countByCategory[category] = (acc.countByCategory[category] || 0) + 1;
        return acc;
      },
      { groups: {}, countByCategory: {} }
    );

  const categoryList = Object.entries(groups)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const total = categoryList.reduce((sum, item) => sum + item.value, 0);
  const visibleCategories = expanded ? categoryList : categoryList.slice(0, 5);

  if (categoryList.length === 0) {
    return (
      <div className="rounded-2xl bg-card border border-border p-6">
        <p className="text-sm font-medium text-muted-foreground mb-4">{title}</p>
        <p className="text-center text-muted-foreground text-sm py-8">暂无数据</p>
      </div>
    );
  }

  return (
    <motion.div
      className="rounded-2xl bg-card border border-border p-4"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      <p className="text-sm font-medium text-muted-foreground mb-4">{title}</p>
      <div className="flex flex-col sm:flex-row gap-6">
        {/* 饼图 */}
        <div className="flex-1 flex items-center justify-center">
          <div className="h-40 w-full min-h-[160px]">
            <ResponsiveContainer width="100%" height="100%" minHeight={160}>
              <PieChart>
                <Pie
                  data={categoryList}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {categoryList.map((_, index) => (
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

        {/* 分类排行列表 */}
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
            分类排行
          </h4>
          <div className="space-y-3">
            {visibleCategories.map((item, index) => {
              const percentage = total > 0 ? (item.value / total) * 100 : 0;
              const count = countByCategory[item.name] || 0;
              return (
                <div key={item.name} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <span className="text-sm text-foreground truncate">{item.name}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{count}笔</span>
                    </div>
                    <span className="text-sm font-medium text-foreground flex-shrink-0 ml-2">
                      ¥{item.value.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right flex-shrink-0">
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {categoryList.length > 5 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-3 pt-3 border-t border-border/50 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  收起
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  展开更多 ({categoryList.length - 5})
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
