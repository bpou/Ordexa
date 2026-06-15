"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { memo, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { MuseoModerno } from "next/font/google";
import { useSession } from "next-auth/react";
import { APP_TRACKS, isAppTrack, type AppTrack } from "@/lib/tracks";
import { STATUS_COLORS } from "@/lib/orderStatus";
import { Shimmer } from "@/components/Shimmer";
import CalendarModal from "@/components/calendar/CalendarModal";
import {
  CalendarClock,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Compass,
  ExternalLink,
  FileText,
  FolderOpen,
  Layers3,
  Search,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trash2,
  UserRound,
  UsersRound,
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

const museoModerno = MuseoModerno({
  subsets: ["latin"],
  weight: ["400", "700"],
});

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

const STATUS_DESCRIPTIONS: Record<TrackStatus, string> = {
  INKOMMANDE: "Nyligen inkomna uppdrag redo att planeras",
  PAGAENDE: "Spår där arbetet är igång",
  LEVERANS: "Ordrar på väg till kund",
  AVSLUTAD: "Färdigställda ordrar som väntar på fakturering",
};

const STATUS_STYLES: Record<TrackStatus, string> = {
  INKOMMANDE: STATUS_COLORS.INKOMMANDE,
  PAGAENDE: STATUS_COLORS.PAGAENDE,
  LEVERANS: STATUS_COLORS.LEVERANS,
  AVSLUTAD: STATUS_COLORS.AVSLUTAD,
};

const STATUS_SEQUENCE: TrackStatus[] = ["INKOMMANDE", "PAGAENDE", "LEVERANS", "AVSLUTAD"];

const TRACK_SCOPE: Record<Role, Track[]> = {
  ADMIN: [...APP_TRACKS],
  SALJARE: [...APP_TRACKS],
  A_TEAM: ["A"],
  B_TEAM: ["B"],
  C_TEAM: ["C"],
  D_TEAM: ["D"],
};

const actionButton =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-800 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-300";

const STATUS_ACCENTS: Record<TrackStatus, { ring: string; dot: string; wash: string }> = {
  INKOMMANDE: {
    ring: "border-blue-200 bg-blue-50 text-blue-700",
    dot: "bg-blue-500",
    wash: "from-blue-50/90",
  },
  PAGAENDE: {
    ring: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
    wash: "from-amber-50/90",
  },
  LEVERANS: {
    ring: "border-violet-200 bg-violet-50 text-violet-700",
    dot: "bg-violet-500",
    wash: "from-violet-50/90",
  },
  AVSLUTAD: {
    ring: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
    wash: "from-emerald-50/90",
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
          className="group rounded-xl border border-neutral-200 bg-white p-4 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[0_24px_58px_-34px_rgba(15,23,42,0.45)]"
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

const SummaryTile = memo(function SummaryTile({
  status,
  total,
}: {
  status: TrackStatus;
  total: number;
}) {
  const accent = STATUS_ACCENTS[status];
  return (
    <Card className={`relative flex min-h-[132px] overflow-hidden rounded-2xl border-neutral-200 bg-gradient-to-br ${accent.wash} via-white to-white p-5 shadow-[0_22px_58px_-42px_rgba(15,23,42,0.55)]`}>
      <div className="absolute -right-8 -top-10 h-24 w-24 rounded-full bg-white/70 blur-2xl" />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-center justify-between gap-3">
          <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border ${accent.ring}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${accent.dot}`} />
          </div>
          <div className="text-3xl font-semibold tabular-nums text-neutral-950">{total}</div>
        </div>
        <div className="mt-4">
          <div className="text-xs font-semibold text-neutral-900">{STATUS_TITLES[status]}</div>
          <p className="mt-1 text-xs leading-relaxed text-neutral-500">{STATUS_DESCRIPTIONS[status]}</p>
        </div>
      </div>
    </Card>
  );
});

const FilterPill = memo(function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 items-center rounded-lg border px-3 text-xs font-semibold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-300 ${
        active
          ? "border-neutral-900 bg-neutral-950 text-white shadow-[0_16px_34px_-26px_rgba(15,23,42,0.9)]"
          : "border-neutral-200 bg-white text-neutral-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800"
      }`}
    >
      {label}
    </button>
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
  activeTrack,
  activeStatus,
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
  activeTrack: Track | "ALL";
  activeStatus: TrackStatus | "ALL";
  canDeleteFiles: boolean;
}) {
  const creatorLabel = order.createdByName ?? order.createdByEmail ?? "Okänd";
  const hasCreator = Boolean(order.createdByName ?? order.createdByEmail);
  const plannedTracks = order.tracks.filter((track) => Boolean(track.plannedStartAt));
  const primaryStatus = order.tracks.find((track) => track.status)?.status ?? null;
  const primaryAccent = primaryStatus ? STATUS_ACCENTS[primaryStatus] : null;

  return (
    <Card className="group relative overflow-hidden rounded-2xl border-neutral-200 bg-white shadow-[0_24px_80px_-58px_rgba(15,23,42,0.65)] transition duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[0_30px_90px_-54px_rgba(15,23,42,0.58)]">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500 via-sky-400 to-amber-400" />
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-600">
                  #{order.orderNumber}
                </span>
                {primaryStatus ? (
                  <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${primaryAccent?.ring}`}>
                    <span className={`h-2 w-2 rounded-full ${primaryAccent?.dot}`} />
                    {STATUS_TITLES[primaryStatus]}
                  </span>
                ) : null}
              </div>
              <h2 className="mt-3 text-xl font-semibold leading-tight text-neutral-950">{order.title}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-neutral-500">
                <span className="inline-flex items-center gap-1.5">
                  <UserRound className="h-4 w-4" aria-hidden />
                  {order.customerName ?? "Okänd kund"}
                </span>
                <span>Skapad {formatDate(order.createdAt)}</span>
                {order.dueDate ? <span>Leverans {formatDate(order.dueDate)}</span> : null}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <Link href={`/orders/${encodeURIComponent(order.orderNumber)}`} className={actionButton}>
                Öppna
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`files-${order.orderNumber}`}
                onClick={() => onToggle(order.orderNumber)}
                className={actionButton}
              >
                <FolderOpen className="h-4 w-4" aria-hidden />
                {open ? "Dölj filer" : "Filer"}
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {order.tracks.map(({ track, status }) => {
              const muted =
                (activeTrack !== "ALL" && track !== activeTrack) ||
                (activeStatus !== "ALL" && status !== activeStatus);
              return (
                <TrackBadge key={track} track={track} status={status} muted={muted} />
              );
            })}
          </div>

          <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50/70 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                <CalendarClock className="h-4 w-4 text-brand-600" aria-hidden />
                Planering
              </div>
              <span className="text-xs tabular-nums text-neutral-500">{plannedTracks.length}/{order.tracks.length} planerade</span>
            </div>
            {plannedTracks.length === 0 ? (
              <div className="rounded-lg border border-dashed border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-500">
                Ingen planerad tid i kalendern.
              </div>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
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
                    className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-left shadow-sm transition hover:border-brand-200 hover:bg-brand-50"
                  >
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-neutral-800">
                        {TRACK_LABELS[trackRow.track]}
                      </span>
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
        </div>

        <aside className="border-t border-neutral-200 bg-gradient-to-br from-neutral-50 via-white to-brand-50/70 p-5 lg:border-l lg:border-t-0">
          <div className="grid gap-3 text-sm">
            <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <UserRound className="h-4 w-4" aria-hidden />
                Säljare
              </div>
              <p className={`mt-2 truncate text-sm font-semibold ${hasCreator ? "text-neutral-900" : "italic text-neutral-400"}`}>
                {creatorLabel}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Spår</div>
                <p className="mt-2 text-2xl font-semibold text-neutral-950">{order.tracks.length}</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Plan</div>
                <p className="mt-2 text-2xl font-semibold text-neutral-950">{plannedTracks.length}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {open && (
        <div
          id={`files-${order.orderNumber}`}
          className="border-t border-neutral-200 bg-neutral-50/80 p-4 sm:p-5"
        >
          <FilesList
            orderNumber={order.orderNumber}
            files={files}
            loading={loadingFiles}
            onDelete={onDeleteFile}
            canDeleteFiles={canDeleteFiles}
          />
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
          className="h-64 animate-pulse rounded-2xl border border-neutral-200 bg-gradient-to-br from-white via-neutral-50 to-brand-50/60 shadow-[0_22px_70px_-56px_rgba(15,23,42,0.6)]"
        />
      ))}
    </div>
  );
});

function roleFocus(role: Role | undefined) {
  if (role === "SALJARE") {
    return {
      title: "Säljarfokus",
      description: "Skapa skarpa orderunderlag, följ mina ordrar och lämna färdiga jobb rena till fakturering.",
      primaryHref: "/orders/new",
      primaryLabel: "Skapa order",
      secondaryHref: "/orders/archived",
      secondaryLabel: "Arkiv",
      cards: [
        ["Nya order", "Starta med kund, rader, leverans och spår."],
        ["Mina ordrar", "Växla till egna ordrar när listan blir tung."],
        ["Fakturering", "Färdiga spår syns tydligare innan arkivering."],
      ],
    };
  }

  if (role === "ADMIN") {
    return {
      title: "Adminöverblick",
      description: "Håll teamets flöde rent: planering, stoppade spår, filer och säljare på samma yta.",
      primaryHref: "/admin/users",
      primaryLabel: "Hantera team",
      secondaryHref: "/orders/new",
      secondaryLabel: "Ny order",
      cards: [
        ["Kapacitet", "Se vilka spår som saknar planering."],
        ["Kvalitet", "Öppna ordern direkt när filer eller tider saknas."],
        ["Styrning", "Filtrera på säljare, status och spår."],
      ],
    };
  }

  const track = role === "A_TEAM" ? "A" : role === "B_TEAM" ? "B" : role === "C_TEAM" ? "C" : role === "D_TEAM" ? "D" : "A";
  return {
    title: "Dagens arbetskö",
    description: "Fokusera på rätt spår, planera nästa lucka och håll tidrapporteringen nära jobbet.",
    primaryHref: `/orders/track/${track}`,
    primaryLabel: "Öppna spåret",
    secondaryHref: `/calendar/${track.toLowerCase()}`,
    secondaryLabel: "Kalender",
    cards: [
      ["Status", "Flytta ordern när arbetet går vidare."],
      ["Tid", "Registrera minuter direkt på ordern."],
      ["Plan", "Öppna kalendern från orderkortet."],
    ],
  };
}

const RoleOnboardingPanel = memo(function RoleOnboardingPanel({
  role,
  ordersCount,
  filteredCount,
}: {
  role: Role | undefined;
  ordersCount: number;
  filteredCount: number;
}) {
  const focus = roleFocus(role);
  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-950 text-white shadow-[0_26px_80px_-54px_rgba(15,23,42,0.8)]">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="p-5 sm:p-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-white/70">
            <Compass className="h-3.5 w-3.5" aria-hidden />
            Rollbaserad start
          </div>
          <h2 className="mt-4 text-2xl font-semibold leading-tight">{focus.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/68">{focus.description}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href={focus.primaryHref}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-3.5 text-sm font-semibold text-neutral-950 shadow-sm transition hover:bg-brand-50"
            >
              {focus.primaryLabel}
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href={focus.secondaryHref}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3.5 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              {focus.secondaryLabel}
            </Link>
          </div>
        </div>
        <div className="grid gap-3 border-t border-white/10 bg-white/[0.04] p-4 sm:grid-cols-3 lg:grid-cols-1 lg:border-l lg:border-t-0">
          <div className="grid grid-cols-2 gap-3 sm:col-span-3 lg:col-span-1">
            <div className="rounded-xl border border-white/10 bg-white/10 p-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-white/55">
                <Layers3 className="h-4 w-4" aria-hidden />
                Aktiva
              </div>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{ordersCount}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/10 p-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-white/55">
                <Target className="h-4 w-4" aria-hidden />
                Visas
              </div>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{filteredCount}</p>
            </div>
          </div>
          {focus.cards.map(([title, description], index) => {
            const Icon = index === 0 ? ClipboardCheck : index === 1 ? UsersRound : CalendarClock;
            return (
              <div key={title} className="rounded-xl border border-white/10 bg-white/8 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Icon className="h-4 w-4 text-brand-200" aria-hidden />
                  {title}
                </div>
                <p className="mt-1 text-xs leading-5 text-white/58">{description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
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
    <Card className="rounded-2xl border-dashed border-neutral-300 bg-white/90 p-10 text-center text-neutral-600 shadow-[0_22px_70px_-56px_rgba(15,23,42,0.6)]">
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
    for (const order of orders) {
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
  }, [orders]);

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
    setTrackFilter("ALL");
    setStatusFilter("ALL");
    setSellerFilter("ALL");
    if (showOwnerFilter) {
      setOwnerFilter("all");
    }
  }

  const activeFilters = useMemo(() => {
    const list: string[] = [];
    if (trackFilter !== "ALL") list.push(`Spår ${TRACK_LABELS[trackFilter]}`);
    if (statusFilter !== "ALL") list.push(STATUS_TITLES[statusFilter]);
    if (sellerFilter !== "ALL") {
      const seller = sellerOptions.find((option) => option.value === sellerFilter);
      list.push(`Säljare ${seller?.label ?? sellerFilter}`);
    }
    if (effectiveOwnerFilter === "mine") list.push("Mina ordrar");
    if (deferredQuery) list.push("Sökning aktiv");
    if (list.length === 0) list.push("Inget filter aktivt");

    return list;
  }, [trackFilter, statusFilter, sellerFilter, sellerOptions, effectiveOwnerFilter, deferredQuery]);
  

  const hasResults = filtered.length > 0;

  function openCalendarForTrack(track: Track, initialRange: { start?: string; end?: string }) {
    setCalendarInitialRange(initialRange);
    setCalendarTrack(track);
    setCalendarOpen(true);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7f9f8]">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,#ffffff_0%,#f7f9f8_42%,#eef4f1_100%)]" />
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[420px] w-[min(980px,92vw)] -translate-x-1/2 rounded-b-[48px] bg-[radial-gradient(circle_at_18%_12%,rgba(5,150,105,0.18),transparent_28%),radial-gradient(circle_at_78%_20%,rgba(14,165,233,0.14),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.95),rgba(217,243,227,0.72))] shadow-[0_40px_120px_-90px_rgba(15,23,42,0.75)]" />

      <div className="mx-auto w-full max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-2xl border border-white/80 bg-white/80 shadow-[0_28px_90px_-62px_rgba(15,23,42,0.7)] backdrop-blur">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_520px]">
            <div className="p-6 sm:p-8">
              <span className={`${museoModerno.className} inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-brand-700 shadow-sm`}>
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Ordersammanställning
              </span>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight text-neutral-950 sm:text-5xl">
                Aktiva ordrar
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
                Visar {filtered.length} av {orders.length} ordrar med status, spår, säljare, planering och filer i samma arbetsyta.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-neutral-200 bg-white/90 p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    <Layers3 className="h-4 w-4 text-brand-600" aria-hidden />
                    Matchar
                  </div>
                  <p className="mt-2 text-3xl font-semibold tabular-nums text-neutral-950">{filtered.length}</p>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-white/90 p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    <CircleDollarSign className="h-4 w-4 text-emerald-600" aria-hidden />
                    Totalt
                  </div>
                  <p className="mt-2 text-3xl font-semibold tabular-nums text-neutral-950">{orders.length}</p>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-white/90 p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    <SlidersHorizontal className="h-4 w-4 text-sky-600" aria-hidden />
                    Urval
                  </div>
                  <p className="mt-2 truncate text-sm font-semibold text-neutral-900">{activeFilters.join(", ")}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-neutral-200 bg-white/70 p-4 lg:border-l lg:border-t-0 sm:p-6">
              {STATUS_SEQUENCE.map((status) => (
                <SummaryTile key={status} status={status} total={statusTotals[status]} />
              ))}
            </div>
          </div>
        </section>

        <section className="sticky top-[5rem] z-20 rounded-2xl border border-neutral-200 bg-white/92 p-4 shadow-[0_18px_60px_-46px_rgba(15,23,42,0.75)] backdrop-blur">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  <SlidersHorizontal className="h-4 w-4" aria-hidden />
                  Spår
                </span>
                <FilterPill
                  label="Alla spår"
                  active={trackFilter === "ALL"}
                  onClick={() => setTrackFilter("ALL")}
                />
                {availableTracks.map((track) => (
                  <FilterPill
                    key={track}
                    label={TRACK_LABELS[track]}
                    active={trackFilter === track}
                    onClick={() => setTrackFilter((prev) => (prev === track ? "ALL" : track))}
                  />
                ))}
              </div>
              <div className="relative w-full xl:w-[340px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden />
                <label className="sr-only" htmlFor="order-search">
                  Sök ordernummer eller kund
                </label>
                <input
                  id="order-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Sök ordernummer eller kund"
                  className="h-11 w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-4 text-sm text-neutral-700 shadow-sm placeholder:text-neutral-400 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-brand-300"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Status
                </span>
                <FilterPill
                  label="Alla statusar"
                  active={statusFilter === "ALL"}
                  onClick={() => setStatusFilter("ALL")}
                />
                {STATUS_SEQUENCE.map((status) => (
                  <FilterPill
                    key={status}
                    label={STATUS_TITLES[status]}
                    active={statusFilter === status}
                    onClick={() => setStatusFilter((prev) => (prev === status ? "ALL" : status))}
                  />
                ))}
              </div>

              <div className="relative min-w-[220px]">
                <label className="sr-only" htmlFor="seller-filter">
                  Filtrera på säljare
                </label>
                <select
                  id="seller-filter"
                  value={sellerFilter}
                  onChange={(event) => setSellerFilter(event.target.value)}
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 pr-8 text-xs font-semibold text-neutral-700 shadow-sm transition focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-brand-300 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={sellerOptions.length === 0}
                >
                  <option value="ALL">Alla säljare</option>
                  {sellerOptions.map((seller) => (
                    <option key={seller.value} value={seller.value}>
                      {seller.label}
                    </option>
                  ))}
                </select>
              </div>

              {showOwnerFilter && (
                <div
                  role="group"
                  aria-label="Filtrera ägande"
                  className="inline-flex overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => setOwnerFilter("all")}
                    className={`px-3 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-300 ${
                      effectiveOwnerFilter === "all"
                        ? "bg-brand-600 text-white"
                        : "text-neutral-600 hover:bg-brand-50/60"
                    }`}
                  >
                    Alla ordrar
                  </button>
                  <button
                    type="button"
                    onClick={() => setOwnerFilter("mine")}
                    aria-disabled={mineDisabled}
                    disabled={mineDisabled}
                    className={`px-3 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-300 ${
                      effectiveOwnerFilter === "mine"
                        ? "bg-brand-600 text-white"
                        : "text-neutral-600 hover:bg-brand-50/60"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    Mina ordrar
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={clearFilters}
                className="ml-auto inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-600 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden />
                Nollställ filter
              </button>
            </div>
          </div>
        </section>

        <RoleOnboardingPanel role={role} ordersCount={orders.length} filteredCount={filtered.length} />

        <div className="space-y-6">
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
                <SlidersHorizontal className="h-4 w-4" aria-hidden />
                Nollställ filter
              </button>
              <Link href="/orders/new" className={actionButton}>
                Skapa order
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            </EmptyState>
          )}

          {!loading && !err && hasResults && (
            <div className="space-y-5">
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
                  activeTrack={trackFilter}
                  activeStatus={statusFilter}
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
