"use client";

import { List, LayoutGrid, BarChart3 } from 'lucide-react';
import { ViewMode } from '../types';

interface ViewSwitcherProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function ViewSwitcher({ viewMode, onViewModeChange }: ViewSwitcherProps) {
  return (
    <div className="px-4 sm:px-6 lg:px-8 mx-auto mb-4 flex max-w-4xl">
      <div className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-muted p-1">
        <button
          onClick={() => onViewModeChange('list')}
          className={`flex-1 inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
            viewMode === 'list'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <List className="h-4 w-4" />
          列表
        </button>
        <button
          onClick={() => onViewModeChange('monthly')}
          className={`flex-1 inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
            viewMode === 'monthly'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <LayoutGrid className="h-4 w-4" />
          月度
        </button>
        <button
          onClick={() => onViewModeChange('chart')}
          className={`flex-1 inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
            viewMode === 'chart'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          图表
        </button>
      </div>
    </div>
  );
}