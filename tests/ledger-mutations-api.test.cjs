const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { randomUUID } = require('node:crypto');
const { PGlite } = require('@electric-sql/pglite');

const id = '12345678-1234-1234-1234-123456789abc';
const requestId = '23456789-2345-2345-2345-23456789abcd';
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const row = { id, amount: 29.9, type: 'expense', brand: null, product: '奶瓶', note: null, category: '喂养用品', transaction_time: null, created_at: '2026-09-24T00:00:00Z', version: 2 };

function fixture() {
  const calls = [];
  const logs = [];
  const state = {
    auth: async () => ({ method: 'api-key' }),
    rpc: async () => ({ data: { success: true, data: row, replayed: false }, error: null }),
    admin: () => ({ rpc: async (name, args) => { calls.push({ name, args }); return state.rpc(name, args); } }),
  };
  const modules = new Map();
  function load(filename) {
    if (modules.has(filename)) return modules.get(filename).exports;
    const module = { exports: {} };
    modules.set(filename, module);
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    const dependency = (name) => {
      if (name.endsWith('/supabase')) return { getSupabaseAdminClient: () => state.admin() };
      if (name.endsWith('/http')) return {
        validateWriteAuth: (request) => state.auth(request),
        json: (body, init) => new Response(JSON.stringify(body), { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } }),
      };
      return name.startsWith('.') ? load(path.resolve(path.dirname(filename), `${name}.ts`)) : require(name);
    };
    new Function('require', 'exports', 'module', 'console', compiled)(dependency, module.exports, module, { error: (...args) => logs.push(args) });
    return module.exports;
  }
  async function invoke(action, value, options = {}) {
    const method = { add: 'POST', edit: 'PATCH', delete: 'DELETE' }[action];
    const route = load(path.resolve(__dirname, `../src/pages/api/${action}.ts`));
    const body = options.raw === undefined ? JSON.stringify(value) : options.raw;
    const request = new Request(`http://localhost/api/${action}`, { method, body, headers: options.headers });
    const response = await route[method]({ request });
    const data = await response.json();
    assert.match(data.trace_id, uuid);
    assert.equal(response.headers.get('x-trace-id'), data.trace_id);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    return { response, data };
  }
  return { state, calls, logs, invoke };
}

test('all write routes handle missing authorization and authentication failures without database access or secrets', async () => {
  const f = fixture();
  const traces = new Set();
  for (const action of ['add', 'edit', 'delete']) {
    f.state.auth = async () => null;
    let result = await f.invoke(action, {});
    assert.equal(result.response.status, 401);
    assert.equal(result.data.code, 'UNAUTHORIZED');
    traces.add(result.data.trace_id);
    f.state.auth = async () => { throw new Error('private-auth-token'); };
    result = await f.invoke(action, {});
    assert.equal(result.response.status, 500);
    assert.equal(result.data.code, 'LEDGER_AUTH_FAILED');
    assert.ok(!JSON.stringify(result.data).includes('private-auth-token'));
    traces.add(result.data.trace_id);
  }
  assert.equal(traces.size, 6);
  assert.equal(f.calls.length, 0);
  assert.ok(!JSON.stringify(f.logs).includes('private-auth-token'));
});

test('legacy add gets a request ID while supplied IDs and replay responses survive the real route', async () => {
  const f = fixture();
  let result = await f.invoke('add', { amount: '29.90', type: 'expense', brand: ' 品牌 ', category: 'feeding', transaction_time: '2024-02-29T08:30+08:00' });
  assert.equal(result.response.status, 200);
  assert.match(result.data.request_id, uuid);
  assert.notEqual(result.data.trace_id, result.data.request_id);
  assert.deepEqual(f.calls[0], { name: 'ledger_mutate', args: {
    p_action: 'add', p_request_id: result.data.request_id, p_id: null, p_expected_version: null,
    p_fields: { amount: 29.9, type: 'expense', brand: '品牌', category: '喂养用品', transaction_time: '2024-02-29T00:30:00.000Z' },
  } });
  f.state.rpc = async () => ({ data: { success: true, data: row, replayed: true }, error: null });
  result = await f.invoke('add', { amount: 29.9, type: 'expense', request_id: requestId });
  assert.equal(result.data.request_id, requestId);
  assert.equal(result.data.replayed, true);
  assert.deepEqual(result.data.data, row);
  assert.equal(f.calls[1].args.p_request_id, requestId);
});

test('edit and delete require a read version and dispatch only validated mutation fields', async () => {
  const f = fixture();
  for (const action of ['edit', 'delete']) {
    for (const expected_version of [undefined, null, 0, -1, 1.5, '1', 2147483648]) {
      const result = await f.invoke(action, { id, expected_version, ...(action === 'edit' ? { note: 'x' } : {}) });
      assert.equal(result.response.status, 400);
      assert.match(result.data.error, /expected_version/);
    }
    for (const badId of [undefined, null, '', 'x', 123]) {
      const result = await f.invoke(action, { id: badId, expected_version: 1, ...(action === 'edit' ? { note: 'x' } : {}) });
      assert.equal(result.response.status, 400);
    }
  }
  assert.equal(f.calls.length, 0);
  await f.invoke('edit', { id, expected_version: 1, request_id: requestId, note: ' 修改 ', transaction_time: null });
  await f.invoke('delete', { id, expected_version: 2, request_id: requestId });
  assert.deepEqual(f.calls.map(({ args }) => args), [
    { p_action: 'edit', p_request_id: requestId, p_id: id, p_expected_version: 1, p_fields: { note: '修改', transaction_time: null } },
    { p_action: 'delete', p_request_id: requestId, p_id: id, p_expected_version: 2, p_fields: {} },
  ]);
});

test('malformed JSON, non-object bodies, unexpected fields and invalid request IDs are rejected before RPC', async () => {
  const f = fixture();
  for (const value of [null, [], 1, true, 'text', { amount: 1, type: 'expense', typo: 'x' }, { amount: 1, type: 'expense', id }]) {
    assert.equal((await f.invoke('add', value)).response.status, 400);
  }
  for (const raw of ['', '{', new Uint8Array([123, 34, 120, 34, 58, 34, 255, 34, 125])]) {
    const result = await f.invoke('add', undefined, { raw });
    assert.equal(result.response.status, 400);
    assert.equal(result.data.code, 'INVALID_INPUT');
  }
  for (const request_id of [null, '', 'bad', [], 123]) {
    assert.equal((await f.invoke('add', { amount: 1, type: 'expense', request_id })).response.status, 400);
  }
  assert.equal((await f.invoke('delete', { id, expected_version: 1, note: 'x' })).response.status, 400);
  assert.equal((await f.invoke('edit', { id, expected_version: 1 })).response.status, 400);
  assert.equal(f.calls.length, 0);
});

test('body size is capped by UTF-8 bytes even without a reliable Content-Length', async () => {
  const f = fixture();
  for (const options of [
    { raw: '{}', headers: { 'content-length': '65537' } },
    { raw: JSON.stringify({ note: '中'.repeat(23000) }) },
    { raw: JSON.stringify({ note: 'x'.repeat(65536) }), headers: { 'content-length': '1' } },
  ]) {
    const result = await f.invoke('add', undefined, options);
    assert.equal(result.response.status, 413);
    assert.equal(result.data.code, 'PAYLOAD_TOO_LARGE');
  }
  assert.equal(f.calls.length, 0);
  assert.equal((await f.invoke('add', { amount: 1, type: 'expense', note: '中'.repeat(10000) })).response.status, 200);
});

test('amount and ISO date validation rejects precision overflow and JavaScript date normalization', async () => {
  const f = fixture();
  for (const amount of ['90071992547409.91', '999999999.999', 1000000000, '1e2', 0, -1, '0.001', true]) {
    assert.equal((await f.invoke('add', { amount, type: 'expense' })).response.status, 400);
  }
  for (const transaction_time of ['2026-02-29T00:00:00Z', '1900-02-29T00:00:00Z', '2026-09-24T24:00:00Z', '2026-09-24T23:60:00Z', '2026-09-24T23:59:60Z', '2026-09-24T00:00:00+24:00', '2026-09-24T00:00:00+08:60', '0999-09-24T00:00:00Z', '9999-09-24T00:00:00Z', '2026-09-24T00:00:00']) {
    assert.equal((await f.invoke('add', { amount: 1, type: 'expense', transaction_time })).response.status, 400, transaction_time);
  }
  assert.equal(f.calls.length, 0);
  for (const transaction_time of ['2400-02-29T23:59:59.123456Z', '2024-02-29T00:00+08:00']) {
    assert.equal((await f.invoke('add', { amount: '999999999.99', type: 'expense', transaction_time })).response.status, 200);
  }
});

test('business errors map to stable status codes and expose only a validated current row for conflicts', async () => {
  const f = fixture();
  for (const [code, status] of [['LEDGER_NOT_FOUND', 404], ['LEDGER_CONFLICT', 409], ['IDEMPOTENCY_CONFLICT', 409], ['INVALID_INPUT', 400]]) {
    f.state.rpc = async () => ({ data: { success: false, code, error: 'private-sql-details', current: row }, error: null });
    const result = await f.invoke('delete', { id, expected_version: 1, request_id: requestId });
    assert.equal(result.response.status, status);
    assert.equal(result.data.code, code);
    assert.equal(result.data.request_id, requestId);
    assert.equal(result.data.success, false);
    assert.ok(!JSON.stringify(result.data).includes('private-sql-details'));
    assert.deepEqual(result.data.current, code === 'LEDGER_CONFLICT' ? row : undefined);
  }
  for (const [tag, log] of f.logs) {
    assert.equal(tag, 'ledger_mutation_failed');
    assert.deepEqual(Object.keys(log).sort(), ['action', 'code', 'trace_id']);
  }
});

test('missing migration, raw RPC exceptions and malformed responses return sanitized retryable errors', async () => {
  const f = fixture();
  for (const error of [
    { code: 'PGRST202', message: 'Could not find public.ledger_mutate' },
    { code: '42883', message: 'function public.ledger_mutate(text,uuid) does not exist' },
  ]) {
    f.state.rpc = async () => ({ data: null, error });
    const result = await f.invoke('add', { amount: 1, type: 'expense', request_id: requestId });
    assert.equal(result.response.status, 503);
    assert.equal(result.data.code, 'LEDGER_MIGRATION_REQUIRED');
  }
  for (const rpc of [
    async () => ({ data: null, error: { code: '42883', message: 'private-function helper does not exist' } }),
    async () => ({ data: null, error: { code: '42501', message: 'private-sql-permission' } }),
    async () => { throw new Error('private-network-details'); },
    async () => ({ data: { success: true, data: row }, error: null }),
    async () => ({ data: { success: true, data: null, replayed: false }, error: null }),
    async () => ({ data: { success: false, code: '__proto__', error: 'private-details' }, error: null }),
  ]) {
    f.state.rpc = rpc;
    const result = await f.invoke('add', { amount: 1, type: 'expense', request_id: requestId, note: 'private-user-note' });
    assert.equal(result.response.status, 500);
    assert.equal(result.data.code, 'LEDGER_WRITE_FAILED');
    assert.equal(result.data.request_id, requestId);
    assert.ok(!JSON.stringify(result.data).includes('private-'));
  }
  f.state.admin = () => { throw new Error('private-admin-secret'); };
  assert.equal((await f.invoke('add', { amount: 1, type: 'expense' })).response.status, 500);
  assert.ok(!JSON.stringify(f.logs).includes('private-'));
});

test('real routes and PostgreSQL agree when a committed RPC response is lost before add or edit completes', async () => {
  const db = new PGlite();
  const f = fixture();
  const root = path.resolve(__dirname, '..');
  const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
  let dropResponse = false;
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon, authenticated, service_role;');
    await db.exec(read('schema.sql'));
    await db.exec(read('supabase/migrations/202609240002_ledger_queries.sql'));
    const migration = fs.readdirSync(path.join(root, 'supabase/migrations')).find((file) => file.endsWith('_ledger_mutations.sql'));
    assert.ok(migration, 'the write migration must ship with the route');
    await db.exec(read(`supabase/migrations/${migration}`));
    await db.exec('set role service_role');
    f.state.rpc = async (name, args) => {
      assert.equal(name, 'ledger_mutate');
      const result = await db.query('select public.ledger_mutate($1,$2,$3,$4,$5::jsonb) as response', [args.p_action, args.p_request_id, args.p_id, args.p_expected_version, JSON.stringify(args.p_fields)]);
      if (dropResponse) { dropResponse = false; throw new Error('private transport failure after database commit'); }
      return { data: result.rows[0].response, error: null };
    };
    const addBody = { request_id: requestId, amount: '16.25', type: 'expense', product: ' 奶瓶 ', category: 'feeding', transaction_time: '2024-02-29T08:30+08:00' };
    dropResponse = true;
    const uncertainAdd = await f.invoke('add', addBody);
    assert.equal(uncertainAdd.response.status, 500);
    assert.equal(uncertainAdd.data.request_id, requestId);
    const added = await f.invoke('add', addBody);
    assert.equal(added.response.status, 200);
    assert.equal(added.data.replayed, true);
    assert.equal(added.data.data.product, '奶瓶');
    assert.equal(added.data.data.category, '喂养用品');
    assert.equal(added.data.data.version, 1);
    assert.equal(Date.parse(added.data.data.transaction_time), Date.parse('2024-02-29T00:30:00Z'));
    assert.equal((await db.query('select count(*)::integer as count from public.transactions')).rows[0].count, 1);

    const editBody = { request_id: randomUUID(), id: added.data.data.id, expected_version: 1, note: '仅保存一次' };
    dropResponse = true;
    assert.equal((await f.invoke('edit', editBody)).response.status, 500);
    const edited = await f.invoke('edit', editBody);
    assert.equal(edited.response.status, 200);
    assert.equal(edited.data.replayed, true);
    assert.equal(edited.data.data.version, 2);
    const conflict = await f.invoke('edit', { ...editBody, request_id: randomUUID(), note: '旧页面修改' });
    assert.equal(conflict.response.status, 409);
    assert.equal(conflict.data.code, 'LEDGER_CONFLICT');
    assert.deepEqual(conflict.data.current, edited.data.data);

    const deleteBody = { request_id: randomUUID(), id: edited.data.data.id, expected_version: 2 };
    assert.equal((await f.invoke('delete', deleteBody)).response.status, 200);
    const deletedReplay = await f.invoke('delete', deleteBody);
    assert.equal(deletedReplay.response.status, 200);
    assert.equal(deletedReplay.data.replayed, true);
    const missing = await f.invoke('delete', { ...deleteBody, request_id: randomUUID() });
    assert.equal(missing.response.status, 404);
    assert.equal(missing.data.code, 'LEDGER_NOT_FOUND');
    const lateAddReplay = await f.invoke('add', addBody);
    assert.equal(lateAddReplay.data.replayed, true);
    assert.deepEqual(lateAddReplay.data.data, added.data.data);
    assert.equal((await db.query('select count(*)::integer as count from public.transactions')).rows[0].count, 0);
    assert.ok(!JSON.stringify(f.logs).includes('private transport'));
  } finally { await db.close(); }
});
