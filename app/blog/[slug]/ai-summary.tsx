'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

export function AiSummary({ slug, initialSummary }: { slug: string; initialSummary?: string }) {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  const handleSummarize = async () => {
    if (initialSummary) {
      setSummary(initialSummary);
      setVisible(true);
      return;
    }

    setLoading(true);
    setSummary('');
    setVisible(true);

    try {
      const res = await fetch('/api/blog/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSummary(data.error || '生成失败，请稍后再试');
        return;
      }

      const contentType = res.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const data = await res.json();
        setSummary(data.summary || '生成失败');
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let text = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              text += delta;
              setSummary(text);
            }
          } catch {
            // skip malformed JSON chunks
          }
        }
      }
    } catch {
      setSummary('网络错误，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 sm:mt-8">
      {!visible && (
        <button
          onClick={handleSummarize}
          className="inline-flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/15 active:bg-primary/20 active:scale-[0.97] transition-all"
        >
          <Sparkles className="h-4 w-4" />
          AI 总结
        </button>
      )}

      {loading && !summary && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
          <Loader2 className="h-4 w-4 animate-spin" />
          AI 正在思考...
        </div>
      )}

      {summary && (
        <div className="border-l-[3px] border-violet-400/50 pl-4 sm:pl-5 py-1">
          <p className="text-[11px] uppercase tracking-widest font-semibold text-violet-500/70 mb-2 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            AI 总结
          </p>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {summary}
            {loading && <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5 align-text-bottom" />}
          </p>
        </div>
      )}
    </div>
  );
}
