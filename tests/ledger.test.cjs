const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  module._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
};
const { parseLedgerInput } = require('../src/lib/ledger-input.ts');
const { transactionTitle, matchesTransaction, csvCell, validateLedgerForm } = require('../lib/ledger.ts');
const id = '12345678-1234-1234-1234-123456789abc';

test('new fields, category compatibility, and Chinese midnight round-trip', () => {
  const { fields } = parseLedgerInput({ amount: '16.00', type: 'expense', brand: ' 示例 ', product: '奶嘴收纳盒 2个装', category: '🍼喂养用品', transaction_time: '2026-09-08T00:00:00+08:00', note: '订单号：000123\n优惠：店铺优惠¥15' });
  assert.equal(fields.amount, 16);
  assert.equal(fields.brand, '示例');
  assert.equal(fields.category, '喂养用品');
  assert.equal(fields.transaction_time, '2026-09-07T16:00:00.000Z');
  assert.equal(fields.note, '订单号：000123\n优惠：店铺优惠¥15');
});
test('partial edit preserves omitted fields and clears optional fields explicitly', () => {
  assert.deepEqual(parseLedgerInput({ id, brand: '', note: null, transaction_time: null }, true).fields, { brand: null, note: null, transaction_time: null });
  assert.deepEqual(parseLedgerInput({ id, product: '新商品' }, true).fields, { product: '新商品' });
});
test('old callers can still add notes without structured fields', () => {
  assert.deepEqual(parseLedgerInput({ amount: 50, type: 'expense', note: '午餐' }).fields, { amount: 50, type: 'expense', note: '午餐' });
});
test('reject invalid amounts, invalid dates, and malformed edits', () => {
  for (const amount of [null, '', ' ', true, [], {}, 0, -1, Infinity, 'NaN', '12x', '0x10', 1.234]) assert.throws(() => parseLedgerInput({ amount, type: 'expense' }));
  for (const transaction_time of ['today', '2026-09-08', '2026-09-08T12:00:00', '2026-02-30T00:00:00+08:00']) assert.throws(() => parseLedgerInput({ amount: 1, type: 'expense', transaction_time }));
  for (const input of [null, [], {}, { id }, { id: 'bad', note: 'x' }, { id, brand: {} }]) assert.throws(() => parseLedgerInput(input, true));
});
test('unknown purchase time is preserved when editing other fields', () => {
  assert.ok(!('transaction_time' in parseLedgerInput({ id, note: '修改备注' }, true).fields));
  assert.equal(parseLedgerInput({ amount: 1, type: 'expense', transaction_time: null }).fields.transaction_time, null);
});
test('title and search use structured fields and support legacy nulls', () => {
  const row = { amount: 16, brand: 'Wubbanub', product: '奶嘴收纳盒', note: '订单号：000123', category: '喂养用品' };
  assert.equal(transactionTitle(row), 'Wubbanub · 奶嘴收纳盒');
  for (const keyword of ['wubbanub', '奶嘴', '000123', '16', '喂养']) assert.equal(matchesTransaction(row, keyword), true);
  assert.equal(transactionTitle({ note: '旧备注' }), '旧备注');
  assert.equal(transactionTitle({ brand: null, product: null, note: null }), '未分类');
});
test('CSV preserves multiline notes and punctuation, escapes formulas', () => {
  assert.equal(csvCell('店铺：A,B\n订单号："0001"'), '"店铺：A,B\n订单号：""0001"""');
  assert.equal(csvCell('=1+1'), '"\'=1+1"');
  assert.equal(csvCell(16), '"16"');
});
test('UI validates required new product and allows incomplete historical record', () => {
  const form = { amount: '16', product: ' ', transaction_time: '' };
  assert.equal(validateLedgerForm(form, true), '请输入商品名称');
  assert.equal(validateLedgerForm(form, false), null);
  assert.ok(validateLedgerForm({ ...form, amount: ' ' }, false));
});
