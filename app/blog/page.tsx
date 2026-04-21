import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ChevronRight, Calendar } from 'lucide-react';

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <main className="max-w-xl mx-auto min-h-[100dvh] pb-6 antialiased bg-stone-100/60">
      <header className="px-6 pt-safe pb-2 flex items-center gap-3">
        <Link href="/" className="pt-4 text-stone-500 hover:text-stone-700 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="pt-4">
          <h1 className="text-lg font-semibold tracking-tight text-stone-800">🌱 成长 Log</h1>
          <p className="text-xs text-stone-400">共 {posts.length} 篇日志</p>
        </div>
      </header>

      <div className="px-5 space-y-3 mt-4">
        {posts.length === 0 ? (
          <Card className="border-stone-200/70 shadow-none">
            <CardContent className="text-center py-12 text-stone-400 text-sm">
              <p className="text-3xl mb-3">📝</p>
              还没有日志，在 <code className="bg-stone-200 px-1.5 py-0.5 rounded text-xs">content/blog/</code> 下新建 .md 文件吧
            </CardContent>
          </Card>
        ) : (
          posts.map((post, index) => (
            <Link key={post.slug} href={`/blog/${post.slug}`}>
              <Card className="border-stone-200/70 shadow-none hover:bg-stone-50 active:bg-stone-100 transition-all cursor-pointer mb-0.5">
                <CardContent className="py-4 px-5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-medium text-sm text-stone-800 truncate">{post.title}</h2>
                    {post.date && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Calendar className="h-3 w-3 text-stone-300" />
                        <p className="text-xs text-stone-400">{post.date}</p>
                      </div>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-stone-300 flex-shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
