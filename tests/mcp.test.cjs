const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { createMcpHandler } = require('@modelcontextprotocol/server');

const token = 'mcp-test-only';
const requestId = 'f850b722-bebd-442c-a139-9f17203dfce1';
const id = 'bdad71d7-2725-46eb-9f53-536826ba4f3e';

async function readMcpResponse(response) {
  const text = await response.text();
  const data = response.headers.get('content-type')?.includes('text/event-stream')
    ? JSON.parse(text.split('\n').find((line) => line.startsWith('data: ')).slice(6))
    : JSON.parse(text);
  return { response, data };
}

function fixture() {
  const calls = [];
  const state = { status: 200, body: { success: true, data: [] }, fail: false };
  const modules = new Map();
  function load(filename) {
    if (modules.has(filename)) return modules.get(filename).exports;
    const module = { exports: {} };
    modules.set(filename, module);
    // Keep the real auth implementation; only Astro's build-time env is substituted.
    const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env', '({})');
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const dependency = (name) => {
      if (name.endsWith('/supabase')) return { getSupabaseClient: () => assert.fail('MCP API Key auth must not use OAuth') };
      if (filename.endsWith('/api/mcp.ts') && name.startsWith('./')) {
        const handle = async ({ request, url }) => {
          calls.push({ method: request.method, path: url.pathname, query: Object.fromEntries(url.searchParams), authorization: request.headers.get('authorization'), body: request.method === 'GET' ? null : await request.json() });
          if (state.fail) throw new Error('private-service-secret');
          return new Response(JSON.stringify(state.body), { status: state.status, headers: { 'Content-Type': 'application/json' } });
        };
        return { GET: handle, POST: handle, PATCH: handle, DELETE: handle };
      }
      return name.startsWith('.') ? load(path.resolve(path.dirname(filename), `${name}.ts`)) : require(name);
    };
    new Function('require', 'exports', 'module', compiled)(dependency, module.exports, module);
    return module.exports;
  }
  const { ALL } = load(path.resolve(__dirname, '../src/pages/api/mcp.ts'));
  let nextId = 0;
  async function invoke(message, options = {}) {
    const previous = process.env.API_KEY;
    process.env.API_KEY = options.serverKey ?? token;
    try {
      const method = options.method || 'POST';
      const request = new Request(`https://example.test/api/mcp${options.query || ''}`, {
        method, headers: {
          'Content-Type': 'application/json', Accept: 'application/json, text/event-stream',
          'MCP-Protocol-Version': '2025-11-25',
          ...(options.auth === false ? {} : { Authorization: `Bearer ${token}` }), ...options.headers,
          ...(options.headers?.['MCP-Protocol-Version'] === '2026-07-28' ? {
            'Mcp-Method': message.method,
            ...(message.params?.name ? { 'Mcp-Name': message.params.name } : {}),
          } : {}),
        },
        ...(method === 'POST' ? { body: options.raw ?? JSON.stringify({ jsonrpc: '2.0', id: ++nextId, ...message }) } : {}),
      });
      const response = await ALL({ request, url: new URL(request.url) });
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
      return await readMcpResponse(response);
    } finally {
      if (previous === undefined) delete process.env.API_KEY;
      else process.env.API_KEY = previous;
    }
  }
  const tool = (name, args, options) => invoke({ method: 'tools/call', params: { name, arguments: args } }, options);
  const { createYudanMcpServer: createServer } = load(path.resolve(__dirname, '../src/lib/mcp-server.ts'));
  return { invoke, tool, calls, state, createServer };
}

test('MCP protects discovery and tools, rejects foreign origins, and requires POST', async () => {
  const f = fixture();
  for (const options of [{ auth: false }, { headers: { Authorization: 'Bearer incorrect' } }, { serverKey: '' }, { auth: false, query: `?api_key=${token}` }]) {
    const { response } = await f.invoke({ method: 'tools/list' }, options);
    assert.equal(response.status, 401);
    assert.match(response.headers.get('www-authenticate'), /Bearer/);
  }
  for (const origin of ['https://evil.test', 'null', 'https://example.test.evil.test', 'http://example.test']) {
    assert.equal((await f.invoke({ method: 'tools/list' }, { headers: { Origin: origin } })).response.status, 403);
  }
  assert.equal((await f.invoke({ method: 'tools/list' }, { headers: { Origin: 'https://example.test' } })).response.status, 200);
  for (const method of ['GET', 'DELETE', 'OPTIONS']) {
    const { response } = await f.invoke({}, { method });
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'POST');
  }
  assert.equal(f.calls.length, 0);
});

test('MCP negotiates legacy clients statelessly and advertises validated, annotated tools', async () => {
  const f = fixture();
  const initialized = await f.invoke({ method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test-client', version: '1.0.0' } } });
  assert.equal(initialized.response.status, 200);
  assert.equal(initialized.data.result.serverInfo.name, 'yudan-log');
  assert.equal(initialized.response.headers.get('mcp-session-id'), null);
  const { data } = await f.invoke({ method: 'tools/list' });
  const tools = data.result.tools;
  assert.equal(tools.length, 10);
  assert.equal(tools.find((tool) => tool.name === 'get_dashboard').annotations.readOnlyHint, true);
  assert.equal(tools.find((tool) => tool.name === 'delete_transaction').annotations.destructiveHint, true);
  assert.ok(tools.find((tool) => tool.name === 'save_weight').inputSchema.required.includes('expected_updated_at'));
  assert.ok(tools.find((tool) => tool.name === 'add_transaction').inputSchema.required.includes('request_id'));
  assert.equal(f.calls.length, 0);
});

test('MCP forwards filters and every operation only to the expected existing handler', async () => {
  const f = fixture();
  const operations = [
    ['list_transactions', { year: 2026, month: 10, q: '奶粉 & 奶瓶', limit: 2, cursor: 'opaque-cursor' }, 'GET', '/api/list'],
    ['get_monthly_summary', { year: 2026, month: 10 }, 'GET', '/api/monthly'],
    ['add_transaction', { request_id: requestId, amount: 29.9, type: 'expense', brand: '品牌', product: '奶瓶', transaction_time: null }, 'POST', '/api/add'],
    ['edit_transaction', { request_id: requestId, id, expected_version: 3, note: '修改', brand: null }, 'PATCH', '/api/edit'],
    ['delete_transaction', { request_id: requestId, id, expected_version: 4 }, 'DELETE', '/api/delete'],
    ['get_dashboard', {}, 'GET', '/api/yudan'],
    ['get_vaccine_schedule', {}, 'GET', '/api/yudan/vaccines'],
    ['get_care_schedule', {}, 'GET', '/api/yudan/care'],
  ];
  for (const [name, input, method, path] of operations) {
    const { data, response } = await f.tool(name, input);
    assert.equal(response.status, 200);
    assert.equal(data.result.isError, undefined);
    const call = f.calls.at(-1);
    assert.equal(call.method, method);
    assert.equal(call.path, path);
    assert.equal(call.authorization, `Bearer ${token}`);
    assert.deepEqual(method === 'GET' ? call.query : call.body, method === 'GET' ? Object.fromEntries(Object.entries(input).map(([key, value]) => [key, String(value)])) : input);
  }
});

test('MCP supports per-request discovery and tools in the modern protocol', async () => {
  const f = fixture();
  const options = { headers: { 'MCP-Protocol-Version': '2026-07-28' } };
  const meta = { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientCapabilities': {} };
  const discovery = await f.invoke({ method: 'server/discover', params: { _meta: meta } }, options);
  assert.equal(discovery.response.status, 200, JSON.stringify(discovery.data));
  assert.ok(discovery.data.result);
  const tools = await f.invoke({ method: 'tools/list', params: { _meta: meta } }, options);
  assert.equal(tools.response.status, 200, JSON.stringify(tools.data));
  assert.equal(tools.data.result.tools.length, 10);
  const call = await f.invoke({ method: 'tools/call', params: { _meta: meta, name: 'get_care_schedule', arguments: {} } }, options);
  assert.equal(call.response.status, 200, JSON.stringify(call.data));
  assert.equal(f.calls.at(-1).path, '/api/yudan/care');
});

test('health tools preserve idempotency and exact versions when mapping to record mutations', async () => {
  const f = fixture();
  const weight = { request_id: requestId, date: '2026-08-26', weight: 3.08, expected_updated_at: null };
  await f.tool('save_weight', weight);
  await f.tool('save_weight', weight);
  assert.deepEqual(f.calls[0].body, { request_id: requestId, kind: 'weight', key: weight.date, action: 'save', expected_updated_at: null, changes: { weight_kg: 3.08 } });
  assert.deepEqual(f.calls[0], f.calls[1]);
  const version = '2026-08-12T00:00:00.123456+00:00';
  await f.tool('save_vaccination', { request_id: requestId, plan_id: 'schedule-001', actual_date: '2026-08-12', expected_updated_at: version });
  assert.deepEqual(f.calls[2].body, { request_id: requestId, kind: 'vaccine', key: 'schedule-001', action: 'save', expected_updated_at: version, changes: { administered_on: '2026-08-12' } });
});

test('MCP rejects unknown tools and invalid arguments before dispatch', async () => {
  const f = fixture();
  for (const [name, input] of [
    ['unknown_tool', {}], ['get_dashboard', { url: 'https://evil.test' }],
    ['list_transactions', { limit: 101 }], ['get_monthly_summary', { year: 2026, month: 13 }],
    ['add_transaction', { amount: 1, type: 'expense' }],
    ['delete_transaction', { request_id: requestId, id }],
    ['edit_transaction', { request_id: requestId, id, expected_version: 0, note: 'x' }],
    ['save_weight', { request_id: requestId, date: '2026-08-12', weight: 3 }],
    ['save_weight', { request_id: requestId, date: '2026-08-12', weight: '3', expected_updated_at: null }],
    ['save_vaccination', { request_id: requestId, actual_date: '2026-08-12', expected_updated_at: null }],
  ]) {
    const { data } = await f.tool(name, input);
    assert.ok(data.error || data.result?.isError, `${name} should reject input`);
  }
  assert.equal(f.calls.length, 0);
});

test('shared schemas retain strict add requirements after partial edit validation', async () => {
  const f = fixture();
  const edit = { request_id: requestId, id, expected_version: 3, note: '只修改备注' };
  assert.equal((await f.tool('edit_transaction', edit)).data.result.isError, undefined);
  assert.deepEqual(f.calls[0].body, edit);
  for (const input of [
    { request_id: requestId, note: '缺少金额和类型' },
    { request_id: requestId, amount: 1, type: 'expense', currency: 'CNY' },
  ]) {
    const { data } = await f.tool('add_transaction', input);
    assert.ok(data.error || data.result?.isError);
  }
  assert.equal(f.calls.length, 1);
  const add = { request_id: requestId, amount: 1, type: 'expense' };
  assert.equal((await f.tool('add_transaction', add)).data.result.isError, undefined);
  assert.deepEqual(f.calls[1].body, add);
  const { data } = await f.invoke({ method: 'tools/list' });
  const schema = data.result.tools.find((tool) => tool.name === 'add_transaction').inputSchema;
  assert.deepEqual(schema.required.toSorted(), ['amount', 'request_id', 'type']);
  assert.equal(schema.additionalProperties, false);
});

test('servers sharing schemas keep concurrent callbacks and results isolated', { timeout: 5000 }, async () => {
  const { createServer } = fixture();
  const calls = [];
  let release;
  const bothStarted = new Promise((resolve) => { release = resolve; });
  const handlers = ['first', 'second'].map((scope) => createMcpHandler(() => createServer(async (method, path, input) => {
    calls.push({ scope, method, path, input });
    if (calls.length === 2) release();
    await bothStarted;
    return Response.json({ success: true, scope, input });
  })));
  const call = (handler, q) => handler.fetch(new Request('https://example.test/api/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': '2025-11-25' },
    body: JSON.stringify({ jsonrpc: '2.0', id: q, method: 'tools/call', params: { name: 'list_transactions', arguments: { q } } }),
  })).then(readMcpResponse);
  try {
    const responses = await Promise.all(handlers.map((handler, index) => call(handler, `query-${index}`)));
    for (const [index, scope] of ['first', 'second'].entries()) {
      assert.equal(responses[index].response.status, 200);
      assert.deepEqual(responses[index].data.result.structuredContent, { success: true, scope, input: { q: `query-${index}` } });
      assert.deepEqual(calls.find((entry) => entry.scope === scope), { scope, method: 'GET', path: '/api/list', input: { q: `query-${index}` } });
    }
    await handlers[0].close();
    const next = await call(handlers[1], 'still-second');
    assert.deepEqual(next.data.result.structuredContent, { success: true, scope: 'second', input: { q: 'still-second' } });
  } finally {
    await Promise.all(handlers.map((handler) => handler.close()));
  }
});

test('MCP keeps actionable conflicts but redacts internal failures', async () => {
  const f = fixture();
  f.state.status = 409;
  f.state.body = { error: '记录已修改', code: 'LEDGER_CONFLICT', current: { id, version: 4 }, request_id: requestId };
  let { data } = await f.tool('delete_transaction', { request_id: requestId, id, expected_version: 3 });
  assert.equal(data.result.isError, true);
  assert.equal(data.result.structuredContent.status, 409);
  assert.deepEqual(data.result.structuredContent.current, f.state.body.current);
  assert.deepEqual(JSON.parse(data.result.content[0].text), data.result.structuredContent);
  f.state.status = 503;
  f.state.body = { error: 'private-service-secret', code: 'LEDGER_MIGRATION_REQUIRED', trace_id: 'trace' };
  ({ data } = await f.tool('get_dashboard', {}));
  assert.equal(data.result.structuredContent.code, 'LEDGER_MIGRATION_REQUIRED');
  assert.equal(data.result.structuredContent.trace_id, 'trace');
  assert.ok(!JSON.stringify(data).includes('private-service-secret'));
  f.state.fail = true;
  ({ data } = await f.tool('get_dashboard', {}));
  assert.equal(data.result.isError, true);
  assert.ok(!JSON.stringify(data).includes('private-service-secret'));
});

test('MCP rejects bad JSON, unsupported protocol versions and oversized bodies', async () => {
  const f = fixture();
  assert.equal((await f.invoke({}, { raw: '{' })).response.status, 400);
  assert.equal((await f.invoke({ method: 'tools/list' }, { headers: { 'MCP-Protocol-Version': 'invalid' } })).response.status, 400);
  assert.equal((await f.invoke({}, { raw: 'x'.repeat(65537) })).response.status, 413);
  assert.equal((await f.invoke({}, { raw: JSON.stringify({ text: '中'.repeat(23000) }) })).response.status, 413);
  assert.equal(f.calls.length, 0);
});
