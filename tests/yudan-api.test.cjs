const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const apiKey = 'offline-yudan-test-key';
const ownerId = '11111111-1111-1111-1111-111111111111';
const sessionOwnerId = '22222222-2222-2222-2222-222222222222';
const requestId = '33333333-3333-3333-3333-333333333333';
const version = '2026-08-15T00:00:00.000001Z';
const owner = { id: ownerId, email: 'William.chen@utah.edu', app_metadata: { provider: 'github' } };
const plan = (id, overrides = {}) => ({
  id, active: true, sort_order: 1, age_months: 0, age_label: '出生', vaccine: '测试疫苗', dose: '第1剂', funding: 'free',
  date_rule: null, date_offset_days: 0, region: '测试地区', schedule_version: 'fixture', prevents: '测试疾病',
  aliases: ['测试'], audience: null, schedule_note: null, source: 'fixture', ...overrides,
});
const vaccineRecord = (planId, overrides = {}) => ({
  id: `record-${planId}`, user_id: ownerId, plan_id: planId, administered_on: '2026-08-15', updated_at: version, ...overrides,
});

function fixture() {
  const calls = [];
  const state = {
    users: [owner], ownerError: null, tableError: null, rpcResult: null,
    sessions: new Map([
      ['owner-session', { ...owner, id: sessionOwnerId }],
      ['wrong-email', { ...owner, email: 'someone@example.test' }],
      ['wrong-provider', { ...owner, app_metadata: { provider: 'email' } }],
    ]),
    tables: {
      yudan_dashboards: [{ user_id: ownerId, birthday: '2026-01-01', updated_at: version }],
      yudan_vaccine_catalog: [plan('active-plan')],
      yudan_vaccine_records: [],
      yudan_weight_records: [],
    },
  };
  class Query {
    constructor(table) { this.table = table; this.filters = []; this.columns = '*'; this.single = false; this.sort = null; this.bounds = null; }
    select(columns) { this.columns = columns; return this; }
    eq(key, value) { this.filters.push([key, value]); return this; }
    order(key) { this.sort = key; return this; }
    range(from, to) { this.bounds = [from, to]; return this; }
    maybeSingle() { this.single = true; return this; }
    then(resolve, reject) {
      calls.push({ kind: 'query', table: this.table, filters: this.filters, columns: this.columns, bounds: this.bounds });
      if (state.tableError === this.table) return Promise.resolve({ data: null, error: new Error('Fixture query failure') }).then(resolve, reject);
      let rows = (state.tables[this.table] || []).filter((row) => this.filters.every(([key, value]) => row[key] === value));
      if (this.sort) rows = [...rows].sort((a, b) => a[this.sort] < b[this.sort] ? -1 : a[this.sort] > b[this.sort] ? 1 : 0);
      if (this.bounds) rows = rows.slice(this.bounds[0], this.bounds[1] + 1);
      const columns = this.columns.split(',').map((value) => value.trim());
      const values = rows.map((row) => this.columns === '*' ? { ...row } : Object.fromEntries(columns.map((key) => [key, row[key]])));
      return Promise.resolve({ data: this.single ? values[0] || null : values, error: null }).then(resolve, reject);
    }
  }
  const client = {
    auth: {
      admin: { async listUsers({ page, perPage }) {
        calls.push({ kind: 'owner', page });
        return { data: { users: state.users.slice((page - 1) * perPage, page * perPage) }, error: state.ownerError };
      } },
      async getUser(token) {
        calls.push({ kind: 'session', token });
        return { data: { user: state.sessions.get(token) || null }, error: null };
      },
    },
    from: (table) => new Query(table),
    async rpc(name, args) {
      calls.push({ kind: 'rpc', name, args });
      return state.rpcResult || {
        data: { created: true, conflict: false, record: args.p_kind === 'weight'
          ? { id: 'weight-fixture', measured_on: args.p_key, weight_kg: args.p_changes.weight_kg, updated_at: version }
          : { id: 'vaccine-fixture', plan_id: args.p_key, administered_on: args.p_changes.administered_on, updated_at: version } },
        error: null,
      };
    },
  };
  const modules = new Map();
  function load(filename) {
    if (modules.has(filename)) return modules.get(filename).exports;
    const module = { exports: {} };
    modules.set(filename, module);
    // Use the real auth and validation code, but no real credentials or Supabase client.
    const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env', '({})').replaceAll('process.env.API_KEY', JSON.stringify(apiKey));
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const dependency = (name) => {
      if (name.endsWith('/supabase')) return { getSupabaseAdminClient: () => client, getSupabaseClient: () => client };
      return name.startsWith('.') ? load(path.resolve(path.dirname(filename), `${name}.ts`)) : require(name);
    };
    new Function('require', 'exports', 'module', compiled)(dependency, module.exports, module);
    return module.exports;
  }
  const api = load(path.resolve(__dirname, '../src/lib/yudan-api.ts'));
  async function invoke(route, method = 'GET', body, token = apiKey) {
    const handlers = load(path.resolve(__dirname, `../src/pages/api/yudan/${route}.ts`));
    const request = new Request(`https://example.test/api/yudan/${route === 'index' ? '' : route}`, {
      method, headers: token ? { Authorization: `Bearer ${token}` } : {},
      ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
    });
    const response = await handlers[method]({ request });
    return { response, body: await response.json() };
  }
  return { api, client, state, calls, invoke };
}

const queries = (f, table) => f.calls.filter((call) => call.kind === 'query' && (!table || call.table === table));
const rpcs = (f) => f.calls.filter((call) => call.kind === 'rpc');
const mutation = (extra = {}) => ({ request_id: requestId, kind: 'weight', key: '2026-08-15', action: 'save', changes: { weight_kg: 4.2 }, expected_updated_at: null, ...extra });

test('owner context shares in-flight discovery and does not read the dashboard', async () => {
  const f = fixture();
  const results = await Promise.all([f.api.getOwnerContext(), f.api.getOwnerContext(), f.api.getOwnerContext()]);
  assert.ok(results.every((context) => context.supabase === f.client && context.userId === ownerId && context.birthday === '2026-08-12'));
  assert.equal(f.calls.filter((call) => call.kind === 'owner').length, 1);
  assert.equal(queries(f).length, 0);
  await f.api.getOwnerContext();
  assert.equal(f.calls.length, 1);
});

test('owner lookup failures can retry and never accept a wrong email or non-GitHub identity', async () => {
  const f = fixture();
  f.state.ownerError = new Error('Fixture auth failure');
  await assert.rejects(f.api.getOwnerContext(), /Fixture auth failure/);
  f.state.ownerError = null;
  f.state.users = [f.state.sessions.get('wrong-email'), f.state.sessions.get('wrong-provider')];
  await assert.rejects(f.api.getOwnerContext(), /未找到已授权/);
  f.state.users = [owner];
  assert.equal((await f.api.getOwnerContext()).userId, ownerId);
  assert.equal(f.calls.filter((call) => call.kind === 'owner').length, 3);
  assert.equal(queries(f).length, 0);
});

test('dashboard reads retain updated_at and the fixed birthday, including an absent profile', async () => {
  const f = fixture();
  let dashboard = await f.api.getOwnerDashboard();
  assert.deepEqual(dashboard.row, { user_id: ownerId, birthday: '2026-08-12', updated_at: version });
  f.state.tables.yudan_dashboards = [];
  dashboard = await f.api.getOwnerDashboard();
  assert.deepEqual(dashboard.row, { user_id: ownerId, birthday: '2026-08-12', updated_at: '' });
  assert.equal(queries(f, 'yudan_dashboards').length, 2);
});

test('warm weight and vaccine writes skip profile reads and preserve mutation versions and response shape', async () => {
  const f = fixture();
  f.state.tables.yudan_vaccine_catalog = [plan('retired-plan', { active: false })];
  await f.api.getOwnerContext();
  f.calls.length = 0;
  let result = await f.invoke('weight', 'POST', { date: '2026-08-15', weight: 4.2, expected_updated_at: version });
  assert.equal(result.response.status, 200);
  assert.equal(queries(f).length, 0);
  assert.equal(rpcs(f).length, 1);
  assert.equal(rpcs(f)[0].args.p_user_id, ownerId);
  assert.equal(rpcs(f)[0].args.p_check_version, true);
  assert.equal(rpcs(f)[0].args.p_expected_updated_at, version);
  assert.deepEqual(result.body.data.record, { id: 'weight-fixture', date: '2026-08-15', weight: 4.2, updated_at: version });
  f.calls.length = 0;
  result = await f.invoke('vaccine', 'POST', { plan_id: 'retired-plan', actual_date: '2026-08-15', expected_updated_at: null });
  assert.equal(result.response.status, 200);
  assert.equal(queries(f).length, 1);
  assert.equal(queries(f, 'yudan_vaccine_catalog').length, 1);
  assert.equal(rpcs(f).length, 1);
  assert.equal(rpcs(f)[0].args.p_check_version, true);
  assert.equal(rpcs(f)[0].args.p_expected_updated_at, null);
  assert.equal(result.body.data.plan.id, 'retired-plan');
  assert.equal(Object.hasOwn(result.body.data.plan, 'active'), false);
  assert.equal(result.body.data.record.planId, 'retired-plan');
});

test('API Key and GitHub record writes keep separate owner IDs, request IDs, and version/conflict handling', async () => {
  const f = fixture();
  await f.api.getOwnerContext();
  f.calls.length = 0;
  let result = await f.invoke('records', 'POST', mutation());
  assert.equal(result.response.status, 200);
  assert.equal(queries(f).length, 0);
  assert.deepEqual(rpcs(f)[0].args, {
    p_user_id: ownerId, p_kind: 'weight', p_key: '2026-08-15', p_action: 'save', p_changes: { weight_kg: 4.2 },
    p_check_version: true, p_expected_updated_at: null, p_request_id: requestId,
  });
  f.calls.length = 0;
  result = await f.invoke('records', 'POST', mutation({ expected_updated_at: version }), 'owner-session');
  assert.equal(result.response.status, 200);
  assert.equal(rpcs(f)[0].args.p_user_id, sessionOwnerId);
  assert.equal(rpcs(f)[0].args.p_request_id, requestId);
  assert.equal(rpcs(f)[0].args.p_expected_updated_at, version);
  assert.equal(queries(f).length, 0);
  assert.equal(f.calls.some((call) => call.kind === 'owner'), false);
  const withoutVersion = mutation();
  delete withoutVersion.expected_updated_at;
  result = await f.invoke('records', 'POST', withoutVersion, 'owner-session');
  assert.equal(result.response.status, 400);
  assert.equal(rpcs(f).length, 1);
  f.state.rpcResult = { data: { conflict: true, current: { weight_kg: 4.3, updated_at: version } }, error: null };
  result = await f.invoke('records', 'POST', mutation(), 'owner-session');
  assert.equal(result.response.status, 409);
  assert.deepEqual(result.body.current, { weight_kg: 4.3, updated_at: version });
});

test('unauthorized requests perform no owner discovery, record reads, or writes, even with a warm owner cache', async () => {
  const f = fixture();
  await f.api.getOwnerContext();
  f.calls.length = 0;
  for (const route of ['index', 'vaccines', 'care']) {
    assert.equal((await f.invoke(route, 'GET', undefined, '')).response.status, 401);
  }
  for (const route of ['weight', 'vaccine']) {
    assert.equal((await f.invoke(route, 'POST', {}, 'wrong')).response.status, 401);
  }
  for (const token of ['', 'wrong-email', 'wrong-provider']) {
    assert.equal((await f.invoke('records', 'POST', mutation(), token)).response.status, 401);
  }
  assert.equal(queries(f).length, 0);
  assert.equal(rpcs(f).length, 0);
  assert.equal(f.calls.some((call) => call.kind === 'owner'), false);
});

test('vaccine schedule uses two reads and preserves active ordering and legacy retired-record matching order', async () => {
  const f = fixture();
  f.state.tables.yudan_vaccine_catalog = [
    plan('b-active', { sort_order: 3, vaccine: '另一个疫苗' }),
    plan('z-active', { sort_order: 2 }),
    plan('a-retired', { active: false, sort_order: 1 }),
    plan('unused-retired', { active: false, sort_order: 0 }),
  ];
  f.state.tables.yudan_vaccine_records = [
    vaccineRecord('z-active', { administered_on: '2026-08-21' }),
    vaccineRecord('a-retired', { administered_on: '2026-08-20' }),
    vaccineRecord('b-active', { user_id: sessionOwnerId, administered_on: '2026-08-22' }),
  ];
  await f.api.getOwnerContext();
  f.calls.length = 0;
  const result = await f.invoke('vaccines');
  assert.equal(result.response.status, 200);
  assert.equal(result.response.headers.get('cache-control'), 'no-store');
  assert.equal(queries(f).length, 2);
  assert.equal(queries(f, 'yudan_vaccine_catalog').length, 1);
  assert.equal(queries(f, 'yudan_vaccine_records').length, 1);
  assert.deepEqual(queries(f, 'yudan_vaccine_records')[0].filters, [['user_id', ownerId]]);
  assert.deepEqual(result.body.data.map((item) => item.plan_id), ['z-active', 'b-active']);
  // Preserve the old first matching record rule: the retired alias sorts before the exact plan record.
  assert.equal(result.body.data[0].actual_date, '2026-08-20');
  assert.equal(result.body.data[1].actual_date, null);
  assert.deepEqual(Object.keys(result.body.data[0]).sort(), [
    'plan_id', 'vaccine', 'dose', 'age_label', 'funding', 'prevents', 'audience', 'region', 'schedule_version',
    'schedule_note', 'source', 'suggested_date', 'actual_date',
  ].sort());
});

test('full dashboard still maps retired and unknown plans without exposing internal catalog flags', async () => {
  const f = fixture();
  f.state.tables.yudan_vaccine_catalog = [plan('retired', { active: false })];
  f.state.tables.yudan_vaccine_records = [vaccineRecord('retired'), vaccineRecord('unknown')];
  const result = await f.invoke('index');
  assert.equal(result.response.status, 200);
  assert.equal(result.body.data.updated_at, version);
  assert.equal(result.body.data.birthday, '2026-08-12');
  assert.deepEqual(result.body.data.vaccine_records.map((item) => [item.planId, item.vaccine, item.dose, item.ageLabel]), [
    ['retired', '测试疫苗', '第1剂', '出生'], ['unknown', 'unknown', '', ''],
  ]);
  assert.equal(queries(f, 'yudan_dashboards').length, 1);
  assert.equal(queries(f, 'yudan_vaccine_catalog').length, 1);
  const active = await f.api.getVaccineCatalog(f.client);
  assert.deepEqual(active, []);
  const all = await f.api.getVaccineCatalog(f.client, true);
  assert.equal(all[0].id, 'retired');
  assert.equal(Object.hasOwn(all[0], 'active'), false);
});

test('shared schedule catalog is queried once across all pages and fresh on the next request', async () => {
  const f = fixture();
  f.state.tables.yudan_vaccine_records = Array.from({ length: 501 }, (_, index) => vaccineRecord(`plan-${String(index).padStart(4, '0')}`));
  let result = await f.api.getVaccineScheduleData(f.client, ownerId);
  assert.equal(result.records.length, 501);
  assert.deepEqual(queries(f, 'yudan_vaccine_records').map((call) => call.bounds), [[0, 499], [500, 999]]);
  assert.equal(queries(f, 'yudan_vaccine_catalog').length, 1);
  f.state.tables.yudan_vaccine_catalog[0].active = false;
  result = await f.api.getVaccineScheduleData(f.client, ownerId);
  assert.deepEqual(result.catalog, []);
  assert.equal(queries(f, 'yudan_vaccine_catalog').length, 2);
});
