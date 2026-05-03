'use client';

import { AlertCircle, RefreshCw, Key } from 'lucide-react';

export default function LedgerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">记账加载失败</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {error.message || '请检查 API Key 是否正确，或稍后再试'}
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all"
          >
            <RefreshCw className="h-4 w-4" />
            重试
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('ledger-api-key');
              reset();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted active:scale-[0.97] transition-all"
          >
            <Key className="h-4 w-4" />
            重新输入 API Key
          </button>
        </div>
      </div>
    </main>
  );
}
