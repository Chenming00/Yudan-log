export default function Loading() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-5 py-6 sm:px-6 sm:py-10" style={{ paddingBottom: "var(--nav-height)" }}>
        {/* 问候骨架 */}
        <div className="flex items-center gap-4 px-1 py-2 animate-pulse">
          <div className="h-[52px] w-[52px] rounded-2xl bg-muted sm:h-16 sm:w-16" />
          <div>
            <div className="h-6 w-32 bg-muted rounded mb-2" />
            <div className="h-4 w-48 bg-muted rounded" />
          </div>
        </div>

        {/* 功能卡片骨架 */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-2xl bg-card border border-border p-5 animate-pulse">
              <div className="h-5 w-5 bg-muted rounded mb-3" />
              <div className="h-4 w-16 bg-muted rounded mb-2" />
              <div className="h-3 w-24 bg-muted rounded" />
            </div>
          ))}
        </div>

        {/* 最近文章骨架 */}
        <div className="mt-8">
          <div className="h-4 w-20 bg-muted rounded mb-4 animate-pulse" />
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl bg-card border border-border p-4 animate-pulse">
                <div className="h-4 w-3/4 bg-muted rounded mb-2" />
                <div className="h-3 w-1/2 bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
