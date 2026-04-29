import type { Metadata } from 'next';
import { getAllPosts } from '@/lib/blog';
import { BlogListClient } from './blog-list-client';

export const metadata: Metadata = {
  title: '成长 Log',
  description: '用文字记录成长的每一步',
  alternates: {
    canonical: '/blog',
  },
  openGraph: {
    type: 'website',
    title: '成长 Log',
    description: '用文字记录成长的每一步',
    url: '/blog',
  },
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <main className="min-h-screen px-4 sm:px-6 py-8 pb-[var(--nav-height)] bg-background">
      <BlogListClient posts={posts} />
    </main>
  );
}
