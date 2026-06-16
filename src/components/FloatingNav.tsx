import { useEffect, useRef } from 'react';
import { BookOpen, Home, Wallet } from 'lucide-react';
import { ThemeToggle } from '../../components/theme-toggle';

const items = [
  {
    href: '/',
    label: 'Home',
    icon: Home,
    match: (pathname: string) => pathname === '/',
  },
  {
    href: '/ledger',
    label: '账本',
    icon: Wallet,
    match: (pathname: string) => pathname.startsWith('/ledger'),
  },
  {
    href: '/blog',
    label: 'Log',
    icon: BookOpen,
    match: (pathname: string) => pathname.startsWith('/blog'),
  },
];

export default function FloatingNav({ activePath }: { activePath: string }) {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const updateNavHeight = () => {
      if (navRef.current) {
        document.documentElement.style.setProperty('--nav-height', `${navRef.current.offsetHeight}px`);
      }
    };

    updateNavHeight();
    window.addEventListener('resize', updateNavHeight);
    return () => window.removeEventListener('resize', updateNavHeight);
  }, []);

  return (
    <nav
      ref={navRef}
      aria-label="全局底部导航"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/50 bg-card/95 shadow-sm px-3 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur lg:px-6"
    >
      <div className="flex w-full items-center justify-around gap-1 lg:justify-center lg:gap-3">
        {items.map((item) => {
          const isActive = item.match(activePath);
          const Icon = item.icon;

          return (
            <a
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={[
                'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2.5 py-2 text-[11px] font-medium transition-all duration-200 active:scale-95 sm:min-w-[88px] sm:px-3 sm:text-xs lg:max-w-[128px]',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              <span
                className={[
                  'flex h-8.5 w-8.5 items-center justify-center rounded-full transition-all duration-200',
                  isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
                ].join(' ')}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? 'fill-current' : ''}`} />
              </span>
              <span className="leading-none truncate">{item.label}</span>
              {isActive && (
                <span className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
              )}
            </a>
          );
        })}
        <div className="flex min-w-0 flex-1 items-center justify-center sm:min-w-[88px] lg:max-w-[128px]">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
