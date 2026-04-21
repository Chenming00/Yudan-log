"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
          <div className="space-y-2">
            <Label>API Key</Label>
            <Input
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="输入你的 API Key"
            />
            <p className="text-xs text-muted-foreground leading-relaxed">
              API Key 将保存在浏览器本地，仅在当前设备可用。
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClear} className="flex-1">
              清除
            </Button>
            <Button onClick={handleSave} className="flex-1">
              保存
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}