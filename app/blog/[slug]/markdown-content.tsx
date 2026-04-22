'use client';

import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import { useState } from 'react';

// --- 辅助函数 ---
function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[`~!@#$%^&*()+=,[\]{}\\|;:'",.<>/?]/g, '')
    .replace(/\s+/g, '-');
}

function toText(children: ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(toText).join('');
  if (children && typeof children === 'object' && 'props' in children) {
    return toText((children as { props?: { children?: ReactNode } }).props?.children);
  }
  return '';
}

// --- Copy Button ---
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 transition"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

// --- 主组件 ---
export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // 标题
          h1: ({ children, ...props }) => {
            const id = slugify(toText(children));
            return <h1 id={id} className="text-3xl font-bold mt-10 mb-4" {...props}>{children}</h1>;
          },
          h2: ({ children, ...props }) => {
            const id = slugify(toText(children));
            return <h2 id={id} className="text-2xl font-semibold mt-10 mb-4" {...props}>{children}</h2>;
          },
          h3: ({ children, ...props }) => {
            const id = slugify(toText(children));
            return <h3 id={id} className="text-xl font-semibold mt-6 mb-2" {...props}>{children}</h3>;
          },

          // 段落
          p: ({ children, ...props }) => (
            <p className="leading-7 text-muted-foreground mt-4" {...props}>{children}</p>
          ),

          // 链接
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              target={href?.startsWith('http') ? '_blank' : undefined}
              rel={href?.startsWith('http') ? 'noreferrer noopener' : undefined}
              className="text-primary underline underline-offset-4 hover:opacity-80 transition"
              {...props}
            >
              {children}
            </a>
          ),

          // 引用
          blockquote: ({ children, ...props }) => (
            <blockquote className="border-l-2 border-border pl-4 italic text-muted-foreground my-4" {...props}>
              {children}
            </blockquote>
          ),

          // 图片
          img: ({ alt, ...props }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={alt} className="rounded-lg my-6 w-full object-cover" {...props} />
          ),

          hr: ({ ...props }) => <hr className="my-6 border-border" {...props} />,

          // 列表
          ul: ({ children, ...props }) => (
            <ul className="ml-6 mt-4 space-y-1 list-disc" {...props}>{children}</ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="ml-6 mt-4 space-y-1 list-decimal" {...props}>{children}</ol>
          ),
          li: ({ children, ...props }) => (
            <li className="leading-7 text-muted-foreground" {...props}>{children}</li>
          ),

          // 表格
          table: ({ children, ...props }) => (
            <div className="my-6 overflow-x-auto">
              <table className="w-full text-sm" {...props}>{children}</table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead className="border-b border-border" {...props}>{children}</thead>
          ),
          tr: ({ children, ...props }) => (
            <tr className="border-b border-border/50" {...props}>{children}</tr>
          ),
          th: ({ children, ...props }) => (
            <th className="px-4 py-2 text-left font-medium" {...props}>{children}</th>
          ),
          td: ({ children, ...props }) => (
            <td className="px-4 py-2 text-muted-foreground" {...props}>{children}</td>
          ),

          // 行内 code
          code: ({ className, children, ...props }) => {
            const isInline = !className;

            if (isInline) {
              return (
                <code className="bg-muted px-1.5 py-0.5 rounded text-sm" {...props}>
                  {children}
                </code>
              );
            }

            return <code className={className} {...props}>{children}</code>;
          },

           // 代码块（带 Copy + 语言）
           pre: ({ children, ...props }) => {
             const codeChild = (children as unknown as { props?: { children?: ReactNode; className?: string } })?.props;
             const rawCode = toText(codeChild?.children);
             const language = codeChild?.className?.replace('language-', '') || 'text';

            return (
              <div className="my-6 rounded-lg overflow-hidden border border-border bg-[#f6f8fa] dark:bg-[#0d1117]">
                {/* 顶部栏 */}
                <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-600 dark:text-muted-foreground bg-gray-100 dark:bg-muted/10">
                  <span className="uppercase tracking-wide">{language}</span>
                  <CopyButton text={rawCode} />
                </div>

                {/* 代码内容 */}
                <pre className="p-4 overflow-x-auto text-sm leading-relaxed" {...props}>
                  {children}
                </pre>
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
