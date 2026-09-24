const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { PGlite } = require('@electric-sql/pglite');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
};
const { categoryLabel } = require('../lib/categories.ts');
const { matchesTransaction } = require('../lib/ledger.ts');
const { daysInShanghaiMonth, shanghaiDateKey, shanghaiMonthRange } = require('../lib/timezone.ts');
const { readLedgerList } = require('../src/lib/ledger-query.ts');

// Independent reference implementation of the old JS aggregate, kept only in tests.
// Production never falls back to transferring the entire ledger to the API server.
function referenceSummary(rows, year, month) {
  const range = shanghaiMonthRange(year, month);
  const previous = shanghaiMonthRange(year, month - 1);
  const time = (row) => row.transaction_time || row.created_at;
  const inside = (row, range) => Date.parse(time(row)) >= Date.parse(range.startISO) && Date.parse(time(row)) < Date.parse(range.endISO);
  const current = rows.filter((row) => inside(row, range));
  const expenses = current.filter((row) => row.type === 'expense');
  const sum = (rows) => rows.reduce((sum, row) => sum + Math.round(Number(row.amount) * 100), 0) / 100;
  const dailyExpenses = Array.from({ length: daysInShanghaiMonth(year, month) }, (_, index) => {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`;
    return { date, amount: sum(expenses.filter((row) => shanghaiDateKey(time(row)) === date)) };
  });
  const categories = [...new Set(expenses.map((row) => categoryLabel(row.category)))];
  const categoryBreakdown = categories.map((category) => {
    const selected = expenses.filter((row) => categoryLabel(row.category) === category);
    return { category, amount: sum(selected), count: selected.length };
  }).sort((a, b) => b.amount - a.amount || (a.category < b.category ? -1 : a.category > b.category ? 1 : 0));
  const calendarData = Object.fromEntries(dailyExpenses.filter((row) => row.amount).map((row) => [String(Number(row.date.slice(-2))), row.amount]));
  const last = [...expenses].sort((a, b) => Date.parse(time(b)) - Date.parse(time(a)) || (b.id < a.id ? -1 : 1))[0];
  return { year, month, totalExpense: sum(expenses), transactionCount: current.length, dailyExpenses, categoryBreakdown, calendarData,
    prevMonthExpense: sum(rows.filter((row) => row.type === 'expense' && inside(row, previous))),
    allTimeExpense: sum(rows.filter((row) => row.type === 'expense')),
    lastTransaction: last ? { amount: Number(last.amount), category: categoryLabel(last.category), note: last.note || '', brand: last.brand, product: last.product, transaction_time: new Date(time(last)).toISOString() } : null };
}

test('ledger migration executes real PostgreSQL queries with stable full-dataset filters and calendar aggregates', async (t) => {
  const db = new PGlite();
  const migration = fs.readFileSync(require.resolve('../supabase/migrations/202609240002_ledger_queries.sql'), 'utf8');
  const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
  const insert = async (n, amount, type, category, when, created, product = null, brand = null, note = null) => db.query('insert into transactions(id,amount,type,category,transaction_time,created_at,product,brand,note) values($1,$2,$3,$4,$5,$6,$7,$8,$9)', [id(n), amount, type, category, when, created || when, product, brand, note]);
  const summary = async (year, month) => (await db.query('select ledger_monthly_summary($1,$2) as value', [year, month])).rows[0].value;
  const list = async (input = {}) => {
    const { p_limit = 30, p_cursor_time = null, p_cursor_id = null, p_start = null, p_end = null, p_type = null, p_category = null, p_search = null, p_include_categories = true } = input;
    return (await db.query('select ledger_list($1,$2,$3,$4,$5,$6,$7,$8,$9) as value', [p_limit, p_cursor_time, p_cursor_id, p_start, p_end, p_type, p_category, p_search, p_include_categories])).rows[0].value;
  };
  const client = { rpc: async (name, input) => { assert.equal(name, 'ledger_list'); return { data: await list(input), error: null }; } };
  try {
    await db.exec('create role anon; create role authenticated; create role service_role;');
    await db.exec(fs.readFileSync(require.resolve('../schema.sql'), 'utf8'));
    await db.exec(migration);
    await insert(1, 15, 'expense', null, '2025-12-31T15:59:59Z');
    await insert(2, 10.1, 'expense', 'feeding', '2025-12-31T16:00:00Z', '2026-09-02T00:00:00Z');
    await insert(3, 20.2, 'expense', '🍼喂养用品', '2026-01-15T00:00:00Z');
    await insert(4, 8, 'income', '退款', '2026-01-20T00:00:00Z');
    await insert(5, 30.3, 'expense', null, null, '2026-01-31T15:59:59Z');
    await insert(6, 6, 'expense', '未分类', '2026-01-31T16:00:00Z');
    await insert(7, 12.34, 'expense', 'care', '2024-02-29T00:00:00Z');
    await insert(8, 4, 'expense', 'other', '2026-12-31T15:59:59Z');
    await insert(9, 9, 'expense', 'other', '2026-12-31T16:00:00Z');

    await t.test('January, December, leap February, empty and sparse months match the complete JS calendar contract', async () => {
      const rows = (await db.query('select * from transactions')).rows;
      for (const [year, month] of [[2026, 1], [2026, 12], [2024, 2], [2026, 2], [2026, 3]]) {
        const actual = await summary(year, month);
        if (actual.lastTransaction) actual.lastTransaction.transaction_time = new Date(actual.lastTransaction.transaction_time).toISOString();
        assert.deepEqual(actual, referenceSummary(rows, year, month));
      }
      assert.equal((await summary(2026, 1)).lastTransaction.amount, 30.3);
      await db.exec("set timezone = 'America/Los_Angeles'");
      assert.equal((await summary(2026, 1)).totalExpense, 60.6);
      await db.exec("set timezone = 'UTC'");
    });

    await t.test('normalized aliases, null categories, numeric and literal punctuation search agree with UI matching', async () => {
      await insert(20, 160, 'expense', 'feeding', '2026-09-01T00:00:00Z', null, '100%_(A,B)', 'Brand', '订单号000123');
      await insert(21, 16.25, 'expense', '', '2026-09-02T00:00:00Z', null, '奶嘴');
      for (const query of ['喂养', '16', '16.25', '%_(', 'A,B', 'BRAND', '000123', '未分类']) {
        const rows = (await db.query('select * from transactions')).rows;
        const actual = (await list({ p_search: query })).data.map((row) => row.id).sort();
        const expected = rows.filter((row) => matchesTransaction({ ...row, amount: Number(row.amount) }, query)).map((row) => row.id).sort();
        assert.deepEqual(actual, expected, query);
      }
      assert.deepEqual((await list({ p_category: 'feeding' })).data.map((row) => row.id).sort(), [2, 3, 20].map(id));
      assert.deepEqual((await list({ p_category: '未分类' })).data.map((row) => row.id).sort(), [1, 5, 6, 21].map(id));
      assert.ok((await list({ p_search: 'impossible' })).categories.includes('退款'));
      for (const raw of ['éfeeding', 'αfeeding', '🍼feeding', '🍼喂养用品']) {
        const normalized = (await db.query('select ledger_category_label($1) as category', [raw])).rows[0].category;
        assert.equal(normalized, categoryLabel(raw));
      }
    });

    await t.test('more than 1000 rows remain searchable and paginated; backfilled, null and microsecond times do not skip or duplicate', async () => {
      await db.exec("insert into transactions (id,amount,type,category,transaction_time,created_at,product) select ('10000000-0000-0000-0000-' || lpad(i::text,12,'0'))::uuid, 1, 'expense', '历史类别', '2026-09-20T00:00:00Z', '2026-09-20T00:00:00Z', case when i=1 then '只在深分页的商品' else '批量商品' end from generate_series(1,1050) i");
      await insert(30, 1, 'expense', 'care', '2026-09-20T00:00:00.123456Z');
      await insert(31, 1, 'expense', 'care', '2026-09-20T00:00:00.123455Z');
      const query = new URLSearchParams('year=2026&month=9&limit=1');
      const first = await readLedgerList(client, query);
      assert.equal(first.data[0].id, id(30));
      query.set('cursor', first.nextCursor);
      assert.equal((await readLedgerList(client, query)).data[0].id, id(31));
      query.delete('cursor'); query.set('limit', '100');
      const ids = [];
      for (;;) {
        const page = await readLedgerList(client, query); ids.push(...page.data.map((row) => row.id));
        if (!page.hasMore) break;
        assert.ok(page.nextCursor); query.set('cursor', page.nextCursor);
      }
      const expected = (await db.query("select id from transactions where coalesce(transaction_time,created_at) >= '2026-08-31T16:00:00Z' and coalesce(transaction_time,created_at) < '2026-09-30T16:00:00Z' order by coalesce(transaction_time,created_at) desc,id desc")).rows.map((row) => row.id);
      assert.equal(ids.length, 1054); assert.deepEqual(ids, expected); assert.equal(new Set(ids).size, ids.length);
      const found = await readLedgerList(client, new URLSearchParams('year=2026&month=9&q=只在深分页的商品'));
      assert.equal(found.data.length, 1);
      const daily = await readLedgerList(client, new URLSearchParams('year=2026&month=9&day=20&limit=100'), true);
      assert.equal(daily.data.length, 100); assert.equal(daily.hasMore, true);
    });

    await t.test('invoker permissions obey RLS and repeated migration preserves rows and uses a keyset index', async () => {
      await insert(40, 999, 'expense', '仅私有', '2026-09-20T00:00:00Z', null, null, 'private');
      await db.exec('drop policy "Public can read transactions" on transactions');
      await db.exec("create policy visible_transactions on transactions for select to anon, authenticated using (brand is distinct from 'private')");
      await db.exec('set role anon');
      assert.ok(!(await list()).categories.includes('仅私有'));
      assert.equal((await list({ p_search: 'private' })).data.length, 0);
      const publicTotal = (await summary(2026, 9)).allTimeExpense;
      await db.exec('reset role');
      assert.equal((await summary(2026, 9)).allTimeExpense - publicTotal, 999);
      const count = (await db.query('select count(*)::integer as count from transactions')).rows[0].count;
      await db.exec(migration);
      assert.equal((await db.query('select count(*)::integer as count from transactions')).rows[0].count, count);
      assert.deepEqual((await db.query("select prosecdef from pg_proc where proname in ('ledger_list','ledger_monthly_summary','ledger_category_label')")).rows.map((row) => row.prosecdef), [false, false, false]);
      await db.exec('analyze transactions');
      await db.exec('set enable_seqscan = off');
      const explain = await db.query("explain select * from transactions where (coalesce(transaction_time,created_at),id) < ('2026-09-20T00:00:00Z','10000000-0000-0000-0000-000000000100') order by coalesce(transaction_time,created_at) desc,id desc limit 31");
      assert.ok(JSON.stringify(explain.rows).includes('transactions_effective_id_desc_idx'), JSON.stringify(explain.rows));
      await assert.rejects(summary(2026, 13), { code: '22023' });
      await assert.rejects(list({ p_limit: 101 }), { code: '22023' });
      await assert.rejects(list({ p_cursor_time: '2026-01-01T00:00:00Z' }), { code: '22023' });
    });
  } finally { await db.close(); }
});
