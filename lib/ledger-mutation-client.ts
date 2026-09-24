export type LedgerMutationOperation = 'add' | 'edit' | 'delete';
type LedgerStorageKey = 'api_key' | 'last_category';
type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function readLedgerStorage(key: LedgerStorageKey, storage?: PreferenceStorage): string | null {
  try { return (storage ?? window.localStorage).getItem(key); }
  catch { return null; }
}
export function writeLedgerStorage(key: LedgerStorageKey, value: string | null, storage?: PreferenceStorage): boolean {
  try {
    const target = storage ?? window.localStorage;
    if (value === null) target.removeItem(key);
    else target.setItem(key, value);
    return true;
  } catch { return false; }
}

export function validLedgerVersion(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

export interface LedgerMutationAttempt {
  readonly operation: LedgerMutationOperation;
  readonly requestId: string;
  readonly body: string;
}
export type LedgerMutationResult<T> =
  | { kind: 'success'; data: T; requestId: string; replayed: boolean }
  | { kind: 'rejected'; status: number; error: string; code?: string; current?: T }
  | { kind: 'uncertain'; error: string; status?: number }
  | { kind: 'busy' }
  | { kind: 'blocked'; error: string };

const METHODS = { add: 'POST', edit: 'PATCH', delete: 'DELETE' } as const;
const DEFINITE_REJECTIONS = new Set([400, 401, 403, 404, 409, 413, 415, 422, 429]);
const UNCERTAIN = '尚未确认本次请求的结果，请重试确认；重试会核对同一笔操作，不会重复提交。确认前请勿刷新或离开页面。';

// Only memory holds the immutable request. Never persist ledger contents or tokens.
// A dialog keeps this client in a ref so a lost response cannot create a new logical request.
export class LedgerMutationClient<T = unknown> {
  private pending: LedgerMutationAttempt | null = null;
  private inFlight = false;
  private unconfirmed = false;
  constructor(private fetcher: typeof fetch = (input, init) => globalThis.fetch(input, init), private uuid: () => string = () => crypto.randomUUID()) {}

  private uncertain(status?: number, detail?: string): LedgerMutationResult<T> {
    this.unconfirmed = true;
    return { kind: 'uncertain', error: detail ? `${detail} ${UNCERTAIN}` : UNCERTAIN, ...(status ? { status } : {}) };
  }

  async submit(operation: LedgerMutationOperation, payload: Record<string, unknown>, authToken: string): Promise<LedgerMutationResult<T>> {
    if (this.inFlight) return { kind: 'busy' };
    if (this.pending && this.pending.operation !== operation) return { kind: 'blocked', error: '请先重试确认上一笔操作的结果' };
    if (!this.pending) {
      if (operation !== 'add' && !validLedgerVersion(payload.expected_version)) {
        return { kind: 'rejected', status: 400, code: 'VERSION_REQUIRED', error: '这条账单缺少有效版本，请刷新账单后再操作' };
      }
      try {
        const requestId = this.uuid();
        this.pending = Object.freeze({ operation, requestId, body: JSON.stringify({ ...payload, request_id: requestId }) });
      } catch {
        return { kind: 'rejected', status: 400, code: 'REQUEST_NOT_CREATED', error: '无法创建安全的保存请求，请使用 HTTPS 打开账本后重试' };
      }
    }
    this.inFlight = true;
    const attempt = this.pending;
    try {
      const response = await this.fetcher(`/api/${attempt.operation}`, {
        method: METHODS[attempt.operation],
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: attempt.body,
      });
      let raw: unknown;
      try { raw = await response.json(); }
      catch {
        if (!DEFINITE_REJECTIONS.has(response.status)) return this.uncertain(response.status);
      }
      const data = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
      if (response.ok && data.success === true && data.request_id === attempt.requestId && data.data && typeof data.data === 'object') {
        this.pending = null;
        this.unconfirmed = false;
        return { kind: 'success', data: data.data as T, requestId: attempt.requestId, replayed: data.replayed === true };
      }
      if (DEFINITE_REJECTIONS.has(response.status)) {
        // A retry rejected before entering SQL cannot disprove a previous commit.
        // These two business results come only from SQL after checking the request receipt.
        const receiptChecked = response.status === 409 && data.code === 'LEDGER_CONFLICT'
          || response.status === 404 && data.code === 'LEDGER_NOT_FOUND';
        if (this.unconfirmed && !receiptChecked) {
          return this.uncertain(response.status, response.status === 401 || response.status === 403
            ? '写入权限需要重新设置。'
            : typeof data.error === 'string' ? data.error : undefined);
        }
        this.pending = null;
        this.unconfirmed = false;
        return {
          kind: 'rejected', status: response.status,
          error: typeof data.error === 'string' ? data.error : '本次操作未完成，请检查后重试',
          ...(typeof data.code === 'string' ? { code: data.code } : {}),
          ...(data.current && typeof data.current === 'object' ? { current: data.current as T } : {}),
        };
      }
      return this.uncertain(response.status, typeof data.error === 'string' ? data.error : undefined);
    } catch {
      return this.uncertain();
    } finally { this.inFlight = false; }
  }
}
