import Link from 'next/link';
import { getPostBySlug, getAllPosts } from '@/lib/blog';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { MarkdownContent } from './markdown-content';

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <main className="max-w-xl mx-auto min-h-[100dvh] pb-6 antialiased bg-stone-100/60">
      <header className="px-6 pt-safe pb-2 flex items-center gap-3">
        <Link href="/blog" className="pt-4 text-stone-500 hover:text-stone-700 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-medium tracking-tight pt-4 text-stone-700 truncate">{post.title}</h1>
      </header>

      {post.date && (
        <p className="px-6 text-xs text-stone-400 mb-4">{post.date}</p>
      )}

      <Card className="mx-5 border-stone-200/70 shadow-none">
        <CardContent className="py-6 px-5">
          <MarkdownContent content={post.content} />
        </CardContent>
      </Card>
    </main>
  );
}
