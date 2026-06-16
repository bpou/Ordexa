"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
      <motion.button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Öppna notiser"
        aria-expanded={open}
        whileHover={{ y: -1, scale: 1.015 }}
        whileTap={{ scale: 0.965 }}
        transition={{ type: "spring", stiffness: 520, damping: 32 }}
        className={[
          "group relative inline-flex h-10 items-center justify-center gap-2 overflow-hidden rounded-full border px-3 text-sm font-semibold shadow-sm backdrop-blur-xl transition",
          open
            ? "border-brand-300 bg-brand-50 text-brand-800 shadow-[0_16px_42px_-28px_rgba(16,185,129,0.85)]"
            : "border-border bg-card/85 text-foreground hover:border-brand-200 hover:bg-card",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        ].join(" ")}
      >
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.9),transparent_34%),linear-gradient(135deg,rgba(16,185,129,0.12),transparent_46%)] opacity-0 transition duration-300 group-hover:opacity-100" />
        <motion.span
          animate={unreadCount > 0 ? { rotate: [0, -10, 8, -4, 0] } : { rotate: 0 }}
          transition={{ duration: 0.9, repeat: unreadCount > 0 ? Infinity : 0, repeatDelay: 5 }}
          className="relative"
        >
          <Bell className="h-4 w-4" aria-hidden />
        </motion.span>
        {!compact ? <span className="relative">Notiser</span> : null}
        {unreadCount > 0 ? (
          <motion.span
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold leading-5 text-white shadow-sm ring-2 ring-background"
          >
            <span className="absolute inset-0 rounded-full bg-red-500 opacity-50 animate-ping" />
            <span className="relative">{unreadCount > 9 ? "9+" : unreadCount}</span>
          </motion.span>
        ) : null}
      </motion.button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.965, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, scale: 0.98, filter: "blur(8px)" }}
            transition={{ type: "spring", stiffness: 430, damping: 34, mass: 0.8 }}
            className="absolute right-0 z-[70] mt-3 w-[min(92vw,410px)] origin-top-right overflow-hidden rounded-2xl border border-border/90 bg-popover/96 shadow-[0_28px_90px_-42px_rgba(15,23,42,0.75)] ring-1 ring-black/5 backdrop-blur-2xl"
          >
            <div className="relative flex items-center justify-between overflow-hidden border-b border-border px-4 py-3">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(16,185,129,0.18),transparent_34%),linear-gradient(90deg,rgba(255,255,255,0.08),transparent)]" />
              <div className="relative">
                <div className="text-sm font-semibold text-foreground">Notiser</div>
                <div className="text-xs text-muted-foreground">Planering, filer och fakturering</div>
              </div>
              <div className="relative flex items-center gap-1">
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
              {error ? (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {error}
                </motion.div>
              ) : null}

              {!error && !loading && items.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="rounded-xl border border-dashed border-border bg-muted/35 px-4 py-8 text-center"
                >
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground">
                    <CheckCircle2 className="h-5 w-5" aria-hidden />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-foreground">Inget brinner just nu</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Du får signaler här när orderflödet behöver uppmärksamhet.
                  </p>
                </motion.div>
              ) : null}

              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 520, damping: 36, delay: Math.min(index * 0.025, 0.16) }}
                >
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="group grid grid-cols-[36px_minmax(0,1fr)_auto] gap-3 rounded-xl px-3 py-3 transition duration-200 hover:-translate-y-0.5 hover:bg-muted/70 hover:shadow-[0_16px_42px_-34px_rgba(15,23,42,0.75)]"
                  >
                    <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border shadow-sm transition group-hover:scale-105 ${toneClass(item.tone)}`}>
                      {itemIcon(item.kind, item.tone)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">{item.title}</span>
                      <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-muted-foreground">{item.description}</span>
                    </span>
                    <span className="pt-0.5 text-[11px] font-medium text-muted-foreground">{formatRelative(item.createdAt)}</span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
