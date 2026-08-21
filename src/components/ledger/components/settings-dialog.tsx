"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CircleUserRound, KeyRound, LogOut, ShieldCheck } from 'lucide-react';
import { OWNER_EMAIL } from '@/lib/auth';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentKey: string | null;
  githubEmail?: string;
  githubAuthorized: boolean;
  githubAvailable: boolean;
  onGitHubSignIn: () => Promise<void>;
  onGitHubSignOut: () => Promise<void>;
  onSave: (key: string | null) => void;
}

export function SettingsDialog({
  open,
  onOpenChange,
  currentKey,
  githubEmail,
  githubAuthorized,
  githubAvailable,
  onGitHubSignIn,
  onGitHubSignOut,
  onSave,
}: SettingsDialogProps) {
  const [value, setValue] = useState(() => currentKey || '');

  useEffect(() => {
    setValue(currentKey || '');
  }, [currentKey, open]);

  const handleSave = () => {
    const trimmed = value.trim();
    onSave(trimmed || null);
    onOpenChange(false);
  };

  const handleClear = () => {
    setValue('');
    onSave(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-center">账本写入权限</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-start gap-3">
              <CircleUserRound className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">GitHub 登录</p>
                <p className="mt-1 break-all text-xs leading-5 text-muted-foreground">
                  {githubEmail
                    ? `${githubEmail}${githubAuthorized ? '，已获得写入权限' : '，没有写入权限'}`
                    : `仅 ${OWNER_EMAIL} 可写入`}
                </p>
              </div>
            </div>
            {githubEmail ? (
              <Button className="mt-3 w-full" variant="outline" onClick={() => void onGitHubSignOut()}>
                <LogOut className="h-4 w-4" />
                退出 GitHub
              </Button>
            ) : (
              <Button className="mt-3 w-full" disabled={!githubAvailable} onClick={() => void onGitHubSignIn()}>
                <CircleUserRound className="h-4 w-4" />
                使用 GitHub 登录
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            或使用 API Key
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              API Key
            </Label>
            <Input type="password" value={value} onChange={(e) => setValue(e.target.value)} placeholder="输入 API Key" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              用于网页备用登录和 API 写入，只保存在当前浏览器。
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
          <p className="flex items-start gap-2 border-t border-border pt-3 text-xs leading-5 text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            GitHub 身份和 API Key 均由服务端验证，匿名访问只能读取账本。
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
