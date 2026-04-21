import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Wallet } from 'lucide-react';

const modules = [
  {
    title: '📒 鱼蛋小账本',
    description: '记录日常收支，管理个人财务',
    href: '/ledger',
    icon: Wallet,
    color: 'text-amber-600 bg-amber-50',
  },
  {
    title: '🌱 成长 Log',
    description: '用文字记录成长的每一步',
    href: '/blog',
    icon: BookOpen,
    color: 'text-green-600 bg-green-50',
  },
];

export default function HomePage() {
  return (
    <main className="max-w-xl mx-auto min-h-full pb-6 antialiased bg-stone-100/60">
      {/* Profile Section */}
      <div className="flex flex-col items-center pt-safe px-6 pb-2">
        <div className="mt-10 mb-3">
          <Image
            src="/apple-home-logo.png"
            alt="头像"
            width={80}
            height={80}
            className="rounded-full ring-2 ring-stone-200 shadow-sm object-cover scale-125"
            priority
          />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-stone-800">鱼蛋宝宝</h1>
        <p className="text-sm text-stone-400 mt-1">记录生活的每一面 🌱</p>
      </div>

      {/* Module Cards */}
      <div className="px-5 mt-8 space-y-3">
        {modules.map((mod) => (
          <Link key={mod.href} href={mod.href}>
            <Card className="border-stone-200/70 shadow-none hover:bg-stone-50 active:bg-stone-100 transition-all cursor-pointer mb-3">
              <CardContent className="py-5 px-5 flex items-center gap-4">
                <div className={`rounded-xl p-2.5 ${mod.color}`}>
                  <mod.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-base text-stone-800">{mod.title}</h2>
                  <p className="text-xs text-stone-400 mt-0.5">{mod.description}</p>
                </div>
                <svg className="h-4 w-4 text-stone-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
