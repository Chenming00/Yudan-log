import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const blogDir = path.join(process.cwd(), 'content', 'blog');

export interface BlogHeading {
  level: number;
  text: string;
  id: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  summary: string;
  tags: string[];
  cover: string;
  readingTime: number;
  headings: BlogHeading[];
  content: string;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[`~!@#$%^&*()+=,[\]{}\\|;:'",.<>/?]/g, '')
    .replace(/\s+/g, '-');
}

function stripMarkdown(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getReadingTime(content: string) {
  const words = stripMarkdown(content).length;
  return Math.max(1, Math.ceil(words / 300));
}

function extractSummary(content: string, summary?: unknown) {
  if (typeof summary === 'string' && summary.trim()) return summary.trim();
  const plain = stripMarkdown(content);
  return plain.slice(0, 120) + (plain.length > 120 ? '…' : '');
}

function formatPostDate(value: unknown) {
  if (!value) return '';

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }

    return trimmed;
  }

  const parsed = new Date(String(value));
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return String(value);
}

function extractHeadings(content: string): BlogHeading[] {
  const lines = content.split(/\r?\n/);
  const headings: BlogHeading[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = /^(#{2,4})\s+(.+)$/.exec(line.trim());
    if (!match) continue;

    const text = match[2].trim();
    headings.push({
      level: match[1].length,
      text,
      id: slugify(text),
    });
  }

  return headings;
}

function normalizePost(file: string, raw: string): BlogPost {
  const { data, content } = matter(raw);
  const slug = file.replace(/\.md$/, '');

  return {
    slug,
    title: data.title || slug,
    date: formatPostDate(data.date),
    summary: extractSummary(content, data.summary),
    tags: Array.isArray(data.tags) ? data.tags.map(String).filter(Boolean) : [],
    cover: typeof data.cover === 'string' && data.cover.trim() ? data.cover.trim() : '/logo.png',
    readingTime: getReadingTime(content),
    headings: extractHeadings(content),
    content,
  };
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(blogDir)) return [];
  const files = fs.readdirSync(blogDir).filter((f) => f.endsWith('.md'));
  return files
    .map((file) => normalizePost(file, fs.readFileSync(path.join(blogDir, file), 'utf-8')))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(slug: string): BlogPost | null {
  const filePath = path.join(blogDir, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  return normalizePost(`${slug}.md`, fs.readFileSync(filePath, 'utf-8'));
}

export function getAdjacentPosts(slug: string) {
  const posts = getAllPosts();
  const index = posts.findIndex((post) => post.slug === slug);
  return {
    previous: index < posts.length - 1 ? posts[index + 1] : null,
    next: index > 0 ? posts[index - 1] : null,
  };
}
