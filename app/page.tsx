import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Wallet, ChevronRight, TrendingUp, TrendingDown, Calendar, Clock3 } from 'lucide-react';
import { getAllPosts } from '@/lib/blog';

const modules = [
  {
    title: '鱼蛋小账本',
    description: '记录日常收支，管理个人财务',
    href: '/ledger',
    icon: Wallet,
    color: 'text-[#FF6B6B]',
    bgColor: 'bg-[#FF6B6B]/10',
  },
  {
    title: '成长 Log',
    description: '用文字记录成长的每一步',
    href: '/blog',
    icon: BookOpen,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
];

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

async function getLedgerSummary() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_URL || ''}/api/list`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success) return null;
    
    const currentMonthKey = getMonthKey(new Date());
    const currentMonthTransactions = data.data.filter((t: any) => {
      const date = new Date(t.transaction_time || t.created_at);
      return getMonthKey(date) === currentMonthKey;
    });
    
    const currentExpense = currentMonthTransactions
      .filter((t: any) => t.type === 'expense')
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0);
    
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthKey = getMonthKey(lastMonth);
    const lastMonthTransactions = data.data.filter((t: any) => {
      const date = new Date(t.transaction_time || t.created_at);
      return getMonthKey(date) === lastMonthKey;
    });
    
    const lastExpense = lastMonthTransactions
      .filter((t: any) => t.type === 'expense')
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0);
    
    return {
      currentExpense,
      lastExpense,
      transactionCount: currentMonthTransactions.length,
    };
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const posts = getAllPosts().slice(0, 2);
  const ledgerSummary = await getLedgerSummary();
  
  const currentExpense = ledgerSummary?.currentExpense || 0;
  const lastExpense = ledgerSummary?.lastExpense || 0;
  const diff = lastExpense > 0 ? ((currentExpense - lastExpense) / lastExpense) * 100 : 0;
  const isIncrease = diff > 0;
  
  return (
    <main className="min-h-screen px-5 py-8 pb-[calc(env(safe-area-inset-bottom)+84px)]">
      {/* Profile Section */}
      <div className="flex flex-col items-center pt-safe pb-8">
        <div className="mb-4 mt-6 sm:mt-8 relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-[#FF6B6B]/30 rounded-full blur-sm" />
          <Image
            src="/apple-home-logo.png"
            alt="头像"
            width={80}
            height={80}
            sizes="80px"
            className="h-20 w-20 rounded-full object-cover shadow-sm relative z-10"
            priority
          />
        </div>
        <h1 className="text-center text-xl font-medium tracking-tight text-foreground sm:text-2xl">
          🐟 鱼蛋宝宝
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          记录生活的每一面
        </p>
      </div>

      {/* Ledger Summary Section */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-muted-foreground">📊 本月概览</h2>
          <Link href="/ledger" className="text-xs text-primary hover:underline">
            查看全部
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white shadow-sm p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <Wallet className="h-4 w-4" />
              <span className="text-sm">本月支出</span>
            </div>
            <div className="text-xl font-bold text-[#FF6B6B]">
              ¥{currentExpense.toLocaleString()}
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              {ledgerSummary && lastExpense > 0 ? (
                <>
                  {isIncrease ? (
                    <TrendingUp className="h-3 w-3 text-[#FF6B6B]" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-emerald-500" />
                  )}
                  <span className={isIncrease ? 'text-[#FF6B6B]' : 'text-emerald-500'}>
                    {isIncrease ? '+' : ''}{diff.toFixed(1)}%
                  </span>
                  <span>vs 上月</span>
                </>
              ) : (
                <span>暂无对比数据</span>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white shadow-sm p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <Wallet className="h-4 w-4" />
              <span className="text-sm">交易笔数</span>
            </div>
            <div className="text-xl font-bold text-foreground">
              {ledgerSummary?.transactionCount || 0}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              本月记录
            </div>
          </div>
        </div>
      </section>

      {/* Latest Blog Posts Section */}
      {posts.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-muted-foreground">🌱 最新动态</h2>
            <Link href="/blog" className="text-xs text-primary hover:underline">
              查看全部
            </Link>
          </div>
          <div className="space-y-3">
            {posts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`}>
                <article className="rounded-2xl bg-white shadow-sm p-5 transition-all hover:bg-accent active:bg-accent/80 cursor-pointer">
                  <h3 className="font-medium text-base text-foreground leading-snug">
                    {post.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {post.summary}
                  </p>
                  <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{post.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock3 className="h-3.5 w-3.5" />
                      <span>{post.readingTime} 分钟</span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Module Cards */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-4">🔗 快捷入口</h2>
        <div className="space-y-4">
          {modules.map((mod) => (
            <Link key={mod.href} href={mod.href}>
              <div className="rounded-2xl bg-white shadow-sm transition-all hover:bg-accent active:bg-accent/80 cursor-pointer p-5 flex items-center gap-4">
                <div className={`rounded-xl p-3 ${mod.bgColor}`}>
                  <mod.icon className={`h-5 w-5 ${mod.color}`} />
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
      </section>
    </main>
  );
}