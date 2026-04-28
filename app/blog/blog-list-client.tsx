"use client";

import Link from "next/link";
import { Calendar, Clock3, Search } from "lucide-react";
import { useState, useMemo } from "react";

interface Post {
  slug: string;
  title: string;
  date: string;
  summary: string;
  readingTime: number;
  tags: string[];
}

interface BlogListClientProps {
  posts: Post[];
}

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "今天";
  if (diffDays === 1) return "昨天";
  if (diffDays < 7) return `${diffDays}天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`;
  return `${Math.floor(diffDays / 365)}年前`;
}

export function BlogListClient({ posts }: BlogListClientProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPosts = useMemo(() => {
    let result = posts;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.summary.toLowerCase().includes(query)
      );
    }

    return result;
  }, [posts, searchQuery]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* 头部区域 */}
      <header className="pt-safe pb-8">
        <div className="relative rounded-2xl bg-gradient-to-br from-primary/10 via-emerald-50 to-teal-50 p-6 overflow-hidden">
          {/* 装饰性圆形 */}
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-primary/5" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-emerald-100/40" />

          <div className="relative">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              🌱 成长 Log
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              用文字记录成长的每一步
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              共 {posts.length} 篇文章
            </p>
          </div>
        </div>
      </header>

      {/* 搜索区域 */}
      <div className="mb-8">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="搜索文章..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-5 rounded-xl bg-card text-base placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm border border-border"
          />
        </div>
      </div>

      {/* 文章列表 - 双列网格 */}
      {filteredPosts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredPosts.map((post, index) => (
            <Link key={post.slug} href={`/blog/${post.slug}`}>
              <article className="group relative h-full rounded-2xl bg-card border border-border p-5 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
                {/* 序号装饰 */}
                <span className="absolute top-4 right-4 text-5xl font-bold text-foreground/[0.04] leading-none select-none">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div className="relative">
                  <h2 className="text-base sm:text-lg font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h2>
                  <p className="mt-2.5 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {post.summary}
                  </p>

                  {post.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{getRelativeTime(post.date)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock3 className="h-3.5 w-3.5" />
                      <span>{post.readingTime} 分钟</span>
                    </div>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-2xl bg-card border border-dashed border-border p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-4">
            <span className="text-2xl">
              {searchQuery ? "🔍" : "📭"}
            </span>
          </div>
          <p className="font-medium text-foreground text-sm">
            {searchQuery ? "没有找到匹配的文章" : "还没有文章"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {searchQuery
              ? "试试换个关键词搜索吧"
              : "去写第一篇成长日志吧 ✍️"}
          </p>
        </div>
      )}
    </div>
  );
}