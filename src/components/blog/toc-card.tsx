'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, BookOpen } from 'lucide-react';

interface BlogHeading {
  level: number;
  text: string;
  id: string;
}

export function TocCard({ headings, defaultOpen = true }: { headings: BlogHeading[]; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
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
    <div className="flex max-h-[calc(100vh-8rem-var(--nav-height))] flex-col overflow-hidden rounded-2xl border border-border/50 bg-card p-5">
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
        <div id="blog-toc-content" className="mt-4 min-h-0 flex-1 space-y-0.5 overflow-y-auto border-t border-border/30 pt-3 pr-1 pb-1 scrollbar-hide">
          {headings.map((heading) => (
            <a
              key={heading.id}
              href={`#${heading.id}`}
              className={`block text-sm py-2 min-h-[40px] flex items-center rounded-xl transition-all duration-200 ${
                activeId === heading.id
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 active:bg-muted/60'
              }`}
              style={{ paddingLeft: `${(heading.level - 2) * 16 + (activeId === heading.id ? 8 : 12)}px`, paddingRight: '8px' }}
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
