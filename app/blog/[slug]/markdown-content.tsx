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
    <div className="prose prose-base max-w-none text-foreground/90 leading-[1.8]
      prose-headings:text-foreground prose-headings:font-bold prose-headings:tracking-tight
      prose-h1:text-2xl prose-h1:mt-10 prose-h1:mb-6 prose-h1:border-b prose-h1:border-border prose-h1:pb-3
      prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:text-foreground
      prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3 prose-h3:text-foreground
      prose-h4:text-base prose-h4:mt-5 prose-h4:mb-2 prose-h4:text-muted-foreground prose-h4:font-semibold
      prose-p:my-4 prose-p:text-base
      prose-a:text-primary prose-a:underline prose-a:underline-offset-4 prose-a:font-medium
      prose-strong:text-foreground prose-strong:font-semibold
      prose-em:text-foreground/80 prose-em:italic
      prose-ul:my-4 prose-ol:my-4 prose-li:my-2 prose-li:text-base
      prose-blockquote:border-l-2 prose-blockquote:border-border prose-blockquote:text-muted-foreground prose-blockquote:not-italic prose-blockquote:bg-transparent prose-blockquote:pl-4 prose-blockquote:py-0 prose-blockquote:my-6
      prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-code:text-foreground prose-code:font-mono
      prose-pre:rounded-xl prose-pre:text-sm prose-pre:p-0 prose-pre:bg-transparent prose-pre:my-6
      prose-hr:border-border prose-hr:my-8
      prose-img:rounded-xl prose-img:shadow-md prose-img:my-6
      prose-table:text-sm prose-th:bg-muted prose-th:text-foreground prose-th:font-semibold prose-td:text-foreground/80 prose-table:my-6
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
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
