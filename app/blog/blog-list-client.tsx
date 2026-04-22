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

export function BlogListClient({ posts }: BlogListClientProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // 根据搜索筛选
  const filteredPosts = useMemo(() => {
    let result = posts;
    
    // 搜索筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((p) => 
        p.title.toLowerCase().includes(query) || 
        p.summary.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [posts, searchQuery]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* 头部区域 */}
      <header className="pt-safe pb-10">
        <div className="relative">
          <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-12 bg-gradient-to-b from-primary to-primary/50 rounded-full" />
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            🌱 成长 Log
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            用文字记录成长的每一步
          </p>
        </div>
      </header>

      {/* 搜索区域 */}
      <div className="mb-10">
        {/* 搜索框 */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="搜索文章..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-5 rounded-2xl border-2 border-border/60 bg-white text-base placeholder:text-muted-foreground/60 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm"
          />
        </div>
      </div>

      {/* 文章列表 */}
      <div className="space-y-8">
        {filteredPosts.map((post, index) => (
          <Link key={post.slug} href={`/blog/${post.slug}`}>
            <article className="group relative rounded-3xl bg-white border border-border/40 p-7 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 hover:-translate-y-1 cursor-pointer overflow-hidden">
              {/* 装饰元素 */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
                  {post.title}
                </h2>
                <p className="mt-4 text-base text-muted-foreground/90 line-clamp-2 leading-relaxed">
                  {post.summary}
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4.5 w-4.5" />
                    <span className="font-medium">{post.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-4.5 w-4.5" />
                    <span className="font-medium">{post.readingTime} 分钟</span>
                  </div>
                </div>
                {post.tags.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-gradient-to-r from-muted to-muted/80 px-3.5 py-1.5 text-xs font-medium text-muted-foreground/80"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </article>
          </Link>
        ))}
      </div>

      {filteredPosts.length === 0 && (
        <div className="mt-14 rounded-3xl bg-white border border-border/40 p-14 text-center">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-muted-foreground text-base">
            {searchQuery ? "没有找到匹配的文章" : "暂无文章"}
          </p>
        </div>
      )}
    </div>
  );
}
