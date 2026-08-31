'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const MAX_QUESTIONS = 5;
const STORAGE_KEY_PREFIX = 'blog-chat-count-';

function getCount(slug: string): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem(STORAGE_KEY_PREFIX + slug) || '0', 10) || 0;
}

function incrementCount(slug: string) {
  const next = getCount(slug) + 1;
  localStorage.setItem(STORAGE_KEY_PREFIX + slug, String(next));
  return next;
}

export function AiChat({ slug }: { slug: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuestionCount(getCount(slug));
  }, [slug]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const remaining = MAX_QUESTIONS - questionCount;
  const reachedLimit = remaining <= 0;

  const handleSend = async () => {
    const question = input.trim();
    if (!question || loading || reachedLimit) return;

    setInput('');
    const userMessage: Message = { role: 'user', content: question };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    const newCount = incrementCount(slug);
    setQuestionCount(newCount);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/blog/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, question, history }),
      });

      if (!res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.error || '出错了，请稍后再试' },
        ]);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let text = '';
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

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
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: text };
                return updated;
              });
            }
          } catch {
            // skip malformed JSON chunks
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '网络错误，请稍后再试' },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="mt-12 sm:mt-16 pt-8 sm:pt-10 border-t border-border/40 max-w-full sm:max-w-3xl">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(!expanded)}
        className="px-0 hover:bg-transparent hover:text-primary"
      >
        <MessageCircle className="h-4 w-4" />
        文章问答
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

      {expanded && (
        <Card className="mt-4 p-4 sm:p-5">
          {/* 消息列表 */}
          <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">
                对文章内容有疑问？在这里向 AI 提问
              </p>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/80 text-foreground'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.role === 'assistant' && msg.content === '' && loading && i === messages.length - 1 && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入框 */}
          {reachedLimit ? (
            <p className="text-sm text-muted-foreground text-center py-3">
              本篇文章问答次数已用完
            </p>
          ) : (
            <>
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="输入你的问题..."
                  disabled={loading}
                  className="flex-1"
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  aria-label="发送问题"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground/60 mt-2 text-right">
                剩余 {remaining} 次提问机会
              </p>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
