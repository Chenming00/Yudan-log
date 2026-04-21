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
        className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-white px-3 py-1.5 text-sm text-foreground hover:bg-muted/50 hover:border-border transition-all"
      >
        <Share2 className="h-4 w-4" />
        分享
      </button>
      <button
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-white px-3 py-1.5 text-sm text-foreground hover:bg-muted/50 hover:border-border transition-all"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        {copied ? '已复制' : '复制链接'}
      </button>
    </div>
  );
}