'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { BlogHeading } from '@/lib/blog';

export function TocCard({ headings }: { headings: BlogHeading[] }) {
  const [isOpen, setIsOpen] = useState(false);

  if (headings.length === 0) return null;

  return (
    <div className="mb-6 rounded-2xl bg-muted/50 border-0 p-4">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={isOpen}
        aria-controls="blog-toc-content"
      >
        <p className="text-xs font-medium tracking-wide text-muted-foreground">文章目录</p>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div id="blog-toc-content" className="mt-3 space-y-2">
          {headings.map((heading) => (
            <a
              key={heading.id}
              href={`#${heading.id}`}
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              style={{ paddingLeft: `${(heading.level - 2) * 12}px` }}
              onClick={() => setIsOpen(false)}
            >
              {heading.text}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}