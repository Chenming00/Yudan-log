'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, BookOpen } from 'lucide-react';
import type { BlogHeading } from '@/lib/blog';

export function TocCard({ headings }: { headings: BlogHeading[] }) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeId, setActiveId] = useState<string>('');

  // 监听滚动，高亮当前激活的标题
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );

    headings.forEach((heading) => {
      const element = document.getElementById(heading.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-white to-muted/20 p-5 shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center justify-between gap-3 text-left group"
        aria-expanded={isOpen}
        aria-controls="blog-toc-content"
      >
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-4.5 w-4.5 text-primary" />
          <p className="text-base font-semibold text-foreground">文章目录</p>
        </div>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 group-hover:text-foreground ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div id="blog-toc-content" className="mt-4 space-y-1.5 border-t border-border/30 pt-4">
          {headings.map((heading) => (
            <a
              key={heading.id}
              href={`#${heading.id}`}
              className={`block text-sm py-1.5 rounded-lg transition-all duration-200 ${
                activeId === heading.id
                  ? 'bg-primary/10 text-primary font-medium pl-3'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              style={{ paddingLeft: `${(heading.level - 2) * 16 + (activeId === heading.id ? 0 : 12)}px` }}
              onClick={() => setIsOpen(true)}
            >
              {heading.text}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
