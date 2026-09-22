const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');

// Exercise the actual save function without loading React or a real database.
const source = fs.readFileSync(require.resolve('../src/components/yudan/page.tsx'), 'utf8');
const ast = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const saveFunction = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'saveCloudDashboard');
assert.ok(saveFunction);
const compiled = ts.transpileModule(saveFunction.getText(ast), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText;
const saveCloudDashboard = vm.runInNewContext(`${compiled}\nsaveCloudDashboard`, { defaultBirthday: '2026-08-12' });

test('saving a new catalog keeps retired vaccine history and deletes only cleared visible records', async () => {
  const removed = [];
  const upserted = [];
  const supabase = {
    from(table) {
      return {
        select() {
          return { eq: async () => ({ error: null, data: table === 'yudan_vaccine_records' ? [
            { id: 'retired-history', plan_id: 'schedule-004' },
            { id: 'kept-history', plan_id: 'schedule-001' },
            { id: 'cleared-history', plan_id: 'penta-001' },
          ] : [] }) };
        },
        async upsert(rows) { upserted.push({ table, rows }); return { error: null }; },
        delete() { return { in: async (_, ids) => { removed.push(...ids); return { error: null }; } }; },
      };
    },
  };
  await saveCloudDashboard(supabase, 'owner', { growth: [], vaccines: [
    { planId: 'schedule-001', doneDate: '2026-08-12' },
    { planId: 'penta-001', doneDate: '' },
  ] });
  assert.deepEqual(removed, ['cleared-history']);
  const saved = upserted.find((call) => call.table === 'yudan_vaccine_records').rows;
  assert.equal(saved.length, 1);
  assert.equal(saved[0].plan_id, 'schedule-001');
  assert.equal(saved[0].administered_on, '2026-08-12');
});
