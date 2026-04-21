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
      className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+16px)] z-50"
    >
      <div className="flex flex-col gap-3 rounded-3xl border border-stone-200/80 bg-white/88 p-3 shadow-[0_12px_32px_rgba(0,0,0,0.12)] backdrop-blur-md">
        {items.map((item) => {
          const isActive = item.match(pathname);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={[
                "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-stone-900 text-white shadow-sm"
                  : "bg-stone-50 text-stone-600 hover:bg-stone-100 active:bg-stone-200",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                  isActive ? "bg-white/15" : "bg-white text-stone-700",
                ].join(" ")}
              >
                <Icon className="h-4.5 w-4.5" />
              </span>
              <span className="pr-1 leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}