import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Wallet, ChevronRight } from 'lucide-react';

const modules = [
  {
    title: '鱼蛋小账本',
    description: '记录日常收支，管理个人财务',
    href: '/ledger',
    icon: Wallet,
  },
  {
    title: '成长 Log',
    description: '用文字记录成长的每一步',
    href: '/blog',
    icon: BookOpen,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen px-5 py-8 pb-[calc(env(safe-area-inset-bottom)+84px)]">
      {/* Profile Section */}
      <div className="flex flex-col items-center pt-safe pb-8">
        <div className="mb-4 mt-6 sm:mt-8">
          <Image
            src="/apple-home-logo.png"
            alt="头像"
            width={80}
            height={80}
            sizes="80px"
            className="h-20 w-20 rounded-full object-cover shadow-sm"
            priority
          />
        </div>
        <h1 className="text-center text-xl font-medium tracking-tight text-foreground sm:text-2xl">鱼蛋宝宝</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">记录生活的每一面</p>
      </div>

      {/* Module Cards */}
      <div className="space-y-4">
        {modules.map((mod) => (
          <Link key={mod.href} href={mod.href}>
            <div className="rounded-2xl bg-white shadow-sm transition-all hover:bg-accent active:bg-accent/80 cursor-pointer p-5 flex items-center gap-4">
              <div className="rounded-xl p-3 bg-muted">
                <mod.icon className="h-5 w-5 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-medium text-base text-foreground">{mod.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{mod.description}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}