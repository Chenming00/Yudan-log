import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

const modules = [
  {
    title: '📒 鱼蛋小账本',
    description: '记录日常收支，管理个人财务',
    href: '/ledger',
  },
  {
    title: '🌱 成长 Log',
    description: '用文字记录成长的每一步',
    href: '/blog',
  },
];

export default function HomePage() {
  return (
    <main className="max-w-xl mx-auto min-h-[100dvh] pb-6 antialiased bg-stone-100/60">
      <header className="px-6 pt-safe pb-2">
        <h1 className="text-lg font-medium tracking-tight pt-4 text-stone-700">🐟 鱼蛋花飞</h1>
        <p className="text-xs text-stone-400 mt-1">选择一个模块开始吧</p>
      </header>

      <div className="px-5 mt-4 space-y-3">
        {modules.map((mod) => (
          <Link key={mod.href} href={mod.href}>
            <Card className="border-stone-200/70 shadow-none hover:bg-stone-50 active:bg-stone-100 transition-colors cursor-pointer mb-3">
              <CardContent className="py-6 px-5">
                <h2 className="font-semibold text-base text-stone-800">{mod.title}</h2>
                <p className="text-xs text-stone-400 mt-1.5">{mod.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
