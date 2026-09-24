const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
};
const { decodeLedgerCursor, encodeLedgerCursor, normalizeLedgerLimit, parseLedgerListQuery, parseLedgerMonth, readLedgerList, isMissingLedgerFunction } = require('../src/lib/ledger-query.ts');
const id = '12345678-1234-1234-1234-123456789abc';
const params = (query) => new URLSearchParams(query);
const cursor = { v: 2, time: '2026-09-24T00:00:00.123456+00:00', id };

function route(name, client) {
  const filename = require.resolve(`../src/pages/api/${name}.ts`);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const output = { exports: {} };
  new Function('require', 'exports', 'module', source)((name) => {
    if (name.endsWith('/supabase')) return { getSupabaseClient: () => client };
    if (name.endsWith('/http')) return { json: (data, init) => new Response(JSON.stringify(data), init) };
    return require('../src/lib/ledger-query.ts');
  }, output.exports, output);
  return (query) => output.exports.GET({ url: new URL(`http://localhost/api/${name}?${query}`) });
}

test('strict ledger cursors preserve PostgreSQL microseconds and explicitly expire old pagination', () => {
  assert.deepEqual(decodeLedgerCursor(encodeLedgerCursor(cursor)), cursor);
  assert.equal(decodeLedgerCursor(null), null);
  for (const old of [cursor.time, Buffer.from(JSON.stringify({ ...cursor, v: 1 })).toString('base64url')]) {
    assert.throws(() => decodeLedgerCursor(old), { status: 400, code: 'CURSOR_EXPIRED' });
  }
  for (const value of ['', 'bad)', 'abc', 'null', JSON.stringify(cursor), encodeLedgerCursor({ ...cursor, time: '2026-02-30T00:00:00Z' }), encodeLedgerCursor({ ...cursor, id: 'x' })]) {
    assert.throws(() => decodeLedgerCursor(value), { status: 400 });
  }
});

test('strict filters reject partial months, fractional numbers, repeated values and invalid calendar days', () => {
  assert.equal(normalizeLedgerLimit(null), 30);
  for (const value of ['', '0', '1.5', '-1', '101', 'NaN', 'Infinity', '1e2']) assert.throws(() => normalizeLedgerLimit(value));
  for (const query of ['year=2026', 'month=2', 'year=2026&month=1.2', 'year=2026&month=0', 'year=2026&year=2025&month=2', 'type=invalid', 'q=' + 'x'.repeat(201)]) assert.throws(() => parseLedgerListQuery(params(query)));
  for (const query of ['year=2026&month=2&day=29', 'year=2024&month=2&day=30', 'year=2026&month=9&day=2.5']) assert.throws(() => parseLedgerListQuery(params(query), true));
  assert.equal(parseLedgerListQuery(params('year=2024&month=2&day=29'), true).p_end, '2024-02-29T16:00:00.000Z');
  assert.equal(parseLedgerMonth(params(''), false), null);
  assert.equal(parseLedgerListQuery(params('category=feeding&q=_(%,)&type=all')).p_category, '喂养用品');
  assert.equal(parseLedgerListQuery(params('q=_(%,)')).p_search, '_(%,)');
});

test('RPC list uses a lookahead row and effective timestamp without reordering records', async () => {
  const rows = [
    { id, transaction_time: cursor.time, created_at: '2026-10-01T00:00:00Z' },
    { id: '12345678-1234-1234-1234-123456789abb', transaction_time: null, created_at: '2026-09-23T00:00:00Z' },
  ];
  const client = { rpc: async (name, input) => {
    assert.equal(name, 'ledger_list'); assert.equal(input.p_limit, 1);
    return { data: { data: rows, categories: ['历史类别'] }, error: null };
  } };
  const first = await readLedgerList(client, params('limit=1'));
  assert.deepEqual(first.data, rows.slice(0, 1)); assert.equal(first.hasMore, true);
  assert.deepEqual(decodeLedgerCursor(first.nextCursor), cursor);
  assert.deepEqual(first.categories, ['历史类别']);
  const final = await readLedgerList({ rpc: async () => ({ data: { data: rows }, error: null }) }, params('limit=2'));
  assert.equal(final.hasMore, false); assert.equal(final.nextCursor, null);
});

test('list, daily and monthly routes return 400/503/500 without reading tables on RPC failures', async () => {
  for (const name of ['list', 'daily', 'monthly']) {
    let calls = 0;
    const rpcName = name === 'monthly' ? 'ledger_monthly_summary' : 'ledger_list';
    const client = { rpc: async () => { calls++; return { data: null, error: { code: 'PGRST202', message: `Could not find public.${rpcName}` } }; }, from: () => assert.fail('must not scan tables') };
    const get = route(name, client);
    const invalid = await get('year=2026&month=2.5&day=31');
    assert.equal(invalid.status, 400); assert.equal(calls, 0);
    const missing = await get('year=2026&month=2&day=28');
    assert.equal(missing.status, 503); assert.equal((await missing.json()).code, 'LEDGER_MIGRATION_REQUIRED');
    client.rpc = async () => ({ data: null, error: { code: '42501', message: 'secret SQL error' } });
    const denied = await get('year=2026&month=2&day=28');
    assert.equal(denied.status, 500); assert.ok(!(await denied.text()).includes('secret'));
  }
  assert.equal(isMissingLedgerFunction({ code: '42883', message: 'function other_helper does not exist' }, 'ledger_monthly_summary'), false);
  assert.equal(isMissingLedgerFunction({ code: '42883', message: 'function public.ledger_monthly_summary(integer,integer) does not exist' }, 'ledger_monthly_summary'), true);
});
