"use client";

import OrdinaLoader from "@/components/OrdinaLoader";

export default function LoadingOrderDetail() {
  return (
    <>
      <OrdinaLoader logoSrc="/N.svg" />
      <div className="mx-auto max-w-4xl space-y-6 px-6 py-10">
        <div className="space-y-3">
        <div className="h-4 w-32 rounded-full bg-neutral-200/60 animate-shimmer" />
        <div className="h-9 w-80 rounded-lg bg-neutral-200/60 animate-shimmer" />
        <div className="h-4 w-44 rounded-full bg-neutral-200/60 animate-shimmer" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(2)].map((_, index) => (
          <div key={index} className="space-y-4 rounded-2xl border border-border bg-white/80 p-4 shadow-sm">
            <div className="h-5 w-28 rounded-full bg-neutral-200/60 animate-shimmer" />
            <div className="flex items-center gap-3">
              <div className="h-4 w-16 rounded-full bg-neutral-200/60 animate-shimmer" />
              <div className="h-6 w-24 rounded-full bg-neutral-200/60 animate-shimmer" />
            </div>
            <div className="flex flex-wrap gap-2">
              {[...Array(5)].map((__, badge) => (
                <div key={badge} className="h-7 w-24 rounded-full bg-neutral-200/60 animate-shimmer" />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-white/80 p-5 shadow-sm">
        <div className="h-5 w-40 rounded-full bg-neutral-200/60 animate-shimmer" />
        <div className="grid gap-3 md:grid-cols-[auto_auto_1fr] md:items-center">
          <div className="h-10 w-32 rounded-xl bg-neutral-200/60 animate-shimmer" />
          <div className="h-10 w-32 rounded-xl bg-neutral-200/60 animate-shimmer" />
          <div className="h-10 w-full rounded-xl bg-neutral-200/60 animate-shimmer" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(6)].map((_, card) => (
          <div key={card} className="space-y-3 rounded-2xl border border-border bg-white/80 p-4 shadow-sm">
            <div className="h-4 w-16 rounded-full bg-neutral-200/60 animate-shimmer" />
            <div className="h-5 w-full rounded-lg bg-neutral-200/60 animate-shimmer" />
            <div className="h-3 w-32 rounded-full bg-neutral-200/60 animate-shimmer" />
            <div className="h-6 w-24 rounded-full bg-neutral-200/60 animate-shimmer" />
          </div>
        ))}
      </div>
    </div>
    </>
  );
}
