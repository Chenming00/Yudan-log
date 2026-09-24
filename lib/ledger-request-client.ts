export interface LedgerResourceState<T> {
  key: string | null;
  data: T | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  loadingMore: boolean;
  pageError: string | null;
}

export function ledgerRequestError(error: unknown): string {
  return error instanceof Error && error.message ? error.message : '加载失败，请重试';
}

// Keep request ownership outside React so aborted transports cannot publish stale data.
export function createLedgerResource<T>() {
  let state: LedgerResourceState<T> = {
    key: null, data: null, status: 'idle', error: null, loadingMore: false, pageError: null,
  };
  let generation = 0;
  let controller: AbortController | null = null;
  const listeners = new Set<() => void>();
  const completedPages = new Set<string>();
  const publish = (next: LedgerResourceState<T>) => {
    state = next;
    listeners.forEach((listener) => listener());
  };
  const cancel = () => {
    generation += 1;
    controller?.abort();
    controller = null;
  };

  const request = async (
    key: string,
    loader: (signal: AbortSignal) => Promise<T>,
    page?: { cursor: string; merge: (previous: T, next: T) => T },
  ) => {
    if (page && (state.key !== key || !state.data || state.status === 'loading'
      || state.loadingMore || completedPages.has(page.cursor))) return;
    cancel();
    const requestGeneration = generation;
    const currentController = new AbortController();
    controller = currentController;
    if (!page) completedPages.clear();
    publish(page
      ? { ...state, loadingMore: true, pageError: null }
      : { key, data: state.key === key ? state.data : null, status: 'loading', error: null, loadingMore: false, pageError: null });
    try {
      const next = await loader(currentController.signal);
      if (generation !== requestGeneration || currentController.signal.aborted) return;
      const data = page && state.data ? page.merge(state.data, next) : next;
      if (page) completedPages.add(page.cursor);
      publish({ key, data, status: 'success', error: null, loadingMore: false, pageError: null });
    } catch (error) {
      if (generation !== requestGeneration || currentController.signal.aborted) return;
      publish(page
        ? { ...state, loadingMore: false, pageError: ledgerRequestError(error) }
        : { ...state, status: 'error', error: ledgerRequestError(error) });
    }
  };

  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    request,
    cancel,
  };
}

export async function fetchLedgerPayload<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  const payload = await response.json();
  if (!response.ok || !payload.success) throw new Error(payload.error || '加载失败，请重试');
  return payload as T;
}

export interface LedgerPageResult<T> {
  data: T[];
  hasMore: boolean;
  nextCursor: string | null;
  categories?: string[];
}

export function mergeLedgerPages<T extends { id: string }>(previous: LedgerPageResult<T>, next: LedgerPageResult<T>): LedgerPageResult<T> {
  const seen = new Set(previous.data.map((row) => row.id));
  const additions = next.data.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
  return { ...next, categories: next.categories ?? previous.categories, data: [...previous.data, ...additions] };
}

export async function fetchLedgerPage<T>(url: string, signal: AbortSignal, cursor?: string | null): Promise<LedgerPageResult<T>> {
  const payload = await fetchLedgerPayload<LedgerPageResult<T>>(url, signal);
  if (!Array.isArray(payload.data) || (payload.hasMore && (!payload.nextCursor || payload.nextCursor === cursor))) {
    throw new Error('分页数据异常，请重试');
  }
  return { data: payload.data, hasMore: Boolean(payload.hasMore), nextCursor: payload.nextCursor || null, categories: payload.categories };
}

export async function collectLedgerPages<T extends { id: string }>(
  getUrl: (cursor: string | null) => string,
  signal: AbortSignal,
  onProgress: (count: number) => void = () => {},
): Promise<T[]> {
  let result: LedgerPageResult<T> = { data: [], hasMore: true, nextCursor: null };
  const seenCursors = new Set<string>();
  do {
    if (signal.aborted) throw new DOMException('已取消导出', 'AbortError');
    const cursor = result.nextCursor;
    if (cursor && seenCursors.has(cursor)) throw new Error('分页数据异常，请重试');
    if (cursor) seenCursors.add(cursor);
    const page = await fetchLedgerPage<T>(getUrl(cursor), signal, cursor);
    if (signal.aborted) throw new DOMException('已取消导出', 'AbortError');
    result = mergeLedgerPages(result, page);
    onProgress(result.data.length);
  } while (result.hasMore);
  return result.data;
}
