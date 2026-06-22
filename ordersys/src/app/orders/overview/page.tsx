"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { memo, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { useSession } from "next-auth/react";
import { APP_TRACKS, isAppTrack, type AppTrack } from "@/lib/tracks";
import { STATUS_COLORS } from "@/lib/orderStatus";
import { Shimmer } from "@/components/Shimmer";
import CalendarModal from "@/components/calendar/CalendarModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CalendarClock,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  FolderOpen,
  MoreHorizontal,
  RotateCcw,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

type Role = "ADMIN" | "SALJARE" | "A_TEAM" | "B_TEAM" | "C_TEAM" | "D_TEAM";
type Track = AppTrack;
type TrackStatus = "INKOMMANDE" | "PAGAENDE" | "LEVERANS" | "AVSLUTAD";
type FileTrack = Track | "SHARED";

type OrderTrack = {
  track: Track;
  status: TrackStatus | null;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
};

type OrderRow = {
  orderNumber: string;
  title: string;
  customerName: string | null;
  createdById: string | null;
  createdByName: string | null;
  createdByEmail: string | null;
  createdAt: string | null;
  dueDate: string | null;
  tracks: OrderTrack[];
};

type UiFile = {
  id: string;
  filename: string;
  url: string;
  track: FileTrack;
  createdAt: string | null;
  uploadedBy?: string | null;
  uploadedByName?: string | null;
  uploadedByImage?: string | null;
};

type SummaryMap = Record<TrackStatus, number>;

type OwnerFilter = "all" | "mine";
type SellerFilter = "ALL" | string;

const TRACK_LABELS: Record<FileTrack, string> = {
  A: "Ateljé",
  B: "Verkstad",
  C: "Montage",
  D: "Bilmontage",
  SHARED: "Delad",
};

const STATUS_TITLES: Record<TrackStatus, string> = {
  INKOMMANDE: "Inkommande",
  PAGAENDE: "Pågående",
  LEVERANS: "Leverans",
  AVSLUTAD: "Avslutad",
};

const STATUS_STYLES: Record<TrackStatus, string> = {
  INKOMMANDE: STATUS_COLORS.INKOMMANDE,
  PAGAENDE: STATUS_COLORS.PAGAENDE,
  LEVERANS: STATUS_COLORS.LEVERANS,
  AVSLUTAD: STATUS_COLORS.AVSLUTAD,
};

const STATUS_SEQUENCE: TrackStatus[] = ["INKOMMANDE", "PAGAENDE", "LEVERANS", "AVSLUTAD"];
const STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "Alla statusar" },
  ...STATUS_SEQUENCE.map((status) => ({ value: status, label: STATUS_TITLES[status] })),
];

const TRACK_SCOPE: Record<Role, Track[]> = {
  ADMIN: [...APP_TRACKS],
  SALJARE: [...APP_TRACKS],
  A_TEAM: ["A"],
  B_TEAM: ["B"],
  C_TEAM: ["C"],
  D_TEAM: ["D"],
};

const actionButton =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 text-xs font-semibold text-neutral-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-300";

const STATUS_ACCENTS: Record<
  TrackStatus,
  { ring: string; dot: string; wash: string; line: string }
> = {
  INKOMMANDE: {
    ring: "border-blue-200 bg-blue-50 text-blue-700",
    dot: "bg-blue-500",
    wash: "from-blue-50/90",
    line: "border-l-blue-500",
  },
  PAGAENDE: {
    ring: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
    wash: "from-amber-50/90",
    line: "border-l-amber-500",
  },
  LEVERANS: {
    ring: "border-violet-200 bg-violet-50 text-violet-700",
    dot: "bg-violet-500",
    wash: "from-violet-50/90",
    line: "border-l-violet-500",
  },
  AVSLUTAD: {
    ring: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
    wash: "from-emerald-50/90",
    line: "border-l-emerald-500",
  },
};

function isTrack(x: unknown): x is Track {
  return isAppTrack(x);
}

function isTrackStatus(x: unknown): x is TrackStatus {
  return x === "INKOMMANDE" || x === "PAGAENDE" || x === "LEVERANS" || x === "AVSLUTAD";
}

function isFileTrack(x: unknown): x is FileTrack {
  return x === "SHARED" || isAppTrack(x);
}

function toStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str === "" ? null : str;
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value !== null && "toISOString" in value) {
    try {
      return (value as { toISOString: () => string }).toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

const dateFmt = new Intl.DateTimeFormat("sv-SE");
const dateTimeFmt = new Intl.DateTimeFormat("sv-SE", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatDate(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : dateFmt.format(d);
}

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : dateTimeFmt.format(d);
}

function formatPlannedRange(start: string | null, end: string | null): string {
  if (!start) return "Inte planerad";
  const startLabel = formatDateTime(start);
  if (!end) return startLabel;
  const endLabel = formatDateTime(end);
  return `${startLabel} - ${endLabel}`;
}

function toFileTrack(value: unknown): FileTrack {
  return isFileTrack(value) ? value : "SHARED";
}

function initials(name: string | null | undefined) {
  const parts = (name || "?").trim().split(/\s+/).filter(Boolean);
  return (parts.length ? parts.map((part) => part[0]).join("") : "?").slice(0, 2).toUpperCase();
}

function isOwnOrder(order: OrderRow, userId: string | null, userEmail: string | null): boolean {
  if (!userId && !userEmail) return false;
  if (userId && order.createdById && order.createdById === userId) {
    return true;
  }
  if (userEmail) {
    const creatorEmail = order.createdByEmail ? order.createdByEmail.toLowerCase() : null;
    if (creatorEmail && creatorEmail === userEmail.toLowerCase()) {
      return true;
    }
  }
  return false;
}

function getSellerKey(order: OrderRow): string | null {
  return order.createdById ?? order.createdByEmail ?? order.createdByName ?? null;
}

function getSellerLabel(order: OrderRow): string {
  return order.createdByName ?? order.createdByEmail ?? "Okänd säljare";
}

function getOrderTitle(order: OrderRow): string {
  const normalizedTitle = order.title.trim().toLowerCase();
  const normalizedNumber = order.orderNumber.trim().toLowerCase();
  if (
    normalizedTitle === normalizedNumber ||
    normalizedTitle === `#${normalizedNumber}` ||
    normalizedTitle === `order ${normalizedNumber}`
  ) {
    return order.customerName ?? `Order ${order.orderNumber}`;
  }
  return order.title;
}

function getOverallStatus(order: OrderRow): TrackStatus | null {
  const statuses = order.tracks.flatMap((track) => (track.status ? [track.status] : []));
  if (statuses.length === 0) return null;
  if (statuses.every((status) => status === "AVSLUTAD")) return "AVSLUTAD";
  if (statuses.includes("LEVERANS")) return "LEVERANS";
  if (statuses.includes("PAGAENDE")) return "PAGAENDE";
  return statuses.includes("INKOMMANDE") ? "INKOMMANDE" : "AVSLUTAD";
}

function TrackBadge({
  track,
  status,
  muted,
  isLoading = false,
}: {
  track: Track;
  status: TrackStatus | null;
  muted?: boolean;
  isLoading?: boolean;
}) {
  const base =
    "rounded-full border px-2 py-1 text-xs font-semibold inline-flex items-center justify-center gap-1 transition";
  const mutedClass = muted ? "opacity-40" : "";

  if (!status) {
    return (
      <Shimmer variant="pill" isLoading={isLoading} className="inline-block">
        <Badge className={`${base} bg-neutral-100 text-neutral-600 border-neutral-200 ${mutedClass} transition-all duration-300`}>
          {TRACK_LABELS[track]}: -
        </Badge>
      </Shimmer>
    );
  }
  
  return (
    <Shimmer variant="pill" isLoading={isLoading} className="inline-block">
      <Badge className={`${base} ${STATUS_STYLES[status]} ${mutedClass} transition-all duration-300`}>
        {TRACK_LABELS[track]}: {STATUS_TITLES[status]}
      </Badge>
    </Shimmer>
  );
}

const FilesList = memo(function FilesList({
  orderNumber,
  files,
  onDelete,
  loading,
  canDeleteFiles,
}: {
  orderNumber: string;
  files: UiFile[];
  loading: boolean;
  onDelete: (orderNumber: string, fileId: string, filename: string) => Promise<void>;
  canDeleteFiles: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white/80 px-3 py-2 text-sm text-neutral-500">
        <FolderOpen className="h-4 w-4" aria-hidden />
        Hämtar filer...
      </div>
    );
  }

  if (!files.length) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-200 bg-white/70 px-4 py-3 text-sm text-neutral-500">
        Inga filer ännu.
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {files.map((file) => (
        <div
          key={file.id}
          className="group rounded-lg border border-neutral-200 bg-white p-3 transition hover:border-brand-200"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-600">
              <FileText className="h-3.5 w-3.5" aria-hidden />
              {TRACK_LABELS[file.track]}
            </div>
            <ExternalLink className="h-4 w-4 text-neutral-300 transition group-hover:text-brand-500" aria-hidden />
          </div>
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block break-all text-sm font-semibold text-neutral-900 underline-offset-2 hover:text-brand-700 hover:underline"
          >
            {file.filename}
          </a>
          <div className="mt-1 text-xs text-neutral-500">{formatDateTime(file.createdAt)}</div>
          {(file.uploadedByName || file.uploadedBy) ? (
            <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full border border-brand-100 bg-white px-2 py-1 text-xs text-neutral-600">
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50 text-[10px] font-semibold text-brand-700">
                {file.uploadedByImage ? (
                  <img src={file.uploadedByImage} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials(file.uploadedByName ?? file.uploadedBy)
                )}
              </span>
              <span className="truncate">{file.uploadedByName ?? file.uploadedBy}</span>
            </div>
          ) : null}
          {canDeleteFiles ? (
            <button
              type="button"
              onClick={() => void onDelete(orderNumber, file.id, file.filename)}
              className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Ta bort
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
});

const OrderCard = memo(function OrderCard({
  order,
  open,
  files,
  loadingFiles,
  onToggle,
  onDeleteFile,
  onOpenCalendar,
  canDeleteFiles,
}: {
  order: OrderRow;
  open: boolean;
  files: UiFile[];
  loadingFiles: boolean;
  onToggle: (orderNumber: string) => void;
  onDeleteFile: (orderNumber: string, fileId: string, filename: string) => Promise<void>;
  onOpenCalendar: (
    track: Track,
    initialRange: { start?: string; end?: string },
  ) => void;
  canDeleteFiles: boolean;
}) {
  const creatorLabel = order.createdByName ?? order.createdByEmail ?? "Okänd";
  const plannedTracks = order.tracks.filter((track) => Boolean(track.plannedStartAt));
  const completedTracks = order.tracks.filter((track) => track.status === "AVSLUTAD").length;
  const primaryStatus = getOverallStatus(order);
  const primaryAccent = primaryStatus ? STATUS_ACCENTS[primaryStatus] : null;
  const displayTitle = getOrderTitle(order);

  return (
    <Card
      className={`overflow-hidden rounded-xl border border-l-4 border-neutral-200 bg-gradient-to-r ${primaryAccent?.line ?? "border-l-neutral-300"} ${primaryAccent?.wash ?? "from-neutral-50"} via-white to-white shadow-[0_14px_42px_-34px_rgba(15,23,42,0.55)] transition duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-[0_20px_50px_-34px_rgba(15,23,42,0.62)]`}
    >
      <div className="relative min-h-[136px] p-4 sm:px-5 sm:py-4">
        <Link
          href={`/orders/${encodeURIComponent(order.orderNumber)}`}
          className="absolute inset-0 z-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-brand-400"
          aria-label={`Öppna order ${order.orderNumber}: ${displayTitle}`}
        />
        <div className="pointer-events-none relative z-10 flex h-full flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <h2 className="min-w-0 text-base font-semibold text-neutral-950 sm:text-lg">
                <span className="text-neutral-500">#{order.orderNumber}</span>
                <span className="px-1.5 text-neutral-300">·</span>
                {displayTitle}
              </h2>
              {primaryStatus ? (
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${primaryAccent?.ring}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${primaryAccent?.dot}`} />
                  {STATUS_TITLES[primaryStatus]}
                </span>
              ) : null}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 sm:text-sm">
              <span>{order.customerName ?? "Okänd kund"}</span>
              <span className="inline-flex items-center gap-1">
                <UserRound className="h-3.5 w-3.5" aria-hidden />
                {creatorLabel}
              </span>
              <span>Skapad {formatDate(order.createdAt)}</span>
              <span>Deadline {order.dueDate ? formatDate(order.dueDate) : "saknas"}</span>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {order.tracks.map(({ track, status }) => (
                <TrackBadge key={track} track={track} status={status} />
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
              <span className="inline-flex items-center gap-1.5 font-medium text-neutral-700">
                <CalendarClock className="h-3.5 w-3.5 text-brand-600" aria-hidden />
                {plannedTracks.length}/{order.tracks.length} planerade
              </span>
              <span>{completedTracks}/{order.tracks.length} spår klara</span>
              {plannedTracks.slice(0, 2).map((track) => (
                <span key={track.track} className="text-neutral-500">
                  {TRACK_LABELS[track.track]} {formatDate(track.plannedStartAt)}
                </span>
              ))}
              {plannedTracks.length === 0 ? <span>Ingen kalenderplanering ännu</span> : null}
            </div>
          </div>

          <div className="pointer-events-auto flex shrink-0 items-center gap-2">
            <Link href={`/orders/${encodeURIComponent(order.orderNumber)}`} className={actionButton}>
              Öppna
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
                  aria-label={`Fler åtgärder för order ${order.orderNumber}`}
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onToggle(order.orderNumber)}>
                  <FolderOpen className="h-4 w-4" aria-hidden />
                  {open ? "Dölj planering och filer" : "Visa planering och filer"}
                </DropdownMenuItem>
                {plannedTracks[0] ? (
                  <DropdownMenuItem
                    onSelect={() =>
                      onOpenCalendar(plannedTracks[0].track, {
                        start: plannedTracks[0].plannedStartAt ?? undefined,
                        end: plannedTracks[0].plannedEndAt ?? undefined,
                      })
                    }
                  >
                    <CalendarClock className="h-4 w-4" aria-hidden />
                    Öppna planering
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {open && (
        <div
          id={`details-${order.orderNumber}`}
          className="animate-in fade-in slide-in-from-top-1 border-t border-neutral-200 bg-white/75 p-4 duration-200 sm:p-5"
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-neutral-700">
                <CalendarClock className="h-4 w-4 text-brand-600" aria-hidden />
                Planering
              </div>
              {plannedTracks.length === 0 ? (
                <p className="text-sm text-neutral-500">Ingen planerad tid i kalendern.</p>
              ) : (
                <div className="divide-y divide-neutral-200 border-y border-neutral-200">
                  {plannedTracks.map((trackRow) => (
                    <button
                      key={`${order.orderNumber}-${trackRow.track}`}
                      type="button"
                      onClick={() =>
                        onOpenCalendar(trackRow.track, {
                          start: trackRow.plannedStartAt ?? undefined,
                          end: trackRow.plannedEndAt ?? undefined,
                        })
                      }
                      className="flex w-full min-w-0 items-center justify-between gap-3 py-2 text-left transition hover:text-brand-700"
                    >
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold">{TRACK_LABELS[trackRow.track]}</span>
                        <span className="block truncate text-xs text-neutral-500">
                          {formatPlannedRange(trackRow.plannedStartAt, trackRow.plannedEndAt)}
                        </span>
                      </span>
                      <ExternalLink className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-neutral-700">
                <FolderOpen className="h-4 w-4 text-brand-600" aria-hidden />
                Filer
              </div>
              <FilesList
                orderNumber={order.orderNumber}
                files={files}
                loading={loadingFiles}
                onDelete={onDeleteFile}
                canDeleteFiles={canDeleteFiles}
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
});

const LoadingList = memo(function LoadingList() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, idx) => (
        <div
          key={idx}
          className="h-24 animate-pulse rounded-xl border border-neutral-200 bg-white"
        />
      ))}
    </div>
  );
});

const EmptyState = memo(function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <Card className="rounded-xl border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-600 shadow-none">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-500">
        <Search className="h-5 w-5" aria-hidden />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-neutral-900">{title}</h2>
      <p className="mt-2 text-sm text-neutral-600">{description}</p>
      {children ? <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div> : null}
    </Card>
  );
});

export default function OrdersOverviewPage() {
  const [query, setQuery] = useState("");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [openRows, setOpenRows] = useState<Record<string, boolean>>({});
  const [filesByOrder, setFilesByOrder] = useState<Record<string, UiFile[]>>({});
  const [loadingFiles, setLoadingFiles] = useState<Record<string, boolean>>({});
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("all");
  const [sellerFilter, setSellerFilter] = useState<SellerFilter>("ALL");
  const [trackFilter, setTrackFilter] = useState<Track | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<TrackStatus | "ALL">("ALL");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarTrack, setCalendarTrack] = useState<Track>(APP_TRACKS[0]);
  const [calendarInitialRange, setCalendarInitialRange] = useState<{ start?: string; end?: string }>({});

  const { data: session, status: sessionStatus } = useSession();
  const sessionUser = session?.user as { id?: string | null; email?: string | null; role?: Role | string } | undefined;
  const sessionUserId = typeof sessionUser?.id === "string" ? sessionUser.id : null;
  const sessionUserEmail = typeof sessionUser?.email === "string" ? sessionUser.email.trim().toLowerCase() : null;
  const role = (sessionUser?.role as Role | undefined) ?? undefined;
  const canDeleteFiles = role === "ADMIN" || role === "SALJARE";

  const showOwnerFilter = role === "SALJARE";
  const canFilterToMine = showOwnerFilter && sessionStatus === "authenticated" && Boolean(sessionUserId || sessionUserEmail);
  const effectiveOwnerFilter: OwnerFilter = showOwnerFilter && ownerFilter === "mine" && canFilterToMine ? "mine" : "all";
  const mineDisabled = !canFilterToMine;

  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const availableTracks = useMemo(() => {
    if (role && TRACK_SCOPE[role]) {
      return TRACK_SCOPE[role];
    }
    return APP_TRACKS;
  }, [role]);

  const sellerOptions = useMemo(() => {
    const sellers = new Map<string, string>();
    for (const order of orders) {
      const key = getSellerKey(order);
      if (!key) continue;
      if (!sellers.has(key)) {
        sellers.set(key, getSellerLabel(order));
      }
    }

    return Array.from(sellers.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "sv"));
  }, [orders]);

  const trackFilterOptions = useMemo(
    () => [
      { value: "ALL", label: "Alla spår" },
      ...availableTracks.map((track) => ({ value: track, label: TRACK_LABELS[track] })),
    ],
    [availableTracks],
  );

  const sellerFilterOptions = useMemo(
    () => [
      { value: "ALL", label: "Alla säljare" },
      ...(showOwnerFilter
        ? [{ value: "MINE", label: "Mina ordrar", disabled: mineDisabled }]
        : []),
      ...sellerOptions,
    ],
    [mineDisabled, sellerOptions, showOwnerFilter],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch("/api/orders", { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());

        const json = await res.json();
        const rawSource = [json?.orders, json?.Orders, json?.items, json].find(Array.isArray) as any[] | undefined;
        const raw = rawSource ?? [];

        const mapped = (raw
          .filter((item: any) => !item?.billingConfirmedAt)
          .map((item: any): OrderRow | null => {
            const orderNumber = toStringOrNull(
              item?.orderNumber ?? item?.fortnox?.DocumentNumber ?? item?.DocumentNumber,
            );
            if (!orderNumber) return null;

            const title =
              toStringOrNull(item?.title) ??
              toStringOrNull(item?.fortnox?.Title) ??
              `Order ${orderNumber}`;

            const customerName =
              toStringOrNull(item?.customerName) ?? toStringOrNull(item?.fortnox?.CustomerName) ?? null;
            const createdById = toStringOrNull(item?.createdById ?? item?.createdBy?.id);
            const createdByName =
              toStringOrNull(item?.createdByName) ?? toStringOrNull(item?.createdBy?.name) ?? null;
            const createdByEmail = toStringOrNull(item?.createdByEmail ?? item?.createdBy?.email) ?? null;

            const trackStatuses: Partial<Record<Track, TrackStatus | null>> = {};
            const plannedStarts: Partial<Record<Track, string | null>> = {};
            const plannedEnds: Partial<Record<Track, string | null>> = {};
            for (const t of (item?.tracks ?? []) as Array<{ track?: unknown; status?: unknown; plannedStartAt?: unknown; plannedEndAt?: unknown }>) {
              if (!isTrack(t?.track)) continue;
              trackStatuses[t.track] = isTrackStatus(t?.status) ? t.status : null;
              plannedStarts[t.track] = toIso(t?.plannedStartAt);
              plannedEnds[t.track] = toIso(t?.plannedEndAt);
            }

            return {
              orderNumber,
              title,
              customerName,
              createdById,
              createdByName,
              createdByEmail,
              createdAt: toIso(item?.createdAt),
              dueDate: toIso(item?.dueDate) ?? toIso(item?.fortnox?.DeliveryDate),
              tracks: APP_TRACKS.map((track) => ({
                track,
                status: trackStatuses[track] ?? null,
                plannedStartAt: plannedStarts[track] ?? null,
                plannedEndAt: plannedEnds[track] ?? null,
              })),
            };
          })
          .filter(Boolean)) as OrderRow[];

        if (!cancelled) setOrders(mapped);
      } catch {
        if (!cancelled) setErr("Kunde inte hämta ordrar.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((order) => {
      const matchesQuery =
        !deferredQuery ||
        [order.orderNumber, order.title, order.customerName ?? ""].some((v) =>
          v.toLowerCase().includes(deferredQuery),
        );
      if (!matchesQuery) return false;

      if (effectiveOwnerFilter === "mine" && !isOwnOrder(order, sessionUserId, sessionUserEmail)) {
        return false;
      }

      if (sellerFilter !== "ALL" && getSellerKey(order) !== sellerFilter) {
        return false;
      }

      if (trackFilter !== "ALL") {
        const hasTrack = order.tracks.some((t) => t.track === trackFilter);
        if (!hasTrack) return false;
      }

      if (statusFilter !== "ALL") {
        const hasStatus = order.tracks.some((t) => t.status === statusFilter);
        if (!hasStatus) return false;
      }

      return true;
    });
  }, [
    orders,
    deferredQuery,
    effectiveOwnerFilter,
    sellerFilter,
    sessionUserEmail,
    sessionUserId,
    trackFilter,
    statusFilter,
  ]);

  const statusTotals: SummaryMap = useMemo(() => {
    const totals: SummaryMap = {
      INKOMMANDE: 0,
      PAGAENDE: 0,
      LEVERANS: 0,
      AVSLUTAD: 0,
    };
    for (const order of filtered) {
      const orderStatuses = new Set<TrackStatus>();
      for (const t of order.tracks) {
        if (t.status) {
          orderStatuses.add(t.status);
        }
      }
      orderStatuses.forEach((s) => {
        totals[s] += 1;
      });
    }
    return totals;
  }, [filtered]);

  async function toggleFiles(orderNumber: string) {
    setOpenRows((prev) => ({ ...prev, [orderNumber]: !prev[orderNumber] }));
    if (!filesByOrder[orderNumber]) {
      setLoadingFiles((prev) => ({ ...prev, [orderNumber]: true }));
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}`, { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        const files = (json?.order?.files ?? [])
          .map((f: any) => {
            const id = toStringOrNull(f?.id);
            const filename = toStringOrNull(f?.filename);
            const url = toStringOrNull(f?.url);
            if (!id || !filename || !url) return null;
            return {
              id,
              filename,
              url,
              track: toFileTrack(f?.track),
              createdAt: toIso(f?.createdAt),
              uploadedBy: toStringOrNull(f?.uploadedBy),
              uploadedByName: toStringOrNull(f?.uploadedByName),
              uploadedByImage: toStringOrNull(f?.uploadedByImage),
            } as UiFile;
          })
          .filter(Boolean) as UiFile[];
        setFilesByOrder((prev) => ({ ...prev, [orderNumber]: files }));
      } catch (error) {
        console.error(error);
        setFilesByOrder((prev) => ({ ...prev, [orderNumber]: [] }));
      } finally {
        setLoadingFiles((prev) => ({ ...prev, [orderNumber]: false }));
      }
    }
  }

  async function deleteFile(orderNumber: string, fileId: string, filename: string) {
    if (!confirm(`Ta bort filen "${filename}"?`)) return;
    const res = await fetch(
      `/api/orders/${encodeURIComponent(orderNumber)}/files/${encodeURIComponent(fileId)}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      alert("Kunde inte ta bort filen.");
      return;
    }
    setFilesByOrder((prev) => ({
      ...prev,
      [orderNumber]: (prev[orderNumber] ?? []).filter((f) => f.id !== fileId),
    }));
  }

  function clearFilters() {
    setQuery("");
    setTrackFilter("ALL");
    setStatusFilter("ALL");
    setSellerFilter("ALL");
    if (showOwnerFilter) {
      setOwnerFilter("all");
    }
  }

  const hasResults = filtered.length > 0;

  function openCalendarForTrack(track: Track, initialRange: { start?: string; end?: string }) {
    setCalendarInitialRange(initialRange);
    setCalendarTrack(track);
    setCalendarOpen(true);
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto w-full max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="border-b border-neutral-200 pb-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-baseline gap-3">
                <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">Aktiva ordrar</h1>
                <span className="text-sm font-medium text-neutral-500">
                  {filtered.length} av {orders.length}
                </span>
              </div>
              <p className="mt-1 text-sm text-neutral-500">Sök, filtrera och öppna orderdetaljer.</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-600 sm:text-sm">
              {STATUS_SEQUENCE.map((status, index) => (
                <span
                  key={status}
                  className={`inline-flex items-center gap-3 transition-opacity ${statusTotals[status] === 0 ? "opacity-35" : "opacity-100"}`}
                >
                  {index > 0 ? <span className="text-neutral-300">·</span> : null}
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_ACCENTS[status].dot}`} />
                    {status === "AVSLUTAD" ? "Avslutade" : STATUS_TITLES[status]}{" "}
                    <strong className="font-semibold text-neutral-900">{statusTotals[status]}</strong>
                  </span>
                </span>
              ))}
            </div>
          </div>
        </header>

        <section className="border-b border-neutral-200 py-4">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_180px_180px_220px_40px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden />
              <label className="sr-only" htmlFor="order-search">Sök ordernummer, titel eller kund</label>
              <input
                id="order-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Sök ordernummer, titel eller kund"
                className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-sm text-neutral-700 placeholder:text-neutral-400 focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-brand-300"
              />
            </div>
            <FilterDropdown
              label="Spår"
              value={trackFilter}
              options={trackFilterOptions}
              onValueChange={(value) => setTrackFilter(value as Track | "ALL")}
            />
            <FilterDropdown
              label="Status"
              value={statusFilter}
              options={STATUS_FILTER_OPTIONS}
              onValueChange={(value) => setStatusFilter(value as TrackStatus | "ALL")}
            />
            <FilterDropdown
              label="Säljare"
              value={effectiveOwnerFilter === "mine" ? "MINE" : sellerFilter}
              options={sellerFilterOptions}
              onValueChange={(value) => {
                if (value === "MINE") {
                  setOwnerFilter("mine");
                  setSellerFilter("ALL");
                } else {
                  setOwnerFilter("all");
                  setSellerFilter(value);
                }
              }}
              disabled={sellerOptions.length === 0 && !showOwnerFilter}
            />
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
              aria-label="Nollställ sökning och filter"
              title="Nollställ filter"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {query || trackFilter !== "ALL" || statusFilter !== "ALL" || sellerFilter !== "ALL" || effectiveOwnerFilter === "mine" ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {query ? <button type="button" onClick={() => setQuery("")} className="inline-flex items-center gap-1 rounded-full bg-neutral-200 px-2.5 py-1 text-xs text-neutral-700">Sök: {query}<X className="h-3 w-3" aria-hidden /></button> : null}
              {trackFilter !== "ALL" ? <button type="button" onClick={() => setTrackFilter("ALL")} className="inline-flex items-center gap-1 rounded-full bg-neutral-200 px-2.5 py-1 text-xs text-neutral-700">{TRACK_LABELS[trackFilter]}<X className="h-3 w-3" aria-hidden /></button> : null}
              {statusFilter !== "ALL" ? <button type="button" onClick={() => setStatusFilter("ALL")} className="inline-flex items-center gap-1 rounded-full bg-neutral-200 px-2.5 py-1 text-xs text-neutral-700">{STATUS_TITLES[statusFilter]}<X className="h-3 w-3" aria-hidden /></button> : null}
              {sellerFilter !== "ALL" ? <button type="button" onClick={() => setSellerFilter("ALL")} className="inline-flex items-center gap-1 rounded-full bg-neutral-200 px-2.5 py-1 text-xs text-neutral-700">{sellerOptions.find((seller) => seller.value === sellerFilter)?.label ?? "Säljare"}<X className="h-3 w-3" aria-hidden /></button> : null}
              {effectiveOwnerFilter === "mine" ? <button type="button" onClick={() => setOwnerFilter("all")} className="inline-flex items-center gap-1 rounded-full bg-neutral-200 px-2.5 py-1 text-xs text-neutral-700">Mina ordrar<X className="h-3 w-3" aria-hidden /></button> : null}
            </div>
          ) : null}
        </section>

        <div className="pt-4">
          {loading && <LoadingList />}

          {!loading && err && (
            <EmptyState title="Något gick fel" description={err} />
          )}

          {!loading && !err && !hasResults && (
            <EmptyState
              title="Inga ordrar hittades"
              description={
                orders.length === 0
                  ? "När nya ordrar skapas visas de här med spår, planering, filer och nästa åtgärd."
                  : "Justera filtren eller sökningen för att hitta det du letar efter."
              }
            >
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
              >
                 <RotateCcw className="h-4 w-4" aria-hidden />
                Nollställ filter
              </button>
              <Link href="/orders/new" className={actionButton}>
                Skapa order
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            </EmptyState>
          )}

          {!loading && !err && hasResults && (
            <div className="space-y-2">
              {filtered.map((order) => (
                <OrderCard
                  key={order.orderNumber}
                  order={order}
                  open={!!openRows[order.orderNumber]}
                  files={filesByOrder[order.orderNumber] ?? []}
                  loadingFiles={!!loadingFiles[order.orderNumber]}
                  onToggle={toggleFiles}
                  onDeleteFile={deleteFile}
                  onOpenCalendar={openCalendarForTrack}
                  canDeleteFiles={canDeleteFiles}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <CalendarModal
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        activeTrack={calendarTrack}
        initialRange={calendarInitialRange}
        activeTracks={[calendarTrack]}
      />
    </div>
  );
}

const FilterDropdown = memo(function FilterDropdown({
  label,
  value,
  options,
  onValueChange,
  disabled,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}) {
  const selectedLabel = options.find((option) => option.value === value)?.label ?? label;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          className="inline-flex h-10 w-full items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 transition hover:border-brand-300 hover:bg-brand-50/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[var(--radix-dropdown-menu-trigger-width)]">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
