import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Wallet, Calendar, Clock3, Plus } from 'lucide-react';
import { getAllPosts } from '@/lib/blog';

const modules = [
  {
    title: '鱼蛋小账本',
    description: '记录每一笔收支',
    href: '/ledger',
    icon: Wallet,
    color: 'text-[#FF6B6B]',
    bgColor: 'bg-[#FF6B6B]/10',
  },
  {
    title: '成长 Log',
    description: '记录成长的点滴',
    href: '/blog',
    icon: BookOpen,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
];

export default async function HomePage() {
  const posts = getAllPosts().slice(0, 3);
  
  return (
    <main className="min-h-screen px-5 py-6 pb-[calc(env(safe-area-inset-bottom)+100px)]">
      {/* Header */}
      <div className="flex items-center justify-between pt-safe pb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">你好呀 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">今天也要好好记录</p>
        </div>
        <div className="relative">
          <Image
            src="/apple-home-logo.png"
            alt="头像"
            width={48}
            height={48}
            sizes="48px"
            className="h-12 w-12 rounded-full object-cover shadow-sm"
            priority
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {modules.map((mod) => (
          <Link key={mod.href} href={mod.href}>
            <div className="rounded-2xl bg-white shadow-sm p-5 flex flex-col gap-4 transition-all hover:shadow-md active:scale-[0.98] cursor-pointer">
              <div className={`w-12 h-12 rounded-xl ${mod.bgColor} flex items-center justify-center`}>
                <mod.icon className={`h-6 w-6 ${mod.color}`} />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">{mod.title}</h2>
                <p className="text-xs text-muted-foreground mt-1">{mod.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Posts */}
      {posts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">最近动态</h2>
            <Link href="/blog" className="text-xs text-primary hover:underline">
              查看全部
            </Link>
          </div>
          <div className="space-y-3">
            {posts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`}>
                <article className="rounded-xl bg-white shadow-sm p-4 transition-all hover:bg-accent active:bg-accent/80 cursor-pointer">
                  <h3 className="font-medium text-sm text-foreground leading-snug">
                    {post.title}
                  </h3>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{post.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock3 className="h-3 w-3" />
                      <span>{post.readingTime} 分钟</span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}