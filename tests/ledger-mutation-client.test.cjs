const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
};
const { LedgerMutationClient, readLedgerStorage, writeLedgerStorage, validLedgerVersion } = require('../lib/ledger-mutation-client.ts');
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const row = { id: uuid(100), version: 1, amount: 16, type: 'expense', product: '奶瓶' };
const success = (body, replayed = false) => Response.json({ success: true, data: { ...row, ...JSON.parse(body) }, request_id: JSON.parse(body).request_id, replayed });

test('the default fetch adapter preserves the browser host receiver', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = function (url, request) {
    assert.equal(this, globalThis);
    assert.equal(url, '/api/add');
    return Promise.resolve(success(request.body));
  };
  try {
    const client = new LedgerMutationClient(undefined, () => uuid(1));
    assert.equal((await client.submit('add', { amount: 16 }, 'key')).kind, 'success');
  } finally { globalThis.fetch = originalFetch; }
});

test('storage read, write and removal failures safely degrade without throwing', () => {
  const blocked = {
    getItem() { throw new DOMException('denied', 'SecurityError'); },
    setItem() { throw new DOMException('full', 'QuotaExceededError'); },
    removeItem() { throw new DOMException('denied', 'SecurityError'); },
  };
  assert.equal(readLedgerStorage('last_category', blocked), null);
  assert.equal(readLedgerStorage('api_key', blocked), null);
  assert.equal(writeLedgerStorage('last_category', '喂养用品', blocked), false);
  assert.equal(writeLedgerStorage('api_key', 'session-only', blocked), false);
  assert.equal(writeLedgerStorage('api_key', null, blocked), false);
  assert.equal(readLedgerStorage('last_category'), null); // SSR has no window.
  const saved = new Map();
  const available = { getItem: (key) => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value), removeItem: (key) => saved.delete(key) };
  assert.equal(writeLedgerStorage('api_key', 'key', available), true);
  assert.equal(readLedgerStorage('api_key', available), 'key');
  assert.equal(writeLedgerStorage('api_key', null, available), true);
  assert.equal(saved.size, 0);
});

test('a response lost after commit retries the exact frozen payload and creates one record', async () => {
  const requests = [];
  const saved = new Map();
  let ids = 0;
  const client = new LedgerMutationClient(async (url, request) => {
    requests.push({ url, body: request.body });
    const input = JSON.parse(request.body);
    if (!saved.has(input.request_id)) saved.set(input.request_id, input);
    if (requests.length === 1) throw new TypeError('response lost after commit');
    return success(request.body, true);
  }, () => uuid(++ids));
  const draft = { amount: 16, product: '原商品', type: 'expense' };
  assert.equal((await client.submit('add', draft, 'key')).kind, 'uncertain');
  draft.amount = 999;
  assert.equal((await client.submit('delete', { id: row.id, expected_version: 1 }, 'key')).kind, 'blocked');
  const retry = await client.submit('add', draft, 'key');
  assert.equal(retry.kind, 'success'); assert.equal(retry.replayed, true);
  assert.equal(retry.data.amount, 16);
  assert.deepEqual(requests[1], requests[0]); assert.equal(saved.size, 1); assert.equal(ids, 1);
  await client.submit('add', { ...draft, product: '下一笔' }, 'key');
  assert.equal(ids, 2); assert.equal(saved.size, 2);
});

test('simultaneous submissions share a synchronous lock before fetch resolves', async () => {
  let resolve;
  let body;
  let calls = 0;
  const client = new LedgerMutationClient((url, request) => {
    calls++; body = request.body;
    return new Promise((done) => { resolve = done; });
  }, () => uuid(1));
  const first = client.submit('add', { amount: 16 }, 'key');
  assert.equal((await client.submit('add', { amount: 32 }, 'key')).kind, 'busy');
  assert.equal(calls, 1);
  resolve(success(body));
  assert.equal((await first).kind, 'success');
});

test('missing/invalid versions never send writes; a version conflict preserves server data and permits a new intent', async () => {
  let calls = 0;
  let ids = 0;
  const requests = [];
  const latest = { ...row, amount: 99, version: 2 };
  const client = new LedgerMutationClient(async (url, request) => {
    calls++; requests.push(JSON.parse(request.body));
    if (calls === 1) return Response.json({ success: false, code: 'LEDGER_CONFLICT', error: '已更新', current: latest }, { status: 409 });
    return success(request.body);
  }, () => uuid(++ids));
  for (const version of [undefined, null, 0, -1, 1.5, '1', NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(validLedgerVersion(version), false);
    const result = await client.submit('edit', { id: row.id, expected_version: version, product: '我的输入' }, 'key');
    assert.equal(result.kind, 'rejected'); assert.equal(result.code, 'VERSION_REQUIRED');
  }
  assert.equal(calls, 0); assert.equal(ids, 0);
  const conflict = await client.submit('edit', { id: row.id, expected_version: 1, product: '我的输入' }, 'key');
  assert.equal(conflict.kind, 'rejected'); assert.deepEqual(conflict.current, latest);
  await client.submit('edit', { id: row.id, expected_version: latest.version, product: '我的输入' }, 'key');
  assert.notEqual(requests[0].request_id, requests[1].request_id);
  assert.equal(requests[1].expected_version, 2); assert.equal(requests[1].product, '我的输入');
});

test('authorization/validation failure after an uncertain attempt keeps the original request until confirmed', async () => {
  for (const [status, code] of [[400, 'INVALID_INPUT'], [401, 'UNAUTHORIZED'], [403, 'FORBIDDEN'], [413, 'BODY_TOO_LARGE'], [409, 'IDEMPOTENCY_CONFLICT']]) {
    let calls = 0;
    let ids = 0;
    const requests = [];
    const client = new LedgerMutationClient(async (url, request) => {
      calls++; requests.push({ body: request.body, auth: request.headers.Authorization });
      if (calls === 1) throw new TypeError('connection lost');
      if (calls === 2) return Response.json({ success: false, error: '本次请求被拒绝', code }, { status });
      return success(request.body, true);
    }, () => uuid(++ids));
    const input = { amount: 16, product: '原商品' };
    assert.equal((await client.submit('add', input, 'old-key')).kind, 'uncertain');
    const deniedRetry = await client.submit('add', input, 'old-key');
    assert.equal(deniedRetry.kind, 'uncertain'); assert.equal(deniedRetry.status, status);
    const final = await client.submit('add', { amount: 999, product: '不能替换原请求' }, 'new-key');
    assert.equal(final.kind, 'success'); assert.equal(final.data.amount, 16); assert.equal(ids, 1);
    assert.equal(requests[0].body, requests[1].body); assert.equal(requests[1].body, requests[2].body);
    assert.equal(requests[2].auth, 'Bearer new-key');
  }
});

test('transaction-level missing/conflict results conclusively settle an uncertain attempt', async () => {
  for (const [status, code] of [[404, 'LEDGER_NOT_FOUND'], [409, 'LEDGER_CONFLICT']]) {
    let calls = 0;
    let ids = 0;
    const requests = [];
    const client = new LedgerMutationClient(async (url, request) => {
      calls++; requests.push(JSON.parse(request.body));
      if (calls === 1) return new Response('upstream unavailable', { status: 502 });
      if (calls === 2) return Response.json({ success: false, error: '账单已变更', code, current: { ...row, version: 2 } }, { status });
      return success(request.body);
    }, () => uuid(++ids));
    const input = { id: row.id, expected_version: 1 };
    assert.equal((await client.submit('delete', input, 'key')).kind, 'uncertain');
    assert.equal((await client.submit('delete', input, 'key')).kind, 'rejected');
    assert.equal(requests[0].request_id, requests[1].request_id);
    await client.submit('delete', { ...input, expected_version: 2 }, 'key');
    assert.equal(ids, 2); assert.equal(requests[2].expected_version, 2);
  }
});

test('malformed success and 5xx responses cannot release a request, while a first definitive rejection can', async () => {
  for (const initial of [() => new Response('broken json'), () => Response.json({ success: true, data: row, request_id: uuid(99) }), () => Response.json({ success: false, error: 'migration required' }, { status: 503 })]) {
    let calls = 0;
    let ids = 0;
    const body = [];
    const client = new LedgerMutationClient(async (url, request) => {
      body.push(request.body);
      return ++calls === 1 ? initial() : success(request.body);
    }, () => uuid(++ids));
    assert.equal((await client.submit('delete', { id: row.id, expected_version: 1 }, 'key')).kind, 'uncertain');
    assert.equal((await client.submit('delete', { id: row.id, expected_version: 2 }, 'key')).kind, 'success');
    assert.equal(ids, 1); assert.equal(body[0], body[1]);
  }
  let ids = 0;
  const client = new LedgerMutationClient(async () => new Response('invalid', { status: 400 }), () => uuid(++ids));
  assert.equal((await client.submit('add', { amount: 0 }, 'key')).kind, 'rejected');
  assert.equal((await client.submit('add', { amount: 16 }, 'key')).kind, 'rejected');
  assert.equal(ids, 2);
});
