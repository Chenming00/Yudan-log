"use client";

import { useState } from 'react';
import { Search, FunnelX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { TransactionTypeFilter, DateRangeFilter } from '../types';

interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedType: TransactionTypeFilter;
  onTypeChange: (value: TransactionTypeFilter) => void;
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  selectedDateRange: DateRangeFilter;
  onDateRangeChange: (value: DateRangeFilter) => void;
  availableMonths: string[];
  selectedMonth: string;
  onMonthChange: (value: string) => void;
  resultCount: number;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-');
  return `${year}年${Number(month)}月`;
}

export function FilterBar({
  searchTerm,
  onSearchChange,
  selectedType,
  onTypeChange,
  categories,
  selectedCategory,
  onCategoryChange,
  selectedDateRange,
  onDateRangeChange,
  availableMonths,
  selectedMonth,
  onMonthChange,
  resultCount,
  hasActiveFilters,
  onClearFilters,
}: FilterBarProps) {
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
  const categoryFilters = ['全部分类', ...categories];

  return (
    <div className="px-4 sm:px-6 lg:px-8 mx-auto mb-4 max-w-4xl space-y-3">
      {/* 搜索框 */}
      <div className="flex items-center gap-3 bg-stone-50 rounded-xl border border-stone-200/70 px-4 py-2.5">
        <Search className="h-4 w-4 text-stone-400 shrink-0" />
        <Input
          type="text"
          placeholder="搜索备注或分类"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400 text-stone-700 border-0 shadow-none focus-visible:ring-0 px-0 py-0 h-auto"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange('')}
            className="text-stone-400 hover:text-stone-600 text-xs shrink-0"
          >
            ✕
          </button>
        )}
      </div>

      {/* 类型筛选 */}
      <div className="flex gap-1 bg-stone-100 rounded-lg p-1">
        {([
          ['all', '全部'],
          ['income', '收入'],
          ['expense', '支出'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => {
              onTypeChange(key as TransactionTypeFilter);
              onCategoryChange('');
            }}
            className={`flex-1 py-1.5 text-sm rounded-md font-medium transition-all ${
              selectedType === key
                ? 'bg-white text-stone-800 shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 分类筛选 */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {categoryFilters.map((category) => {
            const value = category === '全部分类' ? '' : category;
            const isActive = selectedCategory === value;
            return (
              <button
                key={category}
                onClick={() => onCategoryChange(value)}
                className={`shrink-0 px-3 py-1 text-xs rounded-full border font-medium transition-all ${
                  isActive
                    ? 'bg-stone-800 text-stone-50 border-stone-800'
                    : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      )}

      {/* 日期范围筛选 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {([
          ['all', '全部时间'],
          ['7d', '近 7 天'],
          ['30d', '近 30 天'],
          ['month', '本月'],
        ] as const).map(([key, label]) => {
          const isActive = selectedDateRange === key;
          return (
            <button
              key={key}
              onClick={() => {
                onDateRangeChange(key as DateRangeFilter);
                if (key !== 'all') {
                  onMonthChange('');
                }
              }}
              className={`shrink-0 px-3 py-1 text-xs rounded-full border font-medium transition-all ${
                isActive
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100'
              }`}
            >
              {label}
            </button>
          );
        })}

        {/* 月份选择下拉 */}
        {availableMonths.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setMonthDropdownOpen(!monthDropdownOpen)}
              className={`shrink-0 px-3 py-1 text-xs rounded-full border font-medium transition-all flex items-center gap-1 ${
                selectedMonth
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100'
              }`}
            >
              {selectedMonth ? formatMonthLabel(selectedMonth) : '月份'}
              <svg
                className={`w-3 h-3 transition-transform ${
                  monthDropdownOpen ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {monthDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg p-2 z-10 min-w-[140px] max-h-60 overflow-y-auto">
                <button
                  onClick={() => {
                    onMonthChange('');
                    setMonthDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                    selectedMonth === ''
                      ? 'bg-stone-800 text-stone-50'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  全部月份
                </button>
                {availableMonths.map((month) => (
                  <button
                    key={month}
                    onClick={() => {
                      onMonthChange(month);
                      setMonthDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                      selectedMonth === month
                        ? 'bg-amber-100 text-amber-700'
                        : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {formatMonthLabel(month)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 结果统计和清除筛选 */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-stone-400">共 {resultCount} 条记录</span>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-xs text-stone-500 hover:text-stone-700 transition-colors"
          >
            清除筛选
          </button>
        )}
      </div>
    </div>
  );
}