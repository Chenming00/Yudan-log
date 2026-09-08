import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CATEGORIES, categoryLabel } from '@/lib/categories';
import type { TransactionFormState } from '../types';

export function TransactionFields({ form, onChange, requireProduct = true }: {
  form: TransactionFormState;
  onChange: (form: TransactionFormState) => void;
  requireProduct?: boolean;
}) {
  const id = useId();
  const update = (key: keyof TransactionFormState, value: string) => onChange({ ...form, [key]: value });
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-brand`}>品牌 <span className="font-normal text-muted-foreground">（可选）</span></Label>
        <Input id={`${id}-brand`} value={form.brand} onChange={(e) => update('brand', e.target.value)} placeholder="例如：帮宝适" maxLength={200} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-product`}>商品{requireProduct ? ' *' : '（可补充）'}</Label>
        <Input id={`${id}-product`} value={form.product} onChange={(e) => update('product', e.target.value)} placeholder="商品名称、规格、数量" maxLength={2000} required={requireProduct} />
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">分类</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <Button key={cat.value} type="button" size="sm" variant="outline"
              aria-pressed={categoryLabel(form.category) === cat.label}
              onClick={() => update('category', categoryLabel(form.category) === cat.label ? '' : cat.label)}
              className={`rounded-full ${categoryLabel(form.category) === cat.label ? 'border-expense/30 bg-expense/10 text-expense' : 'border-transparent bg-muted text-muted-foreground'}`}>
              {cat.emoji} {cat.label}
            </Button>
          ))}
        </div>
        <Input aria-label="自定义分类" value={form.category} onChange={(e) => update('category', e.target.value)} placeholder="未分类，也可填写自定义分类" maxLength={200} />
      </fieldset>
      <div className="min-w-0 space-y-1.5">
        <Label htmlFor={`${id}-time`}>时间</Label>
        <Input id={`${id}-time`} type="datetime-local" value={form.transaction_time} onChange={(e) => update('transaction_time', e.target.value)} className="min-w-0 max-w-full" />
        <p className="text-xs text-muted-foreground">按设备当地时间填写；不确定可留空。</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-note`}>备注 <span className="font-normal text-muted-foreground">（可选）</span></Label>
        <Textarea id={`${id}-note`} rows={3} value={form.note} onChange={(e) => update('note', e.target.value)}
          placeholder={'店铺：xxxx\n订单号：xxxx\n优惠：xxxx'} maxLength={10000} className="min-h-24" />
        <p className="text-xs text-muted-foreground">优惠仅作记录，金额请填写实际支付金额。</p>
      </div>
    </div>
  );
}
