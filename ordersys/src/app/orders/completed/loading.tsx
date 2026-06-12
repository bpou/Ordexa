"use client";

import OrdinaLoader from "@/components/OrdinaLoader";

export default function LoadingCompletedOrders() {
  return (
    <>
      <OrdinaLoader logoSrc="/N.svg" />
      <div className="space-y-6 px-6 py-10">
        <div className="space-y-3">
        <div className="h-8 w-60 rounded-lg bg-neutral-200/60 animate-shimmer" />
        <div className="h-4 w-72 rounded-full bg-neutral-200/60 animate-shimmer" />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="h-10 w-36 rounded-xl bg-neutral-200/60 animate-shimmer" />
        <div className="h-10 w-48 rounded-xl bg-neutral-200/60 animate-shimmer" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <div className="grid grid-cols-12 gap-4 border-b border-border px-4 py-3">
          {[...Array(5)].map((_, idx) => (
            <div key={idx} className="h-4 rounded-full bg-neutral-200/60 animate-shimmer" />
          ))}
        </div>

        <div className="divide-y divide-border">
          {[...Array(6)].map((_, row) => (
            <div key={row} className="grid grid-cols-12 gap-4 px-4 py-4">
              <div className="h-5 w-5 rounded bg-neutral-200/60 animate-shimmer" />
              <div className="col-span-2 h-4 rounded-full bg-neutral-200/60 animate-shimmer" />
              <div className="col-span-4 h-4 rounded-full bg-neutral-200/60 animate-shimmer" />
              <div className="col-span-3 h-4 rounded-full bg-neutral-200/60 animate-shimmer" />
              <div className="col-span-2 h-3 rounded-full bg-neutral-200/60 animate-shimmer" />
            </div>
          ))}
        </div>
      </div>
    </div>
    </>
  );
}

