"use client";

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-stone prose-sm max-w-none text-stone-700 leading-relaxed
      prose-headings:text-stone-800 prose-headings:font-semibold
      prose-h1:text-lg prose-h1:mt-6 prose-h1:mb-4 prose-h1:border-b prose-h1:border-stone-200 prose-h1:pb-2
      prose-h2:text-base prose-h2:mt-6 prose-h2:mb-3
      prose-h3:text-sm prose-h3:mt-5 prose-h3:mb-2
      prose-h4:text-sm prose-h4:mt-4 prose-h4:mb-2 prose-h4:text-stone-600
      prose-p:my-3 prose-p:text-sm
      prose-a:text-blue-600 prose-a:underline prose-a:underline-offset-2
      prose-strong:text-stone-800
      prose-em:text-stone-600
      prose-ul:my-3 prose-ol:my-3 prose-li:my-1 prose-li:text-sm
      prose-blockquote:border-stone-300 prose-blockquote:text-stone-500 prose-blockquote:not-italic prose-blockquote:bg-stone-50 prose-blockquote:rounded-r-lg prose-blockquote:py-1
      prose-code:bg-stone-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none prose-code:text-stone-700
      prose-pre:bg-stone-900 prose-pre:text-stone-100 prose-pre:rounded-xl prose-pre:text-xs
      prose-hr:border-stone-200
      prose-img:rounded-xl prose-img:shadow-sm
      prose-table:text-xs prose-th:bg-stone-100 prose-th:text-stone-700 prose-td:text-stone-600
      prose-del:text-stone-400">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
