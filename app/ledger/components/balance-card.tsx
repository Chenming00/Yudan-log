import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface BalanceCardProps {
  balance: number;
  income: number;
  expense: number;
}

export function BalanceCard({ balance, income, expense }: BalanceCardProps) {
  return (
    <Card className="mx-4 sm:mx-6 lg:mx-8 sm:mx-auto mb-5 max-w-4xl border-stone-200/70 bg-stone-50 shadow-none">
      <CardContent className="px-4 py-6 sm:py-7 text-center">
        <p className="text-[11px] font-medium text-stone-400 mb-1.5 tracking-[0.2em] uppercase">余额</p>
        <h1 className="mb-5 sm:mb-6 text-2xl font-semibold tracking-tight text-stone-800 sm:text-3xl">
          ¥{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h1>
        <div className="flex items-center justify-center gap-4 sm:gap-5 lg:gap-8">
          <div className="flex flex-col items-center">
            <span className="text-[11px] text-stone-400 tracking-wider mb-1">收入</span>
            <span className="text-sm font-medium text-stone-700">+¥{income.toLocaleString()}</span>
          </div>
          <Separator orientation="vertical" className="h-8 bg-stone-200" />
          <div className="flex flex-col items-center">
            <span className="text-[11px] text-stone-400 tracking-wider mb-1">支出</span>
            <span className="text-sm font-medium text-stone-700">-¥{expense.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}