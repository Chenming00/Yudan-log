// Runs the actual migration in an isolated, in-memory PostgreSQL instance.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');

test('health mutation PostgreSQL transactions, version checks and compatibility', async (t) => {
  const db = new PGlite();
  const owner = randomUUID();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth; create table auth.users (id uuid primary key);
      create table public.yudan_vaccine_catalog (id text primary key, active boolean not null default true);`);
    await db.exec(fs.readFileSync(require.resolve('../yudan-schema.sql'), 'utf8').split('-- Existing installations')[0] + '\ncommit;');
    await db.exec(fs.readFileSync(require.resolve('../supabase/migrations/202609240001_health_record_mutations.sql'), 'utf8'));
    await db.query('insert into auth.users values ($1)', [owner]);
    await db.exec("insert into public.yudan_vaccine_catalog values ('active', true), ('retired', false)");
    const call = async ({ kind = 'weight', key = '2026-08-15', action = 'save', changes = { weight_kg: 4 }, check = true, version = null, request = randomUUID() } = {}) => {
      const result = await db.query('select public.mutate_yudan_health_record($1::uuid,$2::text,$3::text,$4::text,$5::jsonb,$6::boolean,$7::timestamptz,$8::uuid) as result', [owner, kind, key, action, JSON.stringify(changes), check, version, request]);
      return result.rows[0].result;
    };

    await t.test('only one concurrent insert wins; unrelated dates remain untouched', async () => {
      const results = await Promise.all([call(), call({ changes: { weight_kg: 5 } })]);
      assert.equal(results.filter((result) => result.conflict).length, 1);
      await call({ key: '2026-08-16' });
      const weights = await db.query('select measured_on::text from public.yudan_weight_records order by measured_on');
      assert.deepEqual(weights.rows.map((row) => row.measured_on), ['2026-08-15', '2026-08-16']);
    });

    await t.test('legacy upsert preserves omitted height, head, notes; stale updates and deletes conflict', async () => {
      await db.exec("update public.yudan_weight_records set height_cm = 54, head_circumference_cm = 36, note = '出生记录' where measured_on = '2026-08-15'");
      const old = (await db.query("select updated_at::text from public.yudan_weight_records where measured_on = '2026-08-15'")).rows[0].updated_at;
      const saved = await call({ check: false, changes: { weight_kg: 4.5 } });
      assert.equal(Number(saved.record.height_cm), 54); assert.equal(Number(saved.record.head_circumference_cm), 36); assert.equal(saved.record.note, '出生记录');
      assert.equal((await call({ version: old, changes: { weight_kg: 6 } })).conflict, true);
      assert.equal((await call({ version: old, action: 'delete', changes: {} })).conflict, true);
      const deleted = await call({ version: saved.record.updated_at, action: 'delete', changes: {} });
      assert.equal(deleted.conflict, false);
      const weights = await db.query('select measured_on::text from public.yudan_weight_records');
      assert.deepEqual(weights.rows.map((row) => row.measured_on), ['2026-08-16']);
    });

    await t.test('lost HTTP response can be retried with the same receipt without rewriting data', async () => {
      const request = randomUUID();
      const first = await call({ key: '2026-08-17', request });
      const second = await call({ key: '2026-08-17', request });
      assert.deepEqual(first, second);
      await assert.rejects(call({ key: '2026-08-17', request, changes: { weight_kg: 9 } }), /Mutation ID reused/);
    });

    await t.test('vaccine date changes keep metadata and retired history', async () => {
      await call({ kind: 'vaccine', key: 'retired', changes: { administered_on: '2026-08-12' } });
      const first = await call({ kind: 'vaccine', key: 'active', changes: { administered_on: '2026-08-13' } });
      await db.exec("update public.yudan_vaccine_records set batch_no='000123', place='医院', manufacturer='厂家', note='观察' where plan_id='active'");
      const saved = await call({ kind: 'vaccine', key: 'active', changes: { administered_on: '2026-08-14' }, version: first.record.updated_at });
      assert.equal(saved.record.batch_no, '000123'); assert.equal(saved.record.place, '医院'); assert.equal(saved.record.manufacturer, '厂家'); assert.equal(saved.record.note, '观察');
      assert.equal((await db.query("select count(*)::integer as total from public.yudan_vaccine_records where plan_id='retired'")).rows[0].total, 1);
    });

    await t.test('profile update failure rolls back both record mutation and idempotency receipt', async () => {
      await db.exec("create function public.reject_test_profile() returns trigger language plpgsql as $$ begin raise exception 'test profile failure'; end; $$; create trigger test_profile_failure before update on public.yudan_dashboards for each row execute function public.reject_test_profile();");
      const request = randomUUID();
      await assert.rejects(call({ key: '2026-08-18', request }), /test profile failure/);
      assert.equal((await db.query("select count(*)::integer as total from public.yudan_weight_records where measured_on='2026-08-18'")).rows[0].total, 0);
      assert.equal((await db.query('select count(*)::integer as total from public.yudan_health_mutation_receipts where request_id=$1', [request])).rows[0].total, 0);
      await db.exec('drop trigger test_profile_failure on public.yudan_dashboards');
    });

    await t.test('browser and anonymous roles cannot bypass the authenticated API', async () => {
      const result = await db.query("select has_function_privilege('authenticated','public.mutate_yudan_health_record(uuid,text,text,text,jsonb,boolean,timestamptz,uuid)','execute') as rpc, has_table_privilege('authenticated','public.yudan_weight_records','update') as direct, has_table_privilege('anon','public.yudan_health_mutation_receipts','select') as receipts");
      assert.deepEqual(result.rows[0], { rpc: false, direct: false, receipts: false });
    });
  } finally { await db.close(); }
});
