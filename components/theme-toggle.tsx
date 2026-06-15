"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun, Monitor } from "lucide-react";

type Theme = "light" | "dark" | "system";

const ORDER: Theme[] = ["light", "dark", "system"];
const LABELS: Record<Theme, string> = {
  light: "浅色",
  dark: "深色",
  system: "跟随系统",
};

function systemPrefersDark() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? (systemPrefersDark() ? "dark" : "light") : theme;
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

// 把 localStorage 当作外部数据源，避免 effect 内同步 setState
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("themechange", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("themechange", callback);
  };
}

function getSnapshot(): Theme {
  return (localStorage.getItem("theme") as Theme | null) ?? "system";
}

function getServerSnapshot(): Theme {
  return "system";
}

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // 主题变化时更新 <html> class（操作外部 DOM，非 setState）
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // 跟随系统模式下，监听系统主题变化并实时应用
  useEffect(() => {
    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [theme]);

  const cycle = () => {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    localStorage.setItem("theme", next);
    applyTheme(next);
    window.dispatchEvent(new Event("themechange"));
  };

  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <button
      onClick={cycle}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95 ${className}`}
      aria-label={`主题：${LABELS[theme]}（点击切换）`}
      title={`主题：${LABELS[theme]}`}
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}
