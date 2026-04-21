import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <main className="max-w-xl mx-auto min-h-[100dvh] pb-6 antialiased bg-stone-100/60">
      <header className="px-6 pt-safe pb-2 flex items-center gap-3">
        <Link href="/" className="pt-4 text-stone-500 hover:text-stone-700 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-medium tracking-tight pt-4 text-stone-700">🌱 成长 Log</h1>
      </header>

      <div className="px-5 space-y-3 mt-2">
        {posts.length === 0 ? (
          <Card className="border-stone-200/70 shadow-none">
            <CardContent className="text-center py-8 text-stone-400 text-sm">
              还没有日志，在 <code className="bg-stone-200 px-1 rounded text-xs">content/blog/</code> 下新建 .md 文件吧
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`}>
              <Card className="border-stone-200/70 shadow-none hover:bg-stone-50 transition-colors cursor-pointer">
                <CardContent className="py-4 px-5">
                  <h2 className="font-medium text-sm text-stone-800">{post.title}</h2>
                  {post.date && (
                    <p className="text-xs text-stone-400 mt-1">{post.date}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
