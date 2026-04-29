import { getAllPosts, stripMarkdown } from '../lib/blog';
import { getCachedSummary, saveSummary } from '../lib/blog-summaries';

const MIMO_BASE_URL = process.env.MIMO_BASE_URL || '';
const MIMO_API_KEY = process.env.MIMO_API_KEY || '';
const MODEL = 'mimo-v2.5';

async function generateSummary(title: string, content: string): Promise<string> {
  const plainText = stripMarkdown(content).slice(0, 3000);

  const endpoint = MIMO_BASE_URL.replace(/\/+$/, '').endsWith('/v1/chat/completions')
    ? MIMO_BASE_URL.replace(/\/+$/, '')
    : `${MIMO_BASE_URL.replace(/\/+$/, '')}/v1/chat/completions`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MIMO_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      messages: [
        {
          role: 'system',
          content:
            '你是一个文章总结助手。请用中文对以下文章进行总结，要求简洁、有洞察力，用 3-5 个要点概括文章核心内容。不要使用 markdown 格式，直接输出纯文本。',
        },
        {
          role: 'user',
          content: `文章标题：${title}\n\n文章内容：\n${plainText}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`MIMO API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const summary = data.choices?.[0]?.message?.content;
  if (!summary) throw new Error('No summary in response');
  return summary.trim();
}

async function main() {
  if (!MIMO_BASE_URL || !MIMO_API_KEY) {
    console.log('⏭️  MIMO_BASE_URL or MIMO_API_KEY not set, skipping summary generation');
    return;
  }

  const posts = getAllPosts();
  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const post of posts) {
    const cached = getCachedSummary(post.slug);
    if (cached) {
      skipped++;
      continue;
    }

    try {
      console.log(`⏳ Generating summary for: ${post.title}`);
      const summary = await generateSummary(post.title, post.content);
      saveSummary(post.slug, summary, MODEL);
      generated++;
      console.log(`✅ Done: ${post.title}`);
    } catch (err) {
      failed++;
      console.error(`❌ Failed: ${post.title}`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\n📊 Summary generation complete: ${generated} generated, ${skipped} skipped, ${failed} failed`);

  if (generated > 0) {
    try {
      const { execSync } = await import('child_process');
      execSync('git add content/blog-summaries/', { cwd: process.cwd(), stdio: 'pipe' });
      execSync(`git commit -m "chore: auto-generate ${generated} blog summary(ies)"`, { cwd: process.cwd(), stdio: 'pipe' });
      try {
        execSync('git push', { cwd: process.cwd(), stdio: 'pipe' });
        console.log('🚀 Committed and pushed summaries to git');
      } catch {
        console.log('📝 Committed summaries to git (push skipped — may need manual push)');
      }
    } catch (err) {
      console.warn('⚠️  Failed to commit summaries:', err instanceof Error ? err.message : err);
    }
  }
}

main();
