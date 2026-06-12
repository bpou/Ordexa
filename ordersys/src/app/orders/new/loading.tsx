export default function LoadingNewOrderPage() {
  return (
    <div className="bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12">
        <section className="rounded-2xl border border-border bg-white/80 p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2">
              <div className="h-5 w-32 rounded-full animate-shimmer" />
              <div className="h-8 w-56 rounded-lg animate-shimmer" />
            </div>
            <div className="flex gap-3">
              <div className="h-10 w-28 rounded-xl animate-shimmer" />
              <div className="hidden h-10 w-28 rounded-xl animate-shimmer md:block" />
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="rounded-2xl border border-border bg-white/80 p-6 shadow-sm">
                <div className="flex flex-col gap-4">
                  <div className="h-4 w-24 rounded-full animate-shimmer" />
                  <div className="grid gap-3 md:grid-cols-2">
                    {[...Array(4)].map((__, inputIndex) => (
                      <div key={inputIndex} className="space-y-2">
                        <div className="h-3 w-20 rounded-full animate-shimmer" />
                        <div className="h-9 w-full rounded-xl animate-shimmer" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-border bg-white/80 p-6 shadow-sm">
              <div className="h-4 w-32 rounded-full animate-shimmer" />
              <div className="mt-4 space-y-3">
                {[...Array(4)].map((_, badgeIndex) => (
                  <div key={badgeIndex} className="h-9 w-full rounded-xl animate-shimmer" />
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-white/80 p-6 shadow-sm">
              <div className="h-4 w-24 rounded-full animate-shimmer" />
              <div className="mt-4 space-y-3">
                {[...Array(3)].map((_, rowIndex) => (
                  <div key={rowIndex} className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl animate-shimmer" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-24 rounded-full animate-shimmer" />
                      <div className="h-3 w-32 rounded-full animate-shimmer" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
