import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';
import { ArrowLeft } from 'lucide-react';
import { BlogListClient } from './blog-list-client';

export const metadata: Metadata = {
  title: '成长 Log',
  description: '记录鱼蛋宝宝的成长片段、产品迭代和生活观察。',
  alternates: {
    canonical: '/blog',
  },
  openGraph: {
    title: '成长 Log',
    description: '记录鱼蛋宝宝的成长片段、产品迭代和生活观察。',
    url: '/blog',
  },
};

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

      <BlogListClient posts={posts} />
    </main>
  );
}
