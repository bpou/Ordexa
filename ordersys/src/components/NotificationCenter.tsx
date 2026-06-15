"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  tone: "critical" | "warning" | "success" | "info";
  kind: "order" | "planning" | "file" | "billing" | "calendar";
  createdAt: string;
};

function toneClass(tone: NotificationItem["tone"]) {
  if (tone === "critical") return "border-red-200 bg-red-50 text-red-700";
  if (tone === "warning") return "border-amber-200 bg-amber-50 text-amber-700";
  if (tone === "success") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function itemIcon(kind: NotificationItem["kind"], tone: NotificationItem["tone"]) {
  const className = "h-4 w-4";
  if (kind === "file") return <FileText className={className} aria-hidden />;
  if (kind === "billing") return <CheckCircle2 className={className} aria-hidden />;
  if (kind === "planning" || kind === "calendar") return <CalendarClock className={className} aria-hidden />;
  if (tone === "critical" || tone === "warning") return <AlertTriangle className={className} aria-hidden />;
  return <Bell className={className} aria-hidden />;
}

function formatRelative(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 2) return "nyss";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} tim`;
  return date.toLocaleDateString("sv-SE");
}

export default function NotificationCenter({
  isLoggedIn,
  compact = false,
}: {
  isLoggedIn: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    if (!isLoggedIn) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setItems(Array.isArray(json.items) ? json.items : []);
      setUnreadCount(typeof json.unreadCount === "number" ? json.unreadCount : 0);
    } catch {
      setError("Kunde inte hämta notiser.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 60000);
    return () => window.clearInterval(interval);
  }, [isLoggedIn]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  if (!isLoggedIn) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Öppna notiser"
        aria-expanded={open}
        className="relative inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-card/85 px-3 text-sm font-semibold text-foreground shadow-sm backdrop-blur transition hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <Bell className="h-4 w-4" aria-hidden />
        {!compact ? <span>Notiser</span> : null}
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold leading-5 text-white shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-[70] mt-3 w-[min(92vw,390px)] overflow-hidden rounded-2xl border border-border bg-popover/98 shadow-2xl ring-1 ring-black/5 backdrop-blur">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-foreground">Notiser</div>
              <div className="text-xs text-muted-foreground">Planering, filer och fakturering</div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => void load()}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Uppdatera notiser"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Stäng notiser"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>

          <div className="max-h-[430px] overflow-y-auto p-2">
            {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
            {!error && !loading && items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/35 px-4 py-8 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5" aria-hidden />
                </div>
                <p className="mt-3 text-sm font-semibold text-foreground">Inget brinner just nu</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Du får signaler här när orderflödet behöver uppmärksamhet.</p>
              </div>
            ) : null}
            {items.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setOpen(false)}
                className="group grid grid-cols-[36px_minmax(0,1fr)_auto] gap-3 rounded-xl px-3 py-3 transition hover:bg-muted/70"
              >
                <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border ${toneClass(item.tone)}`}>
                  {itemIcon(item.kind, item.tone)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">{item.title}</span>
                  <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-muted-foreground">{item.description}</span>
                </span>
                <span className="pt-0.5 text-[11px] font-medium text-muted-foreground">{formatRelative(item.createdAt)}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
