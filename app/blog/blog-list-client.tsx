"use client";

import Link from "next/link";
import { Calendar, Clock3 } from "lucide-react";
import { useState } from "react";

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

  // 提取所有标签
  const allTags = Array.from(new Set(posts.flatMap((p) => p.tags)));

  // 根据标签筛选
  const filteredPosts = selectedTag
    ? posts.filter((p) => p.tags.includes(selectedTag))
    : posts;

  return (
    <div>
      {/* 头部 */}
      <header className="flex items-center justify-between pt-safe pb-2">
        <h1 className="text-lg font-medium tracking-tight pt-4 text-foreground">
          🌱 成长 Log
        </h1>
      </header>

      {/* 标签筛选 */}
      {allTags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
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

      {/* 文章列表 */}
      <div className="mt-6 space-y-3">
        {filteredPosts.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`}>
            <div className="rounded-2xl bg-white shadow-sm p-4 transition-all hover:bg-accent active:bg-accent/80 cursor-pointer">
              <h2 className="text-base font-semibold text-foreground leading-tight">
                {post.title}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                {post.summary}
              </p>
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{post.date}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  <span>{post.readingTime} 分钟</span>
                </div>
              </div>
              {post.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {filteredPosts.length === 0 && (
        <div className="mt-8 rounded-2xl bg-white shadow-sm p-8 text-center">
          <p className="text-muted-foreground text-sm">暂无文章</p>
        </div>
      )}
    </div>
  );
}
