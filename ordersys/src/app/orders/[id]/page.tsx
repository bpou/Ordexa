"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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

type OrderData = {
  orderNumber: string | number;
  title: string;
  customerName?: string | null;
  tracks: {
    track: Track;
    status: TrackStatus;
    timeSpentMinutes: number;
    plannedStartAt?: string | null;
    plannedEndAt?: string | null;
  }[];
  timeEntries: TimeEntry[];
  files: FileItem[];
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
  const totalsByUser = visibleTimeEntries.reduce<Record<string, { name: string; image: string | null; minutes: number }>>(
    (acc, entry) => {
      const key = entry.userId ?? entry.userName;
      const current = acc[key] ?? { name: entry.userName, image: entry.userImage, minutes: 0 };
      current.minutes += entry.minutes;
      acc[key] = current;
      return acc;
    },
    {}
  );
  const totalRows = Object.entries(totalsByUser)
    .map(([key, value]) => ({ key, ...value }))
    .filter((row) => row.minutes !== 0)
    .sort((a, b) => b.minutes - a.minutes);
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
          {totalRows.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {totalRows.slice(0, 2).map((row) => (
                <PersonPill key={row.key} name={row.name} image={row.image} detail={formatMinutesLabel(row.minutes)} />
              ))}
            </div>
          ) : null}
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
          <div className="flex flex-wrap gap-1.5">
            {totalRows.map((row) => (
              <PersonPill key={row.key} name={row.name} image={row.image} detail={formatMinutesLabel(row.minutes)} />
            ))}
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
  const orderId = String(id ?? "");
  const [data, setData] = useState<OrderData | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [track, setTrack] = useState<TrackType>("SHARED");
  const [uploadTrackPopoverOpen, setUploadTrackPopoverOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [updatingStatuses, setUpdatingStatuses] = useState<Set<string>>(new Set());
  const [savingTimeTracks, setSavingTimeTracks] = useState<Set<Track>>(new Set());
  const [timeErrorsByTrack, setTimeErrorsByTrack] = useState<Partial<Record<Track, string>>>({});
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

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

  async function load() {
    if (!orderId) return;
    setErr(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
      if (!res.ok) {
        const msg = await res.text();
        setErr(`Kunde inte hÃ¤mta order (${res.status}): ${msg}`);
        setData(null);
        return;
      }
      const json = await res.json();
      const order = json.order as OrderData;
      order.timeEntries = Array.isArray(order.timeEntries) ? order.timeEntries : [];

      // Check if order is archived (billed)
      if (order.billingConfirmedAt) {
        // Redirect to archived page
        window.location.href = `/orders/archived`;
        return;
      }

      setData(order);
    } catch (e: any) {
      console.error(e);
      setErr("Tekniskt fel nÃ¤r order skulle hÃ¤mtas.");
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
        `Ã„r du sÃ¤ker pÃ¥ att du vill ta bort filen "${filename}"? Detta gÃ¥r inte att Ã¥ngra.`
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
  }

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
          const trackLabel = TRACK_LABELS[t] ?? `spÃ¥r ${t}`;
          setStatusError(
            `Du har inte behÃ¶righet att uppdatera ${trackLabel}. Kontakta en administratÃ¶r om du behÃ¶ver gÃ¶ra Ã¤ndringar.`
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

      setData((prev) => {
        if (!prev) return prev;
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
          timeEntries: payload?.entry ? [payload.entry as TimeEntry, ...(prev.timeEntries ?? [])] : prev.timeEntries,
        };
      });
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
        <h1 className="text-2xl font-bold">
          Order #{data.orderNumber} â€“ {data.title}
        </h1>
        <p className="text-gray-600">Kund: {data.customerName ?? "-"}</p>
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



