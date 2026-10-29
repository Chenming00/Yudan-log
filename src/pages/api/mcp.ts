import type { APIRoute } from 'astro';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { json, validateApiKey } from '../../lib/http';
import { createYudanMcpServer } from '../../lib/mcp-server';
import { GET as list } from './list';
import { GET as monthly } from './monthly';
import { POST as add } from './add';
import { PATCH as edit } from './edit';
import { DELETE as remove } from './delete';
import { GET as dashboard } from './yudan/index';
import { GET as vaccines } from './yudan/vaccines';
import { GET as care } from './yudan/care';
import { POST as records } from './yudan/records';

const routes: Record<string, APIRoute> = {
  'GET /api/list': list, 'GET /api/monthly': monthly,
  'POST /api/add': add, 'PATCH /api/edit': edit, 'DELETE /api/delete': remove,
  'GET /api/yudan': dashboard, 'GET /api/yudan/vaccines': vaccines,
  'GET /api/yudan/care': care, 'POST /api/yudan/records': records,
};

export const ALL: APIRoute = async (context) => {
  const { request, url } = context;
  const headers = { 'Cache-Control': 'private, no-store' };
  // Native MCP clients normally send no Origin. Browser requests must be same-origin.
  const origin = request.headers.get('origin');
  if (origin !== null && origin !== url.origin) return json({ error: '不允许的请求来源' }, { status: 403, headers });
  if (!validateApiKey(request)) return json({ error: 'API Key 无效或未提供' }, {
    status: 401, headers: { ...headers, 'WWW-Authenticate': 'Bearer realm="yudan-mcp"' },
  });
  if (request.method !== 'POST') return json({ error: '请使用 MCP 客户端通过 Streamable HTTP POST 连接。' }, {
    status: 405, headers: { ...headers, Allow: 'POST' },
  });

  const handler = createMcpHandler(() => createYudanMcpServer(async (method, path, input = {}) => {
    const route = routes[`${method} ${path}`];
    if (!route) throw new Error('Unknown internal MCP route');
    const apiUrl = new URL(path, url.origin);
    if (method === 'GET') {
      for (const [key, value] of Object.entries(input)) if (value !== undefined) apiUrl.searchParams.set(key, String(value));
    }
    const apiRequest = new Request(apiUrl, {
      method, signal: request.signal,
      headers: { Authorization: request.headers.get('authorization')!, 'Content-Type': 'application/json' },
      ...(method === 'GET' ? {} : { body: JSON.stringify(input) }),
    });
    // Call the existing handlers in process: no HTTP roundtrip or credential forwarding to another host.
    const apiContext: typeof context = Object.create(context, {
      request: { value: apiRequest }, url: { value: apiUrl },
    });
    return await route(apiContext);
  }), { maxRequestBodySize: 64 * 1024 });
  try {
    const response = await handler.fetch(request);
    response.headers.set('Cache-Control', headers['Cache-Control']);
    return response;
  } catch {
    return json({ error: 'MCP 服务暂时不可用，请稍后重试。' }, { status: 500, headers });
  } finally {
    await handler.close();
  }
};
