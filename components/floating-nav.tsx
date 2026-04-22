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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 lg:px-6"
    >
      <div className="flex w-full items-center justify-around gap-1 lg:justify-center lg:gap-3">
        {items.map((item) => {
          const isActive = item.match(pathname);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={[
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2.5 py-2 text-[11px] font-medium transition-colors duration-200 sm:min-w-[88px] sm:px-3 sm:text-xs lg:max-w-[128px]",
                isActive
                  ? "text-black"
                  : "text-gray-500 hover:text-gray-700",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-8.5 w-8.5 items-center justify-center rounded-full transition-colors",
                  isActive ? "text-black" : "text-gray-500",
                ].join(" ")}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? "fill-current" : ""}`} />
              </span>
              <span className="leading-none truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}