import type { Metadata } from 'next';
import Link from 'next/link';
import { getPostBySlug, getAllPosts, getAdjacentPosts } from '@/lib/blog';
import { getCachedSummary } from '@/lib/blog-summaries';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Clock3 } from 'lucide-react';
import { MarkdownContent } from './markdown-content';
import { PostActions } from './post-actions';
import { TocCard } from './toc-card';
import { ReadingProgress } from './reading-progress';
import { AiSummary } from './ai-summary';
import { AiChat } from './ai-chat';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.BASE_URL || 'http://localhost:3000';

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
  const cachedSummary = getCachedSummary(slug);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.summary,
    image: post.cover ? `${siteUrl}${post.cover}` : undefined,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      '@type': 'Person',
      name: '鱼蛋宝宝',
    },
    publisher: {
      '@type': 'Organization',
      name: '鱼蛋宝宝',
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteUrl}/blog/${post.slug}`,
    },
  };

  return (
    <main className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ReadingProgress />
      
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-50 glass-effect border-b border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center gap-3">
          <Link href="/blog" className="text-muted-foreground hover:text-foreground transition-colors p-2 -ml-2 rounded-xl hover:bg-muted/80 active:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-foreground truncate">{post.title}</h1>
          </div>
        </div>
      </header>

      {/* 文章内容区域 - 带侧边目录布局 */}
      <div className="max-w-7xl mx-auto px-5 sm:px-6">
        <div className="flex gap-8 lg:gap-12">
          {/* 主内容区 */}
          <article className="flex-1 min-w-0 py-6 sm:py-10 pb-[calc(var(--nav-height)+40px)]">
            {/* 文章头部信息 */}
            <header className="mb-8 sm:mb-10">
              <h1 className="text-[26px] sm:text-3xl lg:text-[40px] font-bold text-foreground leading-tight tracking-tight">
                {post.title}
              </h1>
              
              <div className="mt-4 sm:mt-5 flex flex-wrap items-center gap-3 sm:gap-5 text-xs sm:text-sm text-muted-foreground">
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
                <div className="mt-3 sm:mt-4 flex flex-wrap gap-1.5 sm:gap-2">
                  {post.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-muted/80 px-2.5 py-1 text-xs font-medium text-muted-foreground/80 border border-border/30">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* 摘要 - 明确区分 */}
              <div className="mt-6 sm:mt-8 border-l-[3px] border-primary/40 pl-4 sm:pl-5 py-1">
                <p className="text-[11px] uppercase tracking-widest font-semibold text-primary/70 mb-2">
                  摘要
                </p>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {post.summary}
                </p>
              </div>

              {/* AI 总结 */}
              <AiSummary slug={post.slug} initialSummary={cachedSummary?.summary} />

            </header>

            {/* 目录 - 仅在小屏幕显示，默认折叠 */}
            <div className="lg:hidden mb-8">
              <TocCard headings={post.headings} defaultOpen={false} />
            </div>

            {/* 正文内容 */}
            <div className="max-w-full sm:max-w-3xl">
              <MarkdownContent content={post.content} />
            </div>

            {/* 文章问答 */}
            <AiChat slug={post.slug} />

            {/* 分享与复制 */}
            <div className="mt-12 sm:mt-16 pt-8 sm:pt-10 border-t border-border/40 max-w-full sm:max-w-3xl">
              <p className="text-sm font-medium text-muted-foreground mb-4">分享文章</p>
              <PostActions title={post.title} summary={post.summary} />
            </div>

            {/* 文章底部导航 */}
            {(previous || next) && (
              <nav className="mt-12 sm:mt-16 pt-8 sm:pt-10 border-t border-border/40 max-w-full sm:max-w-3xl">
                <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2">
                  {previous ? (
                    <Link href={`/blog/${previous.slug}`} className="group p-4 sm:p-5 rounded-2xl border-2 border-border/40 hover:border-primary/30 hover:bg-muted/30 active:bg-muted/40 transition-all">
                      <p className="text-xs font-medium text-muted-foreground mb-1.5 sm:mb-2">← 上一篇</p>
                      <p className="text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">{previous.title}</p>
                    </Link>
                  ) : <div />}
                  {next ? (
                    <Link href={`/blog/${next.slug}`} className="group p-4 sm:p-5 rounded-2xl border-2 border-border/40 hover:border-primary/30 hover:bg-muted/30 active:bg-muted/40 transition-all text-left sm:text-right">
                      <p className="text-xs font-medium text-muted-foreground mb-1.5 sm:mb-2">下一篇 →</p>
                      <p className="text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">{next.title}</p>
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
