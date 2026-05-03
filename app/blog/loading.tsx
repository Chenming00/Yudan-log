export default function BlogLoading() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-5 py-6 sm:px-6 sm:py-10" style={{ paddingBottom: "var(--nav-height)" }}>
        {/* 标题骨架 */}
        <div className="h-7 w-24 bg-muted rounded mb-6 animate-pulse" />

        {/* 搜索框骨架 */}
        <div className="h-10 w-full bg-muted rounded-xl mb-6 animate-pulse" />

        {/* 文章列表骨架 */}
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-card border border-border p-5 animate-pulse">
              <div className="h-4 w-3/4 bg-muted rounded mb-3" />
              <div className="h-3 w-full bg-muted rounded mb-2" />
              <div className="h-3 w-1/2 bg-muted rounded mb-3" />
              <div className="flex gap-2">
                <div className="h-5 w-14 bg-muted rounded-full" />
                <div className="h-5 w-14 bg-muted rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
