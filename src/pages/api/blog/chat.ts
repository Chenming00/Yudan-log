import type { APIRoute } from 'astro';
import { getSupabaseAdminClient } from '../../../../lib/supabase';
import { getBlogEntries, stripMarkdown } from '../../../lib/astro-blog';
import { createBlogChatHandlers, type BlogChatConfig, type ChatQuota } from '../../../lib/blog-chat-server';

function env(key: string) { return process.env[key] || import.meta.env[key] || ''; }
function limit(key: string, fallback: number, max: number) {
  const value = Number(env(key));
  return Number.isInteger(value) && value > 0 ? Math.min(value, max) : fallback;
}
function handlers() {
  const config: BlogChatConfig = {
    baseUrl: env('MIMO_BASE_URL'), apiKey: env('MIMO_API_KEY'), cookieSecret: env('BLOG_CHAT_COOKIE_SECRET'),
    dailyLimit: limit('BLOG_CHAT_DAILY_LIMIT', 5, 100), globalDailyLimit: limit('BLOG_CHAT_GLOBAL_DAILY_LIMIT', 100, 100000),
    rateLimit: limit('BLOG_CHAT_RATE_LIMIT', 3, 60), globalRateLimit: limit('BLOG_CHAT_GLOBAL_RATE_LIMIT', 20, 1000),
    maxOutputTokens: limit('BLOG_CHAT_MAX_OUTPUT_TOKENS', 800, 2000),
  };
  return createBlogChatHandlers({
    config,
    async getPost(slug) {
      const post = (await getBlogEntries()).find((entry) => entry.id === slug);
      return post ? { title: post.data.title, text: stripMarkdown(post.body || '') } : null;
    },
    async quota(action, visitor, slug) {
      const args = { p_visitor: visitor, p_article: slug, p_daily_limit: config.dailyLimit, p_global_limit: config.globalDailyLimit };
      const { data, error } = await getSupabaseAdminClient().rpc(`blog_chat_${action}`, action === 'reserve' ? { ...args, p_rate_limit: config.rateLimit, p_global_rate_limit: config.globalRateLimit } : args).abortSignal(AbortSignal.timeout(10000));
      if (error) throw error;
      return data as ChatQuota;
    },
    async finish(ticket, produced) {
      const { error } = await getSupabaseAdminClient().rpc('blog_chat_finish', { p_ticket: ticket, p_produced: produced }).abortSignal(AbortSignal.timeout(10000));
      if (error) throw error;
    },
  });
}
export const GET: APIRoute = ({ request }) => handlers().GET(request);
export const POST: APIRoute = ({ request }) => handlers().POST(request);
