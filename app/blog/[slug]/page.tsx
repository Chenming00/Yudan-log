import type { Metadata } from 'next';
import Link from 'next/link';
import { getPostBySlug, getAllPosts, getAdjacentPosts } from '@/lib/blog';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Clock3 } from 'lucide-react';
import { MarkdownContent } from './markdown-content';
import { PostActions } from './post-actions';
import { TocCard } from './toc-card';
import { ReadingProgress } from './reading-progress';

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
      <ReadingProgress />
      
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Link href="/blog" className="text-muted-foreground hover:text-foreground transition-colors p-2 -ml-2 rounded-xl hover:bg-muted/80">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-foreground truncate">{post.title}</h1>
          </div>
        </div>
      </header>

      {/* 文章内容区域 - 带侧边目录布局 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex gap-8 lg:gap-12">
          {/* 主内容区 */}
          <article className="flex-1 min-w-0 py-10 pb-[calc(env(safe-area-inset-bottom)+84px)]">
            {/* 文章头部信息 */}
            <header className="mb-10">
              <div className="relative">
                <div className="absolute -left-6 top-2 w-1 h-16 bg-gradient-to-b from-primary to-primary/50 rounded-full" />
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                  {post.title}
                </h1>
              </div>
              
              <div className="mt-6 flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
                {post.date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4.5 w-4.5" />
                    <span className="font-medium">{post.date}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4.5 w-4.5" />
                  <span className="font-medium">{post.readingTime} 分钟阅读</span>
                </div>
              </div>

              {post.tags.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-gradient-to-r from-muted to-muted/80 px-3.5 py-1.5 text-xs font-medium text-muted-foreground/80">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-8 p-6 bg-gradient-to-r from-muted/60 to-muted/30 rounded-2xl border border-border/30">
                <p className="text-base text-muted-foreground leading-relaxed">
                  {post.summary}
                </p>
              </div>

              <div className="mt-6">
                <PostActions title={post.title} summary={post.summary} />
              </div>
            </header>

            {/* 目录 - 仅在小屏幕显示，默认折叠 */}
            <div className="lg:hidden mb-8">
              <TocCard headings={post.headings} defaultOpen={false} />
            </div>

            {/* 正文内容 */}
            <div className="max-w-3xl">
              <MarkdownContent content={post.content} />
            </div>

            {/* 文章底部导航 */}
            {(previous || next) && (
              <nav className="mt-16 pt-10 border-t border-border/40 max-w-3xl">
                <div className="grid gap-5 sm:grid-cols-2">
                  {previous ? (
                    <Link href={`/blog/${previous.slug}`} className="group p-5 rounded-2xl border-2 border-border/40 hover:border-primary/30 hover:bg-muted/30 transition-all">
                      <p className="text-xs font-medium text-muted-foreground mb-2">← 上一篇</p>
                      <p className="text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">{previous.title}</p>
                    </Link>
                  ) : <div />}
                  {next ? (
                    <Link href={`/blog/${next.slug}`} className="group p-5 rounded-2xl border-2 border-border/40 hover:border-primary/30 hover:bg-muted/30 transition-all text-left sm:text-right">
                      <p className="text-xs font-medium text-muted-foreground mb-2">下一篇 →</p>
                      <p className="text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">{next.title}</p>
                    </Link>
                  ) : <div />}
                </div>
              </nav>
            )}
          </article>

          {/* 侧边目录 - 仅在大屏幕显示 */}
          {post.headings.length > 0 && (
            <aside className="hidden lg:block w-64 shrink-0">
              <div className="sticky top-24 pt-4">
                <TocCard headings={post.headings} />
              </div>
            </aside>
          )}
        </div>
      </div>
    </main>
  );
}
