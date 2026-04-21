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
    <div className="min-h-screen px-4 py-6">
      {/* Profile Section */}
      <div className="flex flex-col items-center pt-safe pb-2">
        <div className="mb-3 mt-8 sm:mt-10">
          <Image
            src="/apple-home-logo.png"
            alt="头像"
            width={80}
            height={80}
            sizes="80px"
            className="h-20 w-20 rounded-full object-cover shadow-sm ring-2 ring-border scale-110 sm:scale-125"
            priority
          />
        </div>
        <h1 className="text-center text-xl font-semibold tracking-tight text-foreground sm:text-2xl">鱼蛋宝宝</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">记录生活的每一面 🌱</p>
      </div>

      {/* Module Cards */}
      <div className="mt-8 grid gap-3 md:grid-cols-2 md:gap-4">
        {modules.map((mod) => (
          <Link key={mod.href} href={mod.href}>
            <Card className="h-full rounded-2xl shadow-sm transition-all hover:bg-accent active:bg-accent/80 cursor-pointer">
              <CardContent className="flex items-center gap-4 p-4 sm:p-5">
                <div className={`rounded-xl p-2.5 ${mod.color}`}>
                  <mod.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-base text-foreground">{mod.title}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>
                </div>
                <svg className="h-4 w-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
