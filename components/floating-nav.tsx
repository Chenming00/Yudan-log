"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Home, Wallet } from "lucide-react";

const items = [
  {
    href: "/",
    label: "Home",
    icon: Home,
    match: (pathname: string) => pathname === "/",
  },
  {
    href: "/ledger",
    label: "账本",
    icon: Wallet,
    match: (pathname: string) => pathname.startsWith("/ledger"),
  },
  {
    href: "/blog",
    label: "Log",
    icon: BookOpen,
    match: (pathname: string) => pathname.startsWith("/blog"),
  },
];

export function FloatingNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="全局悬浮导航"
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)]"
    >
      <div className="mx-auto flex w-full max-w-xl items-center justify-around rounded-[28px] border border-stone-200/80 bg-white/92 px-2 py-2 shadow-[0_-8px_30px_rgba(15,23,42,0.10)] backdrop-blur-md">
        {items.map((item) => {
          const isActive = item.match(pathname);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={[
                "flex min-w-[88px] flex-1 flex-col items-center justify-center gap-1.5 rounded-[20px] px-3 py-2.5 text-xs font-medium transition-all duration-200",
                isActive
                  ? "bg-stone-900 text-white shadow-sm"
                  : "text-stone-500 hover:bg-stone-100/90 active:bg-stone-200/80",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                  isActive ? "bg-white/15" : "bg-stone-100 text-stone-700",
                ].join(" ")}
              >
                <Icon className="h-4.5 w-4.5" />
              </span>
              <span className="leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}