import { useMemo, useState } from 'react';
import { Calendar, Clock3, Search } from 'lucide-react';

interface Post {
  slug: string;
  title: string;
  date: string;
  summary: string;
  readingTime: number;
  tags: string[];
}

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays}天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`;
  return `${Math.floor(diffDays / 365)}年前`;
}

export default function BlogList({ posts }: { posts: Post[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    posts.forEach((post) => post.tags.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet);
  }, [posts]);

  const filteredPosts = useMemo(() => {
    let result = posts;

    if (selectedTag) {
      result = result.filter((post) => post.tags.includes(selectedTag));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (post) =>
          post.title.toLowerCase().includes(query) ||
          post.summary.toLowerCase().includes(query),
      );
    }

    return result;
  }, [posts, searchQuery, selectedTag]);

  return (
    <div className="max-w-4xl mx-auto">
      <header className="pt-safe pb-8">
        <div className="relative py-4">
          <h1 className="text-[26px] sm:text-3xl font-bold tracking-tight text-foreground">
            🌱 成长 Log
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            用文字记录成长的每一步
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            共 {posts.length} 篇文章
          </p>
        </div>
      </header>

      {allTags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTag(null)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              selectedTag === null
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            全部
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                selectedTag === tag
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <div className="mb-8">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="搜索文章..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full h-12 pl-12 pr-5 rounded-xl bg-card text-base placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all shadow-sm border border-border"
          />
        </div>
      </div>

      {filteredPosts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredPosts.map((post) => (
            <a key={post.slug} href={`/blog/${post.slug}`}>
              <article className="group relative h-full rounded-2xl bg-card border border-border/50 p-5 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer">
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
              </article>
            </a>
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-2xl bg-card border border-dashed border-border/50 p-10 text-center">
          <p className="font-medium text-foreground text-sm">
            {searchQuery || selectedTag ? '没有找到匹配的文章' : '还没有文章'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {searchQuery || selectedTag ? '试试换个关键词或标签' : '去写第一篇成长日志吧'}
          </p>
        </div>
      )}
    </div>
  );
}
