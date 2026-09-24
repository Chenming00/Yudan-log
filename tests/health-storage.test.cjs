const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText, filename);
};

const {
  pendingHealthPrefix, readPendingHealth, migratePendingHealth, appendPendingHealth,
  acknowledgePendingHealth, resolvePendingHealth, preserveHealthDraftBeforeUpdate,
  createHealthRunGuard,
} = require('../src/lib/health-storage.ts');

const owner = 'health-owner';
const originalVersion = '2026-08-15T01:00:00.123456+00:00';
const savedVersion = '2026-08-15T02:00:00.654321+00:00';
const id = (number) => `10000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
const mutation = (number, patch = {}) => ({
  request_id: id(number), kind: 'weight', key: '2026-08-15', action: 'save',
  expected_updated_at: originalVersion, changes: { weight_kg: 4.2 }, ...patch,
});
const itemKey = (requestId, forOwner = owner) => `${pendingHealthPrefix(forOwner)}${requestId}`;
const legacyKey = (forOwner = owner) => `yudan-health-pending-v1:${forOwner}`;

/** Independent tab objects share only the persistent key/value store, not cached queues. */
function storageView(shared = new Map()) {
  return {
    beforeSet: undefined,
    get length() { return shared.size; },
    key(index) { return [...shared.keys()][index] ?? null; },
    getItem(key) { return shared.get(String(key)) ?? null; },
    setItem(key, value) {
      this.beforeSet?.(String(key), String(value));
      shared.set(String(key), String(value));
    },
    removeItem(key) { shared.delete(String(key)); },
  };
}

const byId = (items, number) => items.find((item) => item.request_id === id(number));

test('offline tabs append different records without replacing another tab or owner drafts', () => {
  const shared = new Map();
  const tabA = storageView(shared);
  const tabB = storageView(shared);
  assert.deepEqual(readPendingHealth(tabA, owner), []);
  assert.deepEqual(readPendingHealth(tabB, owner), []);

  appendPendingHealth(tabA, owner, 'tab-a', mutation(1));
  appendPendingHealth(tabB, owner, 'tab-b', mutation(2, { key: '2026-08-14' }));
  appendPendingHealth(tabA, 'other-owner', 'tab-a', mutation(3));

  const queue = readPendingHealth(tabA, owner);
  assert.deepEqual(queue.map((item) => item.request_id), [id(1), id(2)]);
  assert.deepEqual(queue.map((item) => item.client_id), ['tab-a', 'tab-b']);
  assert.deepEqual(readPendingHealth(tabB, owner), queue);
  assert.deepEqual(readPendingHealth(tabB, 'other-owner').map((item) => item.request_id), [id(3)]);
});

test('offline tabs retain all explicit edits of the same record and each original CAS version', () => {
  const shared = new Map();
  const tabA = storageView(shared);
  const tabB = storageView(shared);
  appendPendingHealth(tabA, owner, 'tab-a', mutation(1));
  appendPendingHealth(tabB, owner, 'tab-b', mutation(2, { changes: { weight_kg: 4.3 } }));
  appendPendingHealth(tabA, owner, 'tab-a', mutation(3, { changes: { weight_kg: 4.4 } }));
  appendPendingHealth(tabB, owner, 'tab-b', mutation(4, { action: 'delete', changes: {} }));

  const queue = readPendingHealth(tabB, owner);
  assert.deepEqual(queue.map((item) => item.request_id), [1, 2, 3, 4].map(id));
  assert.deepEqual(queue.map((item) => item.expected_updated_at), Array(4).fill(originalVersion));
  assert.deepEqual(queue.map((item) => item.client_id), ['tab-a', 'tab-b', 'tab-a', 'tab-b']);
  assert.equal(queue[3].action, 'delete');
});

test('ack removes only its request and advances matching later drafts from the same client', () => {
  const storage = storageView();
  appendPendingHealth(storage, owner, 'tab-a', mutation(1));
  appendPendingHealth(storage, owner, 'tab-a', mutation(2));
  appendPendingHealth(storage, owner, 'tab-b', mutation(3));
  appendPendingHealth(storage, owner, 'tab-a', mutation(4, { key: '2026-08-14' }));
  appendPendingHealth(storage, owner, 'tab-a', mutation(5, { expected_updated_at: null }));
  appendPendingHealth(storage, owner, 'tab-a', mutation(6, {
    kind: 'vaccine', changes: { administered_on: '2026-08-15' },
  }));
  const before = readPendingHealth(storage, owner);
  const otherClientRaw = storage.getItem(itemKey(id(3)));

  const after = acknowledgePendingHealth(storage, owner, byId(before, 1), savedVersion);
  assert.deepEqual(after.map((item) => item.request_id), [2, 3, 4, 5, 6].map(id));
  assert.equal(storage.getItem(itemKey(id(1))), null);
  assert.equal(byId(after, 2).expected_updated_at, savedVersion);
  assert.equal(byId(after, 3).expected_updated_at, originalVersion);
  assert.equal(storage.getItem(itemKey(id(3))), otherClientRaw);
  assert.equal(byId(after, 4).expected_updated_at, originalVersion);
  assert.equal(byId(after, 5).expected_updated_at, null);
  assert.equal(byId(after, 6).expected_updated_at, originalVersion);
  assert.equal(byId(before, 2).expected_updated_at, originalVersion);
});

test('an out-of-order acknowledgment does not advance an earlier unconfirmed draft', () => {
  const storage = storageView();
  appendPendingHealth(storage, owner, 'tab-a', mutation(1));
  appendPendingHealth(storage, owner, 'tab-a', mutation(2));
  appendPendingHealth(storage, owner, 'tab-a', mutation(3));
  const completed = byId(readPendingHealth(storage, owner), 2);

  const after = acknowledgePendingHealth(storage, owner, completed, savedVersion);
  assert.equal(byId(after, 1).expected_updated_at, originalVersion);
  assert.equal(byId(after, 3).expected_updated_at, savedVersion);
  assert.equal(byId(after, 2), undefined);
});

test('conflict resolution changes only that client and record, retaining other tab requests', () => {
  for (const keepMine of [true, false]) {
    const storage = storageView();
    appendPendingHealth(storage, owner, 'tab-a', mutation(1));
    appendPendingHealth(storage, owner, 'tab-b', mutation(2));
    appendPendingHealth(storage, owner, 'tab-a', mutation(3));
    appendPendingHealth(storage, owner, 'tab-a', mutation(4, { key: '2026-08-14' }));
    appendPendingHealth(storage, owner, 'tab-a', mutation(5, {
      kind: 'vaccine', changes: { administered_on: '2026-08-15' },
    }));
    const before = readPendingHealth(storage, owner);
    const untouched = new Map([2, 4, 5].map((number) => [number, storage.getItem(itemKey(id(number)))]));

    const after = resolvePendingHealth(storage, owner, byId(before, 1), savedVersion, keepMine);
    assert.deepEqual(after.map((item) => item.request_id), (keepMine ? [1, 2, 3, 4, 5] : [2, 4, 5]).map(id));
    for (const [number, raw] of untouched) assert.equal(storage.getItem(itemKey(id(number))), raw);
    if (keepMine) {
      assert.equal(byId(after, 1).expected_updated_at, savedVersion);
      assert.equal(byId(after, 3).expected_updated_at, savedVersion);
      assert.equal(byId(after, 1).request_id, id(1));
    }
  }
});

test('legacy migration validates the entire source before copying any record', () => {
  const storage = storageView();
  const raw = JSON.stringify([mutation(1), mutation(2, { changes: { weight_kg: -1 } })]);
  storage.setItem(legacyKey(), raw);

  assert.throws(() => migratePendingHealth(storage, owner));
  assert.equal(storage.getItem(legacyKey()), raw);
  assert.equal(storage.getItem(itemKey(id(1))), null);
  assert.equal(storage.length, 1);
});

test('failed migration preserves its source and copied records, then resumes without duplicates', () => {
  const storage = storageView();
  const raw = JSON.stringify([mutation(1), mutation(2), mutation(3)]);
  storage.setItem(legacyKey(), raw);
  storage.beforeSet = (key) => {
    if (key === itemKey(id(2))) throw new Error('storage quota exceeded');
  };

  assert.throws(() => migratePendingHealth(storage, owner), /storage quota exceeded/);
  const firstCopied = storage.getItem(itemKey(id(1)));
  assert.ok(firstCopied);
  assert.equal(storage.getItem(legacyKey()), raw);
  assert.equal(storage.getItem(itemKey(id(2))), null);
  assert.equal(storage.getItem(itemKey(id(3))), null);

  storage.beforeSet = undefined;
  const migrated = migratePendingHealth(storage, owner);
  assert.deepEqual(migrated.map((item) => item.request_id), [1, 2, 3].map(id));
  assert.equal(storage.getItem(legacyKey()), null);
  assert.equal(storage.getItem(itemKey(id(1))), firstCopied);
  assert.equal(storage.length, 3);
  assert.deepEqual(migratePendingHealth(storage, owner), migrated);
  assert.equal(storage.length, 3);
});

test('legacy migration keeps an existing v2 record and its advanced version intact', () => {
  const storage = storageView();
  appendPendingHealth(storage, owner, 'tab-a', mutation(1, { expected_updated_at: savedVersion }));
  const existing = storage.getItem(itemKey(id(1)));
  storage.setItem(legacyKey(), JSON.stringify([mutation(1), mutation(2)]));

  const migrated = migratePendingHealth(storage, owner);
  assert.equal(migrated.length, 2);
  assert.equal(byId(migrated, 1).client_id, 'tab-a');
  assert.equal(byId(migrated, 1).expected_updated_at, savedVersion);
  assert.equal(storage.getItem(itemKey(id(1))), existing);
  assert.equal(storage.getItem(legacyKey()), null);
});

test('migration preserves a source that another tab changed during copying', () => {
  const shared = new Map();
  const tabA = storageView(shared);
  const tabB = storageView(shared);
  tabA.setItem(legacyKey(), JSON.stringify([mutation(1)]));
  const newSource = JSON.stringify([mutation(1), mutation(2)]);
  tabA.beforeSet = (key) => {
    if (key === itemKey(id(1))) tabB.setItem(legacyKey(), newSource);
  };

  migratePendingHealth(tabA, owner);
  assert.equal(tabB.getItem(legacyKey()), newSource);
  assert.equal(readPendingHealth(tabB, owner).length, 1);
  tabA.beforeSet = undefined;
  const resumed = migratePendingHealth(tabA, owner);
  assert.deepEqual(resumed.map((item) => item.request_id), [id(1), id(2)]);
  assert.equal(tabB.getItem(legacyKey()), null);
});

test('a damaged v2 record never causes deletion of the recoverable legacy source', () => {
  const damagedRecords = [
    '{not valid JSON',
    JSON.stringify({ ...mutation(1), client_id: 42, queued_at: 0 }),
    JSON.stringify({ ...mutation(2), client_id: 'tab-a', queued_at: 0 }),
  ];
  for (const damaged of damagedRecords) {
    for (const damagedId of [id(1), id(9)]) {
      const storage = storageView();
      const source = JSON.stringify([mutation(1), mutation(2)]);
      storage.setItem(legacyKey(), source);
      storage.setItem(itemKey(damagedId), damaged);

      assert.throws(() => migratePendingHealth(storage, owner));
      assert.equal(storage.getItem(legacyKey()), source);
      assert.equal(storage.getItem(itemKey(damagedId)), damaged);
    }
  }
});

test('a new login generation aborts the same owner previous run and blocks late ack/state updates', async () => {
  const guard = createHealthRunGuard();
  guard.activate(owner);
  const oldRun = guard.capture();
  const storage = storageView();
  const [pending] = appendPendingHealth(storage, owner, 'tab-a', mutation(1));
  let releaseResponse;
  const response = new Promise((resolve) => { releaseResponse = resolve; });
  let visibleState = 'new login state';
  const inFlight = (async () => {
    await response; // A transport can complete even after its abort signal was raised.
    if (!oldRun.current()) return;
    acknowledgePendingHealth(storage, owner, pending, savedVersion);
    visibleState = 'stale response';
  })();

  guard.activate(owner);
  const newRun = guard.capture();
  assert.equal(oldRun.signal.aborted, true);
  assert.equal(oldRun.current(), false);
  assert.equal(newRun.signal.aborted, false);
  assert.equal(newRun.current(), true);
  assert.notEqual(newRun.token, oldRun.token);
  releaseResponse();
  await inFlight;
  assert.equal(visibleState, 'new login state');
  assert.equal(readPendingHealth(storage, owner).length, 1);

  guard.activate();
  assert.equal(newRun.signal.aborted, true);
  assert.equal(newRun.current(), false);
  assert.equal(guard.capture().owner, undefined);
});

test('service worker update proceeds only when draft preservation succeeds', () => {
  let reports = 0;
  const failureEvent = new Event('before-app-update', { cancelable: true });
  preserveHealthDraftBeforeUpdate(failureEvent, () => { throw new Error('storage full'); }, () => { reports += 1; });
  assert.equal(failureEvent.defaultPrevented, true);
  assert.equal(reports, 1);

  const successEvent = new Event('before-app-update', { cancelable: true });
  let preserved = false;
  preserveHealthDraftBeforeUpdate(successEvent, () => { preserved = true; }, () => { reports += 1; });
  assert.equal(preserved, true);
  assert.equal(successEvent.defaultPrevented, false);
  assert.equal(reports, 1);
});
