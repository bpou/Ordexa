"use client";

import useSWR from "swr";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TRACK_SLUGS, type AppTrack } from "@/lib/tracks";
import { STATUS_COLOR_PARTS } from "@/lib/orderStatus";
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  DragMoveEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
} from "@dnd-kit/core";

// ============================
// Konstanter & Typer
// ============================
const STATI = ["INKOMMANDE", "PAGAENDE", "LEVERANS", "AVSLUTAD"] as const;
type Status = typeof STATI[number];
type Role = "ADMIN" | "SALJARE" | "A_TEAM" | "B_TEAM" | "C_TEAM" | "D_TEAM";
function isStatus(v: unknown): v is Status {
  return typeof v === "string" && (STATI as readonly string[]).includes(v);
}

type Row = {
  id: string;
  status: Status;
  order: {
    orderNumber: string;
    title: string;
    customerName?: string | null;
    files?: {
      id: string;
      filename: string;
      url: string;
      uploadedBy?: string | null;
      uploadedByName?: string | null;
      uploadedByImage?: string | null;
    }[];
  };
};

type ApiData = { grouped: Record<Status, Row[]> };

type DragVisual =
  | { kind: "single"; color: string }
  | { kind: "split"; leftColor: string; rightColor: string; stopPct: number };

type Over = { status: Status; rect: DOMRect };

function statusClasses(status: Status) {
  const parts = STATUS_COLOR_PARTS[status];
  return `${parts.bgClass} ${parts.textClass} ${parts.borderClass}`;
}

const TRACK_STATUS_COLORS: Record<Status, string> = {
  INKOMMANDE: statusClasses("INKOMMANDE"),
  PAGAENDE: statusClasses("PAGAENDE"),
  LEVERANS: statusClasses("LEVERANS"),
  AVSLUTAD: statusClasses("AVSLUTAD"),
};

const TRACK_STATUS_BTN: Record<Status, string> = {
  INKOMMANDE: `${statusClasses("INKOMMANDE")} hover:opacity-90`,
  PAGAENDE: `${statusClasses("PAGAENDE")} hover:opacity-90`,
  LEVERANS: `${statusClasses("LEVERANS")} hover:opacity-90`,
  AVSLUTAD: `${statusClasses("AVSLUTAD")} hover:opacity-90`,
};

// Hex colors from status palette - used for gradient
const STATUS_BG_HEX: Record<Status, string> = {
  INKOMMANDE: STATUS_COLOR_PARTS.INKOMMANDE.bgHex,
  PAGAENDE: STATUS_COLOR_PARTS.PAGAENDE.bgHex,
  LEVERANS: STATUS_COLOR_PARTS.LEVERANS.bgHex,
  AVSLUTAD: STATUS_COLOR_PARTS.AVSLUTAD.bgHex,
};

const fetcher = (url: string) =>
  fetch(url).then(async (r) => {
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error || r.statusText);
    return j as ApiData;
  });

// Fallback så optimisticData alltid är giltig
const EMPTY_API: ApiData = {
  grouped: {
    INKOMMANDE: [],
    PAGAENDE: [],
    LEVERANS: [],
    AVSLUTAD: [],
  },
};

// ============================
// Hjälpare för gradient
// ============================
function clamp(n: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, n));
}
function hexToRgb(hex: string) {
  const m = hex.replace("#", "");
  const n = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const num = parseInt(n, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}
function rgbToHex(r: number, g: number, b: number) {
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function mixHex(a: string, b: string, t: number) {
  const A = hexToRgb(a),
    B = hexToRgb(b);
  const r = Math.round(A.r + (B.r - A.r) * t);
  const g = Math.round(A.g + (B.g - A.g) * t);
  const b2 = Math.round(A.b + (B.b - A.b) * t);
  return rgbToHex(r, g, b2);
}
function colorOf(s: unknown): string {
  return STATUS_BG_HEX[isStatus(s) ? s : "INKOMMANDE"];
}

function initials(name: string | null | undefined) {
  const parts = (name || "?").trim().split(/\s+/).filter(Boolean);
  return (parts.length ? parts.map((part) => part[0]).join("") : "?").slice(0, 2).toUpperCase();
}

// ============================
// Hook: mäter kolumn-rects (fixad)
// ============================
function useColumnRects() {
  const refs = useRef<Record<Status, HTMLDivElement | null>>({
    INKOMMANDE: null,
    PAGAENDE: null,
    LEVERANS: null,
    AVSLUTAD: null,
  });
  const [rects, setRects] = useState<Record<Status, DOMRect | null>>({
    INKOMMANDE: null,
    PAGAENDE: null,
    LEVERANS: null,
    AVSLUTAD: null,
  });

  const setRef = useCallback((status: Status) => (el: HTMLDivElement | null) => {
    refs.current[status] = el;
  }, []);

  const measure = useCallback(() => {
    const next: Record<Status, DOMRect | null> = {
      INKOMMANDE: null,
      PAGAENDE: null,
      LEVERANS: null,
      AVSLUTAD: null,
    };
    (STATI as readonly Status[]).forEach((s) => {
      const el = refs.current[s];
      next[s] = el ? el.getBoundingClientRect() : null;
    });
    setRects(next);
  }, []);

  useLayoutEffect(() => {
    // Vänta tills layouten är applicerad innan vi mäter första gången
    const raf = requestAnimationFrame(() => {
      measure();
    });

    const ro = new ResizeObserver(() => measure());
    (STATI as readonly Status[]).forEach((s) => {
      const el = refs.current[s];
      if (el) ro.observe(el);
    });

    const onScroll = () => measure();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", measure);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  return { setRef, rects, measure };
}

// ============================
// Huvudkomponent
// ============================
export default function TrackBoardClient({ track }: { track: AppTrack }) {
  const { data, error, mutate } = useSWR<ApiData>(`/api/orders/track/${track}`, fetcher, {
    refreshInterval: 10_000,
  });
  const { data: session } = useSession();
  const role = (session?.user as { role?: Role } | null | undefined)?.role;
  const canDeleteFiles = role === "ADMIN" || role === "SALJARE";
  const canCreateOrders = role === "ADMIN" || role === "SALJARE";
  const trackSlug = TRACK_SLUGS[track] ?? track.toLowerCase();

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 8,
      },
    })
  );

  const [activeRow, setActiveRow] = useState<Row | null>(null);
  const [activeCol, setActiveCol] = useState<Status | null>(null);
  const [dragVisual, setDragVisual] = useState<DragVisual | null>(null);
  const [updatingStatuses, setUpdatingStatuses] = useState<Set<string>>(new Set());
  const [collapsedColumns, setCollapsedColumns] = useState<Record<Status, boolean>>({
    INKOMMANDE: false,
    PAGAENDE: true,
    LEVERANS: true,
    AVSLUTAD: true,
  });

  const { setRef, rects, measure } = useColumnRects();

  const getOrderHref = useCallback(
    (orderNumber: string) => {
      const encodedOrder = encodeURIComponent(orderNumber);
      if (role === "SALJARE" || role === "ADMIN") {
        return `/orders/${encodedOrder}`;
      }
      return `/orders/${encodedOrder}/track/${trackSlug}`;
    },
    [role, trackSlug]
  );

  // Optimistisk flytt i cachen
  const moveOptimistic = useCallback(
    (cur: ApiData, orderNumber: string, to: Status): ApiData => {
      const next: ApiData = {
        grouped: { INKOMMANDE: [], PAGAENDE: [], LEVERANS: [], AVSLUTAD: [] },
      } as ApiData;
      let moved: Row | null = null;
      (STATI as readonly Status[]).forEach((s) => {
        next.grouped[s] = cur.grouped[s].filter((r) => {
          if (r.order.orderNumber === orderNumber) {
            moved = { ...r, status: to };
            return false;
          }
          return true;
        });
      });
      if (moved) next.grouped[to] = [moved, ...next.grouped[to]];
      return next;
    },
    []
  );

  const setStatus = useCallback(
    async (orderNumber: string, status: Status) => {
      setUpdatingStatuses(prev => new Set(prev).add(orderNumber));
      try {
        await mutate(
          async (cur: ApiData | undefined): Promise<ApiData> => {
            const res = await fetch(`/api/orders/${orderNumber}/tracks/${track}/status`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status }),
            });
            if (!res.ok) {
              let detail = "";
              try {
                detail = await res.text();
              } catch {}
              return Promise.reject(
                new Error(`Statusbyte misslyckades (${res.status}) ${detail}`.trim())
              );
            }
            const latest = cur ?? (await fetcher(`/api/orders/track/${track}`));
            return moveOptimistic(latest, orderNumber, status);
          },
          {
            revalidate: false,
            rollbackOnError: true,
            populateCache: true,
            optimisticData: (current) =>
              current ? moveOptimistic(current, orderNumber, status) : EMPTY_API,
          }
        );
      } finally {
        setUpdatingStatuses(prev => {
          const next = new Set(prev);
          next.delete(orderNumber);
          return next;
        });
      }
    },
    [mutate, track, moveOptimistic]
  );

  const deleteFile = useCallback(
    async (orderNumber: string, fileId: string, filename: string) => {
      if (!confirm(`Ta bort filen "${filename}"?`)) return;
      const res = await fetch(
        `/api/orders/${encodeURIComponent(orderNumber)}/files/${encodeURIComponent(fileId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        alert("Kunde inte ta bort filen.");
        return;
      }
      mutate();
    },
    [mutate]
  );

  const findRow = useCallback(
    (orderNumber: string, snapshot?: ApiData | null): Row | null => {
      const src = snapshot ?? data;
      if (!src) return null;
      for (const s of STATI as readonly Status[]) {
        const hit = src.grouped[s].find(
          (r) => r.order.orderNumber === orderNumber
        );
        if (hit) return hit;
      }
      return null;
    },
    [data]
  );

  // Beräkna visual utifrån kolumn-rects och kortets rect
  function updateDragVisualFromRects(cardRect: DOMRect | null) {
    if (!cardRect) {
      setDragVisual(null);
      return;
    }

    const overlaps: Over[] = [];
    for (const s of STATI as readonly Status[]) {
      const r = rects[s];
      if (!r) continue;
      const interLeft = Math.max(cardRect.left, r.left);
      const interRight = Math.min(cardRect.right, r.right);
      if (interRight - interLeft > 0) overlaps.push({ status: s, rect: r });
    }

    // Närmaste vänster/höger (explicit typ och null-init)
    let left: Over | null = null;
    let right: Over | null = null;
    for (const s of STATI as readonly Status[]) {
      const r = rects[s];
      if (!r) continue;
      if (r.right <= cardRect.left) {
        if (!left || r.right > left.rect.right) left = { status: s, rect: r };
      } else if (r.left >= cardRect.right) {
        if (!right || r.left < right.rect.left) right = { status: s, rect: r };
      }
    }

    if (overlaps.length >= 2) {
      overlaps.sort((a, b) => a.rect.left - b.rect.left);
      const L: Over = overlaps[0]!;
      const R: Over = overlaps[1]!;
      const borderX = L.rect.right; // == R.rect.left
      const stopPct = clamp(((borderX - cardRect.left) / (cardRect.width || 1)) * 100, 0, 100);
      setDragVisual({ kind: "split", leftColor: STATUS_BG_HEX[L.status], rightColor: STATUS_BG_HEX[R.status], stopPct });
      const centerX = cardRect.left + cardRect.width / 2;
      setActiveCol(centerX < borderX ? L.status : R.status);
      return;
    }

    if (overlaps.length === 0 && left && right) {
      const L: Over = left!;
      const R: Over = right!;
      const borderX = L.rect.right; // gap-gränsen
      const stopPct = clamp(((borderX - cardRect.left) / (cardRect.width || 1)) * 100, 0, 100);
      setDragVisual({ kind: "split", leftColor: STATUS_BG_HEX[L.status], rightColor: STATUS_BG_HEX[R.status], stopPct });
      const centerX = cardRect.left + cardRect.width / 2;
      setActiveCol(centerX < borderX ? L.status : R.status);
      return;
    }

    if (overlaps.length === 1) {
      const only: Over = overlaps[0]!;
      setDragVisual({ kind: "single", color: STATUS_BG_HEX[only.status] });
      setActiveCol(only.status);
      return;
    }

    setDragVisual(null);
  }

  // --- Handlers ---
  function handleDragStart(evt: DragStartEvent) {
    // Säkerställ giltiga rects innan vi använder dem
    measure();

    const orderNumber = (evt.active.data?.current as any)?.orderNumber as string | undefined;
    if (!orderNumber) return;
    const r = findRow(orderNumber);
    if (!r) return;
    setActiveRow(r);
    const rectActive = (evt.active?.rect?.current?.translated || evt.active?.rect?.current?.initial) as DOMRect | undefined;
    updateDragVisualFromRects(rectActive ?? null);
  }

  function handleDragMove(evt: DragMoveEvent) {
    // Om något saknas (t.ex. första draget direkt efter sidstart), mät nu
    if (Object.values(rects).some((v) => !v)) measure();

    const rectActive = (evt.active?.rect?.current?.translated || evt.active?.rect?.current?.initial) as DOMRect | undefined;
    updateDragVisualFromRects(rectActive ?? null);
  }

  async function handleDragEnd(evt: DragEndEvent) {
    const orderNumber = (evt.active.data?.current as any)?.orderNumber as string | undefined;
    setActiveRow(null);
    setDragVisual(null);
    setActiveCol(null);
    const overId = evt.over?.id;
    if (!orderNumber || !isStatus(overId)) return;
    await setStatus(orderNumber, overId);
  }

  if (error)
    return (
      <div className="p-6 text-error-600">
        Kunde inte ladda: {String(error.message || error)}
      </div>
    );
  if (!data) return <div className="p-6">Laddar…</div>;

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Spår {track} kalender</h1>
        <div className="flex gap-2">
          {canCreateOrders ? (
            <Link href="/orders/new" className="rounded-lg bg-brand-500 text-white px-3 py-2 text-sm">Ny order</Link>
          ) : null}
          <Link href="/orders/overview" className="rounded-lg border px-3 py-2 text-sm">Översikt</Link>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onDragCancel={() => { setActiveRow(null); setDragVisual(null); setActiveCol(null); }}
      >
        <motion.div layout className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(STATI as readonly Status[]).map((col) => {
            const items = (data?.grouped?.[col] ?? []) as Row[];
            return (
              <DropColumn
                key={col}
                id={col}
                title={col}
                count={items.length}
                active={activeCol === col}
                collapsed={collapsedColumns[col]}
                onToggle={() =>
                  setCollapsedColumns((prev) => ({
                    ...prev,
                    [col]: !prev[col],
                  }))
                }
                setMeasureRef={setRef(col)}
              >
                <AnimatePresence initial={false}>
                  {items.length === 0 ? (
                    <motion.div
                      key="empty"
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-xs text-gray-500 px-2 py-3"
                    >
                      Inga ordrar
                    </motion.div>
                  ) : null}

                  {items.map((row) => (
                    <DraggableCard key={row.id} row={row}>
                      <OrderCardUI
                        row={row}
                        deleteFile={deleteFile}
                        setStatus={setStatus}
                        getOrderHref={getOrderHref}
                        isUpdating={updatingStatuses.has(row.order.orderNumber)}
                        canDeleteFiles={canDeleteFiles}
                      />
                    </DraggableCard>
                  ))}
                </AnimatePresence>
              </DropColumn>
            );
          })}
        </motion.div>

        <DragOverlay adjustScale={false} dropAnimation={{ duration: 160 }}>
          {activeRow ? <OrderCardPreview row={activeRow} visual={dragVisual} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

// ============================
// UI-komponenter
// ============================
function DropColumn({
  id,
  title,
  count,
  active,
  collapsed,
  onToggle,
  children,
  setMeasureRef,
}: {
  id: Status;
  title: string;
  count: number;
  active: boolean;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  setMeasureRef: (el: HTMLDivElement | null) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <motion.div
      layout
      className={`rounded-xl border bg-white ${active || isOver ? "ring-2 ring-violet-400" : ""}`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-controls={`track-column-${id}`}
        className="flex w-full items-center justify-between gap-3 border-b px-3 py-3 text-left text-xs font-semibold tracking-wide md:cursor-default"
      >
        <span>{title}</span>
        <span className="inline-flex items-center gap-2">
          <span className="rounded-full border px-2 py-0.5 text-[11px] font-semibold normal-case tracking-normal">
            {count}
          </span>
          <span className="text-sm md:hidden" aria-hidden="true">
            {collapsed ? "+" : "-"}
          </span>
        </span>
      </button>
      <div
        id={`track-column-${id}`}
        ref={(el) => {
          setNodeRef(el);
          setMeasureRef(el);
        }}
        className={`space-y-2 p-2 md:block md:min-h-[80px] ${
          collapsed ? "hidden" : "block min-h-[80px]"
        }`}
      >
        {children}
      </div>
    </motion.div>
  );
}

function DraggableCard({ row, children }: { row: Row; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: row.order.orderNumber,
    data: { orderNumber: row.order.orderNumber },
  });

  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    zIndex: isDragging ? 50 : undefined,
    touchAction: "none",
    userSelect: "none",
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: "spring", stiffness: 500, damping: 35, mass: 0.8 }}
      className={`cursor-grab select-none active:cursor-grabbing ${isDragging ? "opacity-0" : ""}`}
      {...attributes}
      {...listeners}
    >
      {children}
    </motion.div>
  );
}

function OrderCardUI({
  row,
  deleteFile,
  setStatus,
  getOrderHref,
  isUpdating = false,
  canDeleteFiles,
}: {
  row: Row;
  deleteFile: (
    orderNumber: string,
    fileId: string,
    filename: string
  ) => Promise<void> | void;
  setStatus: (orderNumber: string, status: Status) => Promise<void> | void;
  getOrderHref: (orderNumber: string) => string;
  isUpdating?: boolean;
  canDeleteFiles: boolean;
}) {
  const cardColor = TRACK_STATUS_COLORS[row.status] ??
    "bg-neutral-50 text-neutral-900 border-neutral-200";
  return (
    <div className={`rounded-lg border p-3 shadow-sm ${cardColor}`}>
      <div className="text-sm font-semibold mb-1">

        <span className="ml-2">{row.order.title}</span>
      </div>
      <div className="text-xs opacity-80 mb-2">
        Kund: {row.order.customerName ?? "—"}
      </div>

      {row.order.files?.length ? (
        <div className="mb-2 space-y-1">
          {row.order.files!.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between text-xs border rounded px-2 py-1 bg-white/70"
            >
              <a
                href={f.url}
                target="_blank"
                className="truncate max-w-[120px] hover:underline"
              >
                {f.filename}
              </a>
              {(f.uploadedByName || f.uploadedBy) ? (
                <span className="ml-2 inline-flex max-w-[90px] items-center gap-1 rounded-full border border-neutral-200 bg-white px-1.5 py-0.5 text-[10px] text-neutral-600">
                  <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-[8px] font-semibold">
                    {f.uploadedByImage ? (
                      <img src={f.uploadedByImage} alt="" className="h-full w-full object-cover" />
                    ) : (
                      initials(f.uploadedByName ?? f.uploadedBy)
                    )}
                  </span>
                  <span className="truncate">{f.uploadedByName ?? f.uploadedBy}</span>
                </span>
              ) : null}
              {canDeleteFiles ? (
                <button
                  onClick={() =>
                    deleteFile(row.order.orderNumber, f.id, f.filename)
                  }
                  className="ml-2 text-error-700 hover:text-error-900"
                >
                  Ta bort
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
      
      </div>
    </div>
  );
}

function OrderCardPreview({ row, visual }: { row: Row; visual: DragVisual | null }) {
  const base = TRACK_STATUS_COLORS[row.status] ?? "bg-neutral-50 text-neutral-900 border-neutral-200";

  // 🔧 Glow-tweaks
  const GLOW_RADIUS = 7;   // px
  const GLOW_STRONG = 1;   // alpha (0..1)
  const GLOW_SOFT   = 3;   // önskad "styrka": tolkas som större blur, alpha clampas till 1

  // inre blur (för själva gradienten)
  const INNER_BLUR_PX = 8;
  const INNER_BLUR_OPACITY = 0.65;

  const hexToRgba = (hex: string, alpha = 1) => {
    const m = hex.replace("#", "");
    const n = m.length === 3 ? m.split("").map(c => c + c).join("") : m;
    const num = parseInt(n, 16);
    const r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const STRONG_A = Math.max(0, Math.min(1, GLOW_STRONG));
  const SOFT_A   = Math.max(0, Math.min(1, GLOW_SOFT)); // 3 -> 1 (max)
  const SOFT_RADIUS = GLOW_RADIUS * 1.8;

  let baseGradient = "";   // skarp gradient (grundlager)
  let blurGradient = "";   // samma gradient, men blurrad overlay

  if (visual?.kind === "single") {
    baseGradient = visual.color;
    blurGradient = visual.color;
  } else if (visual?.kind === "split") {
    const BLEND_WIDTH_PCT = 10; // mjuk zon runt border
    const aPct = clamp(visual.stopPct - BLEND_WIDTH_PCT / 2, 0, 100);
    const bPct = clamp(visual.stopPct + BLEND_WIDTH_PCT / 2, 0, 100);
    const mid25 = mixHex(visual.leftColor, visual.rightColor, 0.25);
    const mid50 = mixHex(visual.leftColor, visual.rightColor, 0.5);
    const mid75 = mixHex(visual.leftColor, visual.rightColor, 0.75);

    const grad = (left: string, right: string) => `
      linear-gradient(90deg,
        ${left} 0%,
        ${left} ${aPct}%,
        ${mid25} ${aPct}%,
        ${mid50} ${visual.stopPct}%,
        ${mid75} ${bPct}%,
        ${right} ${bPct}%,
        ${right} 100%
      )`;

    baseGradient = grad(visual.leftColor, visual.rightColor);
    blurGradient = baseGradient;
  }

  let glowFilter = "";
  if (visual?.kind === "single") {
    const c = visual.color;
    glowFilter = [
      `drop-shadow(0 0 ${GLOW_RADIUS}px ${hexToRgba(c, STRONG_A)})`,
      `drop-shadow(0 0 ${SOFT_RADIUS}px ${hexToRgba(c, SOFT_A)})`,
    ].join(" ");
  } else if (visual?.kind === "split") {
    const mid = visual ? mixHex(visual.leftColor, visual.rightColor, 0.5) : "#000";
    glowFilter = [
      `drop-shadow(0 0 ${GLOW_RADIUS}px ${hexToRgba(visual!.leftColor, STRONG_A)})`,
      `drop-shadow(0 0 ${GLOW_RADIUS}px ${hexToRgba(visual!.rightColor, STRONG_A)})`,
      `drop-shadow(0 0 ${SOFT_RADIUS}px ${hexToRgba(mid, SOFT_A)})`,
    ].join(" ");
  }

  return (
    <div
      className={`relative rounded-lg border p-3 shadow-lg pointer-events-none ${base}`}
      style={{
        background: baseGradient || undefined,
        filter: glowFilter || undefined,
        boxShadow: "0 0 0 1px rgba(0,0,0,0.04)",
        overflow: "hidden",
        willChange: "background, filter",
      }}
    >
      {/* Inre blurrad kopia av gradienten */}
      {blurGradient ? (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: blurGradient,
            filter: `blur(${INNER_BLUR_PX}px)`,
            opacity: INNER_BLUR_OPACITY,
          }}
        />
      ) : null}

      {/* Innehåll ovanpå */}
      <div className="relative">
        <div className="text-sm font-semibold mb-1">
          #{row.order.orderNumber} – {row.order.title}
        </div>
        <div className="text-xs opacity-80">Kund: {row.order.customerName ?? "—"}</div>
      </div>
    </div>
  );
}





