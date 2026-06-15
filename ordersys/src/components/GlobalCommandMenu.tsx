"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Command,
  FilePlus2,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Search,
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-card/85 px-3 text-sm font-semibold text-foreground shadow-sm backdrop-blur transition hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        aria-label="Öppna kommandosök"
      >
        <Search className="h-4 w-4" aria-hidden />
        {!compact ? <span>Sök</span> : null}
        {!compact ? <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">Ctrl K</span> : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[1000] bg-black/35 p-3 backdrop-blur-sm sm:p-6" onMouseDown={() => setOpen(false)}>
          <div
            className="mx-auto mt-16 w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl ring-1 ring-black/5"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Search className="h-5 w-5 text-muted-foreground" aria-hidden />
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
                className="h-11 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
              />
              {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden /> : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Stäng sök"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="max-h-[520px] overflow-y-auto p-2">
              {items.length === 0 && !loading ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm font-semibold text-foreground">Inga träffar</p>
                  <p className="mt-1 text-xs text-muted-foreground">Prova ordernummer, kund, spår eller kalender.</p>
                </div>
              ) : null}

              {grouped.orders.length ? (
                <div className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Ordrar
                </div>
              ) : null}
              {grouped.orders.map((item) => {
                const index = items.indexOf(item);
                return (
                  <CommandLink key={item.id} item={item} active={index === activeIndex} onNavigate={() => setOpen(false)} />
                );
              })}

              {grouped.actions.length ? (
                <div className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Genvägar
                </div>
              ) : null}
              {grouped.actions.map((item) => {
                const index = items.indexOf(item);
                return (
                  <CommandLink key={item.id} item={item} active={index === activeIndex} onNavigate={() => setOpen(false)} />
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function CommandLink({
  item,
  active,
  onNavigate,
}: {
  item: CommandItem;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`grid grid-cols-[36px_minmax(0,1fr)] gap-3 rounded-xl px-3 py-3 transition ${
        active ? "bg-brand-50 text-brand-900" : "hover:bg-muted/70"
      }`}
    >
      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border ${active ? "border-brand-200 bg-white text-brand-700" : "border-border bg-card text-muted-foreground"}`}>
        {iconFor(item.type, item.id)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{item.title}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.subtitle}</span>
      </span>
    </Link>
  );
}
