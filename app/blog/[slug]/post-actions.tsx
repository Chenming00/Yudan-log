"use client";

import { useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';

export function PostActions({ title, summary }: { title: string; summary: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text: summary, url });
        return;
      } catch {
        // ignore cancellation
      }
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={handleShare}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
      >
        <Share2 className="h-3.5 w-3.5" />
        分享文章
      </button>
      <button
        onClick={handleCopy}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? '链接已复制' : '复制链接'}
      </button>
    </div>
  );
}