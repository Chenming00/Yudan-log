"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CategorySummary } from "../types";

interface CategoryBreakdownProps {
  categoryBreakdown: CategorySummary[];
  title?: string;
}

const CHART_COLORS = ["#4c7158", "#92ab80", "#d3b587", "#b37e61", "#96abb0", "#bcb7a3"];

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
      <div className="rounded-lg bg-popover border border-border p-3 shadow-md">
        <p className="text-sm font-medium text-foreground mb-1">{entry.name}</p>
        <p className="text-xs text-muted-foreground">
          ¥{Number(entry.value).toLocaleString()} ({entry.percentage}%)
        </p>
      </div>
    );
  }
  return null;
};

export function CategoryBreakdown({ categoryBreakdown, title = "支出分类" }: CategoryBreakdownProps) {
  const [expanded, setExpanded] = useState(false);

  const categoryList = categoryBreakdown.map((c) => ({ name: c.category, value: c.amount, percentage: 0 }));
  const countByCategory = Object.fromEntries(categoryBreakdown.map((c) => [c.category, c.count]));

  const total = categoryList.reduce((sum, item) => sum + item.value, 0);
  categoryList.forEach((item) => { item.percentage = total > 0 ? Math.round(item.value / total * 100) : 0; });
  const visibleCategories = expanded ? categoryList : categoryList.slice(0, 5);

  // 单分类或无数据时不显示饼图
  if (categoryList.length <= 1) {
    return null;
  }

  return (
    <Card className="min-w-0 gap-0 p-5 shadow-none sm:p-6">
      <p className="section-title mb-1">{title}</p>
      <p className="mb-5 text-xs text-muted-foreground">看看这个月，花费都去了哪里</p>
      <div className="flex flex-col gap-5 sm:flex-row">
        {/* 饼图 */}
        <div className="relative flex items-center justify-center sm:w-36 sm:shrink-0">
          <div className="h-36 w-full min-h-[144px]">
            <ResponsiveContainer width="100%" height="100%" minHeight={144}>
              <PieChart>
                <Pie
                  data={categoryList}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={65}
                  paddingAngle={3}
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
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-xl font-semibold text-foreground">{categoryList.length}</span><span className="text-[10px] text-muted-foreground">支出分类</span></div>
        </div>

        {/* 分类排行列表 */}
        <div className="flex-1 min-w-0">
          <h4 className="sr-only">
            分类排行
          </h4>
          <div className="space-y-3">
            {visibleCategories.map((item, index) => {
              const percentage = total > 0 ? (item.value / total) * 100 : 0;
              const count = countByCategory[item.name] || 0;
              return (
                <div key={item.name} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <span className="text-sm text-foreground truncate">{item.name}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{count}笔</span>
                    </div>
                    <span className="ml-2 max-w-[55%] break-words text-right text-sm font-medium tabular-nums text-foreground">
                      ¥{item.value.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="mt-3 h-auto w-full justify-start rounded-none border-t border-border/50 pt-3 text-xs text-muted-foreground"
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
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
