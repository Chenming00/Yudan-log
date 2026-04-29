import type { Metadata } from 'next';
import { ChatInterface } from './components/chat-interface';

export const metadata: Metadata = {
  title: 'AI 聊天 - 鱼蛋宝宝',
  description: '和鱼蛋小助手聊天，分析消费数据、讨论博客内容',
  openGraph: {
    title: 'AI 聊天 - 鱼蛋宝宝',
    description: '和鱼蛋小助手聊天，分析消费数据、讨论博客内容',
  },
};

export default function ChatPage() {
  return (
    <main className="min-h-screen">
      <ChatInterface />
    </main>
  );
}
