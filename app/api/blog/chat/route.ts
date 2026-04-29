import { NextRequest, NextResponse } from 'next/server';
import { getPostBySlug, stripMarkdown } from '@/lib/blog';

const MIMO_BASE_URL = process.env.MIMO_BASE_URL || '';
const MIMO_API_KEY = process.env.MIMO_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    if (!MIMO_BASE_URL || !MIMO_API_KEY) {
      return NextResponse.json(
        { error: 'AI not configured' },
        { status: 503 },
      );
    }

    const { slug, question, history } = await req.json();
    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
    }
    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Missing question' }, { status: 400 });
    }

    const post = getPostBySlug(slug);
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const plainText = stripMarkdown(post.content).slice(0, 4000);

    const endpoint = MIMO_BASE_URL.replace(/\/+$/, '').endsWith('/v1/chat/completions')
      ? MIMO_BASE_URL.replace(/\/+$/, '')
      : `${MIMO_BASE_URL.replace(/\/+$/, '')}/v1/chat/completions`;

    const messages = [
      {
        role: 'system',
        content: `你是一个文章问答助手。以下是文章内容，请基于文章内容回答用户的问题。如果文章中没有相关信息，请如实说明。回答要求简洁、准确，使用中文。

文章标题：${post.title}

文章内容：
${plainText}`,
      },
      ...(Array.isArray(history) ? history : []),
      { role: 'user', content: question },
    ];

    const mimoRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MIMO_API_KEY}`,
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
      return NextResponse.json(
        { error: 'AI service error' },
        { status: 502 },
      );
    }

    const reader = mimoRes.body?.getReader();
    if (!reader) {
      return NextResponse.json(
        { error: 'No response body' },
        { status: 502 },
      );
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
