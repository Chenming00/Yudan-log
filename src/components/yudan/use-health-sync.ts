import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { validateHealthMutation, type HealthMutation } from '@/src/lib/health-records';
import { acknowledgePendingHealth, appendPendingHealth, createHealthRunGuard, migratePendingHealth, pendingHealthPrefix, resolvePendingHealth, type PendingHealthMutation } from '@/src/lib/health-storage';
import { applyHealthMutation, dashboardFromCloud, defaultBirthday, defaultData, previewData, readStoredData } from '@/src/lib/health-model';
import type { CloudVaccinePlan, CloudVaccineRecord, CloudWeightRecord, DashboardData, SyncStatus } from '@/src/lib/health-model';

type Conflict = { mutation: PendingHealthMutation; current: Record<string, unknown> | null; reviewed: boolean };

export function useHealthSync(supabase: SupabaseClient | null, session: Session | null, isOwner: boolean, hasSupabase: boolean) {
  const userId = isOwner ? session?.user.id : undefined;
  const sessionKey = isOwner ? session?.access_token : undefined;
  const [data, setData] = useState<DashboardData>(hasSupabase ? previewData : defaultData);
  const [cloudReady, setCloudReady] = useState(!hasSupabase);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(hasSupabase ? 'loading' : 'local');
  const [cloudError, setCloudError] = useState('');
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const queue = useRef<PendingHealthMutation[]>([]);
  const runs = useRef(createHealthRunGuard());
  const clientId = useRef<string | null>(null);
  const busyToken = useRef<number | null>(null);
  const readyToken = useRef<number | null>(null);
  const blocked = useRef(false);
  const conflictRef = useRef<Conflict | null>(null);
  const latestData = useRef(data);
  latestData.current = data;

  const readQueue = useCallback((owner: string) => {
    const next = migratePendingHealth(window.localStorage, owner);
    queue.current = next;
    return next;
  }, []);

  const readCloud = useCallback(async (owner: string, signal: AbortSignal) => {
    if (!supabase) throw new Error('云端连接尚未就绪。');
    // Range reads avoid silently losing records beyond Supabase's default row cap.
    const allRows = async (table: string, columns: string, order: string) => {
      const rows: unknown[] = [];
      for (let from = 0; ; from += 500) {
        const { data: page, error } = await supabase.from(table).select(columns).eq('user_id', owner).order(order).range(from, from + 499).abortSignal(signal);
        if (error) throw new Error(error.message);
        rows.push(...(page || []));
        if (!page || page.length < 500) return rows;
      }
    };
    const [catalogResult, weights, vaccines] = await Promise.all([
      supabase.from('yudan_vaccine_catalog').select('*').order('sort_order').abortSignal(signal),
      allRows('yudan_weight_records', 'id, measured_on, weight_kg, height_cm, head_circumference_cm, note, updated_at', 'measured_on'),
      allRows('yudan_vaccine_records', 'id, plan_id, administered_on, place, batch_no, manufacturer, note, updated_at', 'plan_id'),
    ]);
    if (catalogResult.error) throw new Error(catalogResult.error.message);
    return dashboardFromCloud({ birthday: defaultBirthday }, weights as CloudWeightRecord[], vaccines as CloudVaccineRecord[], readStoredData(owner), catalogResult.data as CloudVaccinePlan[]);
  }, [supabase]);

  const processQueue = useCallback(async () => {
    const run = runs.current.capture();
    const owner = run.owner;
    if (!owner || !supabase || readyToken.current !== run.token || busyToken.current === run.token || blocked.current) return;
    if (!navigator.onLine) { setSyncStatus(queue.current.length ? 'pending' : 'error'); setCloudError('当前离线，修改已保存在本机，联网后重试。'); return; }
    busyToken.current = run.token;
    let succeeded = false;
    try {
      while (run.current()) {
        // Read the shared keys before each command: another tab may have appended or acknowledged one.
        const mutation = readQueue(owner)[0];
        if (!mutation) break;
        setSyncStatus('saving');
        const { data: authData, error: authError } = await supabase.auth.getSession();
        if (!run.current()) return;
        if (authError || authData.session?.user.id !== owner) throw new Error('登录已过期，草稿已保留，请重新登录。');
        const controller = new AbortController();
        const cancel = () => controller.abort();
        run.signal.addEventListener('abort', cancel, { once: true });
        const timeout = setTimeout(cancel, 20000);
        let response: Response;
        let result;
        try {
          response = await fetch('/api/yudan/records', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authData.session.access_token}` },
            body: JSON.stringify(validateHealthMutation(mutation)), signal: controller.signal,
          });
          result = await response.json();
        } finally { clearTimeout(timeout); run.signal.removeEventListener('abort', cancel); }
        if (!run.current()) return;
        if (response.status === 409) {
          const latest = readQueue(owner).find((item) => item.request_id === mutation.request_id);
          // Another tab may have resolved this conflict while the old response was in flight.
          if (!latest || latest.expected_updated_at !== mutation.expected_updated_at) continue;
          blocked.current = true;
          const value = { mutation, current: result.current || null, reviewed: false };
          conflictRef.current = value; setConflict(value); setSyncStatus('conflict');
          setCloudError(result.error || '记录已被其他设备修改。请重新读取并核对。');
          return;
        }
        if (!response.ok) throw new Error(result.error || '保存失败，请重试。');
        const nextVersion = result.data.record?.updated_at || null;
        queue.current = acknowledgePendingHealth(window.localStorage, owner, mutation, nextVersion);
        setData((current) => ({ ...current,
          growth: current.growth.map((item) => mutation.kind === 'weight' && item.date === mutation.key ? { ...item, updatedAt: nextVersion || undefined } : item),
          vaccines: current.vaccines.map((item) => mutation.kind === 'vaccine' && item.planId === mutation.key ? { ...item, updatedAt: nextVersion || undefined } : item),
        }));
      }
      if (!run.current()) return;
      const fresh = await readCloud(owner, run.signal);
      if (!run.current()) return;
      setData(readQueue(owner).reduce(applyHealthMutation, fresh));
      setSyncStatus(queue.current.length ? 'pending' : 'saved'); setCloudError('');
      succeeded = true;
    } catch (error) {
      if (run.current()) { setSyncStatus('error'); setCloudError(error instanceof Error ? error.message : '同步失败，草稿已保留。'); }
    } finally {
      // An old request's finally must not release a newer login's in-flight lock.
      if (busyToken.current === run.token) busyToken.current = null;
      // A new edit may arrive while the final read is in flight.
      if (succeeded && queue.current.length && run.current()) queueMicrotask(() => { if (run.current()) void processQueue(); });
    }
  }, [readQueue, readCloud, supabase]);

  useEffect(() => {
    // Token changes also advance the generation when signing back into the same owner account.
    const guard = runs.current;
    guard.activate(userId);
    const run = guard.capture();
    busyToken.current = null; readyToken.current = null; blocked.current = false; conflictRef.current = null; setConflict(null); queue.current = [];
    const cleanup = () => { if (run.current()) guard.activate(undefined); };
    if (!hasSupabase) { setData(readStoredData()); setCloudReady(true); setSyncStatus('local'); return cleanup; }
    if (!userId || !supabase) { setData(previewData); setCloudReady(false); setSyncStatus('loading'); setCloudError(''); return cleanup; }
    const owner = userId;
    setCloudReady(false); setSyncStatus('loading'); setCloudError('');
    void (async () => {
      try {
        readQueue(owner);
        const fresh = await readCloud(owner, run.signal);
        if (!run.current()) return;
        setData(readQueue(owner).reduce(applyHealthMutation, fresh));
        setSyncStatus(queue.current.length ? 'pending' : 'saved');
        readyToken.current = run.token;
        setCloudReady(true);
        if (queue.current.length) void processQueue();
      } catch (error) {
        if (!run.current()) return;
        setData(queue.current.reduce(applyHealthMutation, readStoredData(owner)));
        readyToken.current = run.token;
        setSyncStatus('error'); setCloudError(error instanceof Error ? error.message : '读取失败，请重试。'); setCloudReady(true);
      }
    })();
    return cleanup;
  }, [userId, sessionKey, hasSupabase, supabase, readQueue, readCloud, processQueue]);

  useEffect(() => {
    if (!cloudReady || (hasSupabase && !userId)) return;
    try { localStorage.setItem(userId ? `yudan-dashboard-v2:${userId}` : 'yudan-dashboard-v2', JSON.stringify(data)); }
    catch { setCloudError('本机存储空间不足，请保持页面打开并重试。'); }
  }, [data, cloudReady, hasSupabase, userId]);

  useEffect(() => {
    const online = () => { if (queue.current.length) void processQueue(); };
    window.addEventListener('online', online);
    return () => window.removeEventListener('online', online);
  }, [processQueue]);

  useEffect(() => {
    if (!userId) return;
    const run = runs.current.capture();
    const storageChanged = (event: StorageEvent) => {
      if (!run.current() || (event.key !== null && event.key !== `yudan-health-pending-v1:${userId}` && !event.key.startsWith(pendingHealthPrefix(userId)))) return;
      try {
        if (event.storageArea && event.storageArea !== window.localStorage) return;
        const next = readQueue(userId);
        const priorConflict = conflictRef.current;
        const pendingConflict = next.find((item) => item.request_id === priorConflict?.mutation.request_id);
        if (priorConflict && (!pendingConflict || pendingConflict.expected_updated_at !== priorConflict.mutation.expected_updated_at)) {
          blocked.current = false; conflictRef.current = null; setConflict(null);
        }
        // Storage events carry another tab's change; merge its durable commands into this view.
        setData((current) => next.reduce(applyHealthMutation, current));
        if (!blocked.current) { setSyncStatus(next.length ? 'pending' : 'saved'); void processQueue(); }
      } catch (error) {
        setSyncStatus('error'); setCloudError(error instanceof Error ? error.message : '无法读取其他页面的草稿，原始内容已保留。');
      }
    };
    window.addEventListener('storage', storageChanged);
    return () => window.removeEventListener('storage', storageChanged);
  }, [userId, sessionKey, processQueue, readQueue]);

  const submit = useCallback((mutation: HealthMutation) => {
    if (hasSupabase && (!userId || !cloudReady)) return false;
    try {
      if (userId) {
        const run = runs.current.capture();
        if (run.owner !== userId || readyToken.current !== run.token) return false;
        clientId.current ??= crypto.randomUUID();
        queue.current = appendPendingHealth(window.localStorage, userId, clientId.current, mutation);
      }
      const next = applyHealthMutation(latestData.current, mutation);
      latestData.current = next; setData(next);
      if (userId) { setSyncStatus(blocked.current ? 'conflict' : 'pending'); void processQueue(); }
      return true;
    } catch { setCloudError('无法保留草稿，本次输入仍在表单中，请释放本机存储后重试。'); setSyncStatus('error'); return false; }
  }, [cloudReady, hasSupabase, processQueue, userId]);

  const retry = useCallback(async () => {
    if (!userId) return;
    if (!conflictRef.current) { await processQueue(); return; }
    const run = runs.current.capture();
    const conflictToReview = conflictRef.current;
    try {
      const fresh = await readCloud(userId, run.signal);
      if (!run.current() || run.owner !== userId || conflictRef.current !== conflictToReview) return;
      const existingConflict = conflictRef.current;
      if (!existingConflict) return;
      const mutation = existingConflict.mutation;
      const record = mutation.kind === 'weight' ? fresh.growth.find((item) => item.date === mutation.key) : fresh.vaccines.find((item) => item.planId === mutation.key && item.doneDate);
      const current = record ? { updated_at: record.updatedAt, value: mutation.kind === 'weight' ? ('weight' in record ? record.weight : '') : ('doneDate' in record ? record.doneDate : '') } : null;
      const updated = { mutation, current, reviewed: true };
      conflictRef.current = updated; setConflict(updated);
      setData(readQueue(userId).reduce(applyHealthMutation, fresh));
    } catch (error) { if (run.current()) setCloudError(error instanceof Error ? error.message : '重新读取失败。'); }
  }, [processQueue, readCloud, readQueue, userId]);

  const resolveConflict = useCallback((keepMine: boolean) => {
    const value = conflictRef.current;
    if (!userId || !value?.reviewed) return;
    try {
      const run = runs.current.capture();
      if (run.owner !== userId || readyToken.current !== run.token) return;
      const version = typeof value.current?.updated_at === 'string' ? value.current.updated_at : null;
      queue.current = resolvePendingHealth(window.localStorage, userId, value.mutation, version, keepMine);
      blocked.current = false; conflictRef.current = null; setConflict(null); void processQueue();
    } catch { setCloudError('保存草稿失败，请重试。'); }
  }, [processQueue, userId]);

  return { data: hasSupabase && !userId ? previewData : data, cloudReady, syncStatus, cloudError, conflict, submit, retry, resolveConflict };
}
