import fs from 'fs';
import path from 'path';

const summariesDir = path.join(process.cwd(), 'content', 'blog-summaries');

export interface CachedSummary {
  slug: string;
  summary: string;
  generatedAt: string;
  model: string;
}

export function getCachedSummary(slug: string): CachedSummary | null {
  const filePath = path.join(summariesDir, `${slug}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (typeof data.summary === 'string' && data.summary.trim()) {
      return data as CachedSummary;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveSummary(slug: string, summary: string, model: string): void {
  if (!fs.existsSync(summariesDir)) {
    fs.mkdirSync(summariesDir, { recursive: true });
  }
  const data: CachedSummary = {
    slug,
    summary: summary.trim(),
    generatedAt: new Date().toISOString(),
    model,
  };
  fs.writeFileSync(
    path.join(summariesDir, `${slug}.json`),
    JSON.stringify(data, null, 2) + '\n',
    'utf-8',
  );
}
