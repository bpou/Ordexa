"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import CalendarSkin from "@/components/calendar/CalendarSkin";
import { OrdinaLogoSpinner } from "@/components/OrdinaLoader";
import svLocale from "@fullcalendar/core/locales/sv";
import { MapPin, ChevronLeft, ChevronRight } from "lucide-react";

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

/* =========================
   Types
 ========================= */
type CalendarEventResponse = { events?: EventInput[] };

type Label =
  | "BOKAD_TID"
  | "KAN_FLYTTAS"
  | "LUNCH"
  | "SEMESTER"
  | "TRAFIKVERKET"
  | "UNDER_VECKAN"
  | "UTFORT_ARBETE";

type Visibility = "PUBLIC" | "PERSONAL";

type Palette = {
  bgClass: string;
  textClass: string;
  borderClass: string;
  bgHex: string;
  textHex: string;
  borderHex: string;
};

type CalendarView =
  | "timeGridWorkWeek"
  | "timeGridDay"
  | "timeGridWeek"
  | "dayGridWeek"
  | "dayGridMonth";

/* =========================
   Constants / helpers
 ========================= */

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

const VIEW_OPTIONS: { key: CalendarView; label: string }[] = [
  { key: "timeGridDay", label: "Dag" },
  { key: "timeGridWorkWeek", label: "Arbetsvecka" },
  { key: "timeGridWeek", label: "Vecka" },
  { key: "dayGridMonth", label: "Månad" },
];

function basePalette(label: Label | undefined): Palette | undefined {
  if (label) return LABEL_COLORS[label];
  return undefined;
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

export default function PersonalCalendarClient() {
  const calendarApiRef = useRef<CalendarApi | null>(null);
  const [events, setEvents] = useState<EventInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [currentView, setCurrentView] =
    useState<CalendarView>("timeGridWorkWeek");
  const [toolbarTitle, setToolbarTitle] = useState<string>("");

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

  // New free-form event modal
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    label: null as Label | null,
    allDay: false,
    start: "",
    end: "",
    repeat: "none" as "none" | "weekly" | "daily",
    weeklyDays: [] as string[],
    visibility: "PERSONAL" as Visibility,
  });

  function getEventMetaById(id: string, list: EventInput[]) {
    const ev = list.find((e) => String(e.id) === String(id)) as any;
    if (!ev)
      return {
        ev: null as any,
        kind: null as "free" | null,
        realId: null as string | null,
      };
    const kind = ev?.extendedProps?.kind ?? "free";
    const realId = kind === "free" ? (ev?.extendedProps?.realId ?? null) : String(id);
    return { ev, kind, realId };
  }

  /* ===== Load calendar events ===== */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/personal-calendar", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      const json = await safeJson<CalendarEventResponse>(res, {
        events: [],
      });

      const personalEvents = Array.isArray(json.events) ? json.events : [];

      const events = personalEvents.map((e: any) => ({
        ...e,
        id: `free-${e.id}`,
        extendedProps: {
          ...(e.extendedProps || {}),
          kind: "free",
          realId: e.id,
          visibility: e.visibility ?? "PERSONAL",
        },
      }));

      setEvents(events);
    } catch (e) {
      console.error(e);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /* ===== Create free event ===== */
  const handleSaveFreeEvent = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);

    const visibility: Visibility =
      draft.visibility === "PERSONAL" ? "PERSONAL" : "PUBLIC";
    const startISO = draft.start ? new Date(draft.start).toISOString() : new Date().toISOString();
    const endISO = draft.end ? new Date(draft.end).toISOString() : new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const toHHMMSS = (iso: string | undefined, fallback: string) => {
      if (!iso) return fallback;
      const m = iso.match(/T(\d{2}:\d{2}:\d{2})/);
      return m ? m[1] : fallback;
    };

    const payload: any = {
      title: draft.title || (draft.label ? labelNice(draft.label) : "Event"),
      label: draft.label,
      visibility,
      track: "A", // Personal events need a valid track
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
        const msg = await res.text().catch(() => "Failed to create event");
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
  }, [saving, draft, load]);

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
      setBgMenuPos({ x: e.clientX, y: e.clientY });
      setBgMenuOpen(true);
    };
    root.addEventListener("contextmenu", onCtx);
    return () => root.removeEventListener("contextmenu", onCtx);
  }, []);

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
    } else {
      calendarApiRef.current = null;
    }
  }, []);

  /* ===== Renderers ===== */
  const renderEventContent = useCallback((arg: EventContentArg) => {
    const xp: any = arg.event.extendedProps ?? {};
    const location = (xp.location as string | null) ?? null;
    const label = xp.label as Label | undefined;
    const timeText = arg.timeText;

    return (
      <div className="ordina-calendar-event-inner flex h-full flex-col gap-2 rounded-xl px-3 py-2 text-[11px] leading-tight">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <div className="text-[11px] font-medium leading-tight break-words">
              {arg.event.title}
            </div>
          </div>
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
      "ordina-calendar-event--interactive",
    ];
    return classes;
  }, []);

  const eventDidMount = useCallback(
    (arg: { el: HTMLElement; event: EventApi }) => {
      const label = arg.event.extendedProps?.label as Label | undefined;
      const palette = basePalette(label);

      applyPalette(arg.el, palette);

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
        // Open menu for any event
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
      return true;
    },
    [],
  );

  const onEventDrop = useCallback(
    async (info: any) => {
      const ev = info.event;
      const isFree = ev.extendedProps?.kind === "free";
      const realId = isFree ? ev.extendedProps?.realId : ev.id;
      const url = `/api/free-events/${encodeURIComponent(realId)}`;

      const startISO = ev.start ? ev.start.toISOString() : undefined;
      const endISO = ev.end ? ev.end.toISOString() : undefined;

      const payload: any = { start: startISO, end: endISO };

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
    [load],
  );

  /* =========================
     Render
  ========================= */
  const menuEvent = getEventById(menuEventId);
  const menuCanDelete = isDeletableEvent(menuEvent);

  return (
    <div className="relative p-4">
      <div className="mb-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center gap-2">

          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleToday}
            className="rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-sm font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-100"
          >
            I dag
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
            })}
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm text-neutral-500">
            {loading && (
              <div className="flex items-center gap-2">
                <OrdinaLogoSpinner size={20} />
                <span>Laddar</span>
              </div>
            )}
          </div>
        </div>

      
      </div>

      <CalendarSkin>
        <div
          ref={calendarRootRef}
          className="h-[calc(100vh-260px)] min-h-[600px]"
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
            scrollTime="07:00:00"
            scrollTimeReset={false}
            slotMinTime="00:00:00"
            slotMaxTime="24:00:00"
            stickyHeaderDates
            selectable
            selectMirror
            select={(arg) => {
              setDraft((d) => ({
                ...d,
                start: arg.start ? arg.start.toISOString() : "",
                end: arg.end ? arg.end.toISOString() : "",
              }));
              setModalOpen(true);
            }}
            events={events}
            height="100%"
            contentHeight="100%"
            nowIndicator
            expandRows
            editable
            datesSet={(arg) => {
              setToolbarTitle(arg.view.title);
              setCurrentView(arg.view.type as CalendarView);
            }}
            eventDrop={onEventDrop}
            eventResize={onEventDrop}
            eventContent={renderEventContent}
            eventClassNames={eventClassNames}
            eventAllow={allowEventMutation}
            eventDidMount={eventDidMount}
          />
        </div>
      </CalendarSkin>

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
                visibility: "PERSONAL",
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
          <div className="px-3 py-2 text-xs text-neutral-500 border-b">
            Kalenderetikett
          </div>
          {LABEL_ORDER.map((k) => (
            <button
              key={k}
              className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 flex items-center gap-2"
              onClick={() => {
                if (!menuEventId) return;
                // Update event label
                const ev = getEventById(menuEventId);
                if (ev) {
                  const realId = (ev as any)?.extendedProps?.realId ?? menuEventId;
                  fetch(`/api/free-events/${encodeURIComponent(realId)}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ label: k }),
                  }).then(() => {
                    load();
                    closeEventMenu();
                  });
                }
              }}
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
              onClick={() => {
                if (!menuEventId) return;
                const ev = getEventById(menuEventId);
                if (ev) {
                  const realId = (ev as any)?.extendedProps?.realId ?? menuEventId;
                  fetch(`/api/free-events/${encodeURIComponent(realId)}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ label: null }),
                  }).then(() => {
                    load();
                    closeEventMenu();
                  });
                }
              }}
            >
              Rensa etikett
            </button>
          </div>

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-neutral-200">
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

              <div>
                <label className="text-sm ">Synlighet</label>
                <div className="mt-2 inline-flex rounded-full border border-neutral-200 p-1">
                  {(["PUBLIC", "PERSONAL"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setDraft({ ...draft, visibility: v })}
                      className={
                        "px-3 py-1.5 text-sm rounded-full transition " +
                        (draft.visibility === v
                          ? "bg-neutral-900 text-white"
                          : " hover:bg-neutral-50")
                      }
                    >
                      {v === "PUBLIC" ? "Public" : "Personal"}
                    </button>
                  ))}
                </div>
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
    </div>
  );
}