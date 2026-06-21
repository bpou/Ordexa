"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Camera, Check, ChevronRight, Clock3, MapPin, Navigation, PackageOpen, Play, RotateCcw } from "lucide-react";

import { ProductEmptyState, ProductHeader, ProductPage, ProductSection } from "@/components/product-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Status = "INKOMMANDE" | "PAGAENDE" | "LEVERANS" | "PALACK";
type Job = {
  id: string;
  track: "A" | "B" | "C" | "D";
  status: Status;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  order: {
    orderNumber: string;
    title: string;
    customerName: string | null;
    deliveryAddress: string | null;
    dueDate: string | null;
  };
};

const TRACK_NAMES = { A: "Ateljé", B: "Verkstad", C: "Montage", D: "Bilmontage" } as const;
const STATUS_LABEL = { INKOMMANDE: "Inkommande", PAGAENDE: "Pågående", LEVERANS: "Leverans", PALACK: "På lack" } as const;

function isToday(value: string | null) {
  if (!value) return false;
  return new Date(value).toDateString() === new Date().toDateString();
}

export default function FieldModeClient({ initialJobs, role }: { initialJobs: Job[]; role: string }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [activeId, setActiveId] = useState<string | null>(initialJobs[0]?.id ?? null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadJob, setUploadJob] = useState<Job | null>(null);

  const sortedJobs = useMemo(
    () => [...jobs].sort((a, b) => Number(!isToday(a.plannedStartAt)) - Number(!isToday(b.plannedStartAt))),
    [jobs],
  );

  async function updateStatus(job: Job, status: Status | "AVSLUTAD") {
    setBusyId(job.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(job.order.orderNumber)}/tracks/${job.track}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Status kunde inte uppdateras.");
      if (status === "AVSLUTAD") setJobs((current) => current.filter((item) => item.id !== job.id));
      else setJobs((current) => current.map((item) => item.id === job.id ? { ...item, status } : item));
      setMessage(status === "AVSLUTAD" ? "Jobbet är markerat som klart." : "Statusen är uppdaterad.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Tekniskt fel.");
    } finally {
      setBusyId(null);
    }
  }

  async function uploadPhoto(file: File) {
    if (!uploadJob) return;
    setBusyId(uploadJob.id);
    const form = new FormData();
    form.append("file", file);
    form.append("track", uploadJob.track);
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(uploadJob.order.orderNumber)}/files`, { method: "POST", body: form });
      if (!response.ok) throw new Error("Bilden kunde inte laddas upp.");
      setMessage("Bilden är uppladdad till ordern.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Tekniskt fel.");
    } finally {
      setBusyId(null);
      setUploadJob(null);
    }
  }

  return (
    <ProductPage className="field-mode-page max-w-5xl pb-28">
      <ProductHeader eyebrow="Fältläge" title="Dagens jobb" description="Stora, snabba åtgärder för verkstad och montage. Inga dragytor eller små kontroller." />
      <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
        <span>{sortedJobs.length} aktiva jobb</span><span>{role.replace("_TEAM", "")}</span>
      </div>
      {message ? <div className="rounded-xl border border-primary/20 bg-primary/8 px-4 py-3 text-sm font-medium text-foreground">{message}</div> : null}
      {sortedJobs.length === 0 ? <ProductSection><ProductEmptyState icon={Check} title="Allt klart" description="Det finns inga öppna jobb för ditt arbetsflöde just nu." /></ProductSection> : null}

      <div className="space-y-3">
        {sortedJobs.map((job) => {
          const open = activeId === job.id;
          return (
            <ProductSection key={job.id} className={cn("overflow-hidden transition", open && "border-primary/30 shadow-[0_24px_70px_-48px_rgba(5,150,105,0.7)]")}>
              <button type="button" onClick={() => setActiveId(open ? null : job.id)} className="flex w-full items-start gap-3 p-4 text-left sm:p-5">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">{job.track}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold text-foreground">#{job.order.orderNumber} · {job.order.title}</span>
                    {isToday(job.plannedStartAt) ? <span className="rounded-full bg-amber-500/12 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">Idag</span> : null}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">{job.order.customerName || "Ingen kund"} · {TRACK_NAMES[job.track]}</span>
                </span>
                <ChevronRight className={cn("mt-2 h-5 w-5 shrink-0 text-muted-foreground transition", open && "rotate-90 text-primary")} />
              </button>
              {open ? (
                <div className="border-t border-border bg-muted/20 p-4 sm:p-5">
                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    <div className="flex items-center gap-2 rounded-xl bg-card p-3"><Clock3 className="h-4 w-4 text-primary" /> {STATUS_LABEL[job.status]}</div>
                    <div className="flex items-start gap-2 rounded-xl bg-card p-3"><MapPin className="mt-0.5 h-4 w-4 text-primary" /> {job.order.deliveryAddress || "Ingen leveransadress"}</div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {job.status !== "PAGAENDE" ? (
                      <Button variant="default" size="lg" className="h-12 rounded-xl" disabled={busyId === job.id} onClick={() => void updateStatus(job, "PAGAENDE")}><Play /> Starta</Button>
                    ) : (
                      <Button variant="secondary" size="lg" className="h-12 rounded-xl" disabled={busyId === job.id} onClick={() => void updateStatus(job, "INKOMMANDE")}><RotateCcw /> Pausa</Button>
                    )}
                    <Button variant="outline" size="lg" className="h-12 rounded-xl bg-card" onClick={() => { setUploadJob(job); fileInputRef.current?.click(); }}><Camera /> Foto</Button>
                    {job.order.deliveryAddress ? <Button asChild variant="outline" size="lg" className="h-12 rounded-xl bg-card"><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.order.deliveryAddress)}`} target="_blank" rel="noreferrer"><Navigation /> Hitta</a></Button> : null}
                    <Button variant="default" size="lg" className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700" disabled={busyId === job.id} onClick={() => void updateStatus(job, "AVSLUTAD")}><Check /> Klart</Button>
                  </div>
                  <Link href={`/orders/${encodeURIComponent(job.order.orderNumber)}`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">Öppna hela ordern <ChevronRight className="h-4 w-4" /></Link>
                </div>
              ) : null}
            </ProductSection>
          );
        })}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadPhoto(file); event.target.value = ""; }} />
      <nav className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-md items-center justify-around rounded-2xl border border-white/20 bg-neutral-950/92 p-2 text-white shadow-2xl backdrop-blur-xl sm:hidden" aria-label="Fältnavigering">
        <Link href="/field" className="flex flex-col items-center gap-1 rounded-xl bg-white/10 px-5 py-2 text-[11px]"><PackageOpen className="h-5 w-5" /> Jobb</Link>
        <Link href="/calendar2" className="flex flex-col items-center gap-1 rounded-xl px-5 py-2 text-[11px] text-white/70"><Clock3 className="h-5 w-5" /> Schema</Link>
        <Link href="/" className="flex flex-col items-center gap-1 rounded-xl px-5 py-2 text-[11px] text-white/70"><ChevronRight className="h-5 w-5" /> Översikt</Link>
      </nav>
    </ProductPage>
  );
}
