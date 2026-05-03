"use client";

import { useEffect, useRef } from "react";
import { Home, Plus, Clock } from "lucide-react";

interface LedgerBottomNavProps {
  activeView: "home" | "history";
  onViewChange: (view: "home" | "history") => void;
  onAdd: () => void;
}

export function LedgerBottomNav({ activeView, onViewChange, onAdd }: LedgerBottomNavProps) {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const updateNavHeight = () => {
      if (navRef.current) {
        const height = navRef.current.offsetHeight;
        document.documentElement.style.setProperty("--nav-height", `${height}px`);
      }
    };

    updateNavHeight();
    window.addEventListener("resize", updateNavHeight);
    return () => window.removeEventListener("resize", updateNavHeight);
  }, []);

  return (
    <nav
      ref={navRef}
      aria-label="记账底部导航"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/50 bg-white shadow-sm pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex items-center justify-around px-6 pt-2 pb-1">
        {/* 首页 */}
        <button
          onClick={() => onViewChange("home")}
          className="flex flex-col items-center justify-center gap-1 rounded-2xl px-4 py-1.5 text-[11px] font-medium transition-all active:scale-95"
        >
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
              activeView === "home" ? "bg-[#FF6B6B]/10 text-[#FF6B6B]" : "text-muted-foreground"
            }`}
          >
            <Home className={`h-4.5 w-4.5 ${activeView === "home" ? "fill-current" : ""}`} />
          </span>
          <span className={activeView === "home" ? "text-[#FF6B6B]" : "text-muted-foreground"}>
            首页
          </span>
          {activeView === "home" && (
            <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-[#FF6B6B]" />
          )}
        </button>

        {/* 记账（中间凸起按钮） */}
        <button
          onClick={onAdd}
          className="relative -mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#FF6B6B] text-white shadow-lg transition-all active:scale-95 hover:shadow-xl"
          aria-label="记一笔"
        >
          <Plus className="h-6 w-6" />
        </button>

        {/* 历史 */}
        <button
          onClick={() => onViewChange("history")}
          className="flex flex-col items-center justify-center gap-1 rounded-2xl px-4 py-1.5 text-[11px] font-medium transition-all active:scale-95"
        >
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
              activeView === "history" ? "bg-[#FF6B6B]/10 text-[#FF6B6B]" : "text-muted-foreground"
            }`}
          >
            <Clock className={`h-4.5 w-4.5 ${activeView === "history" ? "fill-current" : ""}`} />
          </span>
          <span className={activeView === "history" ? "text-[#FF6B6B]" : "text-muted-foreground"}>
            历史
          </span>
          {activeView === "history" && (
            <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-[#FF6B6B]" />
          )}
        </button>
      </div>
    </nav>
  );
}
