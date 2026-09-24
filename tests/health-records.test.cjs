const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText, filename);
const { healthDatePositions, shanghaiToday, validateHealthDate, validateHealthWeight, readExpectedVersion, validateHealthMutation, advanceHealthQueue, enqueueHealthMutation } = require('../src/lib/health-records.ts');
const { applyHealthMutation, defaultData, daysBetween, addMonths } = require('../src/lib/health-model.ts');
const id = '11111111-1111-1111-1111-111111111111';
const mutation = (patch = {}) => ({ request_id: id, kind: 'weight', key: '2026-08-15', action: 'save', expected_updated_at: null, changes: { weight_kg: 4.2 }, ...patch });

test('Shanghai midnight advances dates regardless of host timezone; dates and weights reject invalid values', () => {
  assert.equal(shanghaiToday(new Date('2026-08-12T15:59:59Z')), '2026-08-12');
  assert.equal(shanghaiToday(new Date('2026-08-12T16:00:00Z')), '2026-08-13');
  for (const value of ['2026-02-29', '2026-04-31', '2026-2-02', 'today', '', null]) assert.throws(() => validateHealthDate(value));
  assert.throws(() => validateHealthDate('2026-08-14', '日期', new Date('2026-08-12T16:00:00Z')));
  for (const value of [NaN, Infinity, -1, 0, 200.1, '4.2', null]) assert.throws(() => validateHealthWeight(value));
  assert.equal(validateHealthWeight(0.1), 0.1); assert.equal(validateHealthWeight(200), 200);
  assert.equal(daysBetween('2026-03-07', '2026-03-09'), 2);
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
});

test('legacy calls omit version while explicit null means insert only', () => {
  assert.equal(readExpectedVersion({}), undefined); assert.equal(readExpectedVersion({ expected_updated_at: null }), null);
  const value = '2026-08-12T00:00:00.123456+00:00'; assert.equal(readExpectedVersion({ expected_updated_at: value }), value);
  for (const value of ['', '2026-08-12', 1, {}]) assert.throws(() => readExpectedVersion({ expected_updated_at: value }));
});

test('weight chart uses actual day gaps instead of equal spacing', () => {
  assert.deepEqual(healthDatePositions(['2026-08-01', '2026-08-02', '2026-08-11']), [0, 0.1, 1]);
  assert.deepEqual(healthDatePositions(['2026-08-01']), [0.5]);
  assert.deepEqual(healthDatePositions([]), []);
});

test('weight updates and explicit deletes preserve another device record and omitted metadata', () => {
  const first = { id: 'a', date: '2026-08-15', weight: 3, height: 52, head: 36, note: '不要丢失', updatedAt: 'old' };
  const second = { ...first, id: 'remote', date: '2026-08-16', weight: 3.5 };
  const data = { ...defaultData, growth: [first, second] };
  const next = applyHealthMutation(data, mutation());
  assert.deepEqual(next.growth.find((item) => item.id === 'a'), { ...first, weight: 4.2 });
  assert.deepEqual(next.growth.find((item) => item.id === 'remote'), second);
  const removed = applyHealthMutation(next, mutation({ action: 'delete', changes: {} }));
  assert.deepEqual(removed.growth, [second]); assert.equal(data.growth[0].weight, 3);
});

test('queued offline edits keep request identity and chain only matching record versions after acknowledgment', () => {
  const first = mutation({ expected_updated_at: 'v1' });
  const next = mutation({ request_id: '2', expected_updated_at: 'v1', changes: { weight_kg: 4.3 } });
  const remote = mutation({ request_id: '3', key: '2026-08-16', expected_updated_at: 'v1' });
  const queue = enqueueHealthMutation(enqueueHealthMutation([first], next), remote);
  assert.equal(queue.length, 3);
  const advanced = advanceHealthQueue(queue, first, 'v2');
  assert.equal(advanced.length, 2); assert.equal(advanced[0].request_id, '2'); assert.equal(advanced[0].expected_updated_at, 'v2'); assert.equal(advanced[1].expected_updated_at, 'v1');
  assert.equal(queue[1].expected_updated_at, 'v1');
});

test('mutation validation excludes extra fields so snapshots cannot rewrite metadata', () => {
  const parsed = validateHealthMutation(mutation({ changes: { weight_kg: 4.2, height_cm: null, note: '' } }));
  assert.deepEqual(parsed.changes, { weight_kg: 4.2 });
  for (const patch of [{ kind: 'all' }, { action: 'truncate' }, { request_id: 'invalid' }, { changes: {} }, { expected_updated_at: 'bad' }]) assert.throws(() => validateHealthMutation(mutation(patch)));
});
