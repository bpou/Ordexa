"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useOrderRealtime } from "@/lib/useOrderRealtime";
import {
  STATUS_COLORS,
  STATUS_DISPLAY,
  type TrackStatus,
} from "@/lib/orderStatus";
import CalendarModal from "@/components/calendar/CalendarModal";
import { APP_TRACKS, TRACK_NAMES, type AppTrack } from "@/lib/tracks";
import FileUploadButton from '../../../components/FileUploadButton';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Button from "@/components/ui/button";

import { OrdinaLogoSpinner } from "@/components/OrdinaLoader";
import { formatMinutesLabel } from "@/lib/time";
import { recordRecentOrder } from "@/lib/recentOrders";
import { Shimmer } from "@/components/Shimmer";
import {
  Activity,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock3,
  History,
  Link2,
  MapPin,
  PackageCheck,
  PencilLine,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
type TrackType = AppTrack | "SHARED";
type Track = AppTrack;
type Role = "ADMIN" | "SALJARE" | "A_TEAM" | "B_TEAM" | "C_TEAM" | "D_TEAM";

type FileItem = {
  id: string;
  filename: string;
  url: string;
  track: AppTrack | "SHARED";
  createdAt: number | string;
  expiresAt?: number;
  uploadedBy?: string | null;
  uploadedById?: string | null;
  uploadedByName?: string | null;
  uploadedByImage?: string | null;
};

type UserOption = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: Role;
};

type TimeEntry = {
  id: string;
  track: Track;
  minutes: number;
  userId: string | null;
  userName: string;
  userImage: string | null;
  createdById: string | null;
  createdByName: string;
  createdByImage: string | null;
  createdAt: string;
};

type CalendarEventItem = {
  id: string;
  track: Track;
  start: string;
  end: string;
  title: string;
  notes?: string | null;
};

type FortnoxOrderLine = {
  rowId?: string | number | null;
  articleNumber?: string | null;
  description: string;
  orderedQuantity: number;
  unit?: string | null;
  price: number;
  discount?: number | null;
  discountType?: string | null;
  accountNumber?: string | number | null;
  costCenter?: string | null;
};

type OrderHistoryEventItem = {
  id: string;
  type: string;
  title: string;
  description: string;
  actorId?: string | null;
  actorName?: string | null;
  metadata?: unknown;
  createdAt: string;
};

type OrderData = {
  orderNumber: string | number;
  title: string;
  customerName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  dueDate?: string | null;
  deliveryAddress?: string | null;
  deliveryMethod?: string | null;
  createdByName?: string | null;
  createdByEmail?: string | null;
  createdByImage?: string | null;
  fortnox?: { documentNumber: string; createdAt: string } | null;
  historyEvents?: OrderHistoryEventItem[];
  events?: CalendarEventItem[];
  notes?: string | null;
  tracks: {
    track: Track;
    status: TrackStatus;
    timeSpentMinutes: number;
    plannedStartAt?: string | null;
    plannedEndAt?: string | null;
  }[];
  timeEntries: TimeEntry[];
  files: FileItem[];
  fortnoxOrderRows?: FortnoxOrderLine[];
  fortnoxRowsError?: string | null;
  fortnoxOrderRowsSyncedAt?: string | null;
  billingConfirmedAt?: string | null;
};

function canPreviewInModal(filename: string): boolean {
  const lower = filename.toLowerCase();
  return (
    lower.endsWith(".pdf") ||
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".gif") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".svg") ||
    lower.endsWith(".txt")
  );
}

const TRACK_LABELS: Record<AppTrack, string> = {
  A: TRACK_NAMES.A,
  B: TRACK_NAMES.B,
  C: TRACK_NAMES.C,
  D: TRACK_NAMES.D,
};

const TRACK_ROLE: Record<AppTrack, Role> = {
  A: "A_TEAM",
  B: "B_TEAM",
  C: "C_TEAM",
  D: "D_TEAM",
};

function canManageTrackForRole(role: Role | undefined, track: AppTrack) {
  return role === "ADMIN" || role === "SALJARE" || role === TRACK_ROLE[track];
}

function canDeleteFilesForRole(role: Role | undefined) {
  return role === "ADMIN" || role === "SALJARE";
}

function canEditOrderForRole(role: Role | undefined) {
  return role === "ADMIN" || role === "SALJARE";
}

function createEmptyFortnoxLine(): FortnoxOrderLine {
  return {
    rowId: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    articleNumber: "",
    description: "",
    orderedQuantity: 1,
    unit: "st",
    price: 0,
    discount: null,
    discountType: null,
    accountNumber: null,
    costCenter: null,
  };
}

function normalizeFortnoxLines(rows: FortnoxOrderLine[] | undefined): FortnoxOrderLine[] {
  if (!Array.isArray(rows) || rows.length === 0) return [createEmptyFortnoxLine()];
  return rows.map((row, index) => ({
    rowId: row.rowId ?? `row-${index}`,
    articleNumber: row.articleNumber ?? "",
    description: row.description ?? "",
    orderedQuantity: Number.isFinite(Number(row.orderedQuantity)) ? Number(row.orderedQuantity) : 1,
    unit: row.unit ?? "st",
    price: Number.isFinite(Number(row.price)) ? Number(row.price) : 0,
    discount: row.discount === null || row.discount === undefined ? null : Number(row.discount),
    discountType: row.discountType ?? null,
    accountNumber: row.accountNumber ?? null,
    costCenter: row.costCenter ?? null,
  }));
}

function lineAmount(row: FortnoxOrderLine) {
  const quantity = Number(row.orderedQuantity) || 0;
  const price = Number(row.price) || 0;
  const discount = Number(row.discount) || 0;
  const gross = quantity * price;
  if (String(row.discountType ?? "").toUpperCase() === "PERCENT") {
    return gross * (1 - discount / 100);
  }
  return gross - discount;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 2,
  }).format(value);
}

function userDisplayName(user: Pick<UserOption, "name" | "email">) {
  return user.name || user.email;
}

function initials(name: string | null | undefined) {
  const parts = (name || "?").trim().split(/\s+/).filter(Boolean);
  return (parts.length ? parts.map((part) => part[0]).join("") : "?").slice(0, 2).toUpperCase();
}

function PersonPill({
  name,
  image,
  detail,
}: {
  name: string;
  image?: string | null;
  detail?: string;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2 rounded-full border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700 shadow-sm">
      <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-[10px] font-semibold text-neutral-600">
        {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : initials(name)}
      </span>
      <span className="min-w-0 truncate font-medium">{name}</span>
      {detail ? <span className="shrink-0 text-neutral-400">{detail}</span> : null}
    </span>
  );
}

type AuditItem = {
  id: string;
  at: string;
  title: string;
  description: string;
  icon: "created" | "calendar" | "file" | "time" | "status" | "billing" | "fortnox" | "delivery";
  accent: string;
};

function parseDate(value: string | number | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatAuditDate(value: string) {
  const date = parseDate(value);
  return date ? date.toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" }) : "-";
}

function toDateInputValue(value: string | null | undefined) {
  const date = parseDate(value);
  return date ? date.toISOString().slice(0, 10) : "";
}

function auditIcon(icon: AuditItem["icon"]) {
  const className = "h-4 w-4";
  if (icon === "calendar") return <CalendarClock className={className} aria-hidden />;
  if (icon === "file") return <UploadCloud className={className} aria-hidden />;
  if (icon === "time") return <Clock3 className={className} aria-hidden />;
  if (icon === "billing") return <CheckCircle2 className={className} aria-hidden />;
  if (icon === "fortnox") return <Link2 className={className} aria-hidden />;
  if (icon === "delivery") return <MapPin className={className} aria-hidden />;
  if (icon === "status") return <Activity className={className} aria-hidden />;
  return <History className={className} aria-hidden />;
}

function historyAccent(type: string) {
  if (type === "status") return "border-amber-200 bg-amber-50 text-amber-700";
  if (type === "file") return "border-blue-200 bg-blue-50 text-blue-700";
  if (type === "time") return "border-neutral-200 bg-neutral-50 text-neutral-700";
  if (type === "billing") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (type === "fortnox") return "border-sky-200 bg-sky-50 text-sky-700";
  if (type === "order" || type === "notes") return "border-violet-200 bg-violet-50 text-violet-700";
  return "border-brand-200 bg-brand-50 text-brand-700";
}

function historyIcon(type: string): AuditItem["icon"] {
  if (type === "status") return "status";
  if (type === "file") return "file";
  if (type === "time") return "time";
  if (type === "billing") return "billing";
  if (type === "fortnox") return "fortnox";
  if (type === "order" || type === "notes") return "delivery";
  return "created";
}

function buildAuditTrail(order: OrderData): AuditItem[] {
  const items: AuditItem[] = [];
  const orderNumber = String(order.orderNumber);
  const creator = order.createdByName ?? order.createdByEmail ?? "Okänd användare";

  for (const event of order.historyEvents ?? []) {
    items.push({
      id: `history-${event.id}`,
      at: event.createdAt,
      title: event.title,
      description: event.description,
      icon: historyIcon(event.type),
      accent: historyAccent(event.type),
    });
  }

  if (order.createdAt) {
    items.push({
      id: "created",
      at: order.createdAt,
      title: "Order skapad",
      description: `${creator} skapade order ${orderNumber}.`,
      icon: "created",
      accent: "border-brand-200 bg-brand-50 text-brand-700",
    });
  }

  if (order.fortnox) {
    items.push({
      id: "fortnox",
      at: order.fortnox.createdAt,
      title: "Kopplad till Fortnox",
      description: `Dokumentnummer ${order.fortnox.documentNumber} är länkat till ordern.`,
      icon: "fortnox",
      accent: "border-sky-200 bg-sky-50 text-sky-700",
    });
  }

  if (order.deliveryAddress || order.dueDate) {
    items.push({
      id: "delivery",
      at: order.dueDate ?? order.createdAt ?? new Date().toISOString(),
      title: "Leveransinformation",
      description: [
        order.dueDate ? `Leverans ${new Date(order.dueDate).toLocaleDateString("sv-SE")}` : null,
        order.deliveryAddress,
        order.deliveryMethod,
      ].filter(Boolean).join(" · "),
      icon: "delivery",
      accent: "border-violet-200 bg-violet-50 text-violet-700",
    });
  }

  for (const track of order.tracks ?? []) {
    const plannedAt = track.plannedStartAt ?? track.plannedEndAt;
    if (plannedAt) {
      items.push({
        id: `track-${track.track}`,
        at: plannedAt,
        title: `${TRACK_LABELS[track.track]} planerad`,
        description: `${STATUS_DISPLAY[track.status] ?? "Status"} · ${formatMinutesLabel(track.timeSpentMinutes ?? 0)} loggat.`,
        icon: "status",
        accent: "border-amber-200 bg-amber-50 text-amber-700",
      });
    }
  }

  for (const event of order.events ?? []) {
    items.push({
      id: `event-${event.id}`,
      at: event.start,
      title: `${TRACK_LABELS[event.track]} i kalendern`,
      description: `${formatAuditDate(event.start)} till ${formatAuditDate(event.end)}${event.notes ? ` · ${event.notes}` : ""}`,
      icon: "calendar",
      accent: "border-emerald-200 bg-emerald-50 text-emerald-700",
    });
  }

  for (const entry of order.timeEntries ?? []) {
    items.push({
      id: `time-${entry.id}`,
      at: entry.createdAt,
      title: `${formatMinutesLabel(entry.minutes)} registrerat`,
      description: `${entry.createdByName} registrerade tid på ${TRACK_LABELS[entry.track]} för ${entry.userName}.`,
      icon: "time",
      accent: "border-neutral-200 bg-neutral-50 text-neutral-700",
    });
  }

  for (const file of order.files ?? []) {
    const at = typeof file.createdAt === "number" ? new Date(file.createdAt).toISOString() : file.createdAt;
    items.push({
      id: `file-${file.id}`,
      at,
      title: "Fil uppladdad",
      description: `${file.filename}${file.uploadedByName || file.uploadedBy ? ` · ${file.uploadedByName ?? file.uploadedBy}` : ""}`,
      icon: "file",
      accent: "border-blue-200 bg-blue-50 text-blue-700",
    });
  }

  if (order.billingConfirmedAt) {
    items.push({
      id: "billing",
      at: order.billingConfirmedAt,
      title: "Fakturering bekräftad",
      description: "Ordern är markerad som fakturerad.",
      icon: "billing",
      accent: "border-emerald-200 bg-emerald-50 text-emerald-700",
    });
  }

  return items
    .filter((item) => Boolean(parseDate(item.at)))
    .sort((a, b) => (parseDate(b.at)?.getTime() ?? 0) - (parseDate(a.at)?.getTime() ?? 0));
}

function OrderAuditTimeline({ order }: { order: OrderData }) {
  const items = buildAuditTrail(order);
  const [open, setOpen] = useState(false);

  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-[0_22px_54px_-38px_rgba(15,23,42,0.55)]">
      <div className="grid gap-0 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="border-b border-neutral-200 bg-gradient-to-br from-neutral-950 via-neutral-900 to-brand-950 p-5 text-white lg:border-b-0 lg:border-r">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10">
            <History className="h-5 w-5" aria-hidden />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Orderhistorik</h2>
          <p className="mt-2 text-sm leading-6 text-white/70">
            En samlad tidslinje från order, kalender, filer och tidrapportering.
          </p>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 text-xs font-semibold text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            aria-expanded={open}
          >
            {open ? "Dölj historik" : "Visa historik"}
            <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} aria-hidden />
          </button>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/10 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Händelser</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{items.length}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/10 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Filer</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{order.files.length}</div>
            </div>
          </div>
        </div>

        {open ? (
        <div className="p-4 sm:p-5">
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-500">
              Inga händelser att visa ännu.
            </div>
          ) : (
            <div className="relative space-y-3 before:absolute before:bottom-4 before:left-[18px] before:top-4 before:w-px before:bg-neutral-200">
              {items.map((item) => (
                <div key={item.id} className="relative grid grid-cols-[38px_minmax(0,1fr)] gap-3">
                  <span className={`relative z-10 inline-flex h-9 w-9 items-center justify-center rounded-xl border ${item.accent}`}>
                    {auditIcon(item.icon)}
                  </span>
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="text-sm font-semibold text-neutral-900">{item.title}</h3>
                      <span className="text-xs font-medium text-neutral-500">{formatAuditDate(item.at)}</span>
                    </div>
                    <p className="mt-1 text-sm leading-5 text-neutral-600">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        ) : null}
      </div>
    </section>
  );
}

type OrderEditDraft = {
  title: string;
  customerName: string;
  dueDate: string;
  deliveryAddress: string;
  deliveryMethod: string;
};

function OrderEditPanel({
  order,
  draft,
  open,
  saving,
  error,
  onOpenChange,
  onDraftChange,
  onSave,
  onReset,
}: {
  order: OrderData;
  draft: OrderEditDraft;
  open: boolean;
  saving: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (draft: OrderEditDraft) => void;
  onSave: () => void;
  onReset: () => void;
}) {
  const patchDraft = (patch: Partial<OrderEditDraft>) => onDraftChange({ ...draft, ...patch });

  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-[0_22px_54px_-40px_rgba(15,23,42,0.55)]">
      <div className="flex flex-col gap-4 border-b border-neutral-100 bg-gradient-to-r from-neutral-50 via-white to-brand-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-700">
            <PencilLine className="h-3.5 w-3.5" aria-hidden />
            Fortnox + lokalt
          </div>
          <h2 className="mt-3 text-lg font-semibold text-neutral-950">Orderuppgifter</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Ändringar sparas först i Fortnox och därefter lokalt i Ordexa.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (open) onReset();
            onOpenChange(!open);
          }}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-800 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
        >
          {open ? <X className="h-4 w-4" aria-hidden /> : <PencilLine className="h-4 w-4" aria-hidden />}
          {open ? "Stäng" : "Redigera order"}
        </button>
      </div>

      {open ? (
        <div className="p-4 sm:p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Titel</span>
              <input
                value={draft.title}
                onChange={(event) => patchDraft({ title: event.target.value })}
                className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Kund / referens</span>
              <input
                value={draft.customerName}
                onChange={(event) => patchDraft({ customerName: event.target.value })}
                className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Leveransdatum</span>
              <input
                type="date"
                value={draft.dueDate}
                onChange={(event) => patchDraft({ dueDate: event.target.value })}
                className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Leveranssätt</span>
              <input
                value={draft.deliveryMethod}
                onChange={(event) => patchDraft({ deliveryMethod: event.target.value })}
                placeholder="T.ex. Hämtas, Bud, Montör"
                className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <label className="flex flex-col gap-1.5 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Leveransadress</span>
              <textarea
                value={draft.deliveryAddress}
                onChange={(event) => patchDraft({ deliveryAddress: event.target.value })}
                rows={3}
                className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-neutral-500">
              Senast uppdaterad {order.updatedAt ? new Date(order.updatedAt).toLocaleString("sv-SE") : "-"}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onReset}
                disabled={saving}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Återställ
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={saving || !draft.title.trim()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-600 px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" aria-hidden />
                {saving ? "Sparar..." : "Spara i Fortnox"}
              </button>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-3 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Kund</div>
            <div className="mt-1 truncate font-semibold text-neutral-900">{order.customerName ?? "-"}</div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Leverans</div>
            <div className="mt-1 font-semibold text-neutral-900">
              {order.dueDate ? new Date(order.dueDate).toLocaleDateString("sv-SE") : "-"}
            </div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Leveranssätt</div>
            <div className="mt-1 truncate font-semibold text-neutral-900">{order.deliveryMethod ?? "-"}</div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Adress</div>
            <div className="mt-1 truncate font-semibold text-neutral-900">{order.deliveryAddress ?? "-"}</div>
          </div>
        </div>
      )}
    </section>
  );
}

function FortnoxOrderLinesPanel({
  rows,
  saving,
  error,
  syncedAt,
  onRowsChange,
  onSave,
  onReset,
}: {
  rows: FortnoxOrderLine[];
  saving: boolean;
  error: string | null;
  syncedAt?: string | null;
  onRowsChange: (rows: FortnoxOrderLine[]) => void;
  onSave: () => void;
  onReset: () => void;
}) {
  const total = rows.reduce((sum, row) => sum + lineAmount(row), 0);
  const hasInvalidRows = rows.some((row) => !row.description.trim() || Number(row.orderedQuantity) <= 0);

  const patchRow = (index: number, patch: Partial<FortnoxOrderLine>) => {
    onRowsChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) {
      onRowsChange([createEmptyFortnoxLine()]);
      return;
    }
    onRowsChange(rows.filter((_, rowIndex) => rowIndex !== index));
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-[0_24px_70px_-44px_rgba(15,23,42,0.65)]">
      <div className="border-b border-neutral-100 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_48%,#eef6ff_100%)] p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">
              <PackageCheck className="h-3.5 w-3.5" aria-hidden />
              Fortnox orderrader
            </div>
            <h2 className="mt-3 text-lg font-semibold text-neutral-950">Radredigering</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Redigera artikel, beskrivning, antal, pris och rabatt. Sparas i Fortnox och Ordexa samtidigt.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-right shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Rader</div>
              <div className="text-base font-semibold text-neutral-950">{rows.length}</div>
            </div>
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-right shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">Summa</div>
              <div className="text-base font-semibold text-sky-950">{formatMoney(total)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        <div className="hidden grid-cols-[0.85fr_1.8fr_0.6fr_0.5fr_0.7fr_0.65fr_0.7fr_44px] gap-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 lg:grid">
          <span>Artikel</span>
          <span>Beskrivning</span>
          <span>Antal</span>
          <span>Enhet</span>
          <span>Pris</span>
          <span>Rabatt</span>
          <span className="text-right">Rad</span>
          <span />
        </div>

        <div className="space-y-2">
          {rows.map((row, index) => (
            <div
              key={String(row.rowId ?? index)}
              className="grid gap-2 rounded-xl border border-neutral-200 bg-neutral-50/70 p-3 transition focus-within:border-sky-300 focus-within:bg-white focus-within:shadow-[0_18px_40px_-34px_rgba(14,165,233,0.8)] lg:grid-cols-[0.85fr_1.8fr_0.6fr_0.5fr_0.7fr_0.65fr_0.7fr_44px] lg:items-center"
            >
              <label className="flex flex-col gap-1 lg:block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 lg:hidden">
                  Artikel
                </span>
                <input
                  value={row.articleNumber ?? ""}
                  onChange={(event) => patchRow(index, { articleNumber: event.target.value })}
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                />
              </label>
              <label className="flex flex-col gap-1 lg:block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 lg:hidden">
                  Beskrivning
                </span>
                <input
                  value={row.description}
                  onChange={(event) => patchRow(index, { description: event.target.value })}
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-950 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                />
              </label>
              <label className="flex flex-col gap-1 lg:block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 lg:hidden">
                  Antal
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.orderedQuantity}
                  onChange={(event) => patchRow(index, { orderedQuantity: Number(event.target.value) })}
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                />
              </label>
              <label className="flex flex-col gap-1 lg:block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 lg:hidden">
                  Enhet
                </span>
                <input
                  value={row.unit ?? ""}
                  onChange={(event) => patchRow(index, { unit: event.target.value })}
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                />
              </label>
              <label className="flex flex-col gap-1 lg:block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 lg:hidden">
                  Pris
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={row.price}
                  onChange={(event) => patchRow(index, { price: Number(event.target.value) })}
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                />
              </label>
              <label className="flex flex-col gap-1 lg:block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 lg:hidden">
                  Rabatt
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={row.discount ?? ""}
                  onChange={(event) =>
                    patchRow(index, {
                      discount: event.target.value === "" ? null : Number(event.target.value),
                    })
                  }
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                />
              </label>
              <div className="flex h-10 items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 lg:justify-end">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 lg:hidden">
                  Rad
                </span>
                {formatMoney(lineAmount(row))}
              </div>
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-red-100 bg-white text-red-600 transition hover:border-red-200 hover:bg-red-50 lg:w-10"
                aria-label="Ta bort orderrad"
                title="Ta bort orderrad"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ))}
        </div>

        {error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-neutral-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-neutral-500">
            {syncedAt ? `Synkad ${new Date(syncedAt).toLocaleString("sv-SE")}` : "Ingen lokal radsynk sparad ännu."}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onRowsChange([...rows, createEmptyFortnoxLine()])}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-800 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Lägg till rad
            </button>
            <button
              type="button"
              onClick={onReset}
              disabled={saving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Återställ
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving || hasInvalidRows}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sky-600 px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" aria-hidden />
              {saving ? "Sparar rader..." : "Spara orderrader"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrackCard({
  track,
  currentStatus,
  timeSpent,
  plannedStartAt,
  plannedEndAt,
  isUpdating,
  isSavingTime,
  timeError,
  onOpenCalendar,
  onSetStatus,
  onAddTime,
  onClearTimeError,
  canManage,
  users,
  currentUserId,
  timeEntries,
}: {
  track: Track;
  currentStatus?: TrackStatus;
  timeSpent: number;
  plannedStartAt?: string | null;
  plannedEndAt?: string | null;
  isUpdating: boolean;
  isSavingTime: boolean;
  timeError?: string;
  onOpenCalendar: () => void;
  onSetStatus: (status: TrackStatus) => void;
  onAddTime: (minutes: number, userId: string) => void;
  onClearTimeError: () => void;
  canManage: boolean;
  users: UserOption[];
  currentUserId?: string;
  timeEntries: TimeEntry[];
}) {
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const [timePopoverOpen, setTimePopoverOpen] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(currentUserId ?? "");

  useEffect(() => {
    if (!selectedUserId && currentUserId) setSelectedUserId(currentUserId);
  }, [currentUserId, selectedUserId]);

  const timeLabel = formatMinutesLabel(timeSpent);
  const selectedAssigneeId = selectedUserId || currentUserId || users[0]?.id || "";
  const visibleTimeEntries = timeEntries.filter((entry) => entry.track === track);
  const hasPlannedTime = (() => {
    const start = plannedStartAt ? new Date(plannedStartAt) : null;
    const end = plannedEndAt ? new Date(plannedEndAt) : null;
    return (
      (start && !Number.isNaN(start.getTime())) ||
      (end && !Number.isNaN(end.getTime()))
    );
  })();

  function submitCustomTime(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = Number.parseInt(customMinutes.trim(), 10);
    if (!Number.isFinite(parsed) || parsed <= 0 || !selectedAssigneeId) return;
    onClearTimeError();
    onAddTime(parsed, selectedAssigneeId);
    setCustomMinutes("");
    setTimePopoverOpen(false);
  }

  return (
    <div className="group rounded-2xl border border-neutral-200/90 bg-white p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-32px_rgba(15,23,42,0.55)]">
      <div className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-500">
            Spår {track}
          </p>
          <h3 className="mt-1 text-base font-semibold text-neutral-900">
            {TRACK_LABELS[track]}
          </h3>
        </div>

        {currentStatus ? (
          <Shimmer
            variant="pill"
            isLoading={isUpdating}
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[currentStatus]}`}
          >
            {STATUS_DISPLAY[currentStatus]}
          </Shimmer>
        ) : (
          <span className="inline-flex rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-semibold text-neutral-600">
            Ingen status
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 items-stretch gap-3">
        <div className="flex h-28 flex-col justify-start rounded-xl border border-neutral-200 bg-neutral-50/70 px-3 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            Tid loggad
          </div>
          <motion.div
            key={`${track}-${timeSpent}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2 text-lg font-semibold text-neutral-900"
          >
            {timeLabel}
          </motion.div>
        </div>

        <button
          type="button"
          onClick={onOpenCalendar}
          disabled={!canManage}
          className="flex h-28 flex-col justify-between rounded-xl border border-neutral-200 bg-neutral-50/70 px-3 py-3 text-left transition hover:border-neutral-300 hover:bg-neutral-100"
        >
          <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            Planering
          </div>
          <div className="mt-1 text-sm font-semibold text-neutral-900">
            Kalender
          </div>
          <div className="mt-1 min-h-[2.25rem] text-xs font-semibold text-neutral-500">
            {hasPlannedTime ? "Planerad" : "Inte planerad"}
          </div>
        </button>
      </div>

      {canManage ? (
      <div className="mt-3">
        <Popover open={timePopoverOpen} onOpenChange={setTimePopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSavingTime}
              className="h-10 w-full justify-between rounded-xl border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50"
            >
              <span>Justera tid</span>
              <span className="text-neutral-400">Välj</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[280px] gap-2 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              Registrera tid for
            </div>
            <select
              value={selectedAssigneeId}
              onChange={(event) => setSelectedUserId(event.target.value)}
              className="mb-2 h-9 w-full rounded-lg border border-neutral-200 bg-white px-2 text-xs font-medium text-neutral-800 outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200"
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {userDisplayName(user)}
                </option>
              ))}
            </select>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              Snabbval lagg till
            </div>
            <div className="flex flex-wrap gap-2">
              {[15, 30, 60].map((minutes) => (
                <Button
                  key={minutes}
                  type="button"
                  variant="outline"
                  size="xs"
                  disabled={isSavingTime}
                  onClick={() => {
                    onClearTimeError();
                    onAddTime(minutes, selectedAssigneeId);
                    setTimePopoverOpen(false);
                  }}
                  className="border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-100"
                >
                  +{minutes} min
                </Button>
              ))}
            </div>
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              Snabbval ta bort
            </div>
            <div className="flex flex-wrap gap-2">
              {[15, 30, 60].map((minutes) => (
                <Button
                  key={`remove-${minutes}`}
                  type="button"
                  variant="outline"
                  size="xs"
                  disabled={isSavingTime}
                  onClick={() => {
                    onClearTimeError();
                    onAddTime(-minutes, selectedAssigneeId);
                    setTimePopoverOpen(false);
                  }}
                  className="border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-100"
                >
                  -{minutes} min
                </Button>
              ))}
            </div>
            <form onSubmit={submitCustomTime} className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                placeholder="Minuter"
                value={customMinutes}
                onChange={(e) => {
                  setCustomMinutes(e.target.value);
                  if (timeError) onClearTimeError();
                }}
                className="h-8 w-24 rounded-md border border-neutral-200 bg-white px-2 text-xs text-neutral-800 outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200"
              />
              <Button
                type="submit"
                variant="outline"
                size="xs"
                disabled={isSavingTime || !customMinutes.trim()}
                className="border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-100"
              >
                Lägg till
              </Button>
              <Button
                type="button"
                variant="outline"
                size="xs"
                disabled={isSavingTime || !customMinutes.trim()}
                onClick={() => {
                  const parsed = Number.parseInt(customMinutes.trim(), 10);
                  if (!Number.isFinite(parsed) || parsed <= 0) return;
                  onClearTimeError();
                  onAddTime(-parsed, selectedAssigneeId);
                  setCustomMinutes("");
                  setTimePopoverOpen(false);
                }}
                className="border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-100"
              >
                Ta bort
              </Button>
            </form>
            {timeError ? (
              <p className="mt-1 text-xs font-medium text-red-600">{timeError}</p>
            ) : null}
          </PopoverContent>
        </Popover>
      </div>
      ) : null}

      {canManage ? (
      <div className="mt-4">
        <Popover open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUpdating}
              className="h-10 w-full justify-between rounded-xl border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50"
            >
              <span>Ändra status</span>
              <span className="text-neutral-400">Välj</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[260px] gap-2 p-2">
            {(
              ["INKOMMANDE", "PAGAENDE", "LEVERANS", "PALACK", "AVSLUTAD"] as const
            ).map((status) => {
              const active = status === currentStatus;

              return (
                <Button
                  key={status}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onSetStatus(status);
                    setStatusPopoverOpen(false);
                  }}
                  disabled={isUpdating}
                  className={[
                    "h-9 w-full justify-start rounded-lg px-3 text-left text-xs font-semibold transition",
                    active
                      ? `${STATUS_COLORS[status]} ring-2 ring-black/5`
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50",
                  ].join(" ")}
                >
                  {STATUS_DISPLAY[status]}
                </Button>
              );
            })}
          </PopoverContent>
        </Popover>
      </div>
      ) : null}

      {visibleTimeEntries.length ? (
        <div className="mt-4 space-y-2 rounded-xl border border-neutral-200 bg-neutral-50/60 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            Tid per person
          </div>
          <div className="space-y-1 pt-1">
            {visibleTimeEntries.slice(0, 3).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-2 text-xs text-neutral-500">
                <PersonPill name={entry.userName} image={entry.userImage} detail={formatMinutesLabel(entry.minutes)} />
                <span className="truncate">
                  av {entry.createdByName}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const sessionUser = session?.user as { id?: string; role?: Role } | null | undefined;
  const role = sessionUser?.role;
  const currentUserId = sessionUser?.id;
  const canDeleteFiles = canDeleteFilesForRole(role);
  const canEditOrder = canEditOrderForRole(role);
  const orderId = String(id ?? "");
  const [data, setData] = useState<OrderData | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [track, setTrack] = useState<TrackType>("SHARED");
  const [uploadTrackPopoverOpen, setUploadTrackPopoverOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [notesSavedAt, setNotesSavedAt] = useState<string | null>(null);
  const lastSavedNotesRef = useRef("");
  const [statusError, setStatusError] = useState<string | null>(null);
  const [updatingStatuses, setUpdatingStatuses] = useState<Set<string>>(new Set());
  const [savingTimeTracks, setSavingTimeTracks] = useState<Set<Track>>(new Set());
  const [timeErrorsByTrack, setTimeErrorsByTrack] = useState<Partial<Record<Track, string>>>({});
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [orderEditOpen, setOrderEditOpen] = useState(false);
  const [orderEditDraft, setOrderEditDraft] = useState<OrderEditDraft>({
    title: "",
    customerName: "",
    dueDate: "",
    deliveryAddress: "",
    deliveryMethod: "",
  });
  const [savingOrderEdit, setSavingOrderEdit] = useState(false);
  const [orderEditError, setOrderEditError] = useState<string | null>(null);
  const [orderLines, setOrderLines] = useState<FortnoxOrderLine[]>([createEmptyFortnoxLine()]);
  const [savingOrderLines, setSavingOrderLines] = useState(false);
  const [orderLinesError, setOrderLinesError] = useState<string | null>(null);

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarTrack, setCalendarTrack] = useState<Track>(APP_TRACKS[0]);
  const [calendarInitialRange, setCalendarInitialRange] = useState<{ start?: string; end?: string }>({});

  const trackNames = { A: 'Ateljé', B: 'Verkstad', C: 'Montage', D: 'Bilmontage', SHARED: 'Delad' };
  const uploadTrackOptions: TrackType[] = [
    "SHARED",
    ...APP_TRACKS.filter((value) => canManageTrackForRole(role, value)),
  ];

  useEffect(() => {
    if (!uploadTrackOptions.includes(track)) {
      setTrack("SHARED");
    }
  }, [track, uploadTrackOptions]);

  function draftFromOrder(order: OrderData): OrderEditDraft {
    return {
      title: String(order.title ?? ""),
      customerName: order.customerName ?? "",
      dueDate: toDateInputValue(order.dueDate),
      deliveryAddress: order.deliveryAddress ?? "",
      deliveryMethod: order.deliveryMethod ?? "",
    };
  }

  async function load() {
    if (!orderId) return;
    setErr(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
      if (!res.ok) {
        const msg = await res.text();
        setErr(`Kunde inte hämta order (${res.status}): ${msg}`);
        setData(null);
        return;
      }
      const json = await res.json();
      const order = json.order as OrderData;
      order.timeEntries = Array.isArray(order.timeEntries) ? order.timeEntries : [];
      order.historyEvents = Array.isArray(order.historyEvents) ? order.historyEvents : [];
      order.fortnoxOrderRows = normalizeFortnoxLines(order.fortnoxOrderRows);

      // Check if order is archived (billed)
      if (order.billingConfirmedAt) {
        // Redirect to archived page
        window.location.href = `/orders/archived`;
        return;
      }

      setData(order);
      setOrderLines(normalizeFortnoxLines(order.fortnoxOrderRows));
      setOrderEditDraft(draftFromOrder(order));
      lastSavedNotesRef.current = order.notes ?? "";
      setNotesDraft(order.notes ?? "");
      setNotesError(null);
      setOrderEditError(null);
      setOrderLinesError(order.fortnoxRowsError ?? null);
    } catch (e: any) {
      console.error(e);
      setErr("Tekniskt fel när order skulle hämtas.");
    }
  }

  useEffect(() => {
    load();
  }, [orderId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/users", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) {
          setUsers(Array.isArray(json.users) ? json.users : []);
        }
      } catch (error) {
        console.error("Kunde inte hämta användare", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!orderId) return;
    recordRecentOrder(orderId);
  }, [orderId]);

  // Realtime file updates
  useOrderRealtime<FileItem, { id: string }>(
    orderId,
    (incoming) => {
      setData((prev) => {
        if (!prev) return prev;
        const already = prev.files.some(
          (f) => f.id === incoming.id || f.url === incoming.url
        );
        if (already) return prev;
        return { ...prev, files: [incoming, ...prev.files] };
      });
    },
    ({ id }) => {
      setData((prev) =>
        prev ? { ...prev, files: prev.files.filter((f) => f.id !== id) } : prev
      );
    }
  );

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !orderId) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("track", track);
      const res = await fetch(`/api/orders/${orderId}/files`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const msg = await res.text();
        alert(`Uppladdning misslyckades: ${msg}`);
        return;
      }
      await res.json();
      setFile(null);
      await load();
    } catch (e) {
      console.error(e);
      alert("Tekniskt fel vid uppladdning.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteFile(fileId: string, filename: string) {
    if (!orderId) return;
    if (
      !confirm(
        `Ã„r du säker på att du vill ta bort filen "${filename}"? Detta går inte att ångra.`
      )
    )
      return;
    const res = await fetch(`/api/orders/${orderId}/files/${fileId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const msg = await res.text();
      alert(`Kunde inte ta bort filen: ${msg}`);
      return;
    }
    setData((prev) =>
      prev ? { ...prev, files: prev.files.filter((f) => f.id !== fileId) } : prev
    );
    await load();
  }

  async function saveNotes(nextNotes: string) {
    if (!orderId) return;
    setNotesError(null);
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: nextNotes }),
      });

      const text = await res.text();
      const payload = text ? JSON.parse(text) : null;

      if (!res.ok) {
        setNotesError(payload?.error || "Kunde inte spara anteckningarna.");
        return;
      }

      const savedNotes = payload?.order?.notes ?? "";
      lastSavedNotesRef.current = savedNotes;
      setData((prev) => (prev ? { ...prev, notes: savedNotes } : prev));
      setNotesSavedAt(payload?.order?.updatedAt ?? new Date().toISOString());
      await load();
    } catch {
      setNotesError("Tekniskt fel vid sparande av anteckningarna.");
    } finally {
      setSavingNotes(false);
    }
  }

  function resetOrderEditDraft() {
    if (!data) return;
    setOrderEditDraft(draftFromOrder(data));
    setOrderEditError(null);
  }

  async function saveOrderEdit() {
    if (!orderId || !data) return;
    if (!orderEditDraft.title.trim()) {
      setOrderEditError("Titel krävs.");
      return;
    }

    setSavingOrderEdit(true);
    setOrderEditError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: {
            title: orderEditDraft.title,
            customerName: orderEditDraft.customerName,
            dueDate: orderEditDraft.dueDate || null,
            deliveryAddress: orderEditDraft.deliveryAddress,
            deliveryMethod: orderEditDraft.deliveryMethod,
          },
        }),
      });

      const text = await res.text();
      const payload = text ? JSON.parse(text) : null;

      if (!res.ok) {
        setOrderEditError(payload?.error || "Kunde inte uppdatera ordern.");
        return;
      }

      const updated = payload?.order ?? {};
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          title: updated.title ?? prev.title,
          customerName: updated.customerName ?? null,
          dueDate: updated.dueDate ?? null,
          deliveryAddress: updated.deliveryAddress ?? null,
          deliveryMethod: updated.deliveryMethod ?? null,
          updatedAt: updated.updatedAt ?? prev.updatedAt,
        };
      });
      setOrderEditDraft((prev) => ({
        ...prev,
        title: updated.title ?? prev.title,
        customerName: updated.customerName ?? "",
        dueDate: toDateInputValue(updated.dueDate),
        deliveryAddress: updated.deliveryAddress ?? "",
        deliveryMethod: updated.deliveryMethod ?? "",
      }));
      setOrderEditOpen(false);
      await load();
    } catch {
      setOrderEditError("Tekniskt fel vid uppdatering av ordern.");
    } finally {
      setSavingOrderEdit(false);
    }
  }

  function resetOrderLines() {
    if (!data) return;
    setOrderLines(normalizeFortnoxLines(data.fortnoxOrderRows));
    setOrderLinesError(data.fortnoxRowsError ?? null);
  }

  async function saveOrderLines() {
    if (!orderId || !data) return;

    const payloadRows = orderLines.map((row) => ({
      rowId: row.rowId ?? null,
      articleNumber: row.articleNumber ?? "",
      description: row.description.trim(),
      orderedQuantity: Number(row.orderedQuantity),
      unit: row.unit || "st",
      price: Number(row.price),
      discount: row.discount === null || row.discount === undefined ? null : Number(row.discount),
      discountType: row.discountType ?? null,
      accountNumber: row.accountNumber ?? null,
      costCenter: row.costCenter ?? null,
    }));

    const invalidRow = payloadRows.findIndex((row) => !row.description || !Number.isFinite(row.orderedQuantity) || row.orderedQuantity <= 0);
    if (invalidRow >= 0) {
      setOrderLinesError(`Orderrad ${invalidRow + 1} behöver beskrivning och antal större än 0.`);
      return;
    }

    setSavingOrderLines(true);
    setOrderLinesError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: { orderRows: payloadRows } }),
      });

      const text = await res.text();
      const payload = text ? JSON.parse(text) : null;

      if (!res.ok) {
        setOrderLinesError(payload?.error || "Kunde inte spara orderraderna.");
        return;
      }

      const updatedRows = normalizeFortnoxLines(payload?.order?.fortnoxOrderRows);
      setOrderLines(updatedRows);
      setData((prev) =>
        prev
          ? {
              ...prev,
              fortnoxOrderRows: updatedRows,
              fortnoxRowsError: payload?.order?.fortnoxRowsError ?? null,
              fortnoxOrderRowsSyncedAt:
                payload?.order?.fortnoxOrderRowsSyncedAt ?? new Date().toISOString(),
              updatedAt: payload?.order?.updatedAt ?? prev.updatedAt,
            }
          : prev
      );
      await load();
    } catch {
      setOrderLinesError("Tekniskt fel vid sparande av orderrader.");
    } finally {
      setSavingOrderLines(false);
    }
  }

  useEffect(() => {
    if (!orderId) return;
    if (notesDraft.trim() === lastSavedNotesRef.current) return;

    const timeoutId = setTimeout(() => {
      void saveNotes(notesDraft);
    }, 700);

    return () => clearTimeout(timeoutId);
  }, [notesDraft, orderId]);

  async function setStatus(t: Track, status: TrackStatus) {
    if (!orderId) return;
    setStatusError(null);
    setUpdatingStatuses(prev => new Set(prev).add(t));
    try {
      const res = await fetch(`/api/orders/${orderId}/tracks/${t}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const raw = await res.text();
        let parsed: { error?: string } | null = null;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = null;
        }

        if (res.status === 403) {
          const trackLabel = TRACK_LABELS[t] ?? `spår ${t}`;
          setStatusError(
            `Du har inte behörighet att uppdatera ${trackLabel}. Kontakta en administratör om du behöver göra ändringar.`
          );
        } else {
          const readable = (parsed?.error ?? raw) || "Forsok igen om en stund.";
          setStatusError(`Kunde inte byta status (${res.status}). ${readable}`);
        }
        return;
      }
      setStatusError(null);
      await load();
    } finally {
      setUpdatingStatuses(prev => {
        const next = new Set(prev);
        next.delete(t);
        return next;
      });
    }
  }

  function clearTimeError(track: Track) {
    setTimeErrorsByTrack((prev) => {
      if (!prev[track]) return prev;
      const next = { ...prev };
      delete next[track];
      return next;
    });
  }

  async function addTimeToTrack(track: Track, minutes: number, userId: string) {
    if (!orderId) return;
    if (!userId) {
      setTimeErrorsByTrack((prev) => ({ ...prev, [track]: "Välj vem tiden ska registreras på." }));
      return;
    }
    const safeMinutes = Math.round(minutes);
    if (!Number.isFinite(safeMinutes) || safeMinutes === 0) {
      setTimeErrorsByTrack((prev) => ({ ...prev, [track]: "Ange ett giltigt antal minuter." }));
      return;
    }
    if (Math.abs(safeMinutes) > 24 * 60) {
      setTimeErrorsByTrack((prev) => ({ ...prev, [track]: "Max 24 timmar kan justeras per tillfälle." }));
      return;
    }

    clearTimeError(track);
    setSavingTimeTracks((prev) => new Set(prev).add(track));

    try {
      const res = await fetch(`/api/orders/${orderId}/tracks/${track}/time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes: safeMinutes, userId }),
      });

      const payloadText = await res.text();
      let payload: any = null;
      if (payloadText) {
        try {
          payload = JSON.parse(payloadText);
        } catch {
          payload = null;
        }
      }

      if (!res.ok) {
        const message =
          typeof payload?.error === "string" && payload.error.trim().length > 0
            ? payload.error
            : "Kunde inte spara tiden just nu.";
        setTimeErrorsByTrack((prev) => ({ ...prev, [track]: message }));
        return;
      }

      const updatedMinutes =
        typeof payload?.track?.timeSpentMinutes === "number"
          ? payload.track.timeSpentMinutes
          : null;
      const nextEntry = payload?.entry ? (payload.entry as TimeEntry) : null;
      const replacedEntryIds = Array.isArray(payload?.replacedEntryIds)
        ? (payload.replacedEntryIds as string[])
        : [];

      setData((prev) => {
        if (!prev) return prev;
        const remainingEntries = (prev.timeEntries ?? []).filter((entry) => {
          if (replacedEntryIds.includes(entry.id)) return false;
          if (nextEntry && entry.id === nextEntry.id) return false;
          return true;
        });
        return {
          ...prev,
          tracks: prev.tracks.map((row) =>
            row.track === track
              ? {
                  ...row,
                  timeSpentMinutes:
                    updatedMinutes !== null ? updatedMinutes : Math.max(0, row.timeSpentMinutes + safeMinutes),
                }
              : row
          ),
          timeEntries: nextEntry ? [nextEntry, ...remainingEntries] : remainingEntries,
        };
      });
      await load();
    } catch {
      setTimeErrorsByTrack((prev) => ({ ...prev, [track]: "Tekniskt fel vid sparande av tid." }));
    } finally {
      setSavingTimeTracks((prev) => {
        const next = new Set(prev);
        next.delete(track);
        return next;
      });
    }
  }

  function openCalendarForTrack(t: Track) {
    const row = data?.tracks.find((x) => x.track === t);
    setCalendarInitialRange({
      start: row?.plannedStartAt ?? undefined,
      end: row?.plannedEndAt ?? undefined,
    });
    setCalendarTrack(t);
    setCalendarOpen(true);
  }

  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!data)
    return (
      <div className="flex min-h-[200px] items-center justify-center p-6">
        <div className="flex items-center gap-3 text-neutral-600">
          <OrdinaLogoSpinner size={40} />
          <span>Laddar order</span>
        </div>
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Order #{data.orderNumber} - {data.title}
            </h1>
            <p className="text-gray-600">Kund: {data.customerName ?? "-"}</p>
          </div>
          {canEditOrder ? (
            <Link
              href={`/orders/${encodeURIComponent(String(data.orderNumber))}/edit`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-800 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
            >
              <PencilLine className="h-4 w-4" aria-hidden />
              Redigera order
            </Link>
          ) : null}
        </div>
      </div>

      {statusError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
          {statusError}
        </div>
      ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {APP_TRACKS.map((t) => {
            const trackRow = data.tracks.find((x) => x.track === t);
            const currentStatus = trackRow?.status as TrackStatus | undefined;
            const timeSpent = trackRow?.timeSpentMinutes ?? 0;
            const isUpdating = updatingStatuses.has(t);
            const canManage = canManageTrackForRole(role, t);

            return (
              <TrackCard
                key={t}
                track={t}
                currentStatus={currentStatus}
                timeSpent={timeSpent}
                plannedStartAt={trackRow?.plannedStartAt}
                plannedEndAt={trackRow?.plannedEndAt}
                isUpdating={isUpdating}
                isSavingTime={savingTimeTracks.has(t)}
                timeError={timeErrorsByTrack[t]}
                onOpenCalendar={() => openCalendarForTrack(t)}
                onSetStatus={(status) => setStatus(t, status)}
                onAddTime={(minutes, userId) => void addTimeToTrack(t, minutes, userId)}
                onClearTimeError={() => clearTimeError(t)}
                canManage={canManage}
                users={users}
                currentUserId={currentUserId}
                timeEntries={data.timeEntries ?? []}
              />
            );
          })}
        </div>
     
      <OrderAuditTimeline order={data} />

      <form
        onSubmit={upload}
        className="rounded-2xl border border-neutral-200/90 bg-white p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)]"
      >
        <div className="mb-3 border-b border-neutral-100 pb-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.26em] text-neutral-600">
            Filuppladdning
          </h2>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <FileUploadButton onFileSelect={(file) => setFile(file)} />

          <Popover open={uploadTrackPopoverOpen} onOpenChange={setUploadTrackPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 min-w-[130px] justify-between rounded-xl border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50"
              >
                <span>{trackNames[track]}</span>
                <span className="text-neutral-400">Välj</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[180px] gap-2 p-2">
              {uploadTrackOptions.map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTrack(value as TrackType);
                    setUploadTrackPopoverOpen(false);
                  }}
                  className={[
                    "h-9 w-full justify-start rounded-lg px-3 text-left text-xs font-semibold transition",
                    track === value
                      ? "border-neutral-300 bg-neutral-100 text-neutral-900"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50",
                  ].join(" ")}
                >
                  {trackNames[value as TrackType]}
                </Button>
              ))}
            </PopoverContent>
          </Popover>

          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={loading || !file}
            className="h-10 rounded-xl border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <OrdinaLogoSpinner size={20} />
                <span>Laddar</span>
              </div>
            ) : (
              "Ladda upp"
            )}
          </Button>
        </div>
      </form>

      <section className="rounded-2xl border border-neutral-200/90 bg-white p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)]">
        <div className="mb-3 border-b border-neutral-100 pb-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.26em] text-neutral-600">
            Uppladdade filer
          </h2>
        </div>

        {data.files.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50/70 px-4 py-6 text-sm text-neutral-500">
            Inga filer ännu.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.files.map((f) => (
              <article
                key={f.id}
                className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-3 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.45)]"
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
                  {trackNames[f.track] || f.track}
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewFile(f)}
                  className="mt-1 block w-full break-all text-left text-sm font-semibold text-neutral-800 underline-offset-2 hover:underline"
                >
                  {f.filename}
                </button>
                <div className="mt-1 text-xs text-neutral-500">
                  {new Date(f.createdAt).toLocaleString("sv-SE")}
                </div>
                {(f.uploadedByName || f.uploadedBy) ? (
                  <div className="mt-2">
                    <PersonPill
                      name={f.uploadedByName ?? f.uploadedBy ?? "Okänd"}
                      image={f.uploadedByImage}
                      detail="lade till"
                    />
                  </div>
                ) : null}
                {canDeleteFiles ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => deleteFile(f.id, f.filename)}
                    className="mt-3 border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100"
                  >
                    Ta bort
                  </Button>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-neutral-200/90 bg-white p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)]">
        <div className="mb-3 border-b border-neutral-100 pb-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.26em] text-neutral-600">
            Anteckningar
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Extra kostnader, tillägg och intern information för ordern.
          </p>
        </div>

        <div className="space-y-3">
          <textarea
            value={notesDraft}
            onChange={(e) => {
              setNotesDraft(e.target.value);
              if (notesError) setNotesError(null);
            }}
            rows={6}
            placeholder="Skriv anteckningar här..."
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-800 outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200"
          />

          <div className="text-xs text-neutral-500">
            {savingNotes
              ? "Sparar anteckningar..."
              : notesSavedAt
                ? `Senast sparad ${new Date(notesSavedAt).toLocaleString("sv-SE")}`
                : "Autosparar när du skriver."}
          </div>

          {notesError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {notesError}
            </div>
          ) : null}
        </div>
      </section>

      <AnimatePresence>
        {previewFile ? (
          <motion.div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45 p-4"
            onClick={() => setPreviewFile(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <motion.div
              className="flex h-[86vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 14, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.99 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
            >
              <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-neutral-900">{previewFile.filename}</div>
                  <div className="text-xs text-neutral-500">{trackNames[previewFile.track] || previewFile.track}</div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewFile(null)}
                  className="rounded-lg"
                >
                  Stäng
                </Button>
              </div>

              <div className="min-h-0 flex-1 bg-neutral-50">
                {canPreviewInModal(previewFile.filename) ? (
                  <iframe
                    src={previewFile.url}
                    title={previewFile.filename}
                    className="h-full w-full border-0"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                    <p className="text-sm text-neutral-600">
                      Förhandsvisning stöds inte för den här filtypen.
                    </p>
                    <a
                      href={previewFile.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-800 transition hover:border-neutral-300 hover:bg-neutral-50"
                    >
                      Öppna fil ändå
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

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
