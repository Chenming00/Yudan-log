import { getAllPosts } from '@/lib/blog';
import { fetchTransactions, formatTransactions, summarizeTransactions } from '@/lib/chat-utils';

export async function buildSystemPrompt(): Promise<string> {
  const [transactions, posts] = await Promise.all([
    fetchTransactions(),
    Promise.resolve(getAllPosts()),
  ]);

  const txLines = formatTransactions(transactions);
  const txSummary = summarizeTransactions(transactions);

  const blogLines = posts
    .map((p) => `- ${p.title}（${p.date}）：${p.summary}`)
    .join('\n');

  return `你是一个个人生活助手，名叫「鱼蛋小助手」。你说话亲切、友好，用中文回复。

## 你的能力
- 帮助用户分析消费数据，给出理财建议
- 根据用户博客内容，讨论相关话题
- 回答关于用户生活记录的问题

## 用户的消费数据
${txLines}

## 消费数据摘要
${txSummary}

## 用户的博客文章
${blogLines || '暂无博客文章。'}

## 注意事项
- 如果用户询问的数据不在上述范围内，诚实告知你没有这些数据
- 不要编造消费数据，始终基于上面提供的数据回答
- 保持简洁友好的回复风格
- 如果用户问的问题和消费、博客无关，你也可以正常聊天，但要说明你主要擅长分析消费数据和博客内容`;
}
