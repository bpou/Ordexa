"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useOrderRealtime } from "@/lib/useOrderRealtime";
import type { AppTrack } from "@/lib/tracks";
import { STATUS_COLOR_PARTS, STATUS_COLORS, STATUS_DISPLAY, type TrackStatus } from "@/lib/orderStatus";
import { OrdinaLogoSpinner } from "@/components/OrdinaLoader";
import { formatMinutesLabel } from "@/lib/time";
import { recordRecentOrder } from "@/lib/recentOrders";
import { Shimmer } from "@/components/Shimmer";
import Accordion from "@/components/ui/Accordion";

/* ---------- Typer ---------- */
type Track = AppTrack;
type TrackType = AppTrack | "SHARED";
type Role = "ADMIN" | "SALJARE" | "A_TEAM" | "B_TEAM" | "C_TEAM" | "D_TEAM";

type FileItem = {
  id: string;
  filename: string;
  url: string;          // presigned GET-url
  track: TrackType;
  createdAt: string | number;
  expiresAt?: number;   // ms epoch
  uploadedBy?: string | null;
  uploadedByName?: string | null;
  uploadedByImage?: string | null;
};

type TrackRow = {
  track: Track;
  status: TrackStatus;
  timeSpentMinutes: number;
};

type OrderData = {
  orderNumber: string | number;
  title: string;
  customerName?: string | null;
  createdAt?: string | null;
  tracks: TrackRow[];
  files: FileItem[];
};

const FILE_RENEW_BUFFER_MS = 60_000;

/* ---------- Status Pill Helpers (match DnD page) ---------- */
const STATI = ["INKOMMANDE", "PAGAENDE", "LEVERANS", "AVSLUTAD"] as const;
type Status = typeof STATI[number];

const STATUS_DISPLAY_LOCAL: Record<Status, string> = {
  INKOMMANDE: "Inkommande",
  PAGAENDE: "Pågående",
  LEVERANS: "Leverans",
  AVSLUTAD: "Avslutad",
};

function statusClasses(status: Status) {
  const parts = STATUS_COLOR_PARTS[status];
  return `${parts.bgClass} ${parts.textClass} ${parts.borderClass}`;
}

const TRACK_STATUS_BTN: Record<Status, string> = {
  INKOMMANDE: `${statusClasses("INKOMMANDE")} hover:opacity-90`,
  PAGAENDE: `${statusClasses("PAGAENDE")} hover:opacity-90`,
  LEVERANS: `${statusClasses("LEVERANS")} hover:opacity-90`,
  AVSLUTAD: `${statusClasses("AVSLUTAD")} hover:opacity-90`,
};

/* ---------- Hjälp: enkel förhandsvisning ---------- */
function FilePreview({ url, filename }: { url: string; filename: string }) {
  const lower = filename.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/.test(lower)) {
    return <img src={url} alt={filename} className="mt-2 max-h-64 w-auto rounded border" />;
  }
  if (lower.endsWith(".pdf")) {
    return <iframe src={url} className="mt-2 w-full h-[500px] border rounded" />;
  }
  return null;
}

/* ---------- Komponent ---------- */
export default function OrderTrackClient({
  id,
  track,
}: {
  id: string;
  track: Track;
}) {
  const { data: session } = useSession();
  const sessionUser = session?.user as { id?: string; role?: Role } | null | undefined;
  const canDeleteFiles = sessionUser?.role === "ADMIN" || sessionUser?.role === "SALJARE";
  const [data, setData] = useState<OrderData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [hoursInput, setHoursInput] = useState<string>("");
  const [minutesInput, setMinutesInput] = useState<string>("");
  const [savingTime, setSavingTime] = useState<boolean>(false);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [lastAddedMinutes, setLastAddedMinutes] = useState<number | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);

  const trackNames = { A: 'AteljÃ©', B: 'Verkstad', C: 'Montage', D: 'Bilmontage', SHARED: 'Delad' };

  const load = useCallback(async (): Promise<void> => {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}`, { cache: "no-store" });
      if (!res.ok) {
        const msg = await res.text();
        setErr(`Kunde inte hämta order (${res.status}): ${msg}`);
        setData(null);
        return;
      }
      const json: { order: OrderData } = await res.json();
      setData(json.order);
    } catch {
      setErr("Tekniskt fel när order skulle hämtas.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load, track]);

  useEffect(() => {
    if (!id) return;
    recordRecentOrder(id);
  }, [id]);

  useEffect(() => {
    if (lastAddedMinutes === null) return;
    const timer = window.setTimeout(() => setLastAddedMinutes(null), 3200);
    return () => window.clearTimeout(timer);
  }, [lastAddedMinutes]);

  useEffect(() => {
    setHoursInput("");
    setMinutesInput("");
    setTimeError(null);
  }, [track]);

  async function submitTime(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (savingTime) return;

    const hoursRaw = Number.parseInt(hoursInput.trim() || "0", 10);
    const minutesRaw = Number.parseInt(minutesInput.trim() || "0", 10);
    const safeHours = Number.isFinite(hoursRaw) ? Math.max(0, Math.min(999, hoursRaw)) : 0;
    const safeMinutes = Number.isFinite(minutesRaw) ? Math.max(0, minutesRaw) : 0;
    const totalMinutes = safeHours * 60 + safeMinutes;

    if (totalMinutes <= 0) {
      setTimeError("Ange en tid större än noll.");
      return;
    }
    if (totalMinutes > 24 * 60) {
      setTimeError("Max 24 timmar kan registreras per tillfälle.");
      return;
    }

    setSavingTime(true);
    setTimeError(null);
    try {
      const res = await fetch(`/api/orders/${id}/tracks/${track}/time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes: totalMinutes, userId: sessionUser?.id }),
      });

      const payloadText = await res.text();
      let payload: any = null;
      if (payloadText) {
        try {
          payload = JSON.parse(payloadText);
        } catch {
          /* ignore parse error */
        }
      }

      if (!res.ok) {
        const message =
          (typeof payload?.error === "string" && payload.error.trim().length > 0)
            ? payload.error
            : "Kunde inte spara tiden just nu.";
        setTimeError(message);
        return;
      }

      const updatedMinutes =
        typeof payload?.track?.timeSpentMinutes === "number"
          ? payload.track.timeSpentMinutes
          : totalMinutes;
      const minutesAdded =
        typeof payload?.minutesAdded === "number" && payload.minutesAdded > 0
          ? payload.minutesAdded
          : totalMinutes;

      setData((prev) =>
        prev
          ? {
              ...prev,
              tracks: prev.tracks.map((t) =>
                t.track === track ? { ...t, timeSpentMinutes: updatedMinutes } : t
              ),
            }
          : prev
      );

      setHoursInput("");
      setMinutesInput("");
      setLastAddedMinutes(minutesAdded);
    } catch (error) {
      console.error("Failed to submit time", error);
      setTimeError("Tekniskt fel vid sparande av tid.");
    } finally {
      setSavingTime(false);
    }
  }

  /* ---------- Realtime ---------- */
  useOrderRealtime<FileItem, { id: string }>(
    id,
    (incoming: FileItem) => {
      if (!(incoming.track === track || incoming.track === "SHARED")) return;
      setData((prev) => {
        if (!prev) return prev;
        const already = prev.files.some((f) => f.id === incoming.id || f.url === incoming.url);
        if (already) return prev;
        return { ...prev, files: [incoming, ...prev.files] };
      });
    },
    (payload: { id: string }) => {
      setData((prev) =>
        prev ? { ...prev, files: prev.files.filter((f) => f.id !== payload.id) } : prev
      );
    }
  );

  /* ---------- Filtrering: mitt spår + SHARED ---------- */
  const visibleFiles = useMemo(
    () => (data?.files ?? []).filter((f) => f.track === track || f.track === "SHARED"),
    [data?.files, track]
  );

  /* ---------- Auto-förnya presigned URLs ---------- */
  useEffect(() => {
    if (!visibleFiles.length) return;

    const now = Date.now();
    const soonest = visibleFiles
      .map((f) => (typeof f.expiresAt === "number" ? f.expiresAt : now + 3_600_000))
      .reduce((min, x) => Math.min(min, x), now + 3_600_000);

    const delay = Math.max(0, soonest - FILE_RENEW_BUFFER_MS - now);

    const t = setTimeout(async () => {
      try {
        const ids = visibleFiles.map((f) => f.id);
        const res = await fetch(`/api/orders/${id}/files/renew`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        if (!res.ok) return;

        const json: { urls: { id: string; url: string; expiresAt: number }[] } = await res.json();
        const map = new Map(json.urls.map((u) => [u.id, u]));

        setData((prev) =>
          prev
            ? {
                ...prev,
                files: prev.files.map((f) =>
                  map.has(f.id)
                    ? { ...f, url: map.get(f.id)!.url, expiresAt: map.get(f.id)!.expiresAt }
                    : f
                ),
              }
            : prev
        );
      } catch {
        /* ignore */
      }
    }, delay);

    return () => clearTimeout(t);
  }, [
    id,
    JSON.stringify(visibleFiles.map((f) => ({ id: f.id, exp: f.expiresAt ?? 0 }))),
  ]);

  /* ---------- Upload ---------- */
  async function upload(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("track", track);
      const res = await fetch(`/api/orders/${id}/files`, { method: "POST", body: fd });
      if (!res.ok) {
        const msg = await res.text();
        alert(`Uppladdning misslyckades: ${msg}`);
        return;
      }
      await res.json();
      setFile(null);
    } catch {
      alert("Tekniskt fel vid uppladdning.");
    } finally {
      setUploading(false);
    }
  }

  /* ---------- Delete ---------- */
  async function deleteFile(fileId: string, filename: string): Promise<void> {
    if (!confirm(`Är du säker på att du vill ta bort filen "${filename}"?`)) return;
    const res = await fetch(`/api/orders/${id}/files/${fileId}`, { method: "DELETE" });
    if (!res.ok) {
      const msg = await res.text();
      alert(`Kunde inte ta bort filen: ${msg}`);
      return;
    }
    setData((prev) =>
      prev ? { ...prev, files: prev.files.filter((f) => f.id !== fileId) } : prev
    );
  }

  /* ---------- Gate: blockera Montage (C) om Verkstad (B) inte klar ---------- */
  const verkstadRow = useMemo(
    () => data?.tracks.find((t) => t.track === "B"),
    [data?.tracks]
  );
  const montageBlocked = useMemo(() => {
    if (track !== "C") return false;
    // Tillåt när B är LEVERANS (justera här om du har annan logik)
    const ALLOWED_BEFORE_MONTAGE: TrackStatus[] = ["LEVERANS"];
    return !verkstadRow || !ALLOWED_BEFORE_MONTAGE.includes(verkstadRow.status);
  }, [track, verkstadRow]);

  /* ---------- Render ---------- */
  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (loading)
    return (
      <div className="flex min-h-[200px] items-center justify-center p-6">
        <div className="flex items-center gap-3 text-neutral-600">
          <OrdinaLogoSpinner size={36} />
          <span>Laddar orderdata</span>
        </div>
      </div>
    );
  if (!data) return <div className="p-6">Ingen data</div>;

  // Block view if montage not allowed
  if (false && montageBlocked) {
    const currentStatus = verkstadRow?.status ?? "saknas";
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-5">
          <h2 className="text-lg font-semibold text-amber-900">Åtkomst nekad till Montage (Spår C)</h2>
          <p className="mt-2 text-amber-900/90">
            Den här ordern är inte markerad som redo för montage ännu.
            <br />
            Krav: <strong>Verkstad (Spår B)</strong> måste vara i status{" "}
            <span className="font-semibold">LEVERANS</span> 
          </p>
          <p className="mt-2 text-sm text-amber-900/80">
            Nuvarande status för Verkstad (B): <strong>{currentStatus}</strong>
          </p>
          <div className="mt-4 flex gap-2">
            <a
              href={`/orders/${encodeURIComponent(String(data.orderNumber))}/track/B`}
              className="inline-flex items-center rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
            >
              Öppna Verkstad (Spår B)
            </a>
            <a
              href={`/orders/${encodeURIComponent(String(data.orderNumber))}`}
              className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
            >
              Tillbaka till order
            </a>
          </div>
        </div>
      </div>
    );
  }

  const trackData = data.tracks.find((t) => t.track === track);
  const totalMinutesForTrack = trackData?.timeSpentMinutes ?? 0;
  const totalTimeLabel = formatMinutesLabel(totalMinutesForTrack);
  const trackStatus = trackData?.status;
  const recentAdditionLabel =
    lastAddedMinutes !== null ? formatMinutesLabel(lastAddedMinutes) : null;

  const updateStatus = async (newStatus: TrackStatus) => {
    if (updatingStatus) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/orders/${id}/tracks/${track}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const msg = await res.text();
        alert(`Kunde inte uppdatera status: ${msg}`);
        return;
      }
      setData((prev) =>
        prev
          ? {
              ...prev,
              tracks: prev.tracks.map((t) =>
                t.track === track ? { ...t, status: newStatus } : t
              ),
            }
          : prev
      );
    } catch (error) {
      console.error("Failed to update status", error);
      alert("Tekniskt fel vid statusuppdatering.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Order #{data.orderNumber} – {data.title}
        </h1>
        <p className="text-gray-600">Kund: {data.customerName ?? "-"}</p>
        {!!data.createdAt && (
          <p className="text-gray-500 text-sm mt-1">
            Skapad: {new Date(data.createdAt).toLocaleString("sv-SE")}
          </p>
        )}
      </div>

      {/* Status Pill - Prominent display at the top */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-gray-700">Spår {track} Status:</span>
        {trackStatus ? (
          <Shimmer
            variant="pill"
            isLoading={updatingStatus}
            duration={1.5}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-all duration-300 ${STATUS_COLORS[trackStatus]}`}
          >
            {STATUS_DISPLAY[trackStatus]}
          </Shimmer>
        ) : (
          <span className="font-medium text-gray-700 transition-all duration-300">Ingen status</span>
        )}
      </div>

      <div className="border rounded p-4 space-y-5">
        <div>
          <h2 className="text-lg font-semibold">Spår {track}</h2>

          {/* ---------- Status Block (label + shimmer pills) ---------- */}
          <div className="mt-4">
            <p className="text-sm font-semibold mb-2">Status:</p>
            <div className="flex flex-wrap gap-2">
              {(STATI as readonly Status[]).map((s) => {
                const base = TRACK_STATUS_BTN[s] ?? "hover:bg-neutral-100";
                const active = s === trackStatus ? "ring-2 ring-black/10" : "";
                const isUpdatingThis = updatingStatus && s === trackStatus;
                return (
                  <Shimmer
                    key={s}
                    variant="pill"
                    isLoading={isUpdatingThis}
                    className="inline-block"
                  >
                    <motion.button
                      onClick={() => updateStatus(s as unknown as TrackStatus)}
                      whileTap={{ scale: 0.98 }}
                      whileHover={{ y: -1, scale: 1.05 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className={`text-[11px] border rounded-full px-2 py-1 transition-all duration-300 ${base} ${active}`}
                    >
                      {STATUS_DISPLAY_LOCAL[s]}
                    </motion.button>
                  </Shimmer>
                );
              })}
            </div>
          </div>
        </div>

        <Accordion
          items={[
            {
              title: "Tidregistrering",
              content: (
                <div className="rounded-xl border border-brand-100 bg-gradient-to-r from-brand-50 via-white to-brand-50/90 p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-brand-700">Registrerad tid</p>
                      <p className="text-xs text-brand-600/80">Summering för spår {track}</p>
                    </div>
                    <motion.span
                      key={totalMinutesForTrack}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="text-2xl font-semibold text-brand-900"
                    >
                      {totalTimeLabel}
                    </motion.span>
                  </div>

                  <AnimatePresence>
                    {lastAddedMinutes !== null && recentAdditionLabel && (
                      <motion.div
                        key={`added-${lastAddedMinutes}`}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                        className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand-600/10 px-3 py-1 text-xs font-medium text-brand-700"
                      >
                        <span>+{recentAdditionLabel}</span>
                        <span className="text-brand-500">tillagd</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form onSubmit={submitTime} className="mt-4 flex flex-wrap items-end gap-3">
                    <label className="flex flex-col text-xs font-medium text-brand-800">
                      Timmar
                      <input
                        type="number"
                        min="0"
                        max="999"
                        inputMode="numeric"
                        value={hoursInput}
                        onChange={(e) => {
                          const next = e.target.value.replace(/[^0-9]/g, "").slice(0, 3)
                          setHoursInput(next)
                        }}
                        placeholder="0"
                        className="mt-1 w-24 rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-400"
                      />
                    </label>
                    <label className="flex flex-col text-xs font-medium text-brand-800">
                      Minuter
                      <input
                        type="number"
                        min="0"
                        max="1440"
                        inputMode="numeric"
                        value={minutesInput}
                        onChange={(e) => {
                          const next = e.target.value.replace(/[^0-9]/g, "").slice(0, 4)
                          setMinutesInput(next)
                        }}
                        placeholder="30"
                        className="mt-1 w-24 rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-400"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={savingTime}
                      className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingTime ? (
                        <>
                          <OrdinaLogoSpinner size={18} />
                          <span>Sparar</span>
                        </>
                      ) : (
                        <span>Lägg till tid</span>
                      )}
                    </button>
                  </form>

                  <p className="mt-3 text-xs text-brand-600/70">Tiden adderas till den totala summeringen för spåret.</p>

                  {timeError && (
                    <div className="mt-3 rounded-md border border-error-200 bg-error-50 px-3 py-2 text-xs text-error-700">
                      {timeError}
                    </div>
                  )}
                </div>
              ),
            },
            {
              title: "Filhantering",
              content: (
                <div className="space-y-4">
                  {/* Filuppladdning */}
                  <form onSubmit={upload} className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-brand-900">Ladda upp fil till spår {track}</p>
                        <p className="text-xs text-brand-700/70">Filen visas i detta spår samt delade visningar.</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {file ? (
                          <span className="inline-flex max-w-[280px] items-center truncate rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                            {file.name}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <input
                      id="track-file-input"
                      type="file"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      className="hidden"
                    />
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => document.getElementById("track-file-input")?.click()}
                        className="inline-flex items-center rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-medium text-brand-700 transition hover:border-brand-300 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-300"
                      >
                        {file ? "Byt fil" : "Välj fil"}
                      </button>
                      <button
                        type="submit"
                        disabled={uploading || !file}
                        className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-400"
                      >
                        {uploading ? (
                          <div className="flex items-center gap-2">
                            <OrdinaLogoSpinner size={18} />
                            <span>Laddar</span>
                          </div>
                        ) : (
                          <span>Ladda upp</span>
                        )}
                      </button>
                    </div>
                  </form>

                  {/* Filer lista */}
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-brand-900">Filer för spår {track} (inkl. Delad)</h3>
                    {visibleFiles.length === 0 && (
                      <div className="rounded-xl border border-brand-100 bg-brand-50/50 px-4 py-3 text-sm text-brand-700/80">Inga filer ännu.</div>
                    )}
                    <div className="grid gap-4">
                      {visibleFiles.map((f) => (
                        <div key={f.id} className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm transition hover:border-brand-200 hover:shadow">
                          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-600/80">{trackNames[f.track] || f.track}</div>
                          <div className="break-all text-sm font-semibold text-brand-900">
                            <a href={f.url} target="_blank" rel="noopener noreferrer" className="underline decoration-brand-300 underline-offset-2 hover:text-brand-700">
                              {f.filename}
                            </a>
                          </div>
                          <div className="mb-2 text-xs text-neutral-500">
                            Uppladdad: {new Date(f.createdAt).toLocaleString("sv-SE")}
                          </div>
                          {(f.uploadedByName || f.uploadedBy) ? (
                            <div className="mb-2 inline-flex max-w-full items-center gap-2 rounded-full border border-brand-100 bg-white px-2 py-1 text-xs text-neutral-600">
                              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50 text-[10px] font-semibold text-brand-700">
                                {f.uploadedByImage ? (
                                  <img src={f.uploadedByImage} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  (f.uploadedByName ?? f.uploadedBy ?? "?").slice(0, 2).toUpperCase()
                                )}
                              </span>
                              <span className="truncate">{f.uploadedByName ?? f.uploadedBy}</span>
                            </div>
                          ) : null}
                          <FilePreview url={f.url} filename={f.filename} />
                          {canDeleteFiles ? (
                            <button
                              onClick={() => void deleteFile(f.id, f.filename)}
                              className="mt-3 inline-flex items-center rounded-md border border-error-300 bg-error-50 px-2.5 py-1.5 text-xs font-medium text-error-800 transition hover:bg-error-100"
                            >
                              Ta bort
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ),
            },
          ]}
          allowMultiple={true}
        />
      </div>

    </div>
  );
}
