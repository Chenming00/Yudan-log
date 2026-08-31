'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

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
    <Card className="flex max-h-[calc(100vh-8rem-var(--nav-height))] flex-col overflow-hidden p-5">
      <Button
        type="button"
        variant="ghost"
        onClick={() => setIsOpen((open) => !open)}
        className="group h-auto w-full justify-between p-0 text-left hover:bg-transparent"
        aria-expanded={isOpen}
        aria-controls="blog-toc-content"
      >
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-4.5 w-4.5 text-primary" />
          <p className="text-base font-semibold text-foreground">文章目录</p>
        </div>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 group-hover:text-foreground ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div id="blog-toc-content" className="mt-4 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1 pb-1 scrollbar-hide">
          <Separator className="mb-3" />
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
    </Card>
  );
}
