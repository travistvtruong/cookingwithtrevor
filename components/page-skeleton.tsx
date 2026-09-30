// Placeholder shown by loading.tsx while signed-in pages fetch their data.
export function PageSkeleton({ variant = "list" }: { variant?: "list" | "cards" }) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12" aria-busy="true">
      <span className="sr-only" role="status">Loading…</span>
      <div aria-hidden className="animate-pulse space-y-6">
        <div className="h-8 w-48 rounded bg-stone-200" />
        {variant === "cards" ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="overflow-hidden rounded-lg border border-stone-200 bg-white">
                <div className="aspect-[4/3] bg-stone-100" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-3/4 rounded bg-stone-200" />
                  <div className="h-3 w-1/2 rounded bg-stone-100" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between px-4 py-4">
                <div className="h-4 w-1/2 rounded bg-stone-200" />
                <div className="h-4 w-16 rounded bg-stone-100" />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
