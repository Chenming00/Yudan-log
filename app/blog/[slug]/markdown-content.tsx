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
    <div className="prose prose-sm max-w-none text-foreground/80 leading-relaxed
      prose-headings:text-foreground prose-headings:font-semibold
      prose-h1:text-lg prose-h1:mt-6 prose-h1:mb-4 prose-h1:border-b prose-h1:border-border prose-h1:pb-2
      prose-h2:text-base prose-h2:mt-6 prose-h2:mb-3
      prose-h3:text-sm prose-h3:mt-5 prose-h3:mb-2
      prose-h4:text-sm prose-h4:mt-4 prose-h4:mb-2 prose-h4:text-muted-foreground
      prose-p:my-3 prose-p:text-sm
      prose-a:text-primary prose-a:underline prose-a:underline-offset-2
      prose-strong:text-foreground
      prose-em:text-muted-foreground
      prose-ul:my-3 prose-ol:my-3 prose-li:my-1 prose-li:text-sm
      prose-blockquote:border-border prose-blockquote:text-muted-foreground prose-blockquote:not-italic prose-blockquote:bg-muted/50 prose-blockquote:rounded-r-lg prose-blockquote:py-1
      prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none prose-code:text-foreground/80
      prose-pre:rounded-xl prose-pre:text-xs prose-pre:p-0 prose-pre:bg-transparent
      prose-hr:border-border
      prose-img:rounded-xl prose-img:shadow-sm
      prose-table:text-xs prose-th:bg-muted prose-th:text-foreground prose-td:text-foreground/80
      prose-del:text-muted-foreground">
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
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
