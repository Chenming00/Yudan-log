const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText, filename);
const { dashboardFromCloud, defaultData, applyHealthMutation } = require('../src/lib/health-model.ts');
const catalog = (id, active = true) => ({ id, active, sort_order: 1, age_months: 0, age_label: '出生', vaccine: id, dose: '第1剂', funding: 'free', date_rule: null, date_offset_days: 0 });
const record = (plan_id) => ({ id: plan_id, plan_id, administered_on: '2026-08-12', updated_at: '2026-08-12T00:00:00.001Z', place: '医院', batch_no: '000123', manufacturer: '厂家', note: '接种反应' });

test('retired vaccine history stays visible with all metadata; inactive unrecorded plans remain hidden', () => {
  const data = dashboardFromCloud({ birthday: '2026-08-12' }, [], [record('retired')], defaultData, [catalog('retired', false), catalog('unused', false), catalog('active')]);
  assert.deepEqual(data.vaccines.map((item) => item.planId), ['retired', 'active']);
  const saved = data.vaccines[0];
  assert.equal(saved.batchNo, '000123'); assert.equal(saved.place, '医院'); assert.equal(saved.manufacturer, '厂家'); assert.equal(saved.note, '接种反应'); assert.ok(saved.updatedAt);
  const next = applyHealthMutation(data, { kind: 'vaccine', key: 'active', action: 'save', changes: { administered_on: '2026-08-15' } });
  assert.deepEqual(next.vaccines[0], saved);
});

test('changing one vaccine date preserves its batch metadata and all other histories', () => {
  const data = dashboardFromCloud({ birthday: '2026-08-12' }, [], [record('a'), record('b')], defaultData, [catalog('a'), catalog('b')]);
  const next = applyHealthMutation(data, { kind: 'vaccine', key: 'a', action: 'save', changes: { administered_on: '2026-08-14' } });
  assert.equal(next.vaccines[0].doneDate, '2026-08-14'); assert.equal(next.vaccines[0].batchNo, '000123');
  assert.deepEqual(next.vaccines[1], data.vaccines[1]);
});
