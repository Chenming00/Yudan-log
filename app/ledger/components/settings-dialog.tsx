"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentKey: string | null;
  onSave: (key: string) => void;
}

export function SettingsDialog({ open, onOpenChange, currentKey, onSave }: SettingsDialogProps) {
  const [value, setValue] = useState(() => currentKey || '');

  useEffect(() => {
    setValue(currentKey || '');
  }, [currentKey, open]);

  const handleSave = () => {
    const trimmed = value.trim();
    onSave(trimmed);
    onOpenChange(false);
  };

  const handleClear = () => {
    setValue('');
    onSave('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-center">设置 API Key</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="flex flex-col gap-2">
            <label className="text-xs text-stone-400">API Key</label>
            <input
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="输入你的 API Key"
              className="w-full bg-stone-50 border border-stone-200/70 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-stone-400 text-stone-700 placeholder:text-stone-400"
            />
            <p className="text-xs text-stone-400 leading-relaxed">
              API Key 将保存在浏览器本地，仅在当前设备可用。
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleClear}
              className="flex-1 py-2.5 text-sm rounded-xl font-medium border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
            >
              清除
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 text-sm rounded-xl font-medium bg-stone-800 text-stone-50 hover:bg-stone-700 transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}