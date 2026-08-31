"use client";

import { useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
      <Button
        variant="outline"
        onClick={handleShare}
        className="min-h-11"
      >
        <Share2 className="h-4 w-4" />
        分享
      </Button>
      <Button
        variant="outline"
        onClick={handleCopy}
        className="min-h-11"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        {copied ? '已复制' : '复制链接'}
      </Button>
    </div>
  );
}
