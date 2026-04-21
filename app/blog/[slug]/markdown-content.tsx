"use client";

import ReactMarkdown from 'react-markdown';

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-stone prose-sm max-w-none text-stone-700 leading-relaxed
      prose-headings:text-stone-800 prose-headings:font-semibold
      prose-h2:text-base prose-h2:mt-6 prose-h2:mb-3
      prose-h3:text-sm prose-h3:mt-5 prose-h3:mb-2
      prose-p:my-3 prose-p:text-sm
      prose-a:text-stone-800 prose-a:underline
      prose-strong:text-stone-800
      prose-ul:my-3 prose-ol:my-3 prose-li:my-1 prose-li:text-sm
      prose-blockquote:border-stone-300 prose-blockquote:text-stone-500 prose-blockquote:not-italic
      prose-code:bg-stone-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
      prose-hr:border-stone-200
      prose-img:rounded-lg">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
