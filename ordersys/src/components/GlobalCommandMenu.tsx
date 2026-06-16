"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  Command,
  FilePlus2,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Search,
  Sparkles,
  X,
} from "lucide-react";

type CommandItem = {
  id: string;
  type: "action" | "order" | "calendar" | "board";
  title: string;
  subtitle: string;
  href: string;
  keywords: string;
};

function iconFor(type: CommandItem["type"], id: string) {
  const className = "h-4 w-4";
  if (id === "new-order") return <FilePlus2 className={className} aria-hidden />;
  if (type === "calendar") return <CalendarDays className={className} aria-hidden />;
  if (type === "board") return <ListChecks className={className} aria-hidden />;
  if (type === "order") return <Command className={className} aria-hidden />;
  return <LayoutDashboard className={className} aria-hidden />;
}

export default function GlobalCommandMenu({
  isLoggedIn,
  compact = false,
}: {
  isLoggedIn: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<CommandItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const grouped = useMemo(() => {
    const actions = items.filter((item) => item.type !== "order");
    const orders = items.filter((item) => item.type === "order");
    return { actions, orders };
  }, [items]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
      if (isShortcut && isLoggedIn) {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isLoggedIn]);

  useEffect(() => {
    if (!open || !isLoggedIn) return;
    inputRef.current?.focus();
  }, [open, isLoggedIn]);

  useEffect(() => {
    if (!open || !isLoggedIn) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/command-search?q=${encodeURIComponent(query)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        setItems(Array.isArray(json.items) ? json.items : []);
        setActiveIndex(0);
      } catch (_error) {
        if (!controller.signal.aborted) setItems([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 120);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [open, query, isLoggedIn]);

  if (!isLoggedIn) return null;

  const activeItem = items[activeIndex];

  function closeAndGo(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        whileHover={{ y: -1, scale: 1.015 }}
        whileTap={{ scale: 0.965 }}
        transition={{ type: "spring", stiffness: 520, damping: 32 }}
        className="group relative inline-flex h-10 items-center justify-center gap-2 overflow-hidden rounded-full border border-border bg-card/85 px-3 text-sm font-semibold text-foreground shadow-sm backdrop-blur-xl transition hover:border-brand-200 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        aria-label="Öppna kommandosök"
      >
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.95),transparent_35%),linear-gradient(135deg,rgba(14,165,233,0.13),rgba(16,185,129,0.08),transparent_62%)] opacity-0 transition duration-300 group-hover:opacity-100" />
        <Search className="relative h-4 w-4" aria-hidden />
        {!compact ? <span className="relative">Sök</span> : null}
        {!compact ? (
          <span className="relative rounded-md border border-border bg-muted/80 px-1.5 py-0.5 text-[10px] text-muted-foreground transition group-hover:bg-white/70">
            Ctrl K
          </span>
        ) : null}
      </motion.button>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-[1000] bg-black/35 p-3 backdrop-blur-sm sm:p-6"
            onMouseDown={() => setOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <motion.div
              className="mx-auto mt-14 w-full max-w-2xl overflow-hidden rounded-3xl border border-white/20 bg-popover/96 shadow-[0_34px_120px_-48px_rgba(0,0,0,0.82)] ring-1 ring-black/5 backdrop-blur-2xl sm:mt-20"
              onMouseDown={(event) => event.stopPropagation()}
              initial={{ opacity: 0, y: 18, scale: 0.965, filter: "blur(12px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: 12, scale: 0.98, filter: "blur(10px)" }}
              transition={{ type: "spring", stiffness: 360, damping: 32, mass: 0.9 }}
            >
              <div className="relative overflow-hidden border-b border-border">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(16,185,129,0.2),transparent_30%),radial-gradient(circle_at_86%_0%,rgba(14,165,233,0.18),transparent_30%)]" />
                <div className="relative flex items-center gap-3 px-4 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
                    <Sparkles className="h-5 w-5 text-brand-600" aria-hidden />
                  </div>
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        setActiveIndex((index) => Math.min(index + 1, Math.max(items.length - 1, 0)));
                      }
                      if (event.key === "ArrowUp") {
                        event.preventDefault();
                        setActiveIndex((index) => Math.max(index - 1, 0));
                      }
                      if (event.key === "Enter" && activeItem) {
                        event.preventDefault();
                        closeAndGo(activeItem.href);
                      }
                    }}
                    placeholder="Sök order, kalender eller arbetsyta"
                    className="h-12 min-w-0 flex-1 bg-transparent text-base font-medium text-foreground outline-none placeholder:text-muted-foreground"
                  />
                  {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden /> : null}
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    aria-label="Stäng sök"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>

              <div className="max-h-[520px] overflow-y-auto p-2">
                <AnimatePresence mode="popLayout">
                  {items.length === 0 && !loading ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      className="px-4 py-10 text-center"
                    >
                      <p className="text-sm font-semibold text-foreground">Inga träffar</p>
                      <p className="mt-1 text-xs text-muted-foreground">Prova ordernummer, kund, spår eller kalender.</p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                {grouped.orders.length ? (
                  <SectionLabel>Ordrar</SectionLabel>
                ) : null}
                {grouped.orders.map((item, visibleIndex) => {
                  const index = items.indexOf(item);
                  return (
                    <CommandLink
                      key={item.id}
                      item={item}
                      active={index === activeIndex}
                      onNavigate={() => setOpen(false)}
                      delay={visibleIndex * 0.025}
                    />
                  );
                })}

                {grouped.actions.length ? (
                  <SectionLabel>Genvägar</SectionLabel>
                ) : null}
                {grouped.actions.map((item, visibleIndex) => {
                  const index = items.indexOf(item);
                  return (
                    <CommandLink
                      key={item.id}
                      item={item}
                      active={index === activeIndex}
                      onNavigate={() => setOpen(false)}
                      delay={(grouped.orders.length + visibleIndex) * 0.025}
                    />
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </div>
  );
}

function CommandLink({
  item,
  active,
  onNavigate,
  delay,
}: {
  item: CommandItem;
  active: boolean;
  onNavigate: () => void;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 520, damping: 36, delay: Math.min(delay, 0.18) }}
    >
      <Link
        href={item.href}
        onClick={onNavigate}
        className={`group grid grid-cols-[38px_minmax(0,1fr)] gap-3 rounded-2xl px-3 py-3 transition duration-200 ${
          active
            ? "bg-brand-50 text-brand-900 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.18)]"
            : "hover:-translate-y-0.5 hover:bg-muted/70 hover:shadow-[0_18px_46px_-38px_rgba(15,23,42,0.75)]"
        }`}
      >
        <span
          className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border shadow-sm transition group-hover:scale-105 ${
            active ? "border-brand-200 bg-white text-brand-700" : "border-border bg-card text-muted-foreground"
          }`}
        >
          {iconFor(item.type, item.id)}
        </span>
        <span className="min-w-0 self-center">
          <span className="block truncate text-sm font-semibold">{item.title}</span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.subtitle}</span>
        </span>
      </Link>
    </motion.div>
  );
}
