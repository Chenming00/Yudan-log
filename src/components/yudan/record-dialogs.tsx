import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { validateHealthDate, validateHealthWeight } from '@/src/lib/health-records';
import type { VaccineEntry } from '@/src/lib/health-model';

function useDraft<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial; } catch { return initial; }
  });
  const save = (next: T) => { setValue(next); localStorage.setItem(key, JSON.stringify(next)); };
  const clear = () => { localStorage.removeItem(key); setValue(initial); };
  return [value, save, clear] as const;
}

export default function HealthRecordDialogs({ userId, today, weightOpen, onWeightOpenChange, vaccine, onVaccineClose, onSaveWeight, onSaveVaccine }: {
  userId: string; today: string; weightOpen: boolean; onWeightOpenChange: (value: boolean) => void;
  vaccine?: VaccineEntry; onVaccineClose: () => void;
  onSaveWeight: (date: string, weight: number) => boolean; onSaveVaccine: (item: VaccineEntry, date: string) => boolean;
}) {
  return <>{weightOpen && <WeightDialog key={`weight:${userId}`} {...{ userId, today, onWeightOpenChange, onSaveWeight }} />}{vaccine && <VaccineDialog key={`${userId}:${vaccine.id}`} {...{ userId, today, vaccine, onVaccineClose, onSaveVaccine }} />}</>;
}

function WeightDialog({ userId, today, onWeightOpenChange, onSaveWeight }: { userId: string; today: string; onWeightOpenChange: (value: boolean) => void; onSaveWeight: (date: string, weight: number) => boolean }) {
  const [draft, setDraft, clear] = useDraft(`yudan-health-form-v1:${userId}:weight`, { date: today, weight: '' });
  const [error, setError] = useState('');
  const [field, setField] = useState('');
  return <Dialog open onOpenChange={onWeightOpenChange}><DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-lg p-5 sm:p-6"><DialogHeader><DialogTitle>记录体重</DialogTitle><DialogDescription>同一天再次保存只更新体重，其他测量和备注会保留。</DialogDescription></DialogHeader>
    <form className="space-y-4" onSubmit={(event) => {
      event.preventDefault();
      let target = 'health-weight-date';
      try { validateHealthDate(draft.date); target = 'health-weight-value'; validateHealthWeight(Number(draft.weight)); if (onSaveWeight(draft.date, Number(draft.weight))) { clear(); onWeightOpenChange(false); } }
      catch (cause) { setError(cause instanceof Error ? cause.message : '请检查输入。'); setField(target); document.getElementById(target)?.focus(); }
    }}>
      <div className="grid grid-cols-2 gap-3"><label className="grid min-w-0 gap-1.5 text-sm font-medium">测量日期<Input id="health-weight-date" type="date" required max={today} value={draft.date} aria-invalid={field === 'health-weight-date'} aria-describedby={error ? 'weight-error' : undefined} onChange={(event) => { try { setDraft({ ...draft, date: event.target.value }); } catch { setError('本机存储空间不足，草稿无法保留。'); } }} /></label><label className="grid min-w-0 gap-1.5 text-sm font-medium">体重（kg）<Input id="health-weight-value" type="number" required min="0.1" max="200" step="0.001" inputMode="decimal" value={draft.weight} autoFocus aria-invalid={field === 'health-weight-value'} aria-describedby={error ? 'weight-error' : undefined} onChange={(event) => { try { setDraft({ ...draft, weight: event.target.value }); } catch { setError('本机存储空间不足，草稿无法保留。'); } }} placeholder="例如 6.80" /></label></div>
      {error && <p id="weight-error" role="alert" className="text-sm text-rose-700">{error}</p>}
      <Button className="w-full" type="submit">保存体重</Button>
    </form></DialogContent></Dialog>;
}

function VaccineDialog({ userId, today, vaccine, onVaccineClose, onSaveVaccine }: { userId: string; today: string; vaccine: VaccineEntry; onVaccineClose: () => void; onSaveVaccine: (item: VaccineEntry, date: string) => boolean }) {
  const [draft, setDraft, clear] = useDraft(`yudan-health-form-v1:${userId}:vaccine:${vaccine.id}`, vaccine.doneDate || today);
  const [error, setError] = useState('');
  return <Dialog open onOpenChange={(open) => { if (!open) onVaccineClose(); }}><DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-lg p-5 sm:p-6"><DialogHeader><DialogTitle>登记实际接种日期</DialogTitle><DialogDescription>{vaccine.vaccine} {vaccine.dose} · 批号、厂家和备注会保留。</DialogDescription></DialogHeader>
    <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); try { validateHealthDate(draft, '接种日期'); if (onSaveVaccine(vaccine, draft)) { clear(); onVaccineClose(); } } catch (cause) { setError(cause instanceof Error ? cause.message : '请检查输入。'); document.getElementById('health-vaccine-date')?.focus(); } }}>
      <label className="grid gap-1.5 text-sm font-medium">实际接种日期<Input id="health-vaccine-date" type="date" required max={today} value={draft} aria-invalid={Boolean(error)} aria-describedby={error ? 'vaccine-error' : undefined} onChange={(event) => { try { setDraft(event.target.value); } catch { setError('本机存储空间不足，草稿无法保留。'); } }} /></label>
      {error && <p id="vaccine-error" role="alert" className="text-sm text-rose-700">{error}</p>}
      <div className="grid grid-cols-2 gap-3"><Button type="button" variant="outline" onClick={() => { try { setDraft(today); } catch { setError('本机存储空间不足。'); } }}>设为今天</Button><Button type="submit">保存记录</Button></div>
      {vaccine.doneDate && <Button type="button" variant="ghost" className="text-rose-700" onClick={() => { if (onSaveVaccine(vaccine, '')) { clear(); onVaccineClose(); } }}>清除实际接种日期</Button>}
    </form></DialogContent></Dialog>;
}
