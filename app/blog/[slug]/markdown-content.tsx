'use client';

import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import 'highlight.js/styles/github.css';
import { useState, useEffect, useCallback } from 'react';
import { slugify } from '@/lib/utils';

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
      className="text-xs px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

// --- Heading with anchor link ---
function Heading({
  as: Tag,
  children,
  className,
  ...props
}: {
  as: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  children: ReactNode;
  className: string;
  [key: string]: unknown;
}) {
  const id = slugify(toText(children));
  const [copied, setCopied] = useState(false);

  const handleCopyLink = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [id]);

  return (
    <Tag id={id} className={`group relative ${className}`} {...props}>
      <button
        onClick={handleCopyLink}
        className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/50 hover:text-primary text-sm font-mono select-none"
        aria-label={`Copy link to ${toText(children)}`}
      >
        #
      </button>
      {copied && (
        <span className="absolute -left-[72px] top-1/2 -translate-y-1/2 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-md whitespace-nowrap">
          Copied!
        </span>
      )}
      {children}
    </Tag>
  );
}

// --- Image Lightbox ---
function ImageLightbox({ src, alt }: { src?: string; alt?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  if (!src) return null;

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt || ''}
        onClick={() => setOpen(true)}
        className="w-full my-6 rounded-lg cursor-zoom-in hover:opacity-90 transition-opacity"
      />
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-8 cursor-zoom-out"
          onClick={() => setOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={alt}
            src={src}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}
    </>
  );
}

// --- 主组件 ---
export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="w-full">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
        components={{
          // 标题
          h1: ({ children, ...props }) => (
            <Heading as="h1" className="text-3xl font-bold mt-10 mb-4" {...props}>{children}</Heading>
          ),
          h2: ({ children, ...props }) => (
            <Heading as="h2" className="text-2xl font-semibold mt-10 mb-4" {...props}>{children}</Heading>
          ),
          h3: ({ children, ...props }) => (
            <Heading as="h3" className="text-xl font-semibold mt-6 mb-3" {...props}>{children}</Heading>
          ),
          h4: ({ children, ...props }) => (
            <Heading as="h4" className="text-lg font-semibold mt-6 mb-2" {...props}>{children}</Heading>
          ),
          h5: ({ children, ...props }) => (
            <Heading as="h5" className="text-base font-semibold mt-4 mb-2" {...props}>{children}</Heading>
          ),
          h6: ({ children, ...props }) => (
            <Heading as="h6" className="text-sm font-semibold mt-4 mb-2 text-muted-foreground" {...props}>{children}</Heading>
          ),

          // 段落
          p: ({ node, children, ...props }) => {
            // Check if paragraph contains block-level children (e.g. images rendered as lightbox)
            const hasBlockChild = node?.children?.some(
              (child) => 'tagName' in child && child.tagName === 'img'
            );
            if (hasBlockChild) {
              return <div className="leading-7 text-muted-foreground mt-4" {...props}>{children}</div>;
            }
            return <p className="leading-7 text-muted-foreground mt-4" {...props}>{children}</p>;
          },

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

          // 强调
          strong: ({ children, ...props }) => (
            <strong className="font-bold text-foreground" {...props}>{children}</strong>
          ),
          em: ({ children, ...props }) => (
            <em className="italic text-foreground/80" {...props}>{children}</em>
          ),

          // 引用
          blockquote: ({ children, ...props }) => (
            <blockquote className="border-l-2 border-primary/30 pl-4 italic text-muted-foreground/80 my-4 bg-muted/30 rounded-r-lg py-2" {...props}>
              {children}
            </blockquote>
          ),

          // 图片 (带 lightbox)
          img: ({ alt, src, ...props }) => (
            <ImageLightbox alt={alt} src={typeof src === 'string' ? src : undefined} {...props} />
          ),

          hr: ({ ...props }) => <hr className="my-6 border-border" {...props} />,

          // 列表
          ul: ({ children, ...props }) => (
            <ul className="ml-6 mt-4 space-y-1 list-disc" {...props}>{children}</ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="ml-6 mt-4 space-y-1 list-decimal" {...props}>{children}</ol>
          ),
          li: ({ children, ...props }) => {
            // GFM task list: detect checkbox inside li
            const childArray = Array.isArray(children) ? children : [children];
            const hasCheckbox = childArray.some(
              (child) =>
                child &&
                typeof child === 'object' &&
                'type' in child &&
                (child as { type?: string }).type === 'input'
            );

            if (hasCheckbox) {
              return (
                <li className="leading-7 text-muted-foreground flex items-start gap-2 list-none -ml-6" {...props}>
                  {children}
                </li>
              );
            }

            return <li className="leading-7 text-muted-foreground" {...props}>{children}</li>;
          },
          input: ({ checked, ...props }) => (
            <span className="inline-flex items-center justify-center w-4 h-4 mt-[3px] rounded border border-border shrink-0">
              {checked && (
                <svg className="w-3 h-3 text-primary" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="2 6 5 9 10 3" />
                </svg>
              )}
            </span>
          ),

          // 表格
          table: ({ children, ...props }) => (
            <div className="my-6 overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm" {...props}>{children}</table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead className="border-b border-border bg-muted/50" {...props}>{children}</thead>
          ),
          tr: ({ children, ...props }) => (
            <tr className="border-b border-border/50 last:border-b-0" {...props}>{children}</tr>
          ),
          th: ({ children, ...props }) => (
            <th className="px-4 py-2.5 text-left font-semibold text-foreground" {...props}>{children}</th>
          ),
          td: ({ children, ...props }) => (
            <td className="px-4 py-2 text-muted-foreground" {...props}>{children}</td>
          ),

          // details / summary
          details: ({ children, ...props }) => (
            <details className="my-4 rounded-xl border border-border bg-muted/30 overflow-hidden" {...props}>
              {children}
            </details>
          ),
          summary: ({ children, ...props }) => (
            <summary className="px-4 py-3 cursor-pointer font-medium text-foreground hover:bg-muted/50 transition-colors select-none list-none [&::-webkit-details-marker]:hidden">
              <span className="inline-block mr-2 transition-transform ui-open:rotate-90">▶</span>
              {children}
            </summary>
          ),

          // 行内 code
          code: ({ className, children, ...props }) => {
            const isInline = !className;

            if (isInline) {
              return (
                <code className="bg-muted/80 px-1.5 py-0.5 rounded text-[0.85em] font-mono text-primary/90 border border-border/40" {...props}>
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
              <div className="my-6 rounded-xl overflow-hidden border border-border bg-muted/50 max-w-full">
                {/* 顶部栏 */}
                <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground bg-muted/80">
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
