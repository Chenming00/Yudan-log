import { getCollection, type CollectionEntry } from 'astro:content';

export interface BlogCardPost {
  slug: string;
  title: string;
  date: string;
  summary: string;
  tags: string[];
  cover: string;
  readingTime: number;
}

export function stripMarkdown(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getReadingTime(content: string) {
  const words = stripMarkdown(content).length;
  return Math.max(1, Math.ceil(words / 300));
}

function getSummary(entry: CollectionEntry<'blog'>) {
  if (entry.data.summary?.trim()) return entry.data.summary.trim();
  const plain = stripMarkdown(entry.body ?? '');
  return plain.slice(0, 120) + (plain.length > 120 ? '…' : '');
}

export function toBlogCardPost(entry: CollectionEntry<'blog'>): BlogCardPost {
  return {
    slug: entry.id,
    title: entry.data.title,
    date: entry.data.date.toISOString().slice(0, 10),
    summary: getSummary(entry),
    tags: entry.data.tags,
    cover: entry.data.cover || '/logo.png',
    readingTime: getReadingTime(entry.body ?? ''),
  };
}

export async function getBlogEntries() {
  return (await getCollection('blog')).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );
}

export async function getBlogCardPosts() {
  return (await getBlogEntries()).map(toBlogCardPost);
}

export async function getAdjacentBlogPosts(slug: string) {
  const posts = await getBlogEntries();
  const index = posts.findIndex((post) => post.id === slug);
  return {
    previous: index < posts.length - 1 ? toBlogCardPost(posts[index + 1]) : null,
    next: index > 0 ? toBlogCardPost(posts[index - 1]) : null,
  };
}
