'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, Send, Loader2, ChevronDown, ChevronUp, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createSseDecoder, readChatEvent } from '../../lib/blog-chat-stream';

interface Message { role: 'user' | 'assistant'; content: string; }
interface Availability { available: boolean; remaining?: number; limit?: number; resetAt?: string; error?: string; }

export function AiChat({ slug }: { slug: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryAt, setRetryAt] = useState(0);
  const requestRef = useRef<AbortController | null>(null);
  const statusRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refreshStatus = useCallback(async () => {
    statusRef.current?.abort();
    const controller = new AbortController();
    statusRef.current = controller;
    setStatusLoading(true);
    try {
      const res = await fetch(`/api/blog/chat?slug=${encodeURIComponent(slug)}`, { signal: controller.signal, cache: 'no-store' });
      const data: Availability = await res.json();
      if (statusRef.current === controller) setAvailability(res.ok ? data : { available: false, error: data.error || '文章问答暂时不可用' });
    } catch {
      if (!controller.signal.aborted) setAvailability({ available: false, error: '无法连接文章问答，请重试' });
    } finally { if (statusRef.current === controller) setStatusLoading(false); }
  }, [slug]);

  useEffect(() => {
    if (!expanded) return;
    void refreshStatus();
    const refresh = () => { if (!document.hidden && !requestRef.current) void refreshStatus(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      statusRef.current?.abort();
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [expanded, refreshStatus]);

  useEffect(() => () => { requestRef.current?.abort(); requestRef.current = null; statusRef.current?.abort(); }, [slug]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [messages]);
  useEffect(() => {
    if (!expanded || !availability?.resetAt) return;
    const delay = new Date(availability.resetAt).valueOf() - Date.now();
    if (!Number.isFinite(delay) || delay <= 0) return;
    const timer = setTimeout(() => { void refreshStatus(); }, delay + 1000);
    return () => clearTimeout(timer);
  }, [availability?.resetAt, expanded, refreshStatus]);
  useEffect(() => {
    if (!retryAt) return;
    const timer = setTimeout(() => { setRetryAt(0); void refreshStatus(); }, Math.max(0, retryAt - Date.now()));
    return () => clearTimeout(timer);
  }, [retryAt, refreshStatus]);

  const remaining = availability?.remaining;
  const reachedLimit = remaining !== undefined && remaining <= 0;
  const unavailable = !availability?.available;

  const handleSend = async () => {
    const question = input.trim();
    if (!question || loading || requestRef.current || reachedLimit || unavailable || retryAt > Date.now()) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setInput(''); setError(''); setLoading(true);
    setMessages((prev) => [...prev, { role: 'user', content: question }, { role: 'assistant', content: '' }]);
    let text = '';
    let completed = false;
    try {
      const history = messages.filter((message) => message.content).slice(-8).map((message) => ({ ...message, content: message.content.slice(0, 6000) }));
      while (history.reduce((sum, message) => sum + message.content.length, 0) > 12000) history.shift();
      const res = await fetch('/api/blog/chat', {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, question, history }),
      });
      if (!res.ok) {
        const data = await res.json();
        if (res.status === 429) setRetryAt(Date.now() + Number(res.headers.get('Retry-After') || 60) * 1000);
        throw new Error(data.error || '出错了，请稍后重试');
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error('没有收到回复，请重试');
      const parser = createSseDecoder((data) => {
        const event = readChatEvent(data);
        if (event.error) throw new Error(event.error);
        if (event.done) completed = true;
        if (event.text) {
          text += event.text;
          if (requestRef.current === controller) setMessages((prev) => [...prev.slice(0, -1), { role: 'assistant', content: text }]);
        }
      });
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          parser.push(chunk.value);
        }
        parser.finish();
      } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
      if (!completed || !text) throw new Error('回复连接已中断，请重试');
    } catch (caught) {
      if (requestRef.current === controller) {
        setError(controller.signal.aborted ? (text ? '已停止回复' : '已取消；未生成回复的请求不扣次数') : caught instanceof Error ? caught.message : '网络错误，请重试');
        if (!text) { setInput(question); setMessages((prev) => prev.slice(0, -2)); }
      }
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null; setLoading(false);
        requestAnimationFrame(() => inputRef.current?.focus());
        void refreshStatus();
      }
    }
  };

  return (
    <div className="mt-12 sm:mt-16 pt-8 sm:pt-10 border-t border-border/40 max-w-full sm:max-w-3xl">
      <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} aria-controls={`article-chat-${slug}`} className="px-0 hover:bg-transparent hover:text-primary">
        <MessageCircle className="h-4 w-4" />文章问答
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>
      {expanded && (
        <Card id={`article-chat-${slug}`} className="mt-4 p-4 sm:p-5">
          <div className="space-y-3 mb-4 max-h-96 overflow-y-auto" aria-label="文章问答记录" role="log" aria-live="polite" aria-busy={loading}>
            {messages.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">对文章内容有疑问？在这里向 AI 提问</p>}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted/80 text-foreground'}`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.role === 'assistant' && msg.content === '' && loading && i === messages.length - 1 && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="正在回答" />}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          {error && <p className="text-sm text-destructive mb-3" role="alert">{error}</p>}
          {statusLoading && !availability && <p className="text-sm text-muted-foreground" role="status">正在检查问答服务…</p>}
          {availability && unavailable && <div className="text-sm text-muted-foreground flex items-center justify-between gap-2"><span>{availability.error || '文章问答暂时不可用'}</span><Button variant="ghost" size="sm" disabled={statusLoading} onClick={() => void refreshStatus()}>重试</Button></div>}
          {!unavailable && <>
            {reachedLimit && <p className="text-sm text-muted-foreground mb-3" role="status">今天的提问次数已用完，明天再来吧。<Button variant="ghost" size="sm" disabled={statusLoading} onClick={() => void refreshStatus()}>刷新额度</Button></p>}
            <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void handleSend(); }}>
              <label className="sr-only" htmlFor={`chat-question-${slug}`}>关于文章的问题</label>
              <Input id={`chat-question-${slug}`} ref={inputRef} type="text" maxLength={1000} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault(); }} placeholder="输入你的问题…" disabled={loading || reachedLimit} className="flex-1 min-w-0" />
              {loading ? <Button type="button" size="icon" variant="outline" onClick={() => requestRef.current?.abort()} aria-label="停止回复"><Square className="h-4 w-4" /></Button> : <Button type="submit" size="icon" disabled={reachedLimit || !input.trim() || retryAt !== 0} aria-label="发送问题"><Send className="h-4 w-4" /></Button>}
            </form>
            <p className="text-xs text-muted-foreground mt-2 text-right" role="status">{retryAt !== 0 ? '请稍后再试' : `本篇文章今日剩余 ${remaining ?? '—'} 次 · 无回复不扣次数`}</p>
          </>}
        </Card>
      )}
    </div>
  );
}
