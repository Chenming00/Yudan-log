import type { APIRoute } from 'astro';
import { json } from '../../../lib/http';
import { getBlogEntries, stripMarkdown } from '../../../lib/astro-blog';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function getMimoEndpoint(baseUrl: string) {
  const trimmed = baseUrl.replace(/\/+$/, '');
  return trimmed.endsWith('/v1/chat/completions') ? trimmed : `${trimmed}/v1/chat/completions`;
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as Record<string, unknown>;
  return (
    (message.role === 'user' || message.role === 'assistant') &&
    typeof message.content === 'string'
  );
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const mimoBaseUrl = process.env.MIMO_BASE_URL || import.meta.env.MIMO_BASE_URL || '';
    const mimoApiKey = process.env.MIMO_API_KEY || import.meta.env.MIMO_API_KEY || '';

    if (!mimoBaseUrl || !mimoApiKey) {
      return json({ error: 'AI not configured' }, { status: 503 });
    }

    const { slug, question, history } = await request.json();
    if (!slug || typeof slug !== 'string') {
      return json({ error: 'Missing slug' }, { status: 400 });
    }
    if (!question || typeof question !== 'string') {
      return json({ error: 'Missing question' }, { status: 400 });
    }

    const posts = await getBlogEntries();
    const post = posts.find((entry) => entry.id === slug);
    if (!post) {
      return json({ error: 'Post not found' }, { status: 404 });
    }

    const plainText = stripMarkdown(post.body ?? '').slice(0, 4000);
    const safeHistory = Array.isArray(history) ? history.filter(isChatMessage).slice(-8) : [];
    const endpoint = getMimoEndpoint(mimoBaseUrl);

    const messages = [
      {
        role: 'system',
        content: `你是一个文章问答助手。以下是文章内容，请基于文章内容回答用户的问题。如果文章中没有相关信息，请如实说明。回答要求简洁、准确，使用中文。

文章标题：${post.data.title}

文章内容：
${plainText}`,
      },
      ...safeHistory,
      { role: 'user', content: question },
    ];

    const mimoRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mimoApiKey}`,
      },
      body: JSON.stringify({
        model: 'mimo-v2.5',
        stream: true,
        messages,
      }),
    });

    if (!mimoRes.ok) {
      const errText = await mimoRes.text();
      console.error('MIMO API error:', mimoRes.status, errText);
      return json({ error: 'AI service error' }, { status: 502 });
    }

    const reader = mimoRes.body?.getReader();
    if (!reader) {
      return json({ error: 'No response body' }, { status: 502 });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(decoder.decode(value, { stream: true })));
      },
      cancel() {
        void reader.cancel();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Blog chat error:', message);
    return json({ error: message }, { status: 500 });
  }
};
