import { Card, CardContent } from '@/components/ui/card';

interface FilterSummaryProps {
  count: number;
  income: number;
  expense: number;
}

export function FilterSummary({ count, income, expense }: FilterSummaryProps) {
  return (
    <Card className="mx-4 sm:mx-6 lg:mx-8 mx-auto mb-4 max-w-4xl border-stone-200/70 bg-white/80 shadow-none">
      <CardContent className="px-4 py-4">
        <div className="grid grid-cols-1 gap-3 text-center sm:grid-cols-3">
          <div>
            <p className="text-[11px] text-stone-400 tracking-wide">筛选结果</p>
            <p className="mt-1 text-base font-semibold text-stone-800">{count}</p>
          </div>
          <div>
            <p className="text-[11px] text-stone-400 tracking-wide">收入合计</p>
            <p className="mt-1 text-base font-semibold text-emerald-600">
              ¥{income.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-stone-400 tracking-wide">支出合计</p>
            <p className="mt-1 text-base font-semibold text-stone-700">
              ¥{expense.toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}