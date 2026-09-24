import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { createLedgerResource, type LedgerResourceState } from '@/lib/ledger-request-client';

export function useLedgerResource<T>(key: string | null, loader: (signal: AbortSignal) => Promise<T>) {
  const [resource] = useState(() => createLedgerResource<T>());
  const snapshot = useSyncExternalStore(resource.subscribe, resource.getSnapshot, resource.getSnapshot);
  useEffect(() => {
    if (key) void resource.request(key, loader);
    return resource.cancel;
  }, [key, loader, resource]);

  const reload = useCallback(() => {
    if (key) void resource.request(key, loader);
  }, [key, loader, resource]);
  const loadPage = useCallback((cursor: string, pageLoader: (signal: AbortSignal) => Promise<T>, merge: (previous: T, next: T) => T) => {
    if (key) void resource.request(key, pageLoader, { cursor, merge });
  }, [key, resource]);

  // A new render must never show data belonging to the previous selection, even before its effect runs.
  const current: LedgerResourceState<T> = snapshot.key === key ? snapshot : {
    key, data: null, status: key ? 'loading' : 'idle', error: null, loadingMore: false, pageError: null,
  };
  return { ...current, reload, loadPage };
}

export function useLedgerDebouncedValue(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
