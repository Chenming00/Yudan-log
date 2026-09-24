const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  module._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
};
const { createLedgerResource, mergeLedgerPages, collectLedgerPages } = require('../lib/ledger-request-client.ts');
const { buildLedgerListUrl, shanghaiDateKey, shanghaiMonthKey, visibleLedgerDays, formatLedgerRelativeDate } = require('../lib/ledger-query-client.ts');
const { categoryLabel } = require('../lib/categories.ts');

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function page(ids, nextCursor = null) {
  return { data: ids.map((id) => ({ id })), hasMore: Boolean(nextCursor), nextCursor };
}

test('late month and day responses cannot overwrite the currently selected query even when transport ignores abort', async () => {
  for (const [oldKey, newKey] of [['2026-09', '2026-08'], ['2026-09-03', '2026-09-04']]) {
    const resource = createLedgerResource();
    const old = deferred();
    let oldSignal;
    const oldRequest = resource.request(oldKey, (signal) => { oldSignal = signal; return old.promise; });
    await resource.request(newKey, async () => ({ label: newKey }));
    assert.equal(oldSignal.aborted, true);
    old.resolve({ label: oldKey });
    await oldRequest;
    assert.equal(resource.getSnapshot().key, newKey);
    assert.deepEqual(resource.getSnapshot().data, { label: newKey });
    assert.equal(resource.getSnapshot().status, 'success');
  }
});

test('old request failure and cleanup cannot clear the loading status of a newer request', async () => {
  const resource = createLedgerResource();
  const old = deferred();
  const next = deferred();
  const first = resource.request('old', () => old.promise);
  const second = resource.request('new', () => next.promise);
  old.reject(new Error('old failure'));
  await first;
  assert.equal(resource.getSnapshot().status, 'loading');
  assert.equal(resource.getSnapshot().error, null);
  next.resolve('new data');
  await second;
  assert.equal(resource.getSnapshot().data, 'new data');
});

test('pagination is locked per cursor, deduplicates overlapping rows and preserves server order', async () => {
  const resource = createLedgerResource();
  await resource.request('all', async () => page(['z', 'b'], 'cursor-1'));
  const next = deferred();
  let requests = 0;
  const loader = () => { requests += 1; return next.promise; };
  const pending = resource.request('all', loader, { cursor: 'cursor-1', merge: mergeLedgerPages });
  await resource.request('all', loader, { cursor: 'cursor-1', merge: mergeLedgerPages });
  assert.equal(requests, 1);
  next.resolve(page(['b', 'a', 'a']));
  await pending;
  await resource.request('all', loader, { cursor: 'cursor-1', merge: mergeLedgerPages });
  assert.equal(requests, 1);
  assert.deepEqual(resource.getSnapshot().data.data.map((row) => row.id), ['z', 'b', 'a']);
});

test('changing a filter discards its outstanding pagination and clears old rows', async () => {
  const resource = createLedgerResource();
  await resource.request('all', async () => page(['old'], 'cursor'));
  const next = deferred();
  const pending = resource.request('all', () => next.promise, { cursor: 'cursor', merge: mergeLedgerPages });
  const replacement = deferred();
  const search = resource.request('search=奶瓶', () => replacement.promise);
  assert.equal(resource.getSnapshot().data, null);
  assert.equal(resource.getSnapshot().loadingMore, false);
  next.resolve(page(['older']));
  await pending;
  assert.equal(resource.getSnapshot().status, 'loading');
  replacement.resolve(page(['matching']));
  await search;
  assert.deepEqual(resource.getSnapshot().data.data.map((row) => row.id), ['matching']);
});

test('errors are distinct from empty results, retriable, and preserve valid data on refresh or page failure', async () => {
  const resource = createLedgerResource();
  await resource.request('month', async () => { throw new Error('offline'); });
  assert.equal(resource.getSnapshot().status, 'error');
  assert.equal(resource.getSnapshot().data, null);
  await resource.request('month', async () => page(['first'], 'cursor'));
  await resource.request('month', async () => { throw new Error('page failed'); }, { cursor: 'cursor', merge: mergeLedgerPages });
  assert.equal(resource.getSnapshot().pageError, 'page failed');
  assert.equal(resource.getSnapshot().error, null);
  assert.equal(resource.getSnapshot().data.data.length, 1);
  await resource.request('month', async () => page(['second']), { cursor: 'cursor', merge: mergeLedgerPages });
  assert.equal(resource.getSnapshot().pageError, null);
  await resource.request('month', async () => { throw new Error('refresh failed'); });
  assert.equal(resource.getSnapshot().error, 'refresh failed');
  assert.equal(resource.getSnapshot().data.data.length, 2);
  await resource.request('empty', async () => page([]));
  assert.equal(resource.getSnapshot().status, 'success');
  assert.equal(resource.getSnapshot().data.data.length, 0);
});

test('list, pagination, and CSV use identical scope and literal filters, including all-time and uncategorized', () => {
  const query = { year: 2026, month: 9, search: '  奶瓶 + 16.5%  ', category: '未分类', type: 'expense' };
  const first = new URL(buildLedgerListUrl(query), 'http://localhost');
  const csv = new URL(buildLedgerListUrl(query, 100, 'cursor+&='), 'http://localhost');
  for (const name of ['year', 'month', 'q', 'category', 'type']) assert.equal(first.searchParams.get(name), csv.searchParams.get(name));
  assert.equal(first.searchParams.get('q'), '奶瓶 + 16.5%');
  assert.equal(csv.searchParams.get('cursor'), 'cursor+&=');
  const all = new URL(buildLedgerListUrl({ search: '', category: '', type: '' }), 'http://localhost');
  for (const name of ['year', 'month', 'q', 'category', 'type']) assert.equal(all.searchParams.has(name), false);
});

test('category labels match the server contract for nulls, whitespace, aliases and historical custom categories', () => {
  for (const value of [null, undefined, '', '   ', '\t\n']) assert.equal(categoryLabel(value), '未分类');
  for (const value of ['feeding', ' 喂养用品 ', ' 🍼喂养用品 ']) assert.equal(categoryLabel(value), '喂养用品');
  assert.equal(categoryLabel('  历史自定义分类  '), '历史自定义分类');
});

test('CSV reads every filtered page, deduplicates IDs and stops malformed cursor loops', async (context) => {
  const urls = [];
  let index = 0;
  const pages = [page(['a', 'b'], 'cursor'), page(['b', 'c'])];
  context.mock.method(global, 'fetch', async (url) => {
    urls.push(new URL(url, 'http://localhost'));
    return { ok: true, json: async () => ({ success: true, ...pages[index++] }) };
  });
  const query = { year: 2026, month: 9, search: '16', category: '未分类', type: 'expense' };
  const result = await collectLedgerPages((cursor) => buildLedgerListUrl(query, 100, cursor), new AbortController().signal);
  assert.deepEqual(result.map((row) => row.id), ['a', 'b', 'c']);
  assert.equal(urls.length, 2);
  for (const url of urls) for (const name of ['year', 'month', 'q', 'category', 'type']) assert.equal(url.searchParams.get(name), urls[0].searchParams.get(name));
  global.fetch = async () => ({ ok: true, json: async () => ({ success: true, ...page(['a'], 'repeated') }) });
  await assert.rejects(collectLedgerPages((cursor) => buildLedgerListUrl(query, 100, cursor), new AbortController().signal), /分页数据异常/);
});

test('Shanghai date grouping retains the year and seven-day trends use elapsed calendar days', () => {
  assert.equal(shanghaiDateKey('2025-12-31T16:05:00Z'), '2026-01-01');
  assert.equal(shanghaiMonthKey('2025-12-31T16:05:00Z'), '2026-01');
  assert.notEqual(shanghaiDateKey('2025-01-01T01:00:00Z'), shanghaiDateKey('2026-01-01T01:00:00Z'));
  const month = Array.from({ length: 31 }, (_, index) => ({ date: `2026-01-${String(index + 1).padStart(2, '0')}`, amount: index === 0 ? 14 : 0 }));
  const current = visibleLedgerDays(month, 7, new Date('2026-01-01T16:00:00Z'));
  assert.equal(current.length, 2);
  assert.equal(current.reduce((sum, row) => sum + row.amount, 0) / current.length, 7);
  assert.deepEqual(visibleLedgerDays(month, 7, new Date('2026-02-01T00:00:00Z')).map((row) => row.date), month.slice(-7).map((row) => row.date));
  assert.equal(visibleLedgerDays(month, 'month', new Date('2026-01-02T00:00:00Z')).length, 31);
  assert.equal(formatLedgerRelativeDate('2026-09-23T15:59:00Z', new Date('2026-09-23T16:01:00Z')), '昨天');
  assert.equal(formatLedgerRelativeDate('2025-01-01T01:00:00Z', new Date('2026-09-23T16:01:00Z')), '2025年1月1日');
});

test('unmount cancellation prevents publication and cancelled CSV never starts a subsequent page', async (context) => {
  const resource = createLedgerResource();
  const delayed = deferred();
  const pending = resource.request('day', () => delayed.promise);
  const snapshot = resource.getSnapshot();
  resource.cancel();
  delayed.resolve('old day');
  await pending;
  assert.equal(resource.getSnapshot(), snapshot);
  let requests = 0;
  context.mock.method(global, 'fetch', async () => {
    requests += 1;
    return { ok: true, json: async () => ({ success: true, ...page(['first'], 'next') }) };
  });
  const controller = new AbortController();
  await assert.rejects(collectLedgerPages(() => '/api/list', controller.signal, () => controller.abort()), { name: 'AbortError' });
  assert.equal(requests, 1);
});
