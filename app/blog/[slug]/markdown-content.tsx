"use client";

import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.min.css';

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

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-lg max-w-none text-foreground/90 leading-[1.9]
      prose-headings:text-foreground prose-headings:font-bold prose-headings:tracking-tight
      prose-h1:text-3xl prose-h1:mt-12 prose-h1:mb-8 prose-h1:border-b-2 prose-h1:border-border prose-h1:pb-4
      prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-6 prose-h2:text-foreground prose-h2:relative prose-h2:pl-5 prose-h2:before:absolute prose-h2:before:left-0 prose-h2:before:top-2 prose-h2:before:w-1.5 prose-h2:before:h-6 prose-h2:before:bg-gradient-to-b prose-h2:before:from-primary prose-h2:before:to-primary/50 prose-h2:before:rounded-full
      prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4 prose-h3:text-foreground
      prose-h4:text-lg prose-h4:mt-6 prose-h4:mb-3 prose-h4:text-muted-foreground prose-h4:font-semibold
      prose-p:my-5 prose-p:text-base
      prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-a:underline-offset-4 prose-a:font-medium prose-a:transition-all
      prose-strong:text-foreground prose-strong:font-semibold
      prose-em:text-foreground/80 prose-em:italic
      prose-ul:my-5 prose-ol:my-5 prose-li:my-2.5 prose-li:text-base
      prose-pre:rounded-2xl prose-pre:text-sm prose-pre:p-0 prose-pre:bg-transparent prose-pre:my-8 prose-pre:shadow-lg
      prose-hr:border-border prose-hr:my-10 prose-hr:h-px
      prose-img:rounded-2xl prose-img:shadow-xl prose-img:my-8 prose-img:border prose-img:border-border/20
      prose-table:text-sm prose-th:bg-muted/60 prose-th:text-foreground prose-th:font-semibold prose-td:text-foreground/80 prose-table:my-8 prose-table:rounded-xl prose-table:overflow-hidden prose-table:border prose-table:border-border/30
      prose-del:text-muted-foreground prose-del:line-through">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h2: ({ children, ...props }) => {
            const id = slugify(toText(children));
            return <h2 id={id} {...props}>{children}</h2>;
          },
          h3: ({ children, ...props }) => {
            const id = slugify(toText(children));
            return <h3 id={id} {...props}>{children}</h3>;
          },
          h4: ({ children, ...props }) => {
            const id = slugify(toText(children));
            return <h4 id={id} {...props}>{children}</h4>;
          },
          a: ({ href, children, ...props }) => (
            <a href={href} target={href?.startsWith('http') ? '_blank' : undefined} rel={href?.startsWith('http') ? 'noreferrer' : undefined} {...props}>
              {children}
            </a>
          ),
          blockquote: ({ children, ...props }) => {
            // 过滤掉不适合 div 的 props
            const { cite, ...divProps } = props as any;
            return (
              <div className="bg-muted/50 rounded-xl p-4 border border-border/50 flex gap-3 my-8 leading-7" {...divProps}>
                <span className="text-2xl shrink-0">💡</span>
                <div className="text-foreground/80">{children}</div>
              </div>
            );
          },
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && !className?.includes('language-');
            return !isInline ? (
              <code className={className} {...props}>{children}</code>
            ) : (
              <code className="px-1.5 py-0.5 rounded-md bg-muted text-sm font-mono text-foreground/90 border border-border/30" {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
