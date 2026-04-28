import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Wallet, ArrowRight } from 'lucide-react';
import { getAllPosts } from '@/lib/blog';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return { text: '夜深了', emoji: '🌙', sub: '注意休息哦' };
  if (hour < 11) return { text: '早安', emoji: '☀️', sub: '新的一天，元气满满' };
  if (hour < 14) return { text: '午安', emoji: '🌤', sub: '吃好午饭，小憩一下' };
  if (hour < 18) return { text: '下午好', emoji: '☕', sub: '来杯咖啡提提神' };
  if (hour < 22) return { text: '晚上好', emoji: '🌆', sub: '放松心情，享受夜晚' };
  return { text: '夜深了', emoji: '🌙', sub: '早点休息，晚安好梦' };
}

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays}天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`;
  return `${Math.floor(diffDays / 365)}年前`;
}

const modules = [
  {
    title: '鱼蛋小账本',
    description: '记录每一笔收支',
    href: '/ledger',
    icon: Wallet,
    color: 'text-[#FF6B6B]',
    bgGradient: 'bg-gradient-to-br from-[#FF6B6B]/15 to-[#FF8E8E]/5',
    borderColor: 'border-[#FF6B6B]/10',
  },
  {
    title: '成长 Log',
    description: '记录成长的点滴',
    href: '/blog',
    icon: BookOpen,
    color: 'text-primary',
    bgGradient: 'bg-gradient-to-br from-primary/15 to-emerald-400/5',
    borderColor: 'border-primary/10',
  },
];

export default async function HomePage() {
  const posts = getAllPosts().slice(0, 3);
  const greeting = getGreeting();

  return (
    <main className="min-h-screen px-5 py-6 pb-[calc(env(safe-area-inset-bottom)+100px)]">
      {/* Hero Banner */}
      <div className="relative rounded-2xl bg-gradient-to-br from-primary/10 via-emerald-50 to-teal-50 p-5 mb-8 overflow-hidden pt-safe">
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-primary/5" />
        <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-emerald-100/40" />

        <div className="relative flex items-center gap-4">
          <div className="relative shrink-0">
            <Image
              src="/apple-home-logo.png"
              alt="头像"
              width={56}
              height={56}
              sizes="56px"
              className="h-14 w-14 rounded-full object-cover shadow-md ring-2 ring-white"
              priority
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {greeting.text} {greeting.emoji}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{greeting.sub}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {modules.map((mod) => (
          <Link key={mod.href} href={mod.href}>
              <div
                className={`group rounded-2xl border ${mod.borderColor} ${mod.bgGradient} p-4 flex flex-col gap-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer`}
              >
                <div className="w-10 h-10 rounded-xl bg-card shadow-sm flex items-center justify-center border border-border/30">
                <mod.icon className={`h-5 w-5 ${mod.color}`} />
              </div>
              <div>
                <h2 className="font-semibold text-sm text-foreground">{mod.title}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                <span>进入</span>
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Posts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">最近动态</h2>
          <Link href="/blog" className="text-xs text-primary hover:underline">
            查看全部
          </Link>
        </div>

        {posts.length > 0 ? (
          <div className="space-y-3">
            {posts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`}>
                <article className="rounded-xl bg-card shadow-sm border border-border/50 p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer">
                  <h3 className="font-medium text-sm text-foreground leading-snug">
                    {post.title}
                  </h3>
                  {post.summary && (
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                      {post.summary}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      {post.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="inline-block px-2 py-0.5 text-[10px] font-medium rounded-full bg-primary/10 text-primary"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {getRelativeTime(post.date)}
                    </span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="rounded-xl bg-card border border-dashed border-border p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-3">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">还没有动态</p>
            <p className="text-xs text-muted-foreground mt-1">
              去写第一篇成长日志吧 ✍️
            </p>
            <Link
              href="/blog"
              className="inline-block mt-4 px-4 py-2 text-xs font-medium rounded-full bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              去写日志
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}