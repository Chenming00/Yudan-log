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
      aria-label="全局底部导航"
      className="border-t border-stone-200/80 bg-stone-50/95 px-4 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 backdrop-blur-sm"
    >
      <div className="mx-auto flex w-full max-w-xl items-center justify-around gap-1">
        {items.map((item) => {
          const isActive = item.match(pathname);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={[
                "flex min-w-[88px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-xs font-medium transition-colors duration-200",
                isActive
                  ? "bg-white text-stone-800"
                  : "text-stone-500 hover:bg-stone-100/80 active:bg-stone-100",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-8.5 w-8.5 items-center justify-center rounded-full transition-colors",
                  isActive ? "bg-stone-100 text-stone-800" : "text-stone-600",
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