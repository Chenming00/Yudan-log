import Link from "next/link";
import { Home, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <SearchX className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">页面不存在</h1>
        <p className="text-muted-foreground mb-8">
          你访问的页面似乎走丢了
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all"
        >
          <Home className="h-4 w-4" />
          回到首页
        </Link>
      </div>
    </main>
  );
}
