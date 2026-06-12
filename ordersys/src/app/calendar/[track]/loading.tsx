export default function LoadingCalendarTrack() {
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="h-8 w-56 rounded-lg bg-neutral-200/60 animate-shimmer" />
        <div className="flex flex-wrap gap-3">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="h-9 w-24 rounded-xl bg-neutral-200/60 animate-shimmer" />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white/90 p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="h-4 w-32 rounded-full bg-neutral-200/60 animate-shimmer" />
          <div className="flex gap-2">
            {[...Array(3)].map((_, idx) => (
              <div key={idx} className="h-9 w-10 rounded-lg bg-neutral-200/60 animate-shimmer" />
            ))}
          </div>
          <div className="h-9 w-32 rounded-lg bg-neutral-200/60 animate-shimmer" />
        </div>

        <div className="grid gap-2">
          {[...Array(5)].map((_, week) => (
            <div key={week} className="grid gap-2 sm:grid-cols-7">
              {[...Array(7)].map((__, day) => (
                <div
                  key={day}
                  className="h-24 rounded-xl border border-dashed border-neutral-200/70 bg-neutral-100/40 animate-shimmer"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
