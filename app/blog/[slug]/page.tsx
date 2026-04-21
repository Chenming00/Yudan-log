import type { Metadata } from 'next';
import Link from 'next/link';
import { getPostBySlug, getAllPosts, getAdjacentPosts } from '@/lib/blog';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Clock3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { MarkdownContent } from './markdown-content';
import { PostActions } from './post-actions';
import { TocCard } from './toc-card';

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: '文章不存在',
    };
  }

  return {
    title: post.title,
    description: post.summary,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.summary,
      url: `/blog/${post.slug}`,
      images: [{ url: post.cover, alt: post.title }],
      publishedTime: post.date,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.summary,
      images: [post.cover],
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();
  const { previous, next } = getAdjacentPosts(slug);

  return (
    <main className="page-shell pb-6 lg:pb-10">
      <header className="page-padding flex items-center gap-3 pt-safe pb-2">
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

      <Card className="card-gutter mx-auto mt-4 max-w-4xl overflow-hidden border-stone-200/70 shadow-none">
        <div className="border-b border-stone-100 bg-white px-4 pt-5 pb-4 sm:px-5">
          <div className="flex flex-wrap items-center gap-3 text-xs text-stone-400">
            {post.date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>{post.date}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" />
              <span>{post.readingTime} 分钟阅读</span>
            </div>
          </div>
          <p className="mt-3 text-sm leading-7 text-stone-500">{post.summary}</p>
          {post.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] text-stone-500">
                  #{tag}
                </span>
              ))}
            </div>
          )}
          <div className="mt-4">
            <PostActions title={post.title} summary={post.summary} />
          </div>
        </div>
        <CardContent className="px-4 py-6 sm:px-5">
          <TocCard headings={post.headings} />
          <MarkdownContent content={post.content} />
        </CardContent>
      </Card>

      {(previous || next) && (
        <div className="card-gutter mx-auto mt-4 grid max-w-4xl gap-3 md:grid-cols-2">
          {previous ? (
            <Link href={`/blog/${previous.slug}`} className="rounded-2xl border border-stone-200 bg-white px-4 py-4 hover:bg-stone-50 transition-colors">
              <p className="text-xs text-stone-400">上一篇</p>
              <p className="mt-1 text-sm font-medium text-stone-800">{previous.title}</p>
            </Link>
          ) : <div />}
          {next ? (
            <Link href={`/blog/${next.slug}`} className="rounded-2xl border border-stone-200 bg-white px-4 py-4 hover:bg-stone-50 transition-colors text-left">
              <p className="text-xs text-stone-400">下一篇</p>
              <p className="mt-1 text-sm font-medium text-stone-800">{next.title}</p>
            </Link>
          ) : <div />}
        </div>
      )}
    </main>
  );
}
