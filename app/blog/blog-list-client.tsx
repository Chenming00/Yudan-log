"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Calendar, ChevronRight, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { BlogPost } from '@/lib/blog';

export function BlogListClient({ posts }: { posts: BlogPost[] }) {
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  const tags = useMemo(
    () => Array.from(new Set(posts.flatMap((post) => post.tags))).filter(Boolean),
    [posts]
  );

  const filteredPosts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return posts.filter((post) => {
      const matchesSearch =
        !keyword ||
        post.title.toLowerCase().includes(keyword) ||
        post.summary.toLowerCase().includes(keyword) ||
        post.tags.some((tag) => tag.toLowerCase().includes(keyword));
      const matchesTag = !selectedTag || post.tags.includes(selectedTag);
      return matchesSearch && matchesTag;
    });
  }, [posts, search, selectedTag]);

  return (
    <div className="page-padding mx-auto mt-4 max-w-4xl space-y-4">
      <div className="space-y-3">
        <div className="flex items-center gap-3 bg-stone-50 rounded-xl border border-stone-200/70 px-4 py-2.5">
          <Search className="h-4 w-4 text-stone-400 shrink-0" />
          <input
            type="text"
            placeholder="搜索标题、摘要或标签"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400 text-stone-700"
          />
        </div>

        {tags.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedTag('')}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${
                !selectedTag ? 'bg-stone-800 border-stone-800 text-white' : 'bg-stone-50 border-stone-200 text-stone-500'
              }`}
            >
              全部标签
            </button>
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${
                  selectedTag === tag ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-stone-50 border-stone-200 text-stone-500'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-stone-400">
          <span>共 {filteredPosts.length} 篇日志</span>
          {(search || selectedTag) && (
            <button className="text-stone-500" onClick={() => { setSearch(''); setSelectedTag(''); }}>
              清空筛选
            </button>
          )}
        </div>
      </div>

      {filteredPosts.length === 0 ? (
        <Card className="border-stone-200/70 shadow-none">
          <CardContent className="text-center py-12 text-stone-400 text-sm">
            <p className="text-3xl mb-3">📝</p>
            没找到匹配的日志，试试换个关键词或标签。
          </CardContent>
        </Card>
      ) : (
        filteredPosts.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`}>
            <Card className="mb-3 border-stone-200/70 shadow-none transition-all hover:bg-stone-50 active:bg-stone-100 cursor-pointer">
              <CardContent className="flex items-start gap-3 px-4 py-4 sm:px-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-stone-400 mb-1.5">
                    <Calendar className="h-3 w-3 text-stone-300" />
                    <span>{post.date}</span>
                    <span>·</span>
                    <span>{post.readingTime} 分钟阅读</span>
                  </div>
                  <h2 className="font-medium text-base text-stone-800">{post.title}</h2>
                  <p className="mt-2 text-sm text-stone-500 line-clamp-2">{post.summary}</p>
                  {post.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] text-stone-500">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-stone-300 flex-shrink-0 mt-1" />
              </CardContent>
            </Card>
          </Link>
        ))
      )}
    </div>
  );
}