const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');
const owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const other = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const read = (file) => fs.readFileSync(require.resolve(`../${file}`), 'utf8');
const migrations = [
  'supabase/migrations/20260908031942_ledger_brand_product.sql',
  'supabase/migrations/202609240001_health_record_mutations.sql',
  'supabase/migrations/202609240002_ledger_queries.sql',
  'supabase/migrations/202609240003_blog_chat_limits.sql',
  'supabase/migrations/20260924073648_ledger_mutations.sql',
  'supabase/migrations/20260924081517_ledger_baseline_objects.sql',
];
async function database() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    insert into auth.users values ('${owner}'), ('${other}');`);
  return db;
}
async function baseline(db) {
  for (const file of ['schema.sql', 'health-schema.sql', 'yudan-schema.sql', 'access-control.sql']) await db.exec(read(file));
}
async function upgrade(db) {
  for (const file of migrations) await db.exec(read(file));
  await db.exec(read('vaccine-catalog-update.sql'));
}
async function checks(db) {
  const results = await db.exec(read('scripts/check-database.sql'));
  return results.flatMap((result) => result.rows).filter((row) => 'ok' in row);
}
async function requireReady(db) {
  const rows = await checks(db);
  assert.ok(rows.length >= 18);
  assert.deepEqual(rows.filter((row) => !row.ok), []);
}
async function snapshot(db) {
  const rows = {};
  for (const table of ['transactions', 'ledger_mutation_receipts', 'yudan_dashboards', 'yudan_weight_records', 'yudan_vaccine_records', 'yudan_health_mutation_receipts']) {
    rows[table] = (await db.query(`select to_jsonb(t) as row from public.${table} t order by to_jsonb(t)::text`)).rows;
  }
  return rows;
}

test('empty database, repeat upgrade and old access scripts retain service-only writes', async () => {
  const db = await database();
  try {
    await baseline(db); await upgrade(db); await requireReady(db);
    await db.exec('set role service_role');
    const result = await db.query(`select public.mutate_yudan_health_record($1,'weight','2026-08-15','save','{"weight_kg":4}',true,null,'cccccccc-cccc-4ccc-8ccc-cccccccccccc') as result`, [owner]);
    assert.equal(result.rows[0].result.created, true);
    const ledger = (await db.query(`select public.ledger_mutate('add','dddddddd-dddd-4ddd-8ddd-dddddddddddd',null,null,'{"amount":16.25,"type":"expense","product":"奶瓶"}') as result`)).rows[0].result;
    assert.equal(ledger.data.version, 1);
    await db.query('update public.transactions set note=$2 where id=$1', [ledger.data.id, '保留版本']);
    await db.exec('reset role');
    await db.exec(`insert into public.yudan_vaccine_records(user_id, plan_id, administered_on, batch_no, place, manufacturer, note)
      values ('${owner}', 'schedule-005', '2026-08-15', '000123', '医院', '厂家', '历史备注');
      update public.yudan_weight_records set height_cm=54, head_circumference_cm=36, note='测量备注';`);
    const before = await snapshot(db);
    const catalog = (await db.query('select * from public.yudan_vaccine_catalog order by id')).rows;
    await db.exec(read('health-schema.sql'));
    assert.deepEqual((await db.query('select * from public.yudan_vaccine_catalog order by id')).rows, catalog);
    await db.query('select public.blog_chat_reserve($1,$2,5,100,10,100)', [owner, 'article']);
    const quota = (await db.query('select to_jsonb(r) as row from blog_chat_private.reservations r')).rows;
    await baseline(db); await upgrade(db);
    assert.deepEqual(await snapshot(db), before);
    assert.deepEqual((await db.query('select to_jsonb(r) as row from blog_chat_private.reservations r')).rows, quota);
    assert.equal((await db.query('select used from blog_chat_private.daily_global')).rows[0].used, 1);
    // The legacy scripts must remain safe even when they run AFTER RPC migrations.
    await db.exec(read('access-control.sql')); await db.exec(read('yudan-schema.sql'));
    await requireReady(db);
    await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: owner, email: 'William.chen@utah.edu', app_metadata: { provider: 'github' } })]);
    await db.exec('set role authenticated');
    assert.equal((await db.query('select * from public.yudan_weight_records')).rows.length, 1);
    await assert.rejects(db.exec('update public.yudan_weight_records set weight_kg=99'), /permission denied/);
    await assert.rejects(db.exec(`select public.mutate_yudan_health_record('${owner}','weight','2026-08-15','delete','{}')`), /permission denied/);
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: other, email: 'William.chen@utah.edu', app_metadata: { provider: 'github' } })]);
    await db.exec('set role authenticated');
    assert.equal((await db.query('select * from public.yudan_weight_records')).rows.length, 0);
  } finally { await db.close(); }
});

test('legacy JSON upgrade preserves growth, retired vaccine metadata and ledger amounts', async () => {
  const db = await database();
  try {
    await db.exec(`create table public.transactions(id uuid primary key default gen_random_uuid(), amount numeric not null, category text, note text, type text not null, transaction_time timestamptz, created_at timestamptz not null default now());
      insert into public.transactions(amount, category, note, type, transaction_time) values (29.90,'食品','[英氏] 米粉 订单号00123','expense','2026-08-15T08:00:00Z');
      create table public.yudan_dashboards(user_id uuid primary key references auth.users(id), birthday date not null, updated_at timestamptz not null, weight_records jsonb, vaccine_records jsonb);`);
    await db.query(`insert into public.yudan_dashboards values ($1,'2026-08-12','2026-08-16T12:00:00Z',$2::jsonb,$3::jsonb)`, [owner,
      JSON.stringify([{ id: 'old-weight', date: '2026-08-15', weight: 4.123, height: 54, head: 36, note: '出生测量' }]),
      JSON.stringify([{ id: 'old-vaccine', planId: 'schedule-005', doneDate: '2026-08-15', place: '医院', batchNo: '000123', manufacturer: '厂家', note: '接种观察' }])]);
    await baseline(db); await upgrade(db); await requireReady(db);
    const weight = (await db.query('select weight_kg::text, height_cm::text, head_circumference_cm::text, note, legacy_id from public.yudan_weight_records')).rows[0];
    assert.deepEqual(weight, { weight_kg: '4.123', height_cm: '54.00', head_circumference_cm: '36.00', note: '出生测量', legacy_id: 'old-weight' });
    assert.deepEqual((await db.query('select place,batch_no,manufacturer,note,legacy_id from public.yudan_vaccine_records')).rows[0], { place: '医院', batch_no: '000123', manufacturer: '厂家', note: '接种观察', legacy_id: 'old-vaccine' });
    assert.equal((await db.query("select active from public.yudan_vaccine_catalog where id='schedule-005'")).rows[0].active, false);
    const ledger = (await db.query('select amount::text, brand, product, note from public.transactions')).rows[0];
    assert.deepEqual(ledger, { amount: '29.90', brand: '英氏', product: '米粉', note: '订单号：00123' });
    const before = await snapshot(db);
    await baseline(db); await upgrade(db); await requireReady(db);
    assert.deepEqual(await snapshot(db), before);
  } finally { await db.close(); }
});

test('failed legacy validation rolls back normalization and keeps the original JSON', async () => {
  const db = await database();
  try {
    await db.exec(read('health-schema.sql'));
    await db.exec(`create table public.yudan_dashboards(user_id uuid primary key references auth.users(id), birthday date not null, updated_at timestamptz not null default now(), weight_records jsonb, vaccine_records jsonb);
      insert into public.yudan_dashboards values ('${owner}','2026-08-12',now(),'[{"date":"2026-08-15","weight":4},{"date":"2026-08-15","weight":5}]','[]');`);
    await assert.rejects(db.exec(read('yudan-schema.sql')), /cannot affect row a second time|do not match legacy JSON/);
    await db.exec('rollback');
    assert.equal((await db.query('select jsonb_array_length(weight_records) as count from public.yudan_dashboards')).rows[0].count, 2);
    assert.equal((await db.query("select to_regclass('public.yudan_weight_records') as table_name")).rows[0].table_name, null);
  } finally { await db.close(); }
});

test('read-only preflight reports missing migrations and permission regressions', async () => {
  const db = await database();
  try {
    await baseline(db);
    assert.ok((await checks(db)).some((row) => row.check_name.startsWith('rpc:') && !row.ok));
    await upgrade(db); await requireReady(db);
    await db.exec('grant update on public.yudan_weight_records to authenticated; drop index public.yudan_vaccine_records_plan_id_idx; alter table public.transactions disable trigger ledger_increment_version;');
    const failed = (await checks(db)).filter((row) => !row.ok).map((row) => row.check_name);
    assert.ok(failed.includes('table:yudan_weight_records'));
    assert.ok(failed.includes('index:public.yudan_vaccine_records_plan_id_idx'));
    assert.ok(failed.includes('ledger:write-version'));
  } finally { await db.close(); }
});

test('health key preflight accepts historical names and rejects indexes that cannot arbitrate ON CONFLICT', async () => {
  const db = await database();
  const vaccineKey = 'unique:public.yudan_vaccine_records(user_id,plan_id)';
  const vaccineKeyReady = async () => (await checks(db)).find((row) => row.check_name === vaccineKey)?.ok;
  try {
    await baseline(db); await upgrade(db);
    await db.exec(`alter table public.yudan_weight_records rename constraint yudan_weight_records_user_id_measured_on_key to yudan_weight_records_user_measured_on_key;
      alter table public.yudan_vaccine_records rename constraint yudan_vaccine_records_user_id_plan_id_key to yudan_vaccine_records_user_plan_key;`);
    await requireReady(db);
    await db.exec(`alter table public.yudan_vaccine_records drop constraint yudan_vaccine_records_user_plan_key;
      create index yudan_vaccine_records_user_id_plan_id_key on public.yudan_vaccine_records(user_id,plan_id);`);
    assert.equal(await vaccineKeyReady(), false, 'matching names do not make a non-unique index sufficient');
    await db.exec(`drop index public.yudan_vaccine_records_user_id_plan_id_key;
      create unique index partial_vaccine_key on public.yudan_vaccine_records(user_id,plan_id) where administered_on >= '2026-01-01';`);
    assert.equal(await vaccineKeyReady(), false, 'a partial index cannot cover every health record');
    await db.exec(`drop index public.partial_vaccine_key;
      alter table public.yudan_vaccine_records add constraint deferred_vaccine_key unique(user_id,plan_id) deferrable;`);
    assert.equal(await vaccineKeyReady(), false, 'ON CONFLICT cannot use deferrable uniqueness');
    await db.exec(`alter table public.yudan_vaccine_records drop constraint deferred_vaccine_key;
      create unique index compatible_vaccine_key on public.yudan_vaccine_records(plan_id,user_id) include(id);`);
    await requireReady(db);
    await db.query(`insert into public.yudan_vaccine_records(user_id,plan_id,administered_on) values($1,'schedule-005','2026-08-15')
      on conflict(user_id,plan_id) do update set administered_on=excluded.administered_on`, [owner]);
    await db.query(`insert into public.yudan_vaccine_records(user_id,plan_id,administered_on) values($1,'schedule-005','2026-08-16')
      on conflict(user_id,plan_id) do update set administered_on=excluded.administered_on`, [owner]);
    assert.equal((await db.query('select count(*)::integer as count from public.yudan_vaccine_records')).rows[0].count, 1);
  } finally { await db.close(); }
});

test('minimal normalized-database release adds ledger objects and retires health writes only in the final migration', async () => {
  const db = await database();
  const beforeRows = async () => ({
    ledger: (await db.query("select to_jsonb(t)-'version' as row from public.transactions t order by id")).rows,
    health: (await db.query('select to_jsonb(t) as row from public.yudan_weight_records t order by id')).rows,
    catalog: (await db.query('select to_jsonb(t) as row from public.yudan_vaccine_catalog t order by id')).rows,
  });
  const release = [
    'supabase/migrations/20260924081517_ledger_baseline_objects.sql',
    'supabase/migrations/202609240002_ledger_queries.sql',
    'supabase/migrations/202609240003_blog_chat_limits.sql',
    'supabase/migrations/20260924073648_ledger_mutations.sql',
  ];
  try {
    await baseline(db);
    await db.exec(`drop index public.idx_transactions_transaction_time; drop function public.total_expense();
      alter table public.yudan_weight_records rename constraint yudan_weight_records_user_id_measured_on_key to yudan_weight_records_user_measured_on_key;
      alter table public.yudan_vaccine_records rename constraint yudan_vaccine_records_user_id_plan_id_key to yudan_vaccine_records_user_plan_key;
      grant insert,update,delete on public.yudan_dashboards,public.yudan_weight_records,public.yudan_vaccine_records to authenticated;
      insert into public.transactions(amount,type,brand,product) values(12.34,'expense','示例品牌','示例商品'),(5,'income',null,null);
      insert into public.yudan_weight_records(user_id,measured_on,weight_kg,note) values('${owner}','2026-08-15',4,'保留记录');`);
    const before = await beforeRows();
    for (const file of release) await db.exec(read(file));
    assert.equal((await db.query("select has_table_privilege('authenticated','public.yudan_weight_records','update') as allowed")).rows[0].allowed, true);
    await db.exec('set role anon');
    assert.equal(Number((await db.query('select public.total_expense() as total')).rows[0].total), 12.34);
    await db.exec('reset role');
    const fn = (await db.query("select prosecdef,proconfig from pg_proc where oid='public.total_expense()'::regprocedure")).rows[0];
    assert.equal(fn.prosecdef, false); assert.ok(fn.proconfig.includes('search_path=""'));
    await db.exec(read('supabase/migrations/202609240001_health_record_mutations.sql'));
    await requireReady(db);
    assert.deepEqual(await beforeRows(), before);
    for (const file of release) await db.exec(read(file));
    await db.exec(read('supabase/migrations/202609240001_health_record_mutations.sql'));
    await requireReady(db);
    assert.deepEqual(await beforeRows(), before);
  } finally { await db.close(); }
});
