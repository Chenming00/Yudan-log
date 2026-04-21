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
    <main className="min-h-screen bg-white">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link href="/blog" className="text-muted-foreground hover:text-foreground transition-colors p-2 -ml-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-medium text-foreground truncate">{post.title}</h1>
          </div>
        </div>
      </header>

      {/* 文章内容区域 - 居中窄内容 */}
      <article className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-[calc(env(safe-area-inset-bottom)+84px)]">
        {/* 文章头部信息 */}
        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
            {post.title}
          </h1>
          
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {post.date && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{post.date}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Clock3 className="h-4 w-4" />
              <span>{post.readingTime} 分钟阅读</span>
            </div>
          </div>

          {post.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <p className="mt-6 text-base text-muted-foreground leading-relaxed border-l-2 border-border pl-4">
            {post.summary}
          </p>

          <div className="mt-6">
            <PostActions title={post.title} summary={post.summary} />
          </div>
        </header>

        {/* 目录 */}
        <TocCard headings={post.headings} />

        {/* 正文内容 */}
        <div className="mt-8">
          <MarkdownContent content={post.content} />
        </div>

        {/* 文章底部导航 */}
        {(previous || next) && (
          <nav className="mt-12 pt-8 border-t border-border">
            <div className="grid gap-4 sm:grid-cols-2">
              {previous ? (
                <Link href={`/blog/${previous.slug}`} className="group p-4 rounded-xl border border-border/50 hover:border-border hover:bg-muted/50 transition-all">
                  <p className="text-xs text-muted-foreground mb-1">← 上一篇</p>
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">{previous.title}</p>
                </Link>
              ) : <div />}
              {next ? (
                <Link href={`/blog/${next.slug}`} className="group p-4 rounded-xl border border-border/50 hover:border-border hover:bg-muted/50 transition-all text-left sm:text-right">
                  <p className="text-xs text-muted-foreground mb-1">下一篇 →</p>
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">{next.title}</p>
                </Link>
              ) : <div />}
            </div>
          </nav>
        )}
      </article>
    </main>
  );
}
