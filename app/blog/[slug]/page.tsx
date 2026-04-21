import type { Metadata } from 'next';
import Link from 'next/link';
import { getPostBySlug, getAllPosts, getAdjacentPosts } from '@/lib/blog';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Clock3 } from 'lucide-react';
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
    <main className="min-h-screen px-4 py-6 pb-[calc(env(safe-area-inset-bottom)+84px)]">
      <header className="flex items-center gap-3 pt-safe pb-2">
        <Link href="/blog" className="pt-4 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="pt-4 min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-foreground truncate">{post.title}</h1>
          {post.date && (
            <div className="flex items-center gap-1 mt-0.5">
              <Calendar className="h-3 w-3 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">{post.date}</p>
            </div>
          )}
        </div>
      </header>

      <div className="mt-4 rounded-2xl bg-white shadow-sm overflow-hidden">
        <div className="border-b border-border/50 px-4 pt-5 pb-4 sm:px-5">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
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
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{post.summary}</p>
          {post.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                  #{tag}
                </span>
              ))}
            </div>
          )}
          <div className="mt-4">
            <PostActions title={post.title} summary={post.summary} />
          </div>
        </div>
        <div className="px-4 py-6 sm:px-5">
          <TocCard headings={post.headings} />
          <MarkdownContent content={post.content} />
        </div>
      </div>

      {(previous || next) && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {previous ? (
            <Link href={`/blog/${previous.slug}`} className="rounded-2xl bg-white shadow-sm px-4 py-4 hover:bg-accent transition-colors">
              <p className="text-xs text-muted-foreground">上一篇</p>
              <p className="mt-1 text-sm font-medium text-foreground">{previous.title}</p>
            </Link>
          ) : <div />}
          {next ? (
            <Link href={`/blog/${next.slug}`} className="rounded-2xl bg-white shadow-sm px-4 py-4 hover:bg-accent transition-colors text-left">
              <p className="text-xs text-muted-foreground">下一篇</p>
              <p className="mt-1 text-sm font-medium text-foreground">{next.title}</p>
            </Link>
          ) : <div />}
        </div>
      )}
    </main>
  );
}
