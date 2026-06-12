"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type {
  CalendarApi,
  EventApi,
  EventContentArg,
  EventInput,
} from "@fullcalendar/core";
import { STATUS_COLOR_PARTS, STATUS_DISPLAY } from "@/lib/orderStatus";
import type { StatusColorParts } from "@/lib/orderStatus";
import CalendarSkin from "@/components/calendar/CalendarSkin";
import { OrdinaLogoSpinner } from "@/components/OrdinaLoader";
import svLocale from "@fullcalendar/core/locales/sv";
import {
  type AppTrack,
} from "@/lib/tracks";
import { MapPin, ChevronLeft, ChevronRight, Eye, EyeOff, CalendarRange } from "lucide-react";
// Drag and drop imports
import { CalendarDragDropProvider } from "@/components/calendar/CalendarDragDropProvider";
import { DragDropState } from "@/components/calendar/DragDropState";
import { DragOverlayLayer } from "@/components/calendar/DragOverlayLayer";

/* =========================
   Util: safe JSON
========================= */
async function safeJson<T = any>(
  res: Response | undefined | null,
  fallback: T,
): Promise<T> {
  try {
    if (!res || !res.ok) return fallback;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      const txt = await res.text().catch(() => "");
      if (!txt) return fallback;
      try {
        return JSON.parse(txt) as T;
      } catch {
        return fallback;
      }
    }
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

function useMountTransition(isMounted: boolean, delay: number) {
  const [shouldRender, setShouldRender] = useState(isMounted);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (isMounted && !shouldRender) {
      setShouldRender(true);
    } else if (!isMounted && shouldRender) {
      timeoutId = setTimeout(() => setShouldRender(false), delay);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [delay, isMounted, shouldRender]);

  return shouldRender;
}

/* =========================
   Types
========================= */
type CalendarClientProps = {
  track: AppTrack;
  isModal?: boolean;
  initialRange?: { start?: string; end?: string };
  onRangeSelect?: (start: string, end: string) => void;
  showTrackSwitcher?: boolean;
  toolbarAfterLongJobs?: ReactNode;
};
type CalendarEventResponse = { events?: EventInput[] };

type Status = "INKOMMANDE" | "PAGAENDE" | "LEVERANS" | "AVSLUTAD" | "PALACK";
type CalendarStatus = Extract<
  Status,
  "PAGAENDE" | "PALACK" | "LEVERANS" | "AVSLUTAD"
>;

type Label =
  | "BOKAD_TID"
  | "KAN_FLYTTAS"
  | "LUNCH"
  | "SEMESTER"
  | "TRAFIKVERKET"
  | "UNDER_VECKAN"
  | "UTFORT_ARBETE";

type Palette = StatusColorParts;
type CalendarView =
  | "timeGridWorkWeek"
  | "timeGridDay"
  | "timeGridWeek"
  | "dayGridWeek"
  | "dayGridMonth";

type LongJobsWindow = {
  start: Date;
  end: Date;
};

type LongJobsGridMetrics = {
  offset: number;
  width: number | null;
};

type LongJobTimelineRow = {
  id: string;
  title: string;
  statusText: string;
  relativeEndLabel: string;
  leftPercent: number;
  widthPercent: number;
  snapsToLeftEdge: boolean;
  snapsToRightEdge: boolean;
  palette: Palette;
  startLabel: string;
  endLabel: string;
  continuesBefore: boolean;
  continuesAfter: boolean;
};

/* =========================
   Constants / helpers
========================= */
const CALENDAR_STATUS_ORDER: CalendarStatus[] = [
  "PAGAENDE",
  "PALACK",
  "LEVERANS",
  "AVSLUTAD",
];

const STATUS_BADGE: Record<CalendarStatus, string> = {
  PAGAENDE: `border ${STATUS_COLOR_PARTS.PAGAENDE.bgClass} ${STATUS_COLOR_PARTS.PAGAENDE.textClass} ${STATUS_COLOR_PARTS.PAGAENDE.borderClass}`,
  PALACK: `border ${STATUS_COLOR_PARTS.PALACK.bgClass} ${STATUS_COLOR_PARTS.PALACK.textClass} ${STATUS_COLOR_PARTS.PALACK.borderClass}`,
  AVSLUTAD: `border ${STATUS_COLOR_PARTS.AVSLUTAD.bgClass} ${STATUS_COLOR_PARTS.AVSLUTAD.textClass} ${STATUS_COLOR_PARTS.AVSLUTAD.borderClass}`,
  LEVERANS: `border ${STATUS_COLOR_PARTS.LEVERANS.bgClass} ${STATUS_COLOR_PARTS.LEVERANS.textClass} ${STATUS_COLOR_PARTS.LEVERANS.borderClass}`,
};
const STATUS_DOT: Record<CalendarStatus, string> = {
  PAGAENDE: STATUS_COLOR_PARTS.PAGAENDE.bgClass,
  PALACK: STATUS_COLOR_PARTS.PALACK.bgClass,
  AVSLUTAD: STATUS_COLOR_PARTS.AVSLUTAD.bgClass,
  LEVERANS: STATUS_COLOR_PARTS.LEVERANS.bgClass,
};

const LABEL_COLORS: Record<Label, Palette> = {
  BOKAD_TID: {
    bgClass: "bg-[#E74B56]",
    textClass: "text-white",
    borderClass: "border-[#C63B45]",
    bgHex: "#E74B56",
    textHex: "#FFFFFF",
    borderHex: "#C63B45",
  },
  KAN_FLYTTAS: {
    bgClass: "bg-[#0F6B2E]",
    textClass: "text-white",
    borderClass: "border-[#0A4D20]",
    bgHex: "#0F6B2E",
    textHex: "#FFFFFF",
    borderHex: "#0A4D20",
  },
  LUNCH: {
    bgClass: "bg-[#FFD91A]",
    textClass: "text-[#5B4700]",
    borderClass: "border-[#E0B600]",
    bgHex: "#FFD91A",
    textHex: "#5B4700",
    borderHex: "#E0B600",
  },
  SEMESTER: {
    bgClass: "bg-[#FF7A00]",
    textClass: "text-[#5B2C00]",
    borderClass: "border-[#E06600]",
    bgHex: "#FF7A00",
    textHex: "#5B2C00",
    borderHex: "#E06600",
  },
  TRAFIKVERKET: {
    bgClass: "bg-[#8E6CE0]",
    textClass: "text-white",
    borderClass: "border-[#704FC5]",
    bgHex: "#8E6CE0",
    textHex: "#FFFFFF",
    borderHex: "#704FC5",
  },
  UNDER_VECKAN: {
    bgClass: "bg-[#4CD964]",
    textClass: "text-[#0F3F16]",
    borderClass: "border-[#34B44C]",
    bgHex: "#4CD964",
    textHex: "#0F3F16",
    borderHex: "#34B44C",
  },
  UTFORT_ARBETE: {
    bgClass: "bg-[#B0BEC5]",
    textClass: "text-[#263238]",
    borderClass: "border-[#90A4AE]",
    bgHex: "#B0BEC5",
    textHex: "#263238",
    borderHex: "#90A4AE",
  },
};

const LABEL_TW = Object.fromEntries(
  Object.entries(LABEL_COLORS).map(([key, spec]) => [
    key,
    `border ${spec.bgClass} ${spec.textClass} ${spec.borderClass}`,
  ]),
) as Record<Label, string>;
const LABEL_DOT = Object.fromEntries(
  Object.entries(LABEL_COLORS).map(([key, spec]) => [key, spec.bgClass]),
) as Record<Label, string>;

const LABEL_ORDER: Label[] = [
  "BOKAD_TID",
  "KAN_FLYTTAS",
  "LUNCH",
  "SEMESTER",
  "TRAFIKVERKET",
  "UNDER_VECKAN",
  "UTFORT_ARBETE",
];

const DONE_PALETTE: Palette = {
  bgClass: "bg-gray-200",
  textClass: "text-gray-700",
  borderClass: "border-gray-300",
  bgHex: "#E5E7EB",
  textHex: "#374151",
  borderHex: "#D1D5DB",
};

const VIEW_OPTIONS: { key: CalendarView; label: string }[] = [
  { key: "timeGridDay", label: "Dag" },
  { key: "timeGridWorkWeek", label: "Arbetsvecka" },
  { key: "timeGridWeek", label: "Vecka" },
  { key: "dayGridMonth", label: "Månad" },
];

const DUMMY_LONG_JOB_PREFIX = "dummy-long-job";
const DUMMY_STATUS_KEY = "dummy-long-job-statuses";

const WEEKDAY_NAMES = [
  "Söndag",
  "Måndag",
  "Tisdag",
  "Onsdag",
  "Torsdag",
  "Fredag",
  "Lördag",
];

/**
 * Normalizes an event's start/end datetime to local day interval model.
 * - startDay = local start of day(start)
 * - endDayExclusive = local start of day(end) if end is exactly day boundary, else +1 day
 */
function normalizeToLocalDayInterval(isoStart: string, isoEnd: string): {
  startDayMs: number;
  endDayExclusiveMs: number;
} {
  const start = new Date(isoStart);
  const end = new Date(isoEnd);
  
  // Get local start of day for start
  const startDay = new Date(start);
  startDay.setHours(0, 0, 0, 0);
  
  // Get local start of day for end
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  
  // Check if end was exactly at local midnight (inclusive end boundary)
  const endIsExactlyMidnight = 
    end.getHours() === 0 &&
    end.getMinutes() === 0 &&
    end.getSeconds() === 0 &&
    end.getMilliseconds() === 0;
  
  // If NOT exactly midnight, add one more day (exclusive end)
  if (!endIsExactlyMidnight) {
    endDay.setDate(endDay.getDate() + 1);
  }
  
  return {
    startDayMs: startDay.getTime(),
    endDayExclusiveMs: endDay.getTime(),
  };
}

/**
 * Normalizes FullCalendar window to local day interval model.
 * FullCalendar's activeEnd is exclusive, so we normalize to match.
 */
function normalizeCalendarWindow(activeStart: Date, activeEnd: Date): {
  startDayMs: number;
  endDayExclusiveMs: number;
} {
  const start = new Date(activeStart);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(activeEnd);
  end.setHours(0, 0, 0, 0); // FullCalendar's activeEnd is already exclusive
  
  return {
    startDayMs: start.getTime(),
    endDayExclusiveMs: end.getTime(),
  };
}

function startOfWeek(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = (day + 6) % 7; // Monday as first day
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - diff);
  return result;
}

function formatRelativeWeek(target: Date) {
  const now = new Date();
  const targetWeekStart = startOfWeek(target);
  const currentWeekStart = startOfWeek(now);
  const weekDiff = Math.round(
    (targetWeekStart.getTime() - currentWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000),
  );
  const weekday = WEEKDAY_NAMES[target.getDay()];

  if (weekDiff <= 0) return `${weekday} denna vecka`;
  if (weekDiff === 1) return `${weekday} nästa vecka`;
  if (weekDiff === 2) return `${weekday} om två veckor`;
  return `${weekday} om ${weekDiff} veckor`;
}

const isDummyLongJobId = (id?: string | null) =>
  typeof id === "string" && id.startsWith(DUMMY_LONG_JOB_PREFIX);

const readDummyStatusMap = (): Record<string, CalendarStatus> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(DUMMY_STATUS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, CalendarStatus>) : {};
  } catch {
    return {};
  }
};

const persistDummyStatus = (id: string, status: CalendarStatus) => {
  if (typeof window === "undefined") return;
  const map = readDummyStatusMap();
  map[id] = status;
  try {
    localStorage.setItem(DUMMY_STATUS_KEY, JSON.stringify(map));
  } catch {
    // ignore write errors
  }
};

const isDone = (s?: Status, l?: Label) =>
  s === "AVSLUTAD" || l === "UTFORT_ARBETE";
const isIncoming = (s?: Status) => s === "INKOMMANDE";

function basePalette(
  status: Status | undefined,
  label: Label | undefined,
): Palette | undefined {
  if (isDone(status, label)) return DONE_PALETTE;
  if (isIncoming(status)) return label ? LABEL_COLORS[label] : undefined;
  if (
    status &&
    (status === "PAGAENDE" || status === "PALACK" || status === "LEVERANS")
  )
    return STATUS_COLOR_PARTS[status];
  if (label) return LABEL_COLORS[label];
  return undefined;
}

function isOrderEvent(e: EventApi | EventInput | undefined): boolean {
  if (!e) return false;
  const xp: any =
    ("extendedProps" in e ? (e as any).extendedProps : undefined) || {};
  return Boolean(xp.orderId || xp.status);
}

function applyPalette(el: HTMLElement, palette: Palette | undefined) {
  if (!palette) return;
  el.style.setProperty("background-color", palette.bgHex, "important");
  const textColor = palette.textHex ?? "#000000";
  el.style.setProperty("color", textColor, "important");
  el.style.setProperty("border-color", palette.borderHex, "important");
}

function adjustHex(hex: string | undefined, amount: number) {
  if (!hex) return undefined;
  let color = hex.replace("#", "");
  if (color.length === 3) {
    color = color
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = parseInt(color, 16);
  if (Number.isNaN(num)) return hex;
  const clamp = (channel: number) =>
    Math.max(0, Math.min(255, channel + amount));
  const r = clamp(num >> 16);
  const g = clamp((num >> 8) & 0x00ff);
  const b = clamp(num & 0x0000ff);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function labelNice(k: Label) {
  switch (k) {
    case "BOKAD_TID":
      return "Bokad tid";
    case "KAN_FLYTTAS":
      return "Kan flyttas";
    case "LUNCH":
      return "Lunch";
    case "SEMESTER":
      return "Semester";
    case "TRAFIKVERKET":
      return "Trafikverket";
    case "UNDER_VECKAN":
      return "Under veckan";
    case "UTFORT_ARBETE":
      return "Utfört arbete";
    default:
      return k;
  }
}

/** datetime-local helpers */
function toLocalInputValue(d?: string) {
  if (!d) return "";
  const dt = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}
function fromLocalInputValue(v: string) {
  return new Date(v).toISOString();
}

/* =========================
   Component
========================= */

export default function CalendarClient({
  track,
  isModal = false,
  initialRange,
  onRangeSelect,
  showTrackSwitcher = true,
  toolbarAfterLongJobs,
}: CalendarClientProps) {
  const calendarApiRef = useRef<CalendarApi | null>(null);
  const [events, setEvents] = useState<EventInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [currentView, setCurrentView] =
    useState<CalendarView>("timeGridWorkWeek");
  const [toolbarTitle, setToolbarTitle] = useState<string>("");

  // Long jobs row toggle
  const [showLongJobs, setShowLongJobs] = useState(true);
  const [longJobsWindow, setLongJobsWindow] = useState<LongJobsWindow | null>(
    null,
  );
  const [longJobsGridMetrics, setLongJobsGridMetrics] =
    useState<LongJobsGridMetrics>({
      offset: 0,
      width: null,
    });
  const updateLongJobsWindow = useCallback((start: Date, end: Date) => {
    const nextStartMs = start.getTime();
    const nextEndMs = end.getTime();
    setLongJobsWindow((prev) => {
      if (!prev) return { start, end };
      if (
        prev.start.getTime() === nextStartMs &&
        prev.end.getTime() === nextEndMs
      ) {
        return prev;
      }
      return { start, end };
    });
  }, []);

  // Event context menu (right-click on event)
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [menuEventId, setMenuEventId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Background context menu (right-click on empty space)
  const calendarRootRef = useRef<HTMLDivElement | null>(null);
  const [bgMenuOpen, setBgMenuOpen] = useState(false);
  const [bgMenuPos, setBgMenuPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const bgMenuRef = useRef<HTMLDivElement | null>(null);

  const getCalendarApi = useCallback(
    () => calendarApiRef.current,
    [],
  );
  const handleToday = useCallback(() => {
    getCalendarApi()?.today();
  }, [getCalendarApi]);
  const handlePrev = useCallback(() => {
    getCalendarApi()?.prev();
  }, [getCalendarApi]);
  const handleNext = useCallback(() => {
    getCalendarApi()?.next();
  }, [getCalendarApi]);
  const handleViewChange = useCallback(
    (view: CalendarView) => {
      const api = getCalendarApi();
      if (!api) return;
      api.changeView(view);
      setCurrentView(view);
      setToolbarTitle(api.view.title);
    },
    [getCalendarApi],
  );

  const handleCalendarRef = useCallback((fc: any) => {
    if (fc) {
      const api: CalendarApi = fc.getApi();
      calendarApiRef.current = api;
      setToolbarTitle(api.view.title);
      setCurrentView(api.view.type as CalendarView);
      updateLongJobsWindow(
        new Date(api.view.activeStart),
        new Date(api.view.activeEnd),
      );
    } else {
      calendarApiRef.current = null;
    }
  }, [updateLongJobsWindow]);

  useEffect(() => {
    const start = initialRange?.start;
    if (!start) return;
    const target = new Date(start);
    if (Number.isNaN(target.getTime())) return;
    const api = calendarApiRef.current;
    if (!api) return;

    api.gotoDate(target);

    const hh = String(target.getHours()).padStart(2, "0");
    const mm = String(target.getMinutes()).padStart(2, "0");
    api.scrollToTime(`${hh}:${mm}:00`);
  }, [track, initialRange?.start, initialRange?.end, isModal]);

  // New free-form event modal
  const [modalOpen, setModalOpen] = useState(false);
  const [awaitingRangeSelection, setAwaitingRangeSelection] = useState(false);
  const [selectionFading, setSelectionFading] = useState(false);
  const selectionFadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [draft, setDraft] = useState({
    title: "",
    label: null as Label | null,
    allDay: false,
    start: "",
    end: "",
    repeat: "none" as "none" | "weekly" | "daily",
    weeklyDays: [] as string[],
  });
  const showSelectionPrompt = useMountTransition(awaitingRangeSelection, 250);
  const showLongJobsSection = useMountTransition(showLongJobs, 350);

  useEffect(() => {
    return () => {
      if (selectionFadeTimeoutRef.current) {
        clearTimeout(selectionFadeTimeoutRef.current);
      }
    };
  }, []);

  function getEventMetaById(id: string, list: EventInput[]) {
    const ev = list.find((e) => String(e.id) === String(id)) as any;
    if (!ev)
      return {
        ev: null as any,
        kind: null as "free" | "order" | null,
        realId: null as string | null,
      };
    const kind =
      ev?.extendedProps?.kind ?? (ev?.extendedProps?.orderId ? "order" : null);
    const realId =
      kind === "free" ? (ev?.extendedProps?.realId ?? null) : String(id);
    return { ev, kind, realId };
  }

  /* ===== Load calendar events (orders + free) ===== */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [orderRes, freeRes] = await Promise.all([
        fetch(`/api/calendar?track=${track}`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        }),
        fetch(`/api/free-events?track=${track}`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        }),
      ]);

      const orderJson = await safeJson<CalendarEventResponse>(orderRes, {
        events: [],
      });
      const freeJson = await safeJson<CalendarEventResponse>(freeRes, {
        events: [],
      });

      const orders = Array.isArray(orderJson.events) ? orderJson.events : [];
      const freeRaw = Array.isArray(freeJson.events) ? freeJson.events : [];

      const free = freeRaw.map((e: any) => ({
        ...e,
        id: `free-${e.id}`,
        extendedProps: {
          ...(e.extendedProps || {}),
          kind: "free",
          realId: e.id,
          visibility: e.visibility ?? "PUBLIC",
        },
      }));

      // Add dummy long jobs for testing
      const dummyStatusMap = readDummyStatusMap();

      const day = 24 * 60 * 60 * 1000;
      const now = Date.now();
      const dummyLongJobs = Array.from({ length: 8 }).map((_, idx) => {
        const startOffset = (idx + 1) * -5; // staggered starts in the past
        const endOffset = (idx + 1) * 7 + idx * 3; // different future lengths
        return {
          id: `dummy-long-job-${idx + 1}`,
          title: `Test långt jobb ${idx + 1}`,
          start: new Date(now + startOffset * day).toISOString(),
          end: new Date(now + endOffset * day).toISOString(),
          extendedProps: {
            orderId: `TEST-LONG-${idx + 1}`,
            orderTitle: `Test långt jobb ${idx + 1}`,
            status: (dummyStatusMap[`dummy-long-job-${idx + 1}`] as Status) || "PAGAENDE",
            kind: "order",
          },
          allDay: false,
        };
      });

      setEvents([...orders, ...free, ...dummyLongJobs]);
    } catch (e) {
      console.error(e);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [track]);

  /* ===== Filter long jobs (duration > 7 days) ===== */
  const longJobs = events.filter((event) => {
    if (!event.start || !event.end) return false;
    const start = new Date(event.start as string);
    const end = new Date(event.end as string);
    const durationMs = end.getTime() - start.getTime();
    const durationDays = durationMs / (1000 * 60 * 60 * 24);
    return durationDays > 7;
  });

  /* ===== Filter out dummy long job from calendar display ===== */
  const calendarEvents = events.filter(
    (event) => !(typeof event.id === "string" && event.id.startsWith("dummy-long-job")),
  );

  const longJobsDays = useMemo(() => {
    if (!longJobsWindow) return [] as Date[];
    const normalizedWindow = normalizeCalendarWindow(longJobsWindow.start, longJobsWindow.end);
    const days: Date[] = [];
    const cursor = new Date(normalizedWindow.startDayMs);
    const end = new Date(normalizedWindow.endDayExclusiveMs);
    while (cursor < end) {
      const weekday = cursor.getDay();
      const includeDay =
        currentView !== "timeGridWorkWeek" || (weekday >= 1 && weekday <= 5);
      if (includeDay) days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }, [longJobsWindow, currentView]);

  const longJobsTimeline = useMemo(() => {
    if (!longJobsWindow || longJobsDays.length === 0) return [] as LongJobTimelineRow[];
    
    // Normalize calendar window to local day boundaries
    const normalizedWindow = normalizeCalendarWindow(longJobsWindow.start, longJobsWindow.end);
    const rangeStartMs = normalizedWindow.startDayMs;
    const rangeEndMs = normalizedWindow.endDayExclusiveMs;
    const msPerDay = 24 * 60 * 60 * 1000;
    const visibleDayStarts = longJobsDays.map((day) => {
      const d = new Date(day);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    });
    const totalDays = Math.max(1, visibleDayStarts.length);

    return longJobs
      .map((job) => {
        if (!job.start || !job.end || job.id == null) return null;
        const xp: any = job.extendedProps ?? {};
        const status = xp.status as Status | undefined;
        const label = xp.label as Label | undefined;
        const palette = basePalette(status, label) ?? DONE_PALETTE;
        const startDate = new Date(job.start as string);
        const endDate = new Date(job.end as string);
        
        // Use the new normalization function
        const { startDayMs, endDayExclusiveMs } = normalizeToLocalDayInterval(
          job.start as string,
          job.end as string
        );

        const jobStartMs = startDayMs;
        const jobEndMs = endDayExclusiveMs;
        if (Number.isNaN(jobStartMs) || Number.isNaN(jobEndMs) || jobEndMs <= jobStartMs) {
          return null;
        }

        // Map event interval to currently visible calendar day columns.
        // This keeps long-job bars aligned with hidden-day views (e.g. workweek).
        const overlappedIndices: number[] = [];
        visibleDayStarts.forEach((dayStartMs, index) => {
          const dayEndMs = dayStartMs + msPerDay;
          if (jobStartMs < dayEndMs && jobEndMs > dayStartMs) {
            overlappedIndices.push(index);
          }
        });

        if (overlappedIndices.length === 0) return null;
        const clampedStartColumn = overlappedIndices[0];
        const clampedEndColumn = overlappedIndices[overlappedIndices.length - 1] + 1;

        const continuesBefore = jobStartMs < rangeStartMs;
        const continuesAfter = jobEndMs > rangeEndMs;
        const snapsToLeftEdge = clampedStartColumn === 0;
        const snapsToRightEdge = clampedEndColumn === totalDays;

        const leftPercent = (clampedStartColumn / totalDays) * 100;
        const widthPercent =
          ((clampedEndColumn - clampedStartColumn) / totalDays) * 100;

        return {
          id: String(job.id),
          title: job.title || xp.orderTitle || "Untitled",
          statusText: status ? STATUS_DISPLAY[status] : label ? labelNice(label) : "Fri händelse",
          relativeEndLabel: formatRelativeWeek(endDate),
          leftPercent,
          widthPercent,
          snapsToLeftEdge,
          snapsToRightEdge,
          palette,
          startLabel: startDate.toLocaleDateString("sv-SE"),
          endLabel: endDate.toLocaleDateString("sv-SE"),
          continuesBefore,
          continuesAfter,
        } satisfies LongJobTimelineRow;
      })
      .filter((row): row is LongJobTimelineRow => row !== null)
      .sort((a, b) => a.leftPercent - b.leftPercent);
  }, [longJobs, longJobsWindow, longJobsDays]);

  useEffect(() => {
    const measure = () => {
      const root = calendarRootRef.current;
      if (!root) return;

      const rootRect = root.getBoundingClientRect();
      const timeGridCols = root.querySelector(
        ".fc-timegrid-body .fc-timegrid-cols",
      ) as HTMLElement | null;
      const dayGridTable = root.querySelector(
        ".fc-daygrid-body .fc-scrollgrid-sync-table",
      ) as HTMLElement | null;
      const target = timeGridCols ?? dayGridTable;
      if (!target) return;

      const targetRect = target.getBoundingClientRect();
      const next: LongJobsGridMetrics = {
        offset: Math.max(0, targetRect.left - rootRect.left),
        width: Math.max(0, targetRect.width),
      };

      setLongJobsGridMetrics((prev) => {
        if (prev.offset === next.offset && prev.width === next.width) return prev;
        return next;
      });
    };

    measure();
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [currentView, showLongJobs, longJobsDays.length, longJobsTimeline.length]);

  useEffect(() => {
    void load();
  }, [load]);

  // Handle calendar refresh after event creation
  const handleCalendarRefresh = useCallback(() => {
    void load();
  }, [load]);

  /* ===== Create free event ===== */
  const handleSaveFreeEvent = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);

    const startISO = draft.start ? new Date(draft.start).toISOString() : new Date().toISOString();
    const endISO = draft.end ? new Date(draft.end).toISOString() : new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const toHHMMSS = (iso: string | undefined, fallback: string) => {
      if (!iso) return fallback;
      const m = iso.match(/T(\d{2}:\d{2}:\d{2})/);
      return m ? m[1] : fallback;
    };

    const payload: any = {
      track,
      title: draft.title || (draft.label ? labelNice(draft.label) : "Event"),
      label: draft.label,
      visibility: "PUBLIC",
    };

    if (draft.repeat === "weekly") {
      payload.repeat = "weekly";
      payload.weeklyDays = draft.weeklyDays.length ? draft.weeklyDays : ["1"];
      payload.startRecur = (draft.start ? new Date(draft.start) : new Date()).toISOString();
      payload.endRecur = null;
      payload.startTime = toHHMMSS(draft.start, "12:00:00");
      payload.endTime = toHHMMSS(draft.end, "13:00:00");
    } else if (draft.repeat === "daily") {
      payload.repeat = "daily";
      payload.weeklyDays = ["0", "1", "2", "3", "4", "5", "6"];
      payload.startRecur = (draft.start ? new Date(draft.start) : new Date()).toISOString();
      payload.endRecur = null;
      payload.startTime = toHHMMSS(draft.start, "12:00:00");
      payload.endTime = toHHMMSS(draft.end, "13:00:00");
    } else {
      payload.repeat = "none";
      payload.start = startISO;
      payload.end = endISO;
    }

    try {
      const res = await fetch("/api/free-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = "Failed to create event";
        try {
          const text = await res.text();
          const json = JSON.parse(text);
          if (json.error) msg = json.error;
          else if (json.message) msg = json.message;
          else if (typeof json === 'string') msg = json;
          else msg = text;
        } catch {
          msg = await res.text().catch(() => "Failed to create event");
        }


        setSaveError(msg);
        setSaving(false);
        return;
      }

      setModalOpen(false);
      await load();
    } catch (err: any) {
      setSaveError(err?.message ?? "Unexpected error");
    } finally {
      setSaving(false);
    }
  }, [saving, track, draft, load]);

  /* ===== Helpers only used inside component ===== */
  const getEventById = useCallback(
    (id: string | null) =>
      events.find((e) => String(e.id) === String(id)) ?? null,
    [events],
  );

  const isDeletableEvent = useCallback((ev: EventInput | null) => {
    if (!ev) return false;
    const kind = (ev as any)?.extendedProps?.kind;
    // only free events are deletable here
    return kind === "free";
  }, []);

  const deleteEventById = useCallback(
    async (eventId: string) => {
      const ev = getEventById(eventId);
      const kind = (ev as any)?.extendedProps?.kind;

      if (kind !== "free") {
        setActionError("Endast fria händelser kan tas bort.");
        setMenuOpen(false);
        setMenuEventId(null);
        return;
      }

      const realId = (ev as any)?.extendedProps?.realId ?? eventId;
      const url = `/api/free-events/${encodeURIComponent(realId)}`;

      // optimistic removal
      setEvents((prev) => prev.filter((e) => String(e.id) !== String(eventId)));

      try {
        const res = await fetch(url, { method: "DELETE" });
        if (!res.ok) {
          const msg = await res.text().catch(() => "Failed to delete event");
          setActionError(msg || "Failed to delete event");
          await load(); // restore from server
          return;
        }
        await load();
      } catch (err: any) {
        setActionError(err?.message ?? "Failed to delete event");
        await load();
      } finally {
        setMenuOpen(false);
        setMenuEventId(null);
      }
    },
    [getEventById, load],
  );

  /* ===== Event context menu close on outside click / ESC ===== */
  const closeEventMenu = useCallback(() => {
    setMenuOpen(false);
    setMenuEventId(null);
  }, []);
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuOpen) return;
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        closeEventMenu();
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeEventMenu();
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menuOpen, closeEventMenu]);

  /* ===== Background context menu (right-click on empty space) ===== */
  useEffect(() => {
    const root = calendarRootRef.current;
    if (!root) return;
    const onCtx = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".fc-event")) return; // ignore right-clicks on events
      e.preventDefault();
      setAwaitingRangeSelection(false);
      setBgMenuPos({ x: e.clientX, y: e.clientY });
      setBgMenuOpen(true);
    };
    root.addEventListener("contextmenu", onCtx);
    return () => root.removeEventListener("contextmenu", onCtx);
  }, []);

  useEffect(() => {
    if (!awaitingRangeSelection) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAwaitingRangeSelection(false);
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [awaitingRangeSelection]);

  useEffect(() => {
    if (!bgMenuOpen) return;
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setBgMenuOpen(false);
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (bgMenuRef.current && !bgMenuRef.current.contains(t))
        setBgMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [bgMenuOpen]);

  /* ===== Persisters ===== */
  const setEventStatus = useCallback(
    async (eventId: string, next: CalendarStatus) => {
      // optimistic
      setEvents((prev) =>
        prev.map((e) =>
          String(e.id) === String(eventId)
            ? {
                ...e,
                extendedProps: {
                  ...(e.extendedProps || {}),
                  status: next,
                  label: null,
                },
              }
            : e,
        ),
      );
      try {
        const res = await fetch(
          `/api/calendar/${encodeURIComponent(eventId)}/status`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: next, track }),
          },
        );
        if (!res.ok) throw new Error(await res.text());
        await load();
      } catch (err) {
        console.error("Failed to set status", err);
        await load();
      } finally {
        closeEventMenu();
      }
    },
    [track, load, closeEventMenu],
  );

  // Handle status change for long jobs (including dummy)
  const setLongJobStatus = useCallback(
    async (eventId: string, next: CalendarStatus) => {
      if (isDummyLongJobId(eventId)) {
        setEvents((prev) =>
          prev.map((e) =>
            String(e.id) === String(eventId)
              ? {
                  ...e,
                  extendedProps: {
                    ...(e.extendedProps || {}),
                    status: next,
                    label: null,
                  },
                }
              : e,
          ),
        );
        persistDummyStatus(eventId, next);
        closeEventMenu();
        return;
      }

      // Handle real events via API
      setEvents((prev) =>
        prev.map((e) =>
          String(e.id) === String(eventId)
            ? {
                ...e,
                extendedProps: {
                  ...(e.extendedProps || {}),
                  status: next,
                  label: null,
                },
              }
            : e,
        ),
      );
      try {
        const res = await fetch(
          `/api/calendar/${encodeURIComponent(eventId)}/status`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: next, track }),
          },
        );
        if (!res.ok) throw new Error(await res.text());
        await load();
      } catch (err) {
        console.error("Failed to set long job status", err);
        await load();
      } finally {
        closeEventMenu();
      }
    },
    [track, load, closeEventMenu],
  );

  const setCalendarLabel = useCallback(
    async (eventId: string, label: Label | null) => {
      if (isDummyLongJobId(eventId)) {
        setEvents((prev) =>
          prev.map((e) =>
            String(e.id) === String(eventId)
              ? {
                  ...e,
                  extendedProps: {
                    ...(e.extendedProps || {}),
                    label,
                  },
                }
              : e,
          ),
        );
        closeEventMenu();
        return;
      }

      const meta = getEventMetaById(eventId, events);
      const kind = meta.kind;
      const realId = meta.realId ?? eventId;

      // optimistic
      setEvents((prev) =>
        prev.map((e) =>
          String(e.id) === String(eventId)
            ? {
                ...e,
                extendedProps: {
                  ...(e.extendedProps || {}),
                  label,
                  ...(label === "UTFORT_ARBETE" && kind !== "free" ? { status: "AVSLUTAD" } : {}),
                },
              }
            : e,
        ),
      );

      try {
        if (kind === "free") {
          const res = await fetch(
            `/api/free-events/${encodeURIComponent(realId)}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ label }),
            },
          );
          if (!res.ok) throw new Error(await resTextSafe(res));
        } else if (label === "UTFORT_ARBETE") {
          const sRes = await fetch(
            `/api/calendar/${encodeURIComponent(eventId)}/status`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "AVSLUTAD", track }),
            },
          );
          if (!sRes.ok) throw new Error(await resTextSafe(sRes));

          const lRes = await fetch(
            `/api/calendar/${encodeURIComponent(eventId)}/label`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ label: null, track }),
            },
          );
          if (!lRes.ok) throw new Error(await resTextSafe(lRes));
        } else {
          const res = await fetch(
            `/api/calendar/${encodeURIComponent(eventId)}/label`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ label, track }),
            },
          );
          if (!res.ok) throw new Error(await resTextSafe(res));
        }
        await load();
      } catch (err) {
        console.error("Failed to set calendar label", err);
        await load();
      } finally {
        closeEventMenu();
      }
    },
    [events, track, load, closeEventMenu],
  );

  async function resTextSafe(r: Response) {
    try {
      return await r.text();
    } catch {
      return "Request failed";
    }
  }

  /* ===== Renderers ===== */
  const renderEventContent = useCallback((arg: EventContentArg) => {
    const xp: any = arg.event.extendedProps ?? {};
    const location = (xp.location as string | null) ?? null;
    const label = xp.label as Label | undefined;
    const synthetic = Boolean(xp.synthetic);
    const orderId = (xp.orderId as string | null) ?? (arg.event.id as string);
    const orderTitle =
      (xp.orderTitle as string | null) ?? arg.event.title ?? "";
    const sellerInitials = (xp.sellerInitials as string | null) ?? null;
    const timeText = arg.timeText;

    return (
      <div className="ordina-calendar-event-inner flex h-full flex-col gap-2 rounded-xl px-3 py-2 text-[11px] leading-tight">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold tracking-tight uppercase">
              {orderId}
            </div>
            <div className="text-[11px] font-medium leading-tight break-words">
              {orderTitle}
            </div>
          </div>
          {sellerInitials ? (
            <span className="text-[11px] font-semibold opacity-80">
              /{sellerInitials}
            </span>
          ) : null}
        </div>

        {location ? (
          <div className="flex items-start gap-1 text-[10px] opacity-90">
            <MapPin
              className="mt-[2px] h-3 w-3 shrink-0"
              strokeWidth={2.5}
              aria-hidden
            />
            <span className="min-w-0 flex-1 break-words">
              {location}
            </span>
          </div>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 text-[10px]">
          {timeText ? (
            <span className="font-semibold tracking-tight">{timeText}</span>
          ) : (
            <span />
          )}
          {label ? (
            <span className="rounded-full bg-white/40 px-2 py-0.5 font-semibold">
              {labelNice(label)}
            </span>
          ) : null}
        </div>

        {synthetic ? (
          <span className="text-[10px] font-semibold text-amber-900">
            Planerat (utan kalenderpost)
          </span>
        ) : null}
      </div>
    );
  }, []);

  const eventClassNames = useCallback((arg: any) => {
    const classes: string[] = [
      "rounded-2xl",
      "border",
      "border-transparent",
      "shadow-sm",
      "px-0",
      "py-0",
      "overflow-hidden",
      "relative",
      "flex",
      "flex-col",
      "ordina-calendar-event",
    ];
    if (arg.event.extendedProps?.synthetic) {
      classes.push("border-dashed");
    } else {
      classes.push("ordina-calendar-event--interactive");
    }
    return classes;
  }, []);

  const eventDidMount = useCallback(
    (arg: { el: HTMLElement; event: EventApi }) => {
      const status = arg.event.extendedProps?.status as Status | undefined;
      const label = arg.event.extendedProps?.label as Label | undefined;
      const palette = basePalette(status, label);

      applyPalette(arg.el, palette);
      if (arg.event.extendedProps?.synthetic) arg.el.style.opacity = "0.9";

      arg.el.style.padding = "0";
      arg.el.style.display = "flex";
      arg.el.style.flexDirection = "column";

      const accent = adjustHex(palette?.bgHex, -35) ?? "rgba(0,0,0,0.2)";
      arg.el.style.setProperty("--ordina-accent", accent);
      arg.el.style.setProperty("--ordina-accent-width", "12px");
      arg.el.style.setProperty(
        "--ordina-divider",
        adjustHex(palette?.bgHex, -20) ?? "rgba(0,0,0,0.25)",
      );
      arg.el.style.backgroundImage = "none";
      arg.el.style.backgroundBlendMode = "normal";
      arg.el.style.backgroundRepeat = "no-repeat";

      const handler = (ev: MouseEvent) => {
        // Open menu for any event (orders or free)
        ev.preventDefault();
        setMenuEventId(arg.event.id);
        setMenuPos({ x: ev.clientX, y: ev.clientY });
        setMenuOpen(true);
      };
      arg.el.addEventListener("contextmenu", handler);
      return () => arg.el.removeEventListener("contextmenu", handler);
    },
    [],
  );

  const allowEventMutation = useCallback(
    (_dropInfo: any, draggedEvent: any) => {
      return !draggedEvent.extendedProps?.synthetic;
    },
    [],
  );

  const onEventDrop = useCallback(
    async (info: any) => {
      const ev = info.event;

      const isFree = ev.extendedProps?.kind === "free";
      const realId = isFree ? ev.extendedProps?.realId : ev.id;
      const url = isFree
        ? `/api/free-events/${encodeURIComponent(realId)}`
        : `/api/calendar/${encodeURIComponent(realId)}`;

      const startISO = ev.start ? ev.start.toISOString() : undefined;
      const endISO = ev.end ? ev.end.toISOString() : undefined;

      const payload: any = isFree
        ? { start: startISO, end: endISO }
        : { start: startISO, end: endISO, track };

      try {
        const res = await fetch(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.error(`[calendar] PATCH ${url} failed (${res.status}):`, text || res.statusText);
          info.revert();
          return;
        }

        await load();
      } catch (err) {
        console.error("[calendar] PATCH error:", err);
        info.revert();
      }
    },
    [load, track],
  );

  /* =========================
     Render
  ========================= */
  const menuEvent = getEventById(menuEventId);
  const menuIsOrder = isOrderEvent(menuEvent as any);
  const menuIsFree = (menuEvent as any)?.extendedProps?.kind === "free";
  const menuCanDelete = isDeletableEvent(menuEvent);

  return (
    <CalendarDragDropProvider track={track} events={calendarEvents}>
      <DragDropState calendarRef={calendarApiRef}>
        <div className="relative p-4">
          <div className="mb-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {!isModal && showTrackSwitcher && (
                  <span className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm font-semibold text-neutral-700">
                    Spår {track}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              
              <button
                type="button"
                onClick={() => {
                  if (modalOpen) return;
                  if (awaitingRangeSelection) {
                    setAwaitingRangeSelection(false);
                    return;
                  }
                  setDraft((d) => ({
                    ...d,
                    start: "",
                    end: "",
                  }));
                  setAwaitingRangeSelection(true);
                }}
                className="rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-sm font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-100"
              >
                + Ny händelse
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-sm font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-100"
              >
                I dag
              </button>
              <button
                type="button"
                onClick={handlePrev}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-sm font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-100"
                aria-label="Föregående period"
                title="Föregående"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-sm font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-100"
                aria-label="Nästa period"
                title="Nästa"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="flex overflow-hidden rounded-full border border-neutral-200 bg-white shadow-sm">
                {VIEW_OPTIONS.map((opt) => {
                  const active = currentView === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => handleViewChange(opt.key)}
                      className={`px-3 py-1.5 text-sm font-semibold transition ${
                        active
                          ? "bg-neutral-900 text-white"
                          : "text-neutral-700 hover:bg-neutral-100"
                      }`}
                    >
                      {opt.label}
                    </button>
                    
                  );
                  
                })
                }
              </div>
              <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLongJobs(!showLongJobs)}
                  className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-sm font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-100"
                  title={showLongJobs ? "Dölj långa jobb" : "Visa långa jobb"}
                >
                  {showLongJobs ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span className="hidden sm:inline">Långa jobb</span>
                </button>
                {toolbarAfterLongJobs}
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                {loading && (
                  <div className="flex items-center gap-2">
                    <OrdinaLogoSpinner size={20} />
                    <span>Laddar</span>
                  </div>
                )}
                </div>
              </div>
            </div>

            {showSelectionPrompt && (
              <div
                role="status"
                aria-live="polite"
                className={`selection-prompt relative flex w-full flex-wrap items-center gap-4 rounded-2xl border border-brand-200/70 bg-white/85 px-5 py-4 text-sm text-neutral-800 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.55)] backdrop-blur transition-all duration-300 ease-out overflow-hidden ${
                  awaitingRangeSelection
                    ? "opacity-100 translate-y-0 scale-100"
                    : "pointer-events-none opacity-0 -translate-y-1 scale-95"
                }`}
              >
                <span className="selection-prompt__bar absolute inset-x-0 top-0 h-1" aria-hidden />
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 shadow-inner shadow-white/70">
                  <CalendarRange className="h-5 w-5" aria-hidden />
                </div>
                <div className="flex flex-col gap-1 text-left">
                  <span className="text-sm font-semibold text-neutral-900">
                    Markera tiden direkt i kalendern
                  </span>
                  <span className="text-xs text-neutral-600">
                    1. Klicka och dra i kalendern. 2. Släpp för att välja tidsspann.
                  </span>
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-2">
               
          
                  <button
                    type="button"
                    onClick={() => setAwaitingRangeSelection(false)}
                    className="rounded-full border border-brand-200/80 bg-white px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-50 hover:text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            )}

          
          </div>

          {/* Long Jobs Row */}
          {showLongJobsSection && (
            <div
              className={`${
                showLongJobs
                  ? "mb-3 max-h-[900px] opacity-100 translate-y-0 scale-100"
                  : "mb-0 pointer-events-none max-h-0 opacity-0 -translate-y-1 scale-95 overflow-hidden"
              } rounded-xl border border-neutral-200 bg-white/90 p-3 shadow-md shadow-black/5 transition-all duration-400 ease-out`}
            >
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-sm font-semibold text-neutral-700">Långa jobb ({longJobs.length})</h3>
                <div className="h-px flex-1 bg-neutral-200"></div>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-500">
                  {longJobs.length > 0 ? "Aktiva" : "Tomt"}
                </span>
              </div>
              {longJobs.length > 0 ? (
                longJobsTimeline.length > 0 ? (
                  <div className="flex w-full justify-center overflow-visible">
                    <div
                      className="min-w-0"
                      style={{
                        width: longJobsGridMetrics.width
                          ? `${longJobsGridMetrics.width}px`
                          : "100%",
                      }}
                    >
                      <div className="space-y-0">
                        {longJobsTimeline.map((row) => (
                          <div
                            key={row.id}
                            className="relative h-8 overflow-hidden rounded-none border border-neutral-200 bg-neutral-50"
                          >
                            <div
                              className="pointer-events-none absolute inset-0 grid"
                              style={{
                                gridTemplateColumns: `repeat(${Math.max(1, longJobsDays.length)}, minmax(0, 1fr))`,
                              }}
                            >
                              {longJobsDays.map((day) => (
                                <div key={`${row.id}-${day.toISOString()}`} className="border-r border-neutral-200/80 last:border-r-0" />
                              ))}
                            </div>
                            <div
                              className="long-job-bar absolute bottom-0 top-0 flex items-center gap-2 overflow-hidden rounded-none border px-2.5 text-[11px] text-neutral-900"
                              style={{
                                left: row.snapsToLeftEdge ? 0 : `${row.leftPercent}%`,
                                width: row.snapsToRightEdge
                                  ? undefined
                                  : `${row.widthPercent}%`,
                                right: row.snapsToRightEdge ? 0 : undefined,
                                backgroundColor: row.palette.bgHex,
                                borderColor: row.palette.borderHex,
                                color: row.palette.textHex,
                                borderTopLeftRadius: row.continuesBefore ? 0 : 6,
                                borderBottomLeftRadius: row.continuesBefore ? 0 : 6,
                                borderTopRightRadius: row.continuesAfter ? 0 : 6,
                                borderBottomRightRadius: row.continuesAfter ? 0 : 6,
                              }}
                              title={`${row.title} (${row.startLabel} - ${row.endLabel})`}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setMenuEventId(row.id);
                                setMenuPos({ x: e.clientX, y: e.clientY });
                                setMenuOpen(true);
                              }}
                            >
                              <span
                                className="pointer-events-none absolute inset-0"
                                style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
                                aria-hidden
                              />
                              <div className="relative flex min-w-0 flex-1 items-center gap-2">
                                <span className="min-w-0 truncate font-semibold leading-none drop-shadow-[0_1px_0_rgba(0,0,0,0.2)]">
                                  {row.title}
                                </span>
                                <span className="hidden shrink-0 font-semibold leading-none opacity-95 sm:inline">
                                  {row.statusText}
                                </span>
                              </div>
                              <span className="relative ml-auto mr-2 hidden max-w-[42%] shrink truncate text-right text-[11px] font-semibold leading-none opacity-90 lg:inline">
                                {row.relativeEndLabel}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 py-4 text-center text-sm text-neutral-500">
                    Inga långa jobb syns i den valda perioden
                  </div>
                )
              ) : (
                <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 py-6 text-center text-sm text-neutral-500">
                  Inga långa jobb att visa (längre än 7 dagar)
                </div>
              )}
            </div>
          )}

          <CalendarSkin>
            <div
              ref={calendarRootRef}
              className={`calendar-zoom-out relative h-[calc(100vh-320px)] min-h-[520px] ${
                selectionFading ? "calendar-selection-fading" : ""
              }`}
            >
              <FullCalendar
                ref={handleCalendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                locales={[svLocale]}
                locale="sv"
                initialView="timeGridWorkWeek"
                headerToolbar={false}
                allDaySlot={false}
                views={{
                  timeGridWorkWeek: { type: "timeGridWeek", weekends: false },
                  timeGridWeek: { type: "timeGridWeek", weekends: true },
                }}
                titleFormat={{ month: "long", year: "numeric" }}
                dayHeaderContent={(args) => {
                  const date = args.date;
                  const weekday = date.toLocaleDateString("sv-SE", {
                    weekday: "short",
                  });
                  return (
                    <div className="flex w-full flex-col items-start gap-0.5 py-1 pl-2 text-left">
                      <span className="text-2xl font-semibold ">
                        {date.getDate()}
                      </span>
                      <span className="text-xs uppercase tracking-wide text-neutral-500">
                        {weekday}
                      </span>
                    </div>
                  );
                }}
                slotDuration="01:00:00"
                snapDuration="00:30:00"
                slotLabelFormat={{
                  hour: "numeric",

                  hour12: false,
                }}
                eventTimeFormat={{
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }}
                scrollTime="06:00:00"
                scrollTimeReset={false}
                slotMinTime="06:00:00"
                slotMaxTime="18:00:00"
                stickyHeaderDates
                selectable={isModal || awaitingRangeSelection}
                selectMirror={isModal || awaitingRangeSelection}
                select={(arg) => {
                  if (isModal && onRangeSelect) {
                    const start = arg.start ? arg.start.toISOString() : "";
                    const end = arg.end ? arg.end.toISOString() : "";
                    onRangeSelect(start, end);
                    arg.view.calendar.unselect();
                    return;
                  }

                  if (!awaitingRangeSelection) {
                    arg.view.calendar.unselect();
                    return;
                  }

                  setDraft((d) => ({
                    ...d,
                    start: arg.start ? arg.start.toISOString() : "",
                    end: arg.end ? arg.end.toISOString() : "",
                  }));
                  setAwaitingRangeSelection(false);
                  setModalOpen(true);
                  setSelectionFading(true);
                  if (selectionFadeTimeoutRef.current) {
                    clearTimeout(selectionFadeTimeoutRef.current);
                  }
                  selectionFadeTimeoutRef.current = setTimeout(() => {
                    arg.view.calendar.unselect();
                    setSelectionFading(false);
                    selectionFadeTimeoutRef.current = null;
                  }, 220);
                }}
                events={calendarEvents}
                height="100%"
                contentHeight="100%"
                nowIndicator
                expandRows
                editable
                datesSet={(arg) => {
                  setToolbarTitle(arg.view.title);
                  setCurrentView(arg.view.type as CalendarView);
                  updateLongJobsWindow(
                    new Date(arg.view.activeStart),
                    new Date(arg.view.activeEnd),
                  );
                }}
                eventDrop={onEventDrop}
                eventResize={onEventDrop}
                eventContent={renderEventContent}
                eventClassNames={eventClassNames}
                eventAllow={allowEventMutation}
                eventDidMount={eventDidMount}
              />
              
              {/* Drag overlay layer for temporary events */}
              <DragOverlayLayer calendarRef={calendarApiRef} />
              
              {/* Event confirmation modal is now handled by CalendarDragDropProvider */}
            </div>
          </CalendarSkin>
        </div>

        {/* Background right-click menu */}
        {bgMenuOpen && (
          <div
            ref={bgMenuRef}
            className="absolute z-50 min-w-[240px] rounded-lg border border-neutral-200 bg-white shadow-lg overflow-hidden"
            style={{ left: bgMenuPos.x, top: bgMenuPos.y }}
            role="menu"
          >
            <div className="px-3 py-2 text-xs text-neutral-500 border-b">
              Ny kalenderhändelse
            </div>
            <button
              className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50"
              onClick={() => {
                const now = new Date();
                const start = new Date(
                  now.getFullYear(),
                  now.getMonth(),
                  now.getDate(),
                  12,
                  0,
                  0,
                );
                const end = new Date(
                  now.getFullYear(),
                  now.getMonth(),
                  now.getDate(),
                  13,
                  0,
                  0,
                );
                setDraft({
                  title: "",
                  label: null,
                  allDay: false,
                  start: start.toISOString(),
                  end: end.toISOString(),
                  repeat: "none",
                  weeklyDays: [],
                });
                setBgMenuOpen(false);
                setModalOpen(true);
              }}
            >
              + Ny händelse
            </button>
          </div>
        )}

        {/* Event right-click menu */}
        {menuOpen && (
          <div
            ref={menuRef}
            className="absolute z-50 min-w-[220px] rounded-lg border border-border bg-white shadow-lg overflow-hidden"
            style={{ left: menuPos.x, top: menuPos.y }}
            role="menu"
          >
            {menuIsOrder && (
              <>
                <div className="px-3 py-2 text-xs text-neutral-500 border-b">
                  Satt status
                </div>
                {CALENDAR_STATUS_ORDER.map((s) => (
                  <button
                    key={s}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 flex items-center gap-2"
                    onClick={() => {
                      if (menuEventId) {
                        // Check if it's a long job (dummy or real)
                        if (isDummyLongJobId(menuEventId)) {
                          setLongJobStatus(menuEventId, s);
                        } else {
                          setEventStatus(menuEventId, s);
                        }
                      }
                    }}
                    role="menuitem"
                  >
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_DOT[s]}`}
                    />
                    <span className="font-medium">{STATUS_DISPLAY[s]}</span>
                  </button>
                ))}
              </>
            )}

            {(menuIsOrder || menuIsFree) && (
              <>
                <div className="px-3 py-2 text-xs text-neutral-500 border-y">
                  Kalenderetikett
                </div>
                {LABEL_ORDER.map((k) => (
                  <button
                    key={k}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 flex items-center gap-2"
                    onClick={() =>
                      menuEventId && setCalendarLabel(menuEventId, k)
                    }
                    role="menuitem"
                  >
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full ${LABEL_DOT[k]}`}
                    />
                    <span className="font-medium">{labelNice(k)}</span>
                  </button>
                ))}
                <div className="border-t">
                  <button
                    className="w-full text-left px-3 py-2 text-sm  hover:bg-neutral-50"
                    onClick={() =>
                      menuEventId && setCalendarLabel(menuEventId, null)
                    }
                  >
                    Rensa etikett
                  </button>
                </div>
              </>
            )}

            {/* Delete for any deletable event (free only) */}
            <div className="border-t">
              <button
                className={
                  "w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 " +
                  (menuCanDelete
                    ? "text-red-600 hover:text-red-700"
                    : "text-neutral-400 cursor-not-allowed")
                }
                disabled={!menuCanDelete}
                onClick={() => {
                  if (!menuEventId || !menuCanDelete) return;
                  deleteEventById(menuEventId);
                }}
              >
                Ta bort händelse
              </button>
            </div>

            <div className="border-t">
              <button
                className="w-full text-left px-3 py-2 text-sm  hover:bg-neutral-50"
                onClick={closeEventMenu}
              >
                Stäng
              </button>
            </div>
          </div>
        )}

        {/* New free-form event modal */}
        {modalOpen && (
          <div className="calendar-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="calendar-modal-panel w-full max-w-lg rounded-2xl bg-white shadow-2xl shadow-brand-600/20 pulse-glow border border-neutral-200">
              <div className="px-5 py-4 border-b">
                <h3 className="text-lg font-semibold">Ny händelse</h3>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="text-sm ">Titel</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
                    value={draft.title}
                    onChange={(e) =>
                      setDraft({ ...draft, title: e.target.value })
                    }
                    placeholder="Lunch, Semester, etc."
                  />
                </div>
                
                                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm ">Start</label>
                    <input
                      type="datetime-local"
                      className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
                      value={toLocalInputValue(draft.start)}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          start: fromLocalInputValue(e.target.value),
                        })
                      }
                      disabled={draft.repeat !== "none"}
                    />
                  </div>
                  <div>
                    <label className="text-sm ">Slut</label>
                    <input
                      type="datetime-local"
                      className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
                      value={toLocalInputValue(draft.end)}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          end: fromLocalInputValue(e.target.value),
                        })
                      }
                      disabled={draft.repeat !== "none"}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm ">Typ</label>
                    <select
                      className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
                      value={draft.label ?? ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          label: (e.target.value || null) as Label | null,
                        })
                      }
                    >
                      <option value="">Ingen</option>
                      {LABEL_ORDER.map((l) => (
                        <option key={l} value={l}>
                          {labelNice(l)}
                        </option>
                      ))}
                    </select>
                  </div>
   
                </div>

                <div>
                  <label className="text-sm ">Upprepa</label>
                  <div className="mt-2 flex gap-2">
                    {["none", "daily", "weekly"].map((v) => (
                      <button
                        key={v}
                        onClick={() => setDraft({ ...draft, repeat: v as any })}
                        className={`px-3 py-1.5 rounded-full border ${
                          draft.repeat === v
                            ? "border-neutral-900 bg-neutral-900 text-white"
                            : "border-neutral-200"
                        }`}
                        type="button"
                      >
                        {v === "none"
                          ? "Aldrig"
                          : v === "daily"
                          ? "Dagligen"
                          : "Veckovis"}
                      </button>
                    ))}
                  </div>

                  {draft.repeat === "weekly" && (
                    <div className="mt-3 grid grid-cols-7 gap-1 text-center">
                      {[
                        ["1", "M"],
                        ["2", "T"],
                        ["3", "O"],
                        ["4", "T"],
                        ["5", "F"],
                        ["6", "L"],
                        ["0", "S"],
                      ].map(([val, label]) => {
                        const active = draft.weeklyDays.includes(val);
                        return (
                          <button
                            key={val}
                            onClick={() => {
                              const set = new Set(draft.weeklyDays);
                              if (set.has(val)) set.delete(val);
                              else set.add(val);
                              setDraft({ ...draft, weeklyDays: Array.from(set) });
                            }}
                            className={`px-2 py-1 rounded-md border text-sm ${
                              active
                                ? "bg-neutral-900 text-white border-neutral-900"
                                : "border-neutral-200"
                            }`}
                            type="button"
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="px-5 py-4 border-t flex items-center gap-2">
                {saveError && (
                  <div className="text-sm text-red-600 mr-auto" aria-live="polite">
                    {saveError}
                  </div>
                )}
                <button
                  className="ml-auto px-3 py-2 text-sm rounded-lg border"
                  onClick={() => setModalOpen(false)}
                  type="button"
                >
                  Avbryt
                </button>
                <button
                  className="px-3 py-2 text-sm rounded-lg bg-neutral-900 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={handleSaveFreeEvent}
                  disabled={saving}
                  type="button"
                >
                  {saving ? "Sparar..." : "Spara"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action error toast-ish */}
        {actionError && (
          <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow">
            {actionError}
          </div>
        )}
      </DragDropState>
      <style jsx global>{`
        .calendar-zoom-out {
          --fc-slot-min-height: 50px;
        }
        .calendar-zoom-out .fc .fc-highlight {
          opacity: 1;
          transition: opacity 220ms ease;
        }
        .calendar-selection-fading .fc .fc-highlight {
          opacity: 0;
        }
        @media (min-width: 1280px) {
          .calendar-zoom-out {
            --fc-slot-min-height: 50px;
          }
        }
        .calendar-modal-overlay {
          animation: calendar-modal-overlay-in 220ms ease forwards;
        }
        .calendar-modal-panel {
          animation: calendar-modal-panel-in 260ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
          transform-origin: center;
        }
        @keyframes calendar-modal-overlay-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes calendar-modal-panel-in {
          from {
            opacity: 0;
            transform: translateY(14px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .selection-prompt {
          position: relative;
        }
        .selection-prompt::after {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at top left, rgba(5, 150, 105, 0.12), transparent 55%);
          opacity: 0.6;
          pointer-events: none;
        }
        .selection-prompt__bar {
          background: linear-gradient(90deg, rgba(5, 150, 105, 0.6), rgba(16, 185, 129, 0.85), rgba(2, 132, 199, 0.6));
          animation: selection-sheen 2.4s ease-in-out infinite;
        }
        @keyframes selection-sheen {
          0%, 100% {
            opacity: 0.5;
            transform: translateX(-6%);
          }
          50% {
            opacity: 1;
            transform: translateX(6%);
          }
        }
        .pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 25px 50px -12px rgba(5, 150, 105, 0.2);
          }
          50% {
            box-shadow: 0 25px 50px -12px rgba(5, 150, 105, 0.4);
          }
        }
      `}</style>
    </CalendarDragDropProvider>
  );
}
