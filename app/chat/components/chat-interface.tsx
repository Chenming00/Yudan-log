'use client';

import { useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { MessageBubble } from './message-bubble';
import { ChatInput } from './chat-input';
import { BotMessageSquare } from 'lucide-react';

const WELCOME_MESSAGE: UIMessage = {
  id: 'welcome',
  role: 'assistant',
  parts: [{ type: 'text', text: '你好！我是鱼蛋小助手 🐟\n\n我可以帮你：\n- 分析消费数据，看看钱花在了哪里\n- 聊聊你写的博客文章\n\n有什么想问的？' }],
};

function getTextFromMessage(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

export function ChatInterface() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const isLoading = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const allMessages = [WELCOME_MESSAGE, ...messages];

  return (
    <div className="flex flex-col h-[100dvh]">
      {/* Header */}
      <header className="shrink-0 border-b border-border/50 bg-white/80 backdrop-blur-lg px-4 py-3">
        <div className="flex items-center gap-2.5 max-w-2xl mx-auto">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <BotMessageSquare className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">鱼蛋小助手</h1>
            <p className="text-[11px] text-muted-foreground">AI 助手</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        <div className="max-w-2xl mx-auto space-y-4">
          {allMessages.map((msg) => (
            <MessageBubble
              key={msg.id}
              role={msg.role as 'user' | 'assistant'}
              content={getTextFromMessage(msg)}
            />
          ))}
          {isLoading &&
            allMessages[allMessages.length - 1]?.role !== 'assistant' && (
              <MessageBubble role="assistant" content="" isLoading />
            )}
        </div>
      </div>

      {/* Input */}
      <ChatInput
        onSend={(msg) => {
          sendMessage({ text: msg });
        }}
        disabled={isLoading}
      />
    </div>
  );
}
