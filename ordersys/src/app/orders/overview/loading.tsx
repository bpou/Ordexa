"use client";

import OrdinaLoader from "@/components/OrdinaLoader";

export default function LoadingOrdersOverview() {
  return (
    <>
      <OrdinaLoader logoSrc="/N.svg" />
      <div className="min-h-screen bg-[#f7f3ee]">
        <div className="mx-auto max-w-5xl space-y-6 px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="h-3 w-40 rounded-full bg-neutral-200/60 animate-shimmer" />
            <div className="h-8 w-64 rounded-lg bg-neutral-200/60 animate-shimmer" />
          </div>
          <div className="h-9 w-64 rounded-lg bg-neutral-200/60 animate-shimmer" />
        </div>

        <div className="rounded-xl border border-neutral-300 bg-[#f3f1ec] p-3 shadow-sm">
          <div className="rounded-lg border border-neutral-300 bg-white">
            <div className="grid grid-cols-5 gap-4 border-b border-neutral-200 px-3 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              <div className="h-4 w-16 rounded-full bg-neutral-200/60 animate-shimmer" />
              <div className="h-4 w-16 rounded-full bg-neutral-200/60 animate-shimmer" />
              <div className="h-4 w-20 rounded-full bg-neutral-200/60 animate-shimmer" />
              <div className="h-4 w-12 rounded-full bg-neutral-200/60 animate-shimmer" />
              <div className="h-4 w-12 rounded-full bg-neutral-200/60 animate-shimmer" />
            </div>

            <div className="divide-y divide-neutral-100">
              {Array.from({ length: 6 }).map((_, row) => (
                <div key={row} className="grid grid-cols-5 gap-4 px-3 py-4">
                  <div className="space-y-2">
                    <div className="h-4 w-24 rounded-full bg-neutral-200/60 animate-shimmer" />
                    <div className="h-3 w-32 rounded-full bg-neutral-200/60 animate-shimmer" />
                  </div>
                  <div className="h-4 w-28 rounded-full bg-neutral-200/60 animate-shimmer" />
                  <div className="flex gap-2">
                    <div className="h-5 w-20 rounded-full bg-neutral-200/60 animate-shimmer" />
                    <div className="h-5 w-20 rounded-full bg-neutral-200/60 animate-shimmer" />
                  </div>
                  <div className="h-4 w-16 rounded-full bg-neutral-200/60 animate-shimmer" />
                  <div className="ml-auto h-6 w-28 rounded-full bg-neutral-200/60 animate-shimmer" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

