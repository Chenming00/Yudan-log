const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { PGlite } = require('@electric-sql/pglite');
const migrationDirectory = path.join(__dirname, '../supabase/migrations');
const migrationFile = fs.readdirSync(migrationDirectory).find((file) => file.endsWith('_ledger_mutations.sql'));
const migration = () => fs.readFileSync(path.join(migrationDirectory, migrationFile), 'utf8');
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('ledger mutations atomically preserve receipts, optimistic versions and service-only access', async (t) => {
  const db = new PGlite();
  const mutate = async (action, fields = {}, options = {}) => (await db.query(
    'select public.ledger_mutate($1,$2,$3,$4,$5::jsonb) as result',
    [action, options.requestId ?? randomUUID(), options.id ?? null, options.version ?? null, JSON.stringify(fields)],
  )).rows[0].result;
  const add = (fields = {}, options) => mutate('add', { amount: 29.9, type: 'expense', ...fields }, options);
  const count = async (table) => (await db.query(`select count(*)::integer as count from public.${table}`)).rows[0].count;
  const current = async (id) => (await db.query('select to_jsonb(t) as data from public.transactions t where id=$1', [id])).rows[0]?.data;
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon, authenticated, service_role;');
    await db.exec(read('schema.sql'));
    await db.exec(read('supabase/migrations/202609240002_ledger_queries.sql'));
    await db.exec("insert into public.transactions(amount,type,note) values(18.2,'expense','migration history')");
    await db.exec(migration());
    await db.exec('set role service_role');

    // PGlite has one backend. Queued rival submissions cover both write orderings;
    // these tests are not a multi-connection lock-contention stress test.
    await t.test('lost add response and queued identical requests produce one row and one receipt', async () => {
      const requestId = randomUUID();
      const before = await count('transactions');
      const [first, replay] = await Promise.all([add({ product: '奶瓶' }, { requestId }), add({ product: '奶瓶' }, { requestId })]);
      assert.equal(first.success, true); assert.equal(first.replayed, false); assert.equal(replay.replayed, true);
      assert.deepEqual(first.data, replay.data); assert.equal(first.data.version, 1);
      assert.equal(await count('transactions'), before + 1);
      const reordered = await mutate('add', { type: 'expense', product: ' 奶瓶 ', amount: '29.90', note: null }, { requestId });
      assert.equal(reordered.replayed, true); assert.deepEqual(reordered.data, first.data);
      const different = await add({ product: '不同商品' }, { requestId });
      assert.equal(different.code, 'IDEMPOTENCY_CONFLICT');
      assert.equal(await count('transactions'), before + 1);
    });

    await t.test('receipts compare normalized categories and equivalent instants', async () => {
      const requestId = randomUUID();
      const first = await add({ category: 'feeding', transaction_time: '2026-09-24T08:00:00+08:00' }, { requestId });
      assert.equal(first.data.category, '喂养用品');
      const replay = await add({ category: '🍼喂养用品', transaction_time: '2026-09-24T00:00:00.000Z' }, { requestId });
      assert.equal(replay.replayed, true); assert.deepEqual(replay.data, first.data);
    });

    await t.test('two edits from the same version cannot overwrite each other; the successful edit replays', async () => {
      const saved = await add();
      const requestId = randomUUID();
      const attempts = await Promise.all([
        mutate('edit', { note: 'first edit' }, { id: saved.data.id, version: 1, requestId }),
        mutate('edit', { note: 'second edit' }, { id: saved.data.id, version: 1 }),
      ]);
      assert.equal(attempts.filter((result) => result.success).length, 1);
      assert.equal(attempts[0].data.version, 2);
      assert.equal(attempts[1].code, 'LEDGER_CONFLICT'); assert.equal(attempts[1].current.version, 2);
      assert.equal(attempts[1].current.note, 'first edit');
      assert.deepEqual((await mutate('edit', { note: 'first edit' }, { id: saved.data.id, version: 1, requestId })).data, attempts[0].data);
      assert.equal((await current(saved.data.id)).version, 2);
    });

    await t.test('edit versus delete respects the winning version in both orderings', async () => {
      const saved = await add();
      const results = await Promise.all([
        mutate('edit', { amount: 22 }, { id: saved.data.id, version: 1 }),
        mutate('delete', {}, { id: saved.data.id, version: 1 }),
      ]);
      assert.equal(results[0].success, true); assert.equal(results[1].code, 'LEDGER_CONFLICT');
      assert.equal((await current(saved.data.id)).amount, 22);
      const other = await add();
      const reverse = await Promise.all([
        mutate('delete', {}, { id: other.data.id, version: 1 }),
        mutate('edit', { note: 'too late' }, { id: other.data.id, version: 1 }),
      ]);
      assert.equal(reverse[0].success, true); assert.equal(reverse[1].code, 'LEDGER_NOT_FOUND');
      assert.equal(await current(other.data.id), undefined);
    });

    await t.test('add and delete receipts survive deletion, and a replay never deletes a replacement row', async () => {
      const addRequest = randomUUID(); const deleteRequest = randomUUID();
      const saved = await add({}, { requestId: addRequest });
      const removed = await mutate('delete', {}, { id: saved.data.id, version: 1, requestId: deleteRequest });
      assert.deepEqual(removed.data, saved.data);
      const addedAgain = await add({}, { requestId: addRequest });
      assert.equal(addedAgain.replayed, true); assert.equal(await current(saved.data.id), undefined);
      const repeatedDelete = await mutate('delete', {}, { id: saved.data.id, version: 1, requestId: deleteRequest });
      assert.equal(repeatedDelete.replayed, true); assert.deepEqual(repeatedDelete.data, removed.data);
      await db.query("insert into public.transactions(id,amount,type,note) values($1,33,'expense','replacement')", [saved.data.id]);
      await mutate('delete', {}, { id: saved.data.id, version: 1, requestId: deleteRequest });
      assert.equal((await current(saved.data.id)).note, 'replacement');
      assert.equal((await mutate('edit', { note: 'changed action' }, { id: saved.data.id, version: 1, requestId: deleteRequest })).code, 'IDEMPOTENCY_CONFLICT');
    });

    await t.test('missing rows and validation errors do not report writes as successful', async () => {
      assert.equal((await mutate('edit', { note: 'missing' }, { id: randomUUID(), version: 1 })).code, 'LEDGER_NOT_FOUND');
      assert.equal((await mutate('delete', {}, { id: randomUUID(), version: 1 })).code, 'LEDGER_NOT_FOUND');
      const invalid = [
        ['add', { amount: -1, type: 'expense' }, {}], ['add', { amount: '1e2', type: 'expense' }, {}],
        ['add', { amount: 1000000000, type: 'expense' }, {}], ['add', { amount: 1.001, type: 'expense' }, {}],
        ['add', { amount: 1, type: 'bad' }, {}], ['add', { amount: 1, type: 'expense', version: 3 }, {}],
        ['add', { amount: 1, type: 'expense', brand: {} }, {}], ['add', { amount: 1, type: 'expense', brand: 'a'.repeat(201) }, {}],
        ['add', { amount: 1, type: 'expense', transaction_time: '2026-02-30T00:00:00Z' }, {}],
        ['add', { amount: 1, type: 'expense', transaction_time: '2026-09-20T00:00:00' }, {}],
        ['add', { amount: 1, type: 'expense', transaction_time: 'not a date' }, {}],
        ['edit', {}, { id: randomUUID(), version: 1 }], ['edit', { amount: 1 }, { id: randomUUID() }],
        ['delete', { note: 'unexpected' }, { id: randomUUID(), version: 1 }], ['delete', {}, { id: randomUUID(), version: 0 }],
      ];
      const before = await count('transactions');
      for (const [action, fields, options] of invalid) assert.equal((await mutate(action, fields, options)).code, 'INVALID_INPUT', JSON.stringify([action, fields, options]));
      assert.equal((await db.query("select public.ledger_mutate('add',null,null,null,'{\"amount\":1,\"type\":\"expense\"}') as result")).rows[0].result.code, 'INVALID_INPUT');
      assert.equal(await count('transactions'), before);
    });

    await t.test('an enclosing transaction rollback removes both record and receipt', async () => {
      const requestId = randomUUID(); const before = await count('transactions'); const receipts = await count('ledger_mutation_receipts');
      await db.exec('begin');
      assert.equal((await add({ product: 'rolled back' }, { requestId })).success, true);
      await db.exec('rollback');
      assert.equal(await count('transactions'), before); assert.equal(await count('ledger_mutation_receipts'), receipts);
      assert.equal((await add({ product: 'rolled back' }, { requestId })).replayed, false);
    });

    await t.test('a receipt storage failure rolls back the already-written ledger row', async () => {
      const requestId = randomUUID(); const saved = await add(); const before = await count('ledger_mutation_receipts');
      await db.exec('reset role');
      await db.exec(`create function public.test_receipt_failure() returns trigger language plpgsql as $$ begin raise exception 'receipt unavailable'; end; $$;
        create trigger test_receipt_failure before insert on public.ledger_mutation_receipts for each row execute function public.test_receipt_failure();`);
      await db.exec('set role service_role');
      await assert.rejects(mutate('edit', { amount: 12 }, { id: saved.data.id, version: 1, requestId }), /receipt unavailable/);
      assert.deepEqual(await current(saved.data.id), saved.data);
      assert.equal(await count('ledger_mutation_receipts'), before);
      await db.exec('reset role; drop trigger test_receipt_failure on public.ledger_mutation_receipts; drop function public.test_receipt_failure(); set role service_role;');
      assert.equal((await mutate('edit', { amount: 12 }, { id: saved.data.id, version: 1, requestId })).replayed, false);
    });

    await t.test('legacy writes increment versions and repeat migrations preserve existing versions and receipts', async () => {
      const saved = await add();
      await db.query('update public.transactions set note=$2,version=999 where id=$1', [saved.data.id, 'direct update']);
      assert.equal((await current(saved.data.id)).version, 2);
      const rows = (await db.query('select to_jsonb(t) as data from public.transactions t order by id')).rows;
      const receipts = (await db.query('select to_jsonb(r) as data from public.ledger_mutation_receipts r order by request_id')).rows;
      await db.exec('reset role'); await db.exec(migration()); await db.exec('set role service_role');
      assert.deepEqual((await db.query('select to_jsonb(t) as data from public.transactions t order by id')).rows, rows);
      assert.deepEqual((await db.query('select to_jsonb(r) as data from public.ledger_mutation_receipts r order by request_id')).rows, receipts);
      assert.equal((await mutate('edit', { note: 'stale' }, { id: saved.data.id, version: 1 })).code, 'LEDGER_CONFLICT');
    });

    await t.test('anon and authenticated cannot write, execute mutation RPC or access receipts', async () => {
      await db.exec('reset role');
      const functions = (await db.query("select prosecdef,proconfig from pg_proc where proname in ('ledger_mutate','ledger_increment_version') order by proname")).rows;
      assert.equal(functions.length, 2); assert.ok(functions.every((row) => row.prosecdef === false && row.proconfig.includes('search_path=""')));
      for (const role of ['anon', 'authenticated']) {
        await db.exec(`set role ${role}`);
        assert.ok((await db.query('select * from public.transactions')).rows.length > 0);
        await assert.rejects(add(), /permission denied/);
        await assert.rejects(db.exec('select * from public.ledger_mutation_receipts'), /permission denied/);
        await assert.rejects(db.exec("insert into public.transactions(amount,type) values(1,'expense')"), /permission denied/);
        await assert.rejects(db.exec('update public.transactions set amount=99'), /permission denied/);
        await assert.rejects(db.exec('delete from public.transactions'), /permission denied/);
        await db.exec('reset role');
      }
    });
  } finally { await db.close(); }
});
