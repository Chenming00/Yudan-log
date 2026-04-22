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
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // 提取所有标签
  const allTags = useMemo(() => {
    return Array.from(new Set(posts.flatMap((p) => p.tags)));
  }, [posts]);

  // 根据标签和搜索筛选
  const filteredPosts = useMemo(() => {
    let result = posts;
    
    // 标签筛选
    if (selectedTag) {
      result = result.filter((p) => p.tags.includes(selectedTag));
    }
    
    // 搜索筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((p) => 
        p.title.toLowerCase().includes(query) || 
        p.summary.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [posts, selectedTag, searchQuery]);

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

      {/* 搜索和筛选区域 */}
      <div className="space-y-6 mb-10">
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

        {/* 标签筛选 */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTag(null)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                selectedTag === null
                  ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-md shadow-primary/20"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              全部
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  selectedTag === tag
                    ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-md shadow-primary/20"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 文章列表 */}
      <div className="space-y-5">
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
