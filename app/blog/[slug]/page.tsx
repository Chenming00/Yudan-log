import Link from 'next/link';
import { getPostBySlug, getAllPosts } from '@/lib/blog';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar } from 'lucide-react';
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
        <div className="pt-4 min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-stone-800 truncate">{post.title}</h1>
          {post.date && (
            <div className="flex items-center gap-1 mt-0.5">
              <Calendar className="h-3 w-3 text-stone-300" />
              <p className="text-xs text-stone-400">{post.date}</p>
            </div>
          )}
        </div>
      </header>

      <Card className="mx-5 mt-4 border-stone-200/70 shadow-none">
        <CardContent className="py-6 px-5">
          <MarkdownContent content={post.content} />
        </CardContent>
      </Card>
    </main>
  );
}
