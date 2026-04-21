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
    <div className="max-w-3xl mx-auto">
      {/* 头部区域 */}
      <header className="pt-safe pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          🌱 成长 Log
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          用文字记录成长的每一步
        </p>
      </header>

      {/* 搜索和筛选区域 */}
      <div className="space-y-4">
        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索文章..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-white text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
          />
        </div>

        {/* 标签筛选 */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTag(null)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedTag === null
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              全部
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedTag === tag
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 文章列表 */}
      <div className="mt-10 space-y-6">
        {filteredPosts.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`}>
            <article className="group rounded-2xl bg-white border border-border/50 p-6 transition-all hover:shadow-lg hover:border-border hover:-translate-y-0.5 cursor-pointer">
              <h2 className="text-xl font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">
                {post.title}
              </h2>
              <p className="mt-3 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {post.summary}
              </p>
              <div className="mt-5 flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>{post.date}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock3 className="h-4 w-4" />
                  <span>{post.readingTime} 分钟</span>
                </div>
              </div>
              {post.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-muted/70 px-3 py-1 text-xs text-muted-foreground"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </article>
          </Link>
        ))}
      </div>

      {filteredPosts.length === 0 && (
        <div className="mt-12 rounded-2xl bg-white border border-border/50 p-12 text-center">
          <p className="text-muted-foreground text-sm">
            {searchQuery ? "没有找到匹配的文章" : "暂无文章"}
          </p>
        </div>
      )}
    </div>
  );
}
