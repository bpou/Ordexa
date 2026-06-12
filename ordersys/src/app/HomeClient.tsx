
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  LayoutDashboard,
  PlusCircle,
  Quote,
  type LucideIcon,
} from "lucide-react";

import { OrdinaLogoSpinner } from "@/components/OrdinaLoader";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import {
  APP_TRACKS,
  TRACK_CALENDAR_LABELS,
  TRACK_NAMES,
  TRACK_SLUGS,
  type AppTrack,
} from "@/lib/tracks";
import { getRecentOrderIds } from "@/lib/recentOrders";

type Role = "ADMIN" | "SALJARE" | "A_TEAM" | "B_TEAM" | "C_TEAM" | "D_TEAM";
type TrackStatus = "INKOMMANDE" | "PAGAENDE" | "LEVERANS" | "AVSLUTAD" | "PALACK";
type RiskLevel = "blocked" | "risk" | "normal" | "ready";
type AttentionLevel = "urgent" | "warning" | "ready";
type QuickLinkKey = "new" | "newQuote" | "overview" | "planner" | "completed";

type ApiTrack = {
  track: AppTrack;
  status: TrackStatus | null;
  plannedStartAt: string | null;
  actualStartAt: string | null;
  actualEndAt: string | null;
};

type ApiEvent = {
  id: string;
  title: string;
  start: string | null;
  track: AppTrack | null;
};

type ApiOrder = {
  orderNumber: string;
  title: string;
  customerName: string | null;
  dueDate: string | null;
  createdAt: string | null;
  tracks: ApiTrack[];
  events: ApiEvent[];
};

type FreeEvent = {
  id: string;
  title: string;
  start: string | null;
  extendedProps?: { label?: string | null };
};

type AttentionItem = {
  id: string;
  level: AttentionLevel;
  title: string;
  description: string;
  actionLabel: string;
  href: string;
  date: Date | null;
};

type ActiveItem = {
  id: string;
  orderNumber: string;
  title: string;
  customer: string;
  currentStage: string;
  status: string;
  progress: number;
  deadline: Date | null;
  risk: RiskLevel;
  tracks: ApiTrack[];
};

type QuickMeta = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

const QUICK_META: Record<QuickLinkKey, QuickMeta> = {
  new: { title: "Ny order", description: "Skapa en ny order", href: "/orders/new", icon: PlusCircle },
  newQuote: { title: "Ny offert", description: "Skapa en offert", href: "/quotes/new", icon: Quote },
  overview: { title: "Alla ordrar", description: "Öppna orderöversikt", href: "/orders/overview", icon: LayoutDashboard },
  planner: { title: "Öppna planering", description: "Visa teamets schema", href: "/calendar/a", icon: CalendarDays },
  completed: { title: "Fakturering", description: "Granska färdiga ordrar", href: "/orders/completed", icon: ClipboardList },
};

const PERMS: Record<Role, { quick: QuickLinkKey[]; tracks: AppTrack[]; calendar: AppTrack }> = {
  ADMIN: { quick: ["new", "newQuote", "overview", "planner", "completed"], tracks: [...APP_TRACKS], calendar: "A" },
  SALJARE: { quick: ["new", "newQuote", "overview", "planner", "completed"], tracks: [...APP_TRACKS], calendar: "A" },
  A_TEAM: { quick: ["overview", "planner"], tracks: ["A"], calendar: "A" },
  B_TEAM: { quick: ["overview", "planner"], tracks: ["B"], calendar: "B" },
  C_TEAM: { quick: ["overview", "planner"], tracks: ["C"], calendar: "C" },
  D_TEAM: { quick: ["overview", "planner"], tracks: ["D"], calendar: "D" },
};

const STATUS_WEIGHT: Record<TrackStatus, number> = {
  INKOMMANDE: 0,
  PAGAENDE: 45,
  PALACK: 70,
  LEVERANS: 85,
  AVSLUTAD: 100,
};

const STATUS_LABEL: Record<TrackStatus, string> = {
  INKOMMANDE: "Inkommande",
  PAGAENDE: "Pågående",
  PALACK: "Väntar",
  LEVERANS: "Klar",
  AVSLUTAD: "Avslutad",
};

const dateFmt = new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium" });
const dateTimeFmt = new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeStyle: "short" });

const toDate = (value: string | null | undefined) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const text = (value: unknown, fallback = "") =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

const isTrack = (value: unknown): value is AppTrack =>
  typeof value === "string" && (APP_TRACKS as readonly string[]).includes(value);

const isStatus = (value: unknown): value is TrackStatus =>
  value === "INKOMMANDE" ||
  value === "PAGAENDE" ||
  value === "LEVERANS" ||
  value === "AVSLUTAD" ||
  value === "PALACK";

const isDone = (status: TrackStatus | null) => status === "AVSLUTAD" || status === "LEVERANS";

const getTrackStatus = (order: ApiOrder, track: AppTrack) =>
  order.tracks.find((item) => item.track === track)?.status ?? null;

const orderRisk = (order: ApiOrder, tracks: AppTrack[]): RiskLevel => {
  const scoped = order.tracks.filter((item) => tracks.includes(item.track));
  if (scoped.length > 0 && scoped.every((item) => isDone(item.status))) return "ready";
  const due = toDate(order.dueDate);
  if (due && due.getTime() < Date.now()) return "blocked";
  if (scoped.some((item) => item.status === "INKOMMANDE" || item.status === "PALACK")) return "risk";
  return "normal";
};

const currentStageLabel = (order: ApiOrder, tracks: AppTrack[]) => {
  for (const track of APP_TRACKS) {
    if (!tracks.includes(track)) continue;
    const status = getTrackStatus(order, track);
    if (!status || status === "INKOMMANDE" || status === "PAGAENDE" || status === "PALACK") {
      return TRACK_NAMES[track];
    }
  }
  return "Slutkontroll";
};

const currentStatusLabel = (order: ApiOrder, tracks: AppTrack[]) => {
  const statuses = order.tracks
    .filter((item) => tracks.includes(item.track))
    .map((item) => item.status ?? "INKOMMANDE");
  if (!statuses.length) return "Ingen status";
  if (statuses.every((s) => s === "AVSLUTAD")) return "Avslutad";
  if (statuses.some((s) => s === "PAGAENDE")) return "Pågående";
  if (statuses.some((s) => s === "PALACK")) return "Väntar";
  if (statuses.some((s) => s === "LEVERANS")) return "Klar";
  return "Inkommande";
};

const progressValue = (order: ApiOrder, tracks: AppTrack[]) => {
  const scoped = order.tracks.filter((item) => tracks.includes(item.track));
  if (!scoped.length) return 0;
  return Math.round(scoped.reduce((acc, item) => acc + STATUS_WEIGHT[item.status ?? "INKOMMANDE"], 0) / scoped.length);
};

const relativeDeadline = (date: Date | null) => {
  if (!date) return "Ingen deadline";
  const now = new Date();
  const dayA = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const dayB = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.round((dayB - dayA) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}d försenad`;
  if (diff === 0) return "Förfaller idag";
  if (diff <= 3) return `Förfaller om ${diff}d`;
  return dateFmt.format(date);
};

export default function HomeClient({ name: _name, role }: { name: string; role: Role }) {
  const perms = PERMS[role];
  const canSeeBilling = role === "ADMIN" || role === "SALJARE";

  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [freeEvents, setFreeEvents] = useState<FreeEvent[]>([]);
  const [invoiceReady, setInvoiceReady] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentOrderIds, setRecentOrderIds] = useState<string[]>([]);

  useEffect(() => {
    let canceled = false;

    (async () => {
      setLoading(true);
      try {
        const [ordersRes, eventsRes, completedRes] = await Promise.all([
          fetch("/api/orders", { cache: "no-store" }),
          fetch("/api/free-events", { cache: "no-store" }),
          canSeeBilling ? fetch("/api/orders/completed", { cache: "no-store" }) : Promise.resolve(null),
        ]);

        const ordersData = ordersRes.ok ? await ordersRes.json() : { orders: [] };
        const eventsData = eventsRes.ok ? await eventsRes.json() : { events: [] };
        const completedData = completedRes?.ok ? await completedRes.json() : { orders: [] };

        const parsedOrders = (Array.isArray(ordersData?.orders) ? ordersData.orders : [])
          .map((raw: unknown) => {
            if (!raw || typeof raw !== "object") return null;
            const row = raw as Record<string, unknown>;
            if (row.billingConfirmedAt) return null;

            const orderNumber = text(row.orderNumber);
            if (!orderNumber) return null;

            const tracks = (Array.isArray(row.tracks) ? row.tracks : [])
              .map((rawTrack: unknown) => {
                if (!rawTrack || typeof rawTrack !== "object") return null;
                const trackRow = rawTrack as Record<string, unknown>;
                if (!isTrack(trackRow.track)) return null;
                return {
                  track: trackRow.track,
                  status: isStatus(trackRow.status) ? trackRow.status : null,
                  plannedStartAt: text(trackRow.plannedStartAt) || null,
                  actualStartAt: text(trackRow.actualStartAt) || null,
                  actualEndAt: text(trackRow.actualEndAt) || null,
                } as ApiTrack;
              })
              .filter((item: ApiTrack | null): item is ApiTrack => Boolean(item));

            const events = (Array.isArray(row.events) ? row.events : [])
              .map((rawEvent: unknown) => {
                if (!rawEvent || typeof rawEvent !== "object") return null;
                const eventRow = rawEvent as Record<string, unknown>;
                const id = text(eventRow.id);
                if (!id) return null;
                return {
                  id,
                  title: text(eventRow.title, "Kalender"),
                  start: text(eventRow.start) || null,
                  track: isTrack(eventRow.track) ? eventRow.track : null,
                } as ApiEvent;
              })
              .filter((item: ApiEvent | null): item is ApiEvent => Boolean(item));

            return {
              orderNumber,
              title: text(row.title, `Order ${orderNumber}`),
              customerName: text(row.customerName) || null,
              dueDate: text(row.dueDate) || null,
              createdAt: text(row.createdAt) || null,
              tracks,
              events,
            } as ApiOrder;
          })
          .filter((item: ApiOrder | null): item is ApiOrder => Boolean(item));

        const parsedFreeEvents = (Array.isArray(eventsData?.events) ? eventsData.events : [])
          .map((rawEvent: unknown) => {
            if (!rawEvent || typeof rawEvent !== "object") return null;
            const eventRow = rawEvent as Record<string, unknown>;
            const id = text(eventRow.id);
            if (!id) return null;
            const extendedProps =
              eventRow.extendedProps && typeof eventRow.extendedProps === "object"
                ? (eventRow.extendedProps as Record<string, unknown>)
                : undefined;
            return {
              id,
              title: text(eventRow.title, "Kalender"),
              start: text(eventRow.start) || null,
              extendedProps: extendedProps ? { label: text(extendedProps.label) || null } : undefined,
            } as FreeEvent;
          })
          .filter((item: FreeEvent | null): item is FreeEvent => Boolean(item));

        if (!canceled) {
          setOrders(parsedOrders);
          setFreeEvents(parsedFreeEvents);
          setInvoiceReady(canSeeBilling && Array.isArray(completedData?.orders) ? completedData.orders.length : null);
        }
      } finally {
        if (!canceled) setLoading(false);
      }
    })();

    return () => {
      canceled = true;
    };
  }, [canSeeBilling]);

  useEffect(() => {
    const refreshRecentOrders = () => setRecentOrderIds(getRecentOrderIds(6));
    refreshRecentOrders();
    window.addEventListener("focus", refreshRecentOrders);
    return () => {
      window.removeEventListener("focus", refreshRecentOrders);
    };
  }, []);

  const scopedOrders = useMemo(
    () => orders.filter((order) => order.tracks.some((track) => perms.tracks.includes(track.track))),
    [orders, perms.tracks]
  );

  const recentOpenedOrders = useMemo(() => {
    const orderByNumber = new Map(scopedOrders.map((order) => [order.orderNumber, order]));
    return recentOrderIds
      .map((orderNumber) => {
        const order = orderByNumber.get(orderNumber);
        if (!order) return null;
        return {
          id: order.orderNumber,
          href: `/orders/${encodeURIComponent(order.orderNumber)}`,
          title: order.title,
          customer: order.customerName ?? "OkÃ¤nd kund",
          createdAt: toDate(order.createdAt),
        };
      })
      .filter((order): order is { id: string; href: string; title: string; customer: string; createdAt: Date | null } => Boolean(order))
      .slice(0, 6);
  }, [recentOrderIds, scopedOrders]);

  const attention = useMemo<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];

    for (const order of scopedOrders) {
      const due = toDate(order.dueDate);
      const baseHref = `/orders/${encodeURIComponent(order.orderNumber)}`;

      if (due && due.getTime() < Date.now() && orderRisk(order, perms.tracks) !== "ready") {
        items.push({
          id: `${order.orderNumber}-overdue`,
          level: "urgent",
          title: `${order.title} är försenad`,
          description: `Deadline ${dateFmt.format(due)} har passerat.`,
          actionLabel: "Öppna order",
          href: baseHref,
          date: due,
        });
      }

      for (const track of APP_TRACKS) {
        if (!perms.tracks.includes(track)) continue;
        const current = getTrackStatus(order, track);
        if (!current) continue;
        const idx = APP_TRACKS.indexOf(track);
        if (idx > 0) {
          const previous = APP_TRACKS[idx - 1];
          const previousStatus = getTrackStatus(order, previous);
          if ((current === "INKOMMANDE" || current === "PALACK") && previousStatus && !isDone(previousStatus)) {
            items.push({
              id: `${order.orderNumber}-dep-${track}`,
              level: "warning",
              title: `${TRACK_NAMES[track]} väntar på ${TRACK_NAMES[previous]}`,
              description: `Order ${order.orderNumber} beror på föregående steg.`,
              actionLabel: `Öppna ${TRACK_NAMES[track]}`,
              href: `${baseHref}/track/${track}`,
              date: due,
            });
          }
        }

        const planned = toDate(order.tracks.find((item) => item.track === track)?.plannedStartAt ?? null);
        if ((current === "INKOMMANDE" || current === "PALACK") && !planned) {
          items.push({
            id: `${order.orderNumber}-plan-${track}`,
            level: "warning",
            title: `${TRACK_NAMES[track]} är inte schemalagd`,
            description: `Ingen planerad start för order ${order.orderNumber}.`,
            actionLabel: "Öppna planering",
            href: `/calendar/${TRACK_SLUGS[track]}`,
            date: due,
          });
        }
      }

      if (orderRisk(order, perms.tracks) === "ready") {
        items.push({
          id: `${order.orderNumber}-ready`,
          level: "ready",
          title: `${order.title} redo för nästa steg`,
          description: "Alla synliga steg är klara eller i leverans.",
          actionLabel: "Granska",
          href: baseHref,
          date: due,
        });
      }
    }

    const rank: Record<AttentionLevel, number> = { urgent: 0, warning: 1, ready: 2 };
    return items
      .sort((a, b) => rank[a.level] - rank[b.level] || ((a.date?.getTime() ?? 9e15) - (b.date?.getTime() ?? 9e15)))
      .slice(0, 8);
  }, [scopedOrders, perms.tracks]);

  const activeOrders = useMemo<ActiveItem[]>(() => {
    const severity: Record<RiskLevel, number> = { blocked: 0, risk: 1, normal: 2, ready: 3 };
    return scopedOrders
      .map((order) => ({
        id: order.orderNumber,
        orderNumber: order.orderNumber,
        title: order.title,
        customer: order.customerName ?? "Okänd kund",
        currentStage: currentStageLabel(order, perms.tracks),
        status: currentStatusLabel(order, perms.tracks),
        progress: progressValue(order, perms.tracks),
        deadline: toDate(order.dueDate),
        risk: orderRisk(order, perms.tracks),
        tracks: order.tracks.filter((track) => perms.tracks.includes(track.track)),
      }))
      .sort((a, b) => severity[a.risk] - severity[b.risk] || ((a.deadline?.getTime() ?? 9e15) - (b.deadline?.getTime() ?? 9e15)))
      .slice(0, 8);
  }, [scopedOrders, perms.tracks]);

  const schedule = useMemo(() => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 7);

    const items: Array<{ id: string; title: string; detail: string; when: Date; href: string }> = [];

    for (const order of scopedOrders) {
      const baseHref = `/orders/${encodeURIComponent(order.orderNumber)}`;
      for (const event of order.events) {
        const start = toDate(event.start);
        if (!start || start < from || start > to) continue;
        if (event.track && !perms.tracks.includes(event.track)) continue;
        items.push({
          id: `order-${event.id}`,
          title: event.title,
          detail: `${order.customerName ?? "Okänd kund"} · ${event.track ? TRACK_NAMES[event.track] : "Delad"}`,
          when: start,
          href: baseHref,
        });
      }
      for (const track of order.tracks) {
        const start = toDate(track.plannedStartAt);
        if (!start || start < from || start > to) continue;
        if (!perms.tracks.includes(track.track)) continue;
        items.push({
          id: `${order.orderNumber}-${track.track}`,
          title: `${TRACK_NAMES[track.track]} planerad`,
          detail: `${order.title} · ${order.customerName ?? "Okänd kund"}`,
          when: start,
          href: `${baseHref}/track/${track.track}`,
        });
      }
    }

    for (const event of freeEvents) {
      const start = toDate(event.start);
      if (!start || start < from || start > to) continue;
      items.push({
        id: `free-${event.id}`,
        title: event.title,
        detail: event.extendedProps?.label ? `Team: ${event.extendedProps.label}` : "Teamkalender",
        when: start,
        href: "/personal-calendar",
      });
    }

    return items.sort((a, b) => a.when.getTime() - b.when.getTime()).slice(0, 6);
  }, [scopedOrders, freeEvents, perms.tracks]);

  const activity = useMemo(() => {
    const items: Array<{ id: string; text: string; when: Date; tone: "neutral" | "warning" | "success" }> = [];
    for (const order of scopedOrders) {
      const createdAt = toDate(order.createdAt);
      if (createdAt) items.push({ id: `${order.orderNumber}-created`, text: `Order ${order.orderNumber} skapades`, when: createdAt, tone: "neutral" });
      for (const track of order.tracks) {
        if (!perms.tracks.includes(track.track)) continue;
        const startedAt = toDate(track.actualStartAt);
        if (startedAt) items.push({ id: `${order.orderNumber}-${track.track}-start`, text: `${TRACK_NAMES[track.track]} startade ${order.title}`, when: startedAt, tone: "warning" });
        const endedAt = toDate(track.actualEndAt);
        if (endedAt) items.push({ id: `${order.orderNumber}-${track.track}-end`, text: `${TRACK_NAMES[track.track]} slutförde ${order.title}`, when: endedAt, tone: "success" });
      }
    }
    return items.sort((a, b) => b.when.getTime() - a.when.getTime()).slice(0, 7);
  }, [scopedOrders, perms.tracks]);

  const plannerLink = `/calendar/${TRACK_SLUGS[perms.calendar]}`;
  const plannerLabel = TRACK_CALENDAR_LABELS[perms.calendar] ?? "Planering";

  const summaryCards = [
    { title: "Aktiva ordrar", value: scopedOrders.length, cls: "border-neutral-200 bg-white text-neutral-900" },
    { title: "Pågående jobb", value: attention.filter((item) => item.level === "warning").length, cls: "border-amber-200 bg-amber-50 text-amber-900" },
    { title: "Försenade", value: attention.filter((item) => item.level === "urgent").length, cls: "border-red-200 bg-red-50 text-red-900" },
    ...(canSeeBilling
      ? [{ title: "Fakturering", value: invoiceReady ?? 0, cls: "border-emerald-200 bg-emerald-50 text-emerald-900" }]
      : []),
  ];

  return (
    <div className="relative -mx-4 -my-4 min-h-screen overflow-hidden bg-neutral-50 sm:-mx-6 sm:-my-6">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_0%,rgba(16,185,129,0.08),transparent_45%),radial-gradient(circle_at_95%_5%,rgba(15,23,42,0.06),transparent_30%)]" />
      <main className="mx-auto flex w-full flex-col gap-6 px-4 py-8 sm:px-6 lg:w-[min(75vw,90rem)] lg:px-0">
        <Card className="rounded-2xl border-neutral-200 bg-white shadow-[0_24px_60px_-42px_rgba(15,23,42,0.35)]">
          <CardHeader className="border-b-0 px-6 pt-6 pb-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">Översikt</p>
                <p className="max-w-2xl text-sm text-neutral-600">
                  {loading
                    ? "Laddar aktuell arbetsbelastning..."
                    : `${scopedOrders.length} aktiva ordrar över ${perms.tracks.length} spår${perms.tracks.length === 1 ? "" : ""}`}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-500"><Clock3 className="h-4 w-4" />Livestatus för arbetsflöde</div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-4 gap-1 px-2 pb-6 pt-0 sm:gap-1.5 sm:px-3 md:gap-2 md:px-4 xl:gap-3 xl:px-6">
            {summaryCards.map((card) => (
              <div key={card.title} className={`relative flex aspect-square min-w-0 flex-col items-stretch justify-start rounded-md border p-[clamp(0.25rem,1.1vw,0.75rem)] xl:aspect-auto xl:items-start xl:justify-between xl:rounded-xl xl:p-4 ${card.cls}`}>
                <p className="relative z-10 self-start text-left text-[clamp(0.55rem,1.6vw,0.78rem)] font-medium uppercase tracking-[0.04em] opacity-80 xl:text-xs">{card.title}</p>
                <p className="absolute inset-0 flex items-center justify-center text-[clamp(1.2rem,5.2vw,2.8rem)] font-semibold leading-none xl:relative xl:inset-auto xl:mt-3 xl:block xl:text-3xl">{loading ? "..." : card.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.65fr_1fr] ">
         
         
          <Card className="rounded-2xl border-neutral-200 bg-white shadow-sm ">
            <CardHeader className="border-neutral-200 px-6 py-5 ">
              <h2 className="text-lg font-semibold text-neutral-900">Senaste ordrar</h2>
              <p className="text-sm text-neutral-600">De 6 senaste ordrarna du klickade in i.</p>
            </CardHeader>
            <CardContent className="space-y-3 px-4 pb-5 pt-4 sm:px-6">
              {loading && (
                <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
                  <OrdinaLogoSpinner size={20} />
                  Laddar senaste ordrar...
                </div>
              )}
              {!loading && !recentOpenedOrders.length && (
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
                  Inga nyligen öppnade ordrar än.
                </div>
              )}
              {!loading &&
                recentOpenedOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={order.href}
                    className="group flex items-start justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-neutral-300 hover:bg-neutral-50"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-neutral-900">{order.title}</p>
                      <p className="text-sm text-neutral-600">#{order.id} - {order.customer}</p>
                      <p className="text-xs text-neutral-500">{order.createdAt ? `Skapad ${dateFmt.format(order.createdAt)}` : ""}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-neutral-600">
                      Öppna
                      <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                ))}
            </CardContent>
          </Card>

          <div className="space-y-6"><Card className="rounded-2xl border-neutral-200 bg-white shadow-sm"><CardHeader className="border-neutral-200 px-6 py-5"><h2 className="text-lg font-semibold text-neutral-900">Kalenderöversikt</h2><p className="text-sm text-neutral-600"></p></CardHeader><CardContent className="space-y-3 px-4 pb-5 pt-4 sm:px-6">{loading && <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600"><OrdinaLogoSpinner size={18} />Laddar schema...</div>}{!loading && !schedule.length && <p className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">Inget planerat de kommande 7 dagarna.</p>}{!loading && schedule.map((item) => <Link key={item.id} href={item.href} className="group flex items-start justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3 transition hover:border-neutral-300 hover:bg-neutral-50"><div><p className="text-sm font-semibold text-neutral-900">{item.title}</p><p className="text-xs text-neutral-600">{item.detail}</p><p className="mt-1 text-xs font-medium text-neutral-500">{dateTimeFmt.format(item.when)}</p></div><ArrowRight className="mt-1 h-4 w-4 text-neutral-400 transition group-hover:translate-x-1" /></Link>)}<Button asChild variant="outline" size="sm" className="w-full justify-center"><Link href={plannerLink}>{plannerLabel}</Link></Button></CardContent></Card>
          <Card className="rounded-2xl border-neutral-200 bg-white shadow-sm"><CardHeader className="border-neutral-200 px-6 py-5"><h2 className="text-lg font-semibold text-neutral-900">Snabbåtgärder</h2><p className="text-sm text-neutral-600"></p></CardHeader><CardContent className="grid gap-2 px-4 pb-5 pt-4 sm:px-6">{perms.quick.map((key) => { const meta = key === "planner" ? { ...QUICK_META.planner, href: plannerLink, description: plannerLabel } : QUICK_META[key]; const Icon = meta.icon; return <Link key={key} href={meta.href} className="group flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3 transition hover:shadow-sm"><span className="flex min-w-0 items-center gap-3"><span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-700"><Icon className="h-4 w-4" /></span><span className="min-w-0"><span className="block text-sm font-semibold text-neutral-900">{meta.title}</span><span className="block truncate text-xs text-neutral-500">{meta.description}</span></span></span><span className="inline-flex items-center gap-2 text-xs text-neutral-500">{key === "completed" && invoiceReady !== null ? `${invoiceReady}` : ""}<ChevronRight className="h-4 w-4" /></span></Link>; })}</CardContent></Card></div>
        </div>

        <Card className="rounded-2xl border-neutral-200 bg-white shadow-sm"><CardHeader className="border-neutral-200 px-6 py-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-neutral-900">Aktiva ordrar och projekt</h2><p className="text-sm text-neutral-600">Pågående jobb med steg, progress, deadline och risknivå.</p></div><Button asChild variant="outline" size="sm"><Link href="/orders/overview">Visa alla ordrar</Link></Button></div></CardHeader><CardContent className="space-y-3 px-4 pb-5 pt-4 sm:px-6">{loading && <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600"><OrdinaLogoSpinner size={20} />Laddar aktiva ordrar...</div>}{!loading && !activeOrders.length && <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">Inga aktiva ordrar i din vy.</div>}{!loading && activeOrders.map((order) => <Link key={order.id} href={`/orders/${encodeURIComponent(order.orderNumber)}`} className="group block rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-neutral-300 hover:bg-neutral-50"><div className="flex flex-wrap items-start justify-between gap-3"><div className="space-y-1"><p className="text-sm font-semibold text-neutral-900">{order.title}</p><p className="text-sm text-neutral-600">#{order.orderNumber} · {order.customer}</p></div><span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${order.risk === "blocked" ? "border-red-200 bg-red-50 text-red-700" : order.risk === "risk" ? "border-amber-200 bg-amber-50 text-amber-700" : order.risk === "ready" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-neutral-200 bg-neutral-50 text-neutral-700"}`}>{order.risk === "blocked" ? "Blockerad" : order.risk === "risk" ? "Behöver planering" : order.risk === "ready" ? "Klar" : "På rätt spår"}</span></div><div className="mt-3 grid gap-3 sm:grid-cols-3"><div><p className="text-xs uppercase tracking-wide text-neutral-500">Nuvarande steg</p><p className="text-sm font-medium text-neutral-800">{order.currentStage}</p></div><div><p className="text-xs uppercase tracking-wide text-neutral-500">Status</p><p className="text-sm font-medium text-neutral-800">{order.status}</p></div><div><p className="text-xs uppercase tracking-wide text-neutral-500">Deadline</p><p className="text-sm font-medium text-neutral-800">{relativeDeadline(order.deadline)}</p></div></div><div className="mt-3"><div className="mb-1 flex items-center justify-between text-xs text-neutral-500"><span>Progress</span><span>{order.progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-neutral-800" style={{ width: `${order.progress}%` }} /></div></div><div className="mt-3 flex flex-wrap gap-2">{order.tracks.map((track) => <span key={`${order.id}-${track.track}`} className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs text-neutral-600"><span className="font-semibold">{TRACK_NAMES[track.track]}</span><span>{STATUS_LABEL[track.status ?? "INKOMMANDE"]}</span></span>)}</div></Link>)}</CardContent></Card>

        <Card className="rounded-2xl border-neutral-200 bg-white shadow-sm"><CardHeader className="border-neutral-200 px-6 py-5"><h2 className="text-lg font-semibold text-neutral-900">Team- och arbetsflödesaktivitet</h2><p className="text-sm text-neutral-600">Senaste rörelser mellan avdelningar och arbetssteg.</p></CardHeader><CardContent className="space-y-2 px-4 pb-5 pt-4 sm:px-6">{loading && <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600"><OrdinaLogoSpinner size={18} />Laddar teamaktivitet...</div>}{!loading && !activity.length && <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">Ingen nylig aktivitet registrerad.</div>}{!loading && activity.map((item) => <div key={item.id} className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-3"><span className="mt-0.5">{item.tone === "success" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : item.tone === "warning" ? <AlertTriangle className="h-4 w-4 text-amber-600" /> : <Clock3 className="h-4 w-4 text-neutral-500" />}</span><div><p className="text-sm font-medium text-neutral-900">{item.text}</p><p className="text-xs text-neutral-500">{dateTimeFmt.format(item.when)}</p></div></div>)}</CardContent></Card>
      </main>
    </div>
  );
}
