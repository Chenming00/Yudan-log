import { useState } from 'react';
import { CalendarCheck, CalendarDays, Weight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { validateHealthDate, validateHealthWeight } from '@/src/lib/health-records';
import { formatDate } from '@/src/lib/health-model';
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
  return (
    <Dialog open onOpenChange={onWeightOpenChange}>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-[24px] p-6 sm:p-8">
        <DialogHeader className="text-left">
          <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#eaf0e2] text-primary"><Weight className="h-6 w-6" /></span>
          <DialogTitle className="text-xl">记录体重</DialogTitle>
          <DialogDescription className="leading-6">记下今天的小变化。同一天再次保存会更新体重，其他测量和备注会保留。</DialogDescription>
        </DialogHeader>
        <form className="mt-2 space-y-5" onSubmit={(event) => {
          event.preventDefault();
          let target = 'health-weight-date';
          try { validateHealthDate(draft.date); target = 'health-weight-value'; validateHealthWeight(Number(draft.weight)); if (onSaveWeight(draft.date, Number(draft.weight))) { clear(); onWeightOpenChange(false); } }
          catch (cause) { setError(cause instanceof Error ? cause.message : '请检查输入。'); setField(target); document.getElementById(target)?.focus(); }
        }}>
          <label className="grid min-w-0 gap-2 text-sm font-medium text-foreground">
            测量日期
            <Input className="h-12 rounded-xl bg-[#f8faf5]" id="health-weight-date" type="date" required max={today} value={draft.date} aria-invalid={field === 'health-weight-date'} aria-describedby={error ? 'weight-error' : undefined} onChange={(event) => { try { setDraft({ ...draft, date: event.target.value }); } catch { setError('本机存储空间不足，草稿无法保留。'); } }} />
          </label>
          <label className="grid min-w-0 gap-2 text-sm font-medium text-foreground">
            体重（kg）
            <Input className="h-14 rounded-xl border-[#d4dfca] bg-[#f4f7ef] text-lg font-semibold text-primary" id="health-weight-value" type="number" required min="0.1" max="200" step="0.001" inputMode="decimal" value={draft.weight} autoFocus aria-invalid={field === 'health-weight-value'} aria-describedby={error ? 'weight-error' : undefined} onChange={(event) => { try { setDraft({ ...draft, weight: event.target.value }); } catch { setError('本机存储空间不足，草稿无法保留。'); } }} placeholder="例如 6.80" />
          </label>
          {error && <p id="weight-error" role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          <div className="grid grid-cols-[1fr_1.5fr] gap-3 border-t border-border pt-5">
            <Button variant="outline" type="button" onClick={() => onWeightOpenChange(false)}>取消</Button>
            <Button type="submit">保存体重</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function VaccineDialog({ userId, today, vaccine, onVaccineClose, onSaveVaccine }: { userId: string; today: string; vaccine: VaccineEntry; onVaccineClose: () => void; onSaveVaccine: (item: VaccineEntry, date: string) => boolean }) {
  const [draft, setDraft, clear] = useDraft(`yudan-health-form-v1:${userId}:vaccine:${vaccine.id}`, vaccine.doneDate || today);
  const [error, setError] = useState('');
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onVaccineClose(); }}>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-[24px] p-6 sm:p-8">
        <DialogHeader className="text-left">
          <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#f6eddf] text-[#9b794b]"><CalendarCheck className="h-6 w-6" /></span>
          <DialogTitle className="text-xl">登记实际接种日期</DialogTitle>
          <DialogDescription className="leading-6">记录完成接种的这一天，批号、厂家和备注会保留。</DialogDescription>
        </DialogHeader>
        <div className="rounded-2xl bg-[#f4f7ef] px-4 py-4"><p className="text-sm font-semibold text-primary">{vaccine.vaccine} {vaccine.dose}</p><p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />建议日期 {formatDate(vaccine.plannedDate)}</p></div>
        <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); try { validateHealthDate(draft, '接种日期'); if (onSaveVaccine(vaccine, draft)) { clear(); onVaccineClose(); } } catch (cause) { setError(cause instanceof Error ? cause.message : '请检查输入。'); document.getElementById('health-vaccine-date')?.focus(); } }}>
          <label className="grid gap-2 text-sm font-medium text-foreground">实际接种日期<Input className="h-12 rounded-xl bg-[#f8faf5]" id="health-vaccine-date" type="date" required max={today} value={draft} aria-invalid={Boolean(error)} aria-describedby={error ? 'vaccine-error' : undefined} onChange={(event) => { try { setDraft(event.target.value); } catch { setError('本机存储空间不足，草稿无法保留。'); } }} /></label>
          {error && <p id="vaccine-error" role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          <div className="grid grid-cols-[1fr_1.5fr] gap-3 border-t border-border pt-5"><Button type="button" variant="outline" onClick={() => { try { setDraft(today); } catch { setError('本机存储空间不足。'); } }}>设为今天</Button><Button type="submit">保存记录</Button></div>
          {vaccine.doneDate && <Button type="button" variant="ghost" className="w-full text-rose-700 hover:bg-rose-50 hover:text-rose-800" onClick={() => { if (onSaveVaccine(vaccine, '')) { clear(); onVaccineClose(); } }}>清除实际接种日期</Button>}
        </form>
      </DialogContent>
    </Dialog>
  );
}
