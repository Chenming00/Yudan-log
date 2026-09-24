import type { APIRoute } from 'astro';
/** Telegram ingestion was intentionally retired. Keep the route for a clear client-facing response. */
export const POST: APIRoute = async () => new Response(
  JSON.stringify({ ok: false, error: 'Telegram 记账入口已停用，请使用网页或直接 API。' }),
  {
    status: 410,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  },
);
