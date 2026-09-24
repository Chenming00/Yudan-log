import { validateHealthMutation, type HealthMutation } from './health-records';

type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;
export type PendingHealthMutation = HealthMutation & { client_id: string; queued_at: number };
export const pendingHealthPrefix = (owner: string) => `yudan-health-pending-v2:${owner}:`;
const itemKey = (owner: string, id: string) => `${pendingHealthPrefix(owner)}${id}`;

/** Each command has its own key, so appending in another tab cannot overwrite it. */
export function readPendingHealth(storage: DraftStorage, owner: string): PendingHealthMutation[] {
  const prefix = pendingHealthPrefix(owner);
  const result: PendingHealthMutation[] = [];
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter((key): key is string => Boolean(key?.startsWith(prefix)));
  for (const key of keys) {
    const raw = storage.getItem(key);
    if (!raw) continue;
    const item = JSON.parse(raw) as PendingHealthMutation;
    const mutation = validateHealthMutation(item);
    if (key !== itemKey(owner, mutation.request_id) || typeof item.client_id !== 'string' || !item.client_id || !Number.isFinite(item.queued_at)) throw new Error('本机草稿格式无效，原始内容已保留。');
    result.push({ ...mutation, client_id: item.client_id, queued_at: item.queued_at });
  }
  return result.sort((left, right) => left.queued_at - right.queued_at || left.request_id.localeCompare(right.request_id));
}

export function migratePendingHealth(storage: DraftStorage, owner: string) {
  // Validate existing v2 commands before touching the only legacy copy.
  readPendingHealth(storage, owner);
  const legacyKey = `yudan-health-pending-v1:${owner}`;
  const raw = storage.getItem(legacyKey);
  if (raw) {
    const legacy = JSON.parse(raw);
    if (!Array.isArray(legacy)) throw new Error('本机草稿格式无效，原始内容已保留。');
    legacy.map(validateHealthMutation).forEach((mutation, index) => {
      const key = itemKey(owner, mutation.request_id);
      if (!storage.getItem(key)) storage.setItem(key, JSON.stringify({ ...mutation, client_id: 'legacy', queued_at: index }));
    });
    // Validate all copies before removing the source; failures leave it recoverable.
    readPendingHealth(storage, owner);
    if (storage.getItem(legacyKey) === raw) storage.removeItem(legacyKey);
  }
  return readPendingHealth(storage, owner);
}

export function appendPendingHealth(storage: DraftStorage, owner: string, clientId: string, mutation: HealthMutation) {
  const existing = readPendingHealth(storage, owner);
  const queued_at = Math.max(Date.now(), ...existing.map((item) => item.queued_at + 1));
  const next = { ...mutation, client_id: clientId, queued_at };
  storage.setItem(itemKey(owner, mutation.request_id), JSON.stringify(next));
  return readPendingHealth(storage, owner);
}

export function acknowledgePendingHealth(storage: DraftStorage, owner: string, completed: PendingHealthMutation, version: string | null) {
  for (const item of readPendingHealth(storage, owner)) {
    // A different tab's edit represents its own snapshot and must pass its own CAS.
    if (item.request_id !== completed.request_id && item.queued_at > completed.queued_at && item.client_id === completed.client_id && item.kind === completed.kind && item.key === completed.key && item.expected_updated_at === completed.expected_updated_at) {
      storage.setItem(itemKey(owner, item.request_id), JSON.stringify({ ...item, expected_updated_at: version }));
    }
  }
  storage.removeItem(itemKey(owner, completed.request_id));
  return readPendingHealth(storage, owner);
}

export function resolvePendingHealth(storage: DraftStorage, owner: string, conflict: PendingHealthMutation, version: string | null, keepMine: boolean) {
  for (const item of readPendingHealth(storage, owner)) {
    if (item.client_id !== conflict.client_id || item.kind !== conflict.kind || item.key !== conflict.key) continue;
    if (keepMine) {
      // A rejected CAS has no receipt; retaining the ID also avoids a non-atomic key move.
      storage.setItem(itemKey(owner, item.request_id), JSON.stringify({ ...item, expected_updated_at: version }));
    } else storage.removeItem(itemKey(owner, item.request_id));
  }
  return readPendingHealth(storage, owner);
}

export function preserveHealthDraftBeforeUpdate(event: Event, preserve: () => void, reportFailure: () => void) {
  try { preserve(); } catch { event.preventDefault(); reportFailure(); }
}

/** Identity includes the login generation, even when signing back into the same account. */
export function createHealthRunGuard() {
  let generation = 0;
  let owner: string | undefined;
  let controller = new AbortController();
  return {
    activate(nextOwner?: string) {
      controller.abort(); controller = new AbortController(); owner = nextOwner; generation += 1;
      return generation;
    },
    capture() {
      const token = generation;
      const expectedOwner = owner;
      return { owner: expectedOwner, token, signal: controller.signal, current: () => token === generation && expectedOwner === owner && !controller.signal.aborted };
    },
  };
}
