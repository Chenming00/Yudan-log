import { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Clock3, Code2, Heart, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Post {
  slug: string;
  title: string;
  date: string;
  summary: string;
  readingTime: number;
  tags: string[];
}

type JournalCategory = 'stories' | 'tech' | 'all';
const technicalTags = new Set(['技术笔记', 'API 教程', '开发工具', '项目介绍', '产品日志', 'Markdown', 'AI', 'Next.js']);
const isTechnicalPost = (post: Post) => post.tags.some((tag) => technicalTags.has(tag));
const categories = [
  { value: 'stories' as const, label: '成长故事', icon: Heart },
  { value: 'tech' as const, label: '技术笔记', icon: Code2 },
  { value: 'all' as const, label: '全部', icon: BookOpen },
];

const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function PostMeta({ post }: { post: Post }) {
  return <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
    <time dateTime={post.date}>{post.date.replace(/-/g, '.')}</time>
    <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{post.readingTime} 分钟阅读</span>
  </div>;
}

export default function BlogList({ posts }: { posts: Post[] }) {
  const [category, setCategory] = useState<JournalCategory>('stories');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const counts = useMemo(() => {
    const tech = posts.filter(isTechnicalPost).length;
    return { stories: posts.length - tech, tech, all: posts.length };
  }, [posts]);
  const categoryPosts = useMemo(() => posts.filter((post) => category === 'all' || isTechnicalPost(post) === (category === 'tech')), [posts, category]);
  const allTags = useMemo(() => [...new Set(categoryPosts.flatMap((post) => post.tags))], [categoryPosts]);
  const categoryLabel = categories.find((item) => item.value === category)!.label;
  const filteredPosts = useMemo(() => categoryPosts.filter((post) => {
    if (selectedTag && !post.tags.includes(selectedTag)) return false;
    const query = searchQuery.toLowerCase().trim();
    return !query || post.title.toLowerCase().includes(query) || post.summary.toLowerCase().includes(query);
  }), [categoryPosts, searchQuery, selectedTag]);
  const isFiltering = Boolean(selectedTag || searchQuery.trim());
  const featured = !isFiltering ? filteredPosts[0] : undefined;
  const remainingPosts = featured ? filteredPosts.slice(1) : filteredPosts;

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6 sm:mb-8 sm:pb-8">
        <div>
          <p className="page-eyebrow">THE FAMILY JOURNAL</p>
          <h1 className="page-heading">成长日志</h1>
          <p className="page-description">把平凡的日子，写成值得珍藏的故事。</p>
        </div>
        <div className="flex items-center gap-3 text-primary sm:pb-1">
          <span className="hidden h-12 w-12 place-items-center rounded-full border border-primary/20 sm:grid"><BookOpen className="h-5 w-5" strokeWidth={1.4} /></span>
          <div><span className="text-lg font-medium tabular-nums sm:text-2xl">{posts.length}</span><span className="ml-2 text-xs text-muted-foreground">篇记录</span><p className="mt-0.5 hidden text-[10px] tracking-[0.14em] text-muted-foreground sm:block">LITTLE MOMENTS, BIG MEMORIES</p></div>
        </div>
      </header>

      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <nav aria-label="日志分类" className="flex w-full gap-1 rounded-2xl bg-secondary p-1 sm:w-fit">
          {categories.map(({ value, label, icon: Icon }) => <button
            key={value}
            type="button"
            aria-label={label}
            aria-pressed={category === value}
            onClick={() => { setCategory(value); setSelectedTag(null); }}
            className={`flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-medium transition-colors sm:flex-none sm:gap-2 sm:px-5 sm:text-sm ${category === value ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-primary'}`}
          ><Icon className="hidden h-4 w-4 shrink-0 min-[380px]:block" /><span className="whitespace-nowrap">{label}</span><span className={`text-[10px] tabular-nums ${category === value ? 'text-primary/70' : 'text-muted-foreground/75'}`}>{counts[value]}</span></button>)}
        </nav>
        <div className="relative lg:w-64">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" aria-label="搜索文章" placeholder={category === 'all' ? '搜索全部文章…' : `在${categoryLabel}中搜索…`} value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="h-11 rounded-xl border-border bg-card pl-10 pr-10 text-sm shadow-none" />
          {searchQuery && <button type="button" aria-label="清除搜索" onClick={() => setSearchQuery('')} className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-secondary"><X className="h-3.5 w-3.5" /></button>}
        </div>
      </div>
      <p className="mb-5 text-xs leading-6 text-muted-foreground" aria-live="polite">{category === 'stories' ? '宝宝的成长、家庭的日常，还有那些值得珍藏的小事。' : category === 'tech' ? '小站的开发记录、工具心得与使用指南。' : '成长故事与技术笔记，都收在这里。'}</p>

      {featured && <a href={`/blog/${featured.slug}`} className="group mb-9 grid overflow-hidden rounded-[24px] border border-border bg-card transition-colors hover:border-primary/35 md:grid-cols-[1fr_240px]">
        <div className="flex flex-col items-start p-6 sm:p-8">
          <span className="mb-5 inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary" />{category === 'tech' ? '最新笔记 · LATEST NOTE' : category === 'all' ? '最新一篇 · LATEST ENTRY' : '最新故事 · LATEST STORY'}</span>
          <h2 className="text-2xl font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-3xl">{featured.title}</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground line-clamp-3">{featured.summary}</p>
          <div className="mt-7 flex w-full flex-wrap items-center justify-between gap-5">
            <PostMeta post={featured} />
            <span className="inline-flex items-center gap-2 text-sm font-medium text-primary">翻开这一篇<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
          </div>
        </div>
        <div className="relative hidden flex-col justify-between border-l border-border bg-[#eee7d9] p-8 text-[#766346] md:flex" aria-hidden="true">
          <span className="text-[11px] tracking-[0.18em]">A PAGE OF OUR LIFE</span>
          <div><p className="font-serif text-[88px] leading-none tracking-[-0.06em]">{featured.date.slice(8, 10)}</p><p className="mt-2 border-t border-[#766346]/20 pt-3 text-sm tracking-[0.2em]">{months[Number(featured.date.slice(5, 7)) - 1]} / {featured.date.slice(0, 4)}</p></div>
          <span className="mt-6 text-xs">{featured.tags[0] || '生活记录'}</span>
        </div>
      </a>}

      <section aria-label="浏览成长日志">
        <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3"><h2 className="section-title">{isFiltering ? '查找结果' : category === 'stories' ? '成长故事' : category === 'tech' ? '技术笔记' : '全部记录'}</h2><span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground" aria-live="polite">{filteredPosts.length} 篇</span></div>
        </div>
        {allTags.length > 0 && <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide" aria-label="按标签筛选">
          {[null, ...allTags].map((tag) => <button key={tag || 'all'} type="button" onClick={() => setSelectedTag(tag === selectedTag ? null : tag)} aria-pressed={selectedTag === tag} className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-medium transition-colors ${selectedTag === tag ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-transparent text-muted-foreground hover:border-primary/40 hover:text-primary'}`}>{tag || '全部标签'}</button>)}
        </div>}

        {filteredPosts.length > 0 ? <div className="grid gap-x-7 sm:grid-cols-2">
          {remainingPosts.map((post, index) => <a key={post.slug} href={`/blog/${post.slug}`} className="group flex flex-col border-t border-border py-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="text-[11px] font-medium text-primary">{post.tags[0] || '生活记录'}</span>
              <span className="font-mono text-[10px] text-muted-foreground/65">{String(index + (featured ? 2 : 1)).padStart(2, '0')}</span>
            </div>
            <h3 className="text-lg font-semibold leading-relaxed tracking-tight text-foreground transition-colors group-hover:text-primary line-clamp-2">{post.title}</h3>
            <p className="mt-3 mb-6 text-sm leading-7 text-muted-foreground line-clamp-2">{post.summary}</p>
            <div className="mt-auto flex items-center justify-between gap-2"><PostMeta post={post} /><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" /></div>
          </a>)}
        </div> : <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
          <BookOpen className="mx-auto mb-4 h-8 w-8 text-primary/45" strokeWidth={1.3} />
          <p className="font-medium text-foreground">{isFiltering ? '没有找到匹配的文章' : '故事，正要开始'}</p>
          <p className="mt-2 text-sm text-muted-foreground">{isFiltering ? `试试另一个关键词，或清除${category === 'all' ? '当前' : categoryLabel + '的'}筛选。` : '第一篇成长日志，值得慢慢写。'}</p>
          {isFiltering && <Button variant="outline" className="mt-5" onClick={() => { setSearchQuery(''); setSelectedTag(null); }}><X className="h-4 w-4" />清除筛选</Button>}
        </div>}
      </section>
      <p className="mt-10 border-t border-border pt-6 text-center text-xs tracking-wide text-muted-foreground">日子很长，值得一页一页记下来。</p>
    </div>
  );
}
