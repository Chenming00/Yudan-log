import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { buildSystemPrompt } from '@/lib/ai';

const mimo = createOpenAI({
  baseURL: process.env.MIMO_BASE_URL,
  apiKey: process.env.MIMO_API_KEY,
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const systemPrompt = await buildSystemPrompt();

  const result = streamText({
    model: mimo('MiMo-V2.5-Pro'),
    system: systemPrompt,
    messages,
  });

  return result.toTextStreamResponse();
}
