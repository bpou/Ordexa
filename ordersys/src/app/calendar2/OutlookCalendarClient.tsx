"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type {
  CalendarApi,
  DateSelectArg,
  EventClickArg,
  EventDropArg,
  EventInput,
} from "@fullcalendar/core";
import svLocale from "@fullcalendar/core/locales/sv";
import { AnimatePresence, motion } from "framer-motion";
import { CALENDAR_SETTABLE, STATUS_COLOR_PARTS, STATUS_DISPLAY, type TrackStatus } from "@/lib/orderStatus";
import {
  AppWindow,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Filter,
  Globe,
  MapPin,
  Menu,
  MoreHorizontal,
  Plus,
  Save,
  RefreshCw,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";

type CalendarView = "timeGridDay" | "timeGridWorkWeek" | "timeGridWeek" | "dayGridMonth";
type Visibility = "PUBLIC" | "PERSONAL";
type Label =
  | "BOKAD_TID"
  | "KAN_FLYTTAS"
  | "LUNCH"
  | "SEMESTER"
  | "TRAFIKVERKET"
  | "UNDER_VECKAN"
  | "UTFORT_ARBETE";

type Draft = {
  id?: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  label: Label;
  status?: TrackStatus;
  visibility: Visibility;
  location: string;
  body: string;
  showAs: "UPPTAGEN" | "LEDIG";
  recurrence: "none" | "daily" | "weekly";
  weeklyDays: string[];
  recurrenceUntil: string;
};

type DragHandle = "top" | "bottom" | "middle" | null;

type CalendarResponse = { events?: EventInput[] };

type CalendarLabel = Exclude<Label, "UTFORT_ARBETE">;

const LABELS: { value: CalendarLabel; label: string; color: string }[] = [
  { value: "BOKAD_TID", label: "Calendar", color: "#059669" },
  { value: "KAN_FLYTTAS", label: "Verkstad", color: "#107c10" },
  { value: "SEMESTER", label: "Ateljé", color: "#ca5010" },
  { value: "TRAFIKVERKET", label: "Bilmontage", color: "#8764b8" },
  { value: "UNDER_VECKAN", label: "Montage", color: "#00b7c3" },
];

const STATUS_TO_LABEL: Partial<Record<TrackStatus, Label>> = {
  PAGAENDE: "BOKAD_TID",
  PALACK: "KAN_FLYTTAS",
  LEVERANS: "TRAFIKVERKET",
  AVSLUTAD: "UTFORT_ARBETE",
};

const VIEW_BUTTONS: { view: CalendarView; label: string }[] = [
  { view: "timeGridDay", label: "Dag" },
  { view: "timeGridWorkWeek", label: "Arbetsvecka" },
  { view: "timeGridWeek", label: "Vecka" },
  { view: "dayGridMonth", label: "Månad" },
];

const WEEKDAYS_SHORT = ["S", "M", "T", "O", "T", "F", "L"];
const WEEKDAYS_LONG = ["Söndag", "Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag"];
const WEEKDAY_PICKER: Array<{ value: string; label: string }> = [
  { value: "1", label: "M" },
  { value: "2", label: "T" },
  { value: "3", label: "O" },
  { value: "4", label: "T" },
  { value: "5", label: "F" },
  { value: "6", label: "L" },
  { value: "0", label: "S" },
];
const SPRING = { type: "spring", stiffness: 420, damping: 34, mass: 0.8 } as const;
const SMOOTH = { duration: 0.24, ease: [0.22, 1, 0.36, 1] } as const;
const MONTHS = [
  "januari",
  "februari",
  "mars",
  "april",
  "maj",
  "juni",
  "juli",
  "augusti",
  "september",
  "oktober",
  "november",
  "december",
];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toLocalInputValue(value?: string | Date | null) {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIso(value: string) {
  return new Date(value).toISOString();
}

function toDateInputValue(value?: string | Date | null) {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTimeInputValue(value?: string | Date | null) {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "00:00";
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatTime24(value?: string | Date | null) {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "00:00";
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromTimeInputValue(value: string) {
  const [hours, minutes] = value.split(":").map((part) => parseInt(part, 10) || 0);
  return { hours, minutes };
}

function combineDateAndTimeInput(dateValue: string, timeValue: string) {
  const date = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();
  const { hours, minutes } = fromTimeInputValue(timeValue || "00:00");
  date.setHours(hours, minutes, 0, 0);
  return toLocalInputValue(date);
}

function toTimeApiValue(value: string) {
  const { hours, minutes } = fromTimeInputValue(value);
  return `${pad(hours)}:${pad(minutes)}:00`;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfWeek(date: Date) {
  const out = new Date(date);
  out.setHours(0, 0, 0, 0);
  out.setDate(out.getDate() - out.getDay());
  return out;
}

function addDays(date: Date, days: number) {
  const out = new Date(date);
  out.setDate(out.getDate() + days);
  return out;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function monthGrid(date: Date) {
  const first = startOfMonth(date);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function labelFor(value?: string | null) {
  return LABELS.find((item) => item.value === value) ?? LABELS[0];
}

function darkenHex(hex: string, amount = 0.18) {
  const normalized = hex.replace("#", "").trim();
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => part + part)
          .join("")
      : normalized;

  if (!/^[0-9a-f]{6}$/i.test(full)) return hex;

  const factor = 1 - amount;
  const parts = [0, 2, 4].map((start) => {
    const value = Math.max(0, Math.min(255, Math.round(parseInt(full.slice(start, start + 2), 16) * factor)));
    return value.toString(16).padStart(2, "0");
  });

  return `#${parts.join("")}`;
}

function recurrenceSummary(draft: Draft) {
  if (draft.recurrence === "none") return "";
  const start = new Date(draft.start);
  const end = new Date(draft.end);
  const startLabel = formatTime24(start);
  const endLabel = formatTime24(end);
  const until = draft.recurrenceUntil ? new Date(`${draft.recurrenceUntil}T00:00:00`) : null;

  if (draft.recurrence === "daily") {
    return `Inträffar dagligen från ${startLabel} till ${endLabel}${until ? ` gäller till ${until.toLocaleDateString("sv-SE")}` : ""}`;
  }

  const dayNames = WEEKDAY_PICKER.filter((day) => draft.weeklyDays.includes(day.value)).map((day) => {
    const index = Number(day.value);
    return WEEKDAYS_LONG[index].toLowerCase();
  });
  const dayText = dayNames.length ? dayNames.join(", ") : WEEKDAYS_LONG[start.getDay()].toLowerCase();
  return `Inträffar varje ${dayText} från ${startLabel} till ${endLabel}${until ? ` gäller ${start.toLocaleDateString("sv-SE")} till ${until.toLocaleDateString("sv-SE")}` : ""}`;
}

function popupTimeSummary(draft: Pick<Draft, "start" | "end">) {
  const start = new Date(draft.start);
  const end = new Date(draft.end);
  const dayPart = start.toLocaleDateString("sv-SE", {
    weekday: "short",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const timePart = `${formatTime24(start)} - ${formatTime24(end)}`;
  return `${dayPart} ${timePart}`;
}

function formatRangeTitle(date: Date, view: CalendarView) {
  if (view === "dayGridMonth") {
    return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  }
  if (view === "timeGridDay") {
    return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  }
  const weekStart = startOfWeek(date);
  const workStart = addDays(weekStart, 1);
  const end = view === "timeGridWorkWeek" ? addDays(workStart, 4) : addDays(weekStart, 6);
  const first = view === "timeGridWorkWeek" ? workStart : weekStart;
  const monthPart =
    first.getMonth() === end.getMonth()
      ? MONTHS[first.getMonth()]
      : `${MONTHS[first.getMonth()]}-${MONTHS[end.getMonth()]}`;
  return `${first.getDate()} ${monthPart}-${end.getDate()} ${end.getFullYear()}`;
}

async function safeJson<T>(response: Response | null, fallback: T): Promise<T> {
  try {
    if (!response || !response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

function normalizeEvents(events: EventInput[]) {
  return events.map((event: any) => {
    const label = labelFor(event.extendedProps?.label);
    const status = event.extendedProps?.status as TrackStatus | undefined;
    const statusColor = status ? STATUS_COLOR_PARTS[status] : null;
    const backgroundColor = statusColor?.bgHex ?? label.color;
    return {
      ...event,
      id: event.id,
      backgroundColor,
      borderColor: backgroundColor,
      textColor: statusColor?.textHex ?? "#ffffff",
      extendedProps: {
        ...(event.extendedProps ?? {}),
        accentColor: darkenHex(backgroundColor),
        realId: event.extendedProps?.realId ?? event.id,
        label: event.extendedProps?.label ?? label.value,
        status,
        visibility: event.extendedProps?.visibility ?? "PERSONAL",
        notes: event.extendedProps?.notes ?? "",
        recurrence: event.extendedProps?.recurrence ?? "none",
        weeklyDays:
          Array.isArray(event.extendedProps?.weeklyDays)
            ? event.extendedProps.weeklyDays
            : typeof event.extendedProps?.weeklyDays === "string" && event.extendedProps.weeklyDays.length
              ? event.extendedProps.weeklyDays.split(",")
              : [],
        recurrenceUntil: event.extendedProps?.endRecur ? toDateInputValue(event.extendedProps.endRecur) : "",
      },
    };
  });
}

function makeDraft(input?: Partial<Draft>): Draft {
  const start = input?.start ? new Date(input.start) : new Date();
  if (Number.isNaN(start.getTime())) start.setTime(Date.now());
  const end = input?.end ? new Date(input.end) : addMinutes(start, 30);
  if (Number.isNaN(end.getTime()) || end <= start) end.setTime(addMinutes(start, 30).getTime());

  return {
    title: input?.title ?? "",
    start: toLocalInputValue(start),
    end: toLocalInputValue(end),
    allDay: input?.allDay ?? false,
    label: input?.label ?? "BOKAD_TID",
    status: input?.status,
    visibility: input?.visibility ?? "PERSONAL",
    location: input?.location ?? "",
    body: input?.body ?? "",
    id: input?.id,
    showAs: input?.showAs ?? "UPPTAGEN",
    recurrence: input?.recurrence ?? "none",
    weeklyDays:
      input?.weeklyDays && input.weeklyDays.length
        ? input.weeklyDays
        : [String(start.getDay())],
    recurrenceUntil: input?.recurrenceUntil ?? "",
  };
}

type OutlookCalendarClientProps = {
  initialCalendarLabels?: CalendarLabel[];
  lockCalendarSelection?: boolean;
  calendarTrack?: "A" | "B" | "C" | "D";
};

export default function OutlookCalendarClient({
  initialCalendarLabels,
  lockCalendarSelection = false,
  calendarTrack = "A",
}: OutlookCalendarClientProps = {}) {
  const defaultCalendarLabels = useMemo(
    () => (initialCalendarLabels?.length ? initialCalendarLabels : LABELS.map((label) => label.value)),
    [initialCalendarLabels],
  );
  const defaultCalendarLabel = defaultCalendarLabels[0] ?? LABELS[0].value;
  const [events, setEvents] = useState<EventInput[]>([]);
  const [view, setView] = useState<CalendarView>("timeGridWorkWeek");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => makeDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeCalendars, setActiveCalendars] = useState<Label[]>(defaultCalendarLabels);
  const [previewDate, setPreviewDate] = useState(() => new Date());
  const [dragHandle, setDragHandle] = useState<DragHandle>(null);
  const [showAsMenuOpen, setShowAsMenuOpen] = useState(false);
  const [recurrenceEditorOpen, setRecurrenceEditorOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobileCalendar, setIsMobileCalendar] = useState(false);
  const [timeZoneMode, setTimeZoneMode] = useState<"LOCAL" | "UTC">("LOCAL");
  const [eventMenu, setEventMenu] = useState<{
    eventId: string;
    persistId: string;
    x: number;
    y: number;
    track?: "A" | "B" | "C" | "D";
  } | null>(null);

  const calendarRefs = useRef<Record<string, FullCalendar | null>>({});
  const timePopupRef = useRef<HTMLDivElement | null>(null);

  const setCalendarRef = (label: string) => (el: FullCalendar | null) => {
    if (el) {
      calendarRefs.current[label] = el;
    } else {
      delete calendarRefs.current[label];
    }
  };

  const primaryLabel = activeCalendars[0];
  const visibleLabels = useMemo(
    () => (lockCalendarSelection ? LABELS.filter((label) => defaultCalendarLabels.includes(label.value)) : LABELS),
    [defaultCalendarLabels, lockCalendarSelection],
  );
  const api = useCallback((): CalendarApi | null => {
    const ref = primaryLabel ? calendarRefs.current[primaryLabel] : Object.values(calendarRefs.current)[0];
    return ref?.getApi() ?? null;
  }, [primaryLabel]);

  const callAllApis = (fn: (api: CalendarApi) => void) => {
    Object.values(calendarRefs.current).forEach((ref) => {
      const calApi = ref?.getApi();
      if (calApi) fn(calApi);
    });
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/personal-calendar", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const json = await safeJson<CalendarResponse>(response, { events: [] });
      setEvents(normalizeEvents(Array.isArray(json.events) ? json.events : []));
      if (!response.ok) setError("Kunde inte läsa kalendern.");
    } catch (err: any) {
      setError(err?.message ?? "Kunde inte läsa kalendern.");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!eventMenu) return;
    const close = () => setEventMenu(null);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [eventMenu]);

  useEffect(() => {
    if (!dialogOpen) {
      setShowAsMenuOpen(false);
      setRecurrenceEditorOpen(false);
    }
  }, [dialogOpen]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobileCalendar(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isMobileCalendar) return;
    setActiveCalendars((prev) => (prev.length > 1 ? [prev[0]] : prev));
  }, [isMobileCalendar]);

  useEffect(() => {
    if (!recurrenceEditorOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && timePopupRef.current?.contains(target)) return;
      setRecurrenceEditorOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [recurrenceEditorOpen]);

  useEffect(() => {
    if (dialogOpen) {
      setPreviewDate(new Date(draft.start));
      const container = document.querySelector("[data-event-preview-container]") as HTMLElement | null;
      if (!container) return;
      const block = container.querySelector("[data-event-preview-block]") as HTMLElement | null;
      if (!block) return;
      const blockTop = parseFloat(block.style.top) || 0;
      const blockHeight = parseFloat(block.style.height) || 0;
      const containerHeight = container.clientHeight;
      const scrollTo = blockTop - containerHeight / 2 + blockHeight / 2;
      container.scrollTo({ top: Math.max(0, scrollTo), behavior: "smooth" });
    }
  }, [dialogOpen, draft.start]);

  const title = useMemo(() => formatRangeTitle(anchorDate, view), [anchorDate, view]);
  const miniDays = useMemo(() => monthGrid(anchorDate), [anchorDate]);
  const calendarViews = useMemo(
    () => ({
      timeGridWorkWeek: {
        type: "timeGridWeek",
        buttonText: "Arbetsvecka",
      },
    }),
    [],
  );
  const hiddenDays = useMemo(() => (view === "timeGridWorkWeek" ? [0, 6] : []), [view]);

  const goToday = useCallback(() => {
    callAllApis((calApi) => calApi.today());
    const calApi = api();
    setAnchorDate(calApi?.getDate() ?? new Date());
  }, [api]);

  const goPrev = useCallback(() => {
    callAllApis((calApi) => calApi.prev());
    const calApi = api();
    setAnchorDate(calApi?.getDate() ?? addDays(anchorDate, -7));
  }, [api, anchorDate]);

  const goNext = useCallback(() => {
    callAllApis((calApi) => calApi.next());
    const calApi = api();
    setAnchorDate(calApi?.getDate() ?? addDays(anchorDate, 7));
  }, [api, anchorDate]);

  const goDate = useCallback(
    (date: Date) => {
      callAllApis((calApi) => calApi.gotoDate(date));
      setAnchorDate(date);
    },
    [],
  );

  const changeView = useCallback(
    (nextView: CalendarView) => {
      setView(nextView);
      callAllApis((calApi) => calApi.changeView(nextView));
      const calApi = api();
      if (calApi) setAnchorDate(calApi.getDate());
    },
    [api],
  );

  const openNew = useCallback((start?: Date, end?: Date, allDay = false) => {
    const base = start ?? new Date();
    setDraft(
      makeDraft({
        start: toLocalInputValue(base),
        end: toLocalInputValue(end ?? addMinutes(base, 30)),
        allDay,
        label: defaultCalendarLabel,
      }),
    );
    setRecurrenceEditorOpen(false);
    setDialogOpen(true);
  }, [defaultCalendarLabel]);

  const openFromSelect = useCallback(
    (arg: DateSelectArg) => {
      openNew(arg.start, arg.end, arg.allDay);
      arg.view.calendar.unselect();
    },
    [openNew],
  );

  const openEvent = useCallback((arg: EventClickArg) => {
    const label = labelFor(arg.event.extendedProps?.label);
    setDraft(
      makeDraft({
        id: String(arg.event.extendedProps?.realId ?? arg.event.id),
        title: arg.event.title,
        start: toLocalInputValue(arg.event.start),
        end: toLocalInputValue(arg.event.end ?? addMinutes(arg.event.start ?? new Date(), 30)),
        allDay: arg.event.allDay,
        label: label.value,
        status: arg.event.extendedProps?.status as TrackStatus | undefined,
        visibility: (arg.event.extendedProps?.visibility as Visibility) ?? "PERSONAL",
        location: (arg.event.extendedProps?.location as string | null) ?? "",
        body: (arg.event.extendedProps?.notes as string | null) ?? "",
        recurrence: (arg.event.extendedProps?.recurrence as Draft["recurrence"] | undefined) ?? "none",
        weeklyDays: Array.isArray(arg.event.extendedProps?.weeklyDays)
          ? (arg.event.extendedProps.weeklyDays as string[])
          : typeof arg.event.extendedProps?.weeklyDays === "string" && arg.event.extendedProps.weeklyDays.length
            ? String(arg.event.extendedProps.weeklyDays).split(",")
            : [String((arg.event.start ?? new Date()).getDay())],
        recurrenceUntil: arg.event.extendedProps?.endRecur
          ? toDateInputValue(arg.event.extendedProps.endRecur as string)
          : "",
      }),
    );
    setRecurrenceEditorOpen(false);
    setDialogOpen(true);
  }, []);

  const setCalendarLabel = useCallback(
    async (eventId: string, persistId: string, label: Label) => {
      const color = labelFor(label);
      const accentColor = darkenHex(color.color);
      const calendarEvent = api()?.getEventById(eventId);
      calendarEvent?.setProp("backgroundColor", color.color);
      calendarEvent?.setProp("borderColor", color.color);
      calendarEvent?.setProp("textColor", "#ffffff");
      calendarEvent?.setExtendedProp("accentColor", accentColor);
      calendarEvent?.setExtendedProp("label", label);
      calendarEvent?.setExtendedProp("status", undefined);

      setEvents((prev) =>
        prev.map((event) =>
          String(event.id) === eventId
            ? {
                ...event,
                backgroundColor: color.color,
                borderColor: color.color,
                textColor: "#ffffff",
                extendedProps: { ...(event.extendedProps ?? {}), accentColor, label, status: undefined },
              }
            : event,
        ),
      );

      try {
        const response = await fetch(`/api/free-events/${encodeURIComponent(persistId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ label }),
        });
        if (!response.ok) throw new Error(await response.text());
      } catch (err) {
        console.error("Failed to set calendar label", err);
        await load();
      } finally {
        setEventMenu(null);
      }
    },
    [api, load],
  );

  const setEventStatus = useCallback(
    async (eventId: string, persistId: string, status: TrackStatus, track?: "A" | "B" | "C" | "D") => {
      const statusColor = STATUS_COLOR_PARTS[status];
      const accentColor = darkenHex(statusColor.bgHex);
      const calendarEvent = api()?.getEventById(eventId);
      calendarEvent?.setProp("backgroundColor", statusColor.bgHex);
      calendarEvent?.setProp("borderColor", statusColor.bgHex);
      calendarEvent?.setProp("textColor", statusColor.textHex);
      calendarEvent?.setExtendedProp("accentColor", accentColor);
      calendarEvent?.setExtendedProp("status", status);
      calendarEvent?.setExtendedProp("label", null);

      setEvents((prev) =>
        prev.map((event) =>
          String(event.id) === eventId
            ? {
                ...event,
                backgroundColor: statusColor.bgHex,
                borderColor: statusColor.bgHex,
                textColor: statusColor.textHex,
                extendedProps: { ...(event.extendedProps ?? {}), accentColor, status, label: null },
              }
            : event,
        ),
      );

      try {
        if (track) {
          const response = await fetch(`/api/calendar/${encodeURIComponent(persistId)}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ status, track }),
          });
          if (!response.ok) throw new Error(await response.text());
          await load();
        } else {
          const label = STATUS_TO_LABEL[status] ?? "BOKAD_TID";
          const response = await fetch(`/api/free-events/${encodeURIComponent(persistId)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ label }),
          });
          if (!response.ok) throw new Error(await response.text());
        }
      } catch (err) {
        console.error("Failed to set status", err);
        await load();
      } finally {
        setEventMenu(null);
      }
    },
    [api, load],
  );

  const saveDraft = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setError(null);

    const payload: Record<string, unknown> = {
      title: draft.title.trim() || "(Inget ämne)",
      start: toIso(draft.start),
      end: toIso(draft.end),
      allDay: draft.allDay,
      label: draft.status ? STATUS_TO_LABEL[draft.status] ?? draft.label : draft.label,
      visibility: draft.visibility,
      track: calendarTrack,
      repeat: draft.recurrence,
      showAs: draft.showAs,
      notes: draft.body.trim() || null,
    };

    if (draft.recurrence !== "none") {
      payload.startRecur = toIso(combineDateAndTimeInput(toDateInputValue(draft.start), "00:00"));
      payload.endRecur = draft.recurrenceUntil
        ? toIso(combineDateAndTimeInput(draft.recurrenceUntil, "00:00"))
        : null;
      payload.startTime = toTimeApiValue(toTimeInputValue(draft.start));
      payload.endTime = toTimeApiValue(toTimeInputValue(draft.end));
      payload.weeklyDays =
        draft.recurrence === "daily"
          ? ["0", "1", "2", "3", "4", "5", "6"]
          : draft.weeklyDays.length
            ? draft.weeklyDays
            : [String(new Date(draft.start).getDay())];
    }

    try {
      const response = await fetch(
        draft.id ? `/api/free-events/${encodeURIComponent(draft.id)}` : "/api/free-events",
        {
          method: draft.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        setError(text || "Kunde inte spara händelsen.");
        return;
      }

      setDialogOpen(false);
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Kunde inte spara händelsen.");
    } finally {
      setSaving(false);
    }
  }, [calendarTrack, draft, load, saving]);

  const deleteDraft = useCallback(async () => {
    if (!draft.id || saving) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/free-events/${encodeURIComponent(draft.id)}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        setError(text || "Kunde inte ta bort händelsen.");
        return;
      }
      setDialogOpen(false);
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Kunde inte ta bort händelsen.");
    } finally {
      setSaving(false);
    }
  }, [draft.id, load, saving]);

  const MINUTES_PER_PX = 1;
  const PREVIEW_START_HOUR = 0;
  const PREVIEW_HOURS = 24;

  const minutesToLocalValue = useCallback((date: Date, totalMinutes: number) => {
    const d = new Date(date);
    const h = Math.max(0, Math.floor(totalMinutes / 60));
    const m = Math.max(0, Math.floor(totalMinutes % 60));
    d.setHours(h, m, 0, 0);
    return toLocalInputValue(d);
  }, []);

  const dragStateRef = useRef<{
    handle: DragHandle;
    startY: number;
    startTotal: number;
    endTotal: number;
  } | null>(null);

  const startDrag = useCallback((handle: "top" | "bottom" | "middle", event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const container = (event.currentTarget.closest("[data-event-preview-container]") as HTMLElement) ?? null;
    if (!container) return;

    dragStateRef.current = {
      handle,
      startY: event.clientY,
      startTotal: new Date(draft.start).getHours() * 60 + new Date(draft.start).getMinutes(),
      endTotal: new Date(draft.end).getHours() * 60 + new Date(draft.end).getMinutes(),
    };
    setDragHandle(handle);
  }, [draft.start, draft.end]);

  useEffect(() => {
    if (!dragHandle) return;

    document.body.style.userSelect = "none";
    document.body.style.cursor = dragHandle === "middle" ? "grabbing" : "ns-resize";

    const onMouseMove = (event: MouseEvent) => {
      const state = dragStateRef.current;
      if (!state) return;

      const container = document.querySelector("[data-event-preview-container]") as HTMLElement | null;
      if (!container) return;

      const deltaY = event.clientY - state.startY;
      const deltaMinutes = Math.round(deltaY * MINUTES_PER_PX / 15) * 15;
      const baseDate = new Date(draft.start);

      if (state.handle === "middle") {
        const duration = state.endTotal - state.startTotal;
        const clampedStart = Math.max(0, Math.min(24 * 60 - duration, state.startTotal + deltaMinutes));
        setDraft((prev) => ({
          ...prev,
          start: minutesToLocalValue(baseDate, clampedStart),
          end: minutesToLocalValue(baseDate, clampedStart + duration),
        }));
      } else if (state.handle === "top") {
        const newStart = Math.max(0, state.startTotal + deltaMinutes);
        if (newStart >= state.endTotal - 15) return;
        setDraft((prev) => ({ ...prev, start: minutesToLocalValue(baseDate, newStart) }));
      } else if (state.handle === "bottom") {
        const newEnd = Math.min(24 * 60, Math.max(0, state.endTotal + deltaMinutes));
        if (newEnd <= state.startTotal + 15) return;
        setDraft((prev) => ({ ...prev, end: minutesToLocalValue(baseDate, newEnd) }));
      }
    };

    const onMouseUp = () => {
      dragStateRef.current = null;
      setDragHandle(null);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [dragHandle, minutesToLocalValue, draft.start]);

  const goToPreviewDay = useCallback((days: number) => {
    setPreviewDate((prev) => {
      const next = addDays(prev, days);
      setDraft((d) => ({
        ...d,
        start: toLocalInputValue(addDays(new Date(d.start), days)),
        end: toLocalInputValue(addDays(new Date(d.end), days)),
      }));
      return next;
    });
  }, []);

  const setPreviewDateAndDraftDate = useCallback((date: Date) => {
    setPreviewDate(date);
    setDraft((d) => {
      const startDate = new Date(d.start);
      const endDate = new Date(d.end);
      startDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      endDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      return {
        ...d,
        start: toLocalInputValue(startDate),
        end: toLocalInputValue(endDate),
      };
    });
  }, []);

  const toggleWeekday = useCallback((day: string) => {
    setDraft((prev) => {
      const set = new Set(prev.weeklyDays);
      if (set.has(day)) {
        set.delete(day);
      } else {
        set.add(day);
      }
      const next = Array.from(set);
      return {
        ...prev,
        weeklyDays: next.length ? next : [day],
      };
    });
  }, []);

  const setRecurrenceMode = useCallback((mode: Draft["recurrence"]) => {
    setDraft((prev) => ({
      ...prev,
      recurrence: mode,
      weeklyDays:
        mode === "daily"
          ? ["0", "1", "2", "3", "4", "5", "6"]
          : prev.weeklyDays.length
            ? prev.weeklyDays
            : [String(new Date(prev.start).getDay())],
    }));
  }, []);

  const toggleCalendarActive = useCallback((label: Label) => {
    if (lockCalendarSelection) return;
    if (isMobileCalendar) {
      setActiveCalendars([label]);
      setFilterOpen(false);
      return;
    }
    setActiveCalendars((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  }, [isMobileCalendar, lockCalendarSelection]);

  const filteredEvents = useMemo(
    () =>
      events.filter((e: any) => {
        const label = e.extendedProps?.label as Label | null | undefined;
        return label !== "UTFORT_ARBETE";
      }),
    [events],
  );

  const eventsByLabel = useMemo(() => {
    const map: Record<string, typeof events> = {};
    for (const label of activeCalendars) {
      if (label === "UTFORT_ARBETE") continue;
      map[label] = events.filter((e: any) => {
        const l = e.extendedProps?.label as Label | null | undefined;
        return l === label || (!l && activeCalendars.length === 1);
      });
    }
    return map;
  }, [events, activeCalendars]);

  const eventDrop = useCallback(
    async (arg: EventDropArg) => {
      const realId = String(arg.event.extendedProps?.realId ?? arg.event.id);
      const response = await fetch(`/api/free-events/${encodeURIComponent(realId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          start: arg.event.start?.toISOString(),
          end: arg.event.end?.toISOString(),
          allDay: arg.event.allDay,
        }),
      }).catch(() => null);

      if (!response?.ok) {
        arg.revert();
        setError("Kunde inte flytta händelsen.");
        return;
      }
      await load();
    },
    [load],
  );

  const previewPalette = useMemo(() => {
    if (draft.status) {
      const statusColor = STATUS_COLOR_PARTS[draft.status];
      return {
        bg: statusColor.bgHex,
        text: statusColor.textHex,
        accent: darkenHex(statusColor.bgHex),
      };
    }
    const label = labelFor(draft.label);
    return {
      bg: label.color,
      text: "#ffffff",
      accent: darkenHex(label.color),
    };
  }, [draft.label, draft.status]);

  return (
    <div className="outlook2 h-[calc(100dvh-80px)] min-h-0 overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-sm md:h-[calc(100dvh-128px)] md:min-h-[680px]">
      <div className="flex h-full">
        <AnimatePresence>
          {mobileSidebarOpen ? (
            <motion.button
              key="mobile-sidebar-backdrop"
              type="button"
              aria-label="Stäng kalenderlista"
              className="fixed inset-0 z-[1090] bg-black/35 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={SMOOTH}
              onClick={() => setMobileSidebarOpen(false)}
            />
          ) : null}
        </AnimatePresence>
        <aside
          className={[
            "fixed inset-y-0 left-0 z-[1100] w-[260px] shrink-0 border-r border-border bg-brand-50/95 shadow-2xl transition-transform duration-300 ease-out md:relative md:z-auto md:translate-x-0 md:bg-brand-50/60 md:shadow-none",
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          <div className="flex h-12 items-center border-b border-brand-100 px-4">
            <span className="text-sm font-semibold text-brand-800">Kalender</span>
          </div>

          <div className="px-4 py-3">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => openNew()}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                <Plus className="h-4 w-4" />
                Ny händelse
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>

            <div className="mb-3 flex items-center justify-between text-sm font-semibold">
              <button type="button" className="flex items-center gap-2">
                <ChevronDown className="h-4 w-4" />
                {MONTHS[anchorDate.getMonth()]} {anchorDate.getFullYear()}
              </button>
              <div className="flex gap-1 text-brand-700">
                <button type="button" onClick={() => goDate(addDays(anchorDate, -30))} aria-label="Föregående månad">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => goDate(addDays(anchorDate, 30))} aria-label="Nästa månad">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
              {WEEKDAYS_SHORT.map((day, index) => (
                <div key={`${day}-${index}`} className="text-[#717b87]">
                  {day}
                </div>
              ))}
              {miniDays.map((day) => {
                const selected = sameDay(day, anchorDate);
                const today = sameDay(day, new Date());
                const outside = day.getMonth() !== anchorDate.getMonth();
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => goDate(day)}
                    className={[
                      "mx-auto flex h-6 w-7 items-center justify-center rounded-md text-xs",
                      outside ? "text-muted-foreground" : "text-foreground",
                      selected ? "bg-brand-100 outline outline-1 outline-brand-600" : "hover:bg-brand-100/70",
                      today ? "font-semibold text-brand-700" : "",
                    ].join(" ")}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>

            <button className="mt-5 flex items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-800" onClick={() => {}}>
              <CalendarDays className="h-4 w-4" />
              Lägg till kalender
            </button>

            <div className="mt-6 border-t border-brand-100 pt-3">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-900">
                <ChevronDown className="h-4 w-4" />
                Mina kalendrar
              </div>
              <div className="space-y-3">
                {visibleLabels.map((item) => {
                  const active = activeCalendars.includes(item.value);
                  return (
                    <label
                      key={item.value}
                      className="flex cursor-pointer items-center gap-3 text-sm hover:bg-brand-100/40 -mx-1 px-1 py-0.5 rounded"
                      onClick={() => toggleCalendarActive(item.value)}
                    >
                      <span
                        className="flex h-4 w-4 items-center justify-center rounded-full border"
                        style={{
                          borderColor: item.color,
                          backgroundColor: active ? item.color : "transparent",
                          color: "white",
                        }}
                      >
                        {active ? <Check className="h-3 w-3" /> : null}
                      </span>
                      {item.label}
                    </label>
                  );
                })}
              </div>
              {!lockCalendarSelection ? (
                <button
                  className="ml-7 mt-4 hidden text-sm font-medium text-brand-700 hover:text-brand-800 md:block"
                  onClick={() =>
                    setActiveCalendars(
                      activeCalendars.length === LABELS.length ? [] : LABELS.map((l) => l.value),
                    )
                  }
                >
                  {activeCalendars.length === LABELS.length ? "Dölj alla" : "Visa alla"}
                </button>
              ) : null}
            </div>

          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col bg-white">
          <div className="flex h-12 items-center gap-2 overflow-x-auto border-b border-border bg-card px-3 shadow-sm">
            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-brand-900 hover:bg-brand-50 md:hidden"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Öppna kalenderlista"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => openNew()}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-semibold text-white hover:bg-brand-700 md:w-auto md:px-3"
              aria-label="Ny händelse"
            >
              <Plus className="h-4 w-4 md:hidden" />
              <CalendarDays className="hidden h-4 w-4 md:block" />
              <span className="hidden md:inline">Ny händelse</span>
              <ChevronDown className="hidden h-3 w-3 md:block" />
            </button>
            <div className="h-6 w-px shrink-0 bg-border" />
            {VIEW_BUTTONS.map((item) => (
              <motion.button
                key={item.view}
                type="button"
                layout
                whileTap={{ scale: 0.96 }}
                transition={SPRING}
                onClick={() => changeView(item.view)}
                className={`h-9 shrink-0 items-center gap-1 rounded-lg border px-2 text-xs md:px-3 md:text-sm ${
                  item.view === "dayGridMonth" ? "hidden md:inline-flex" : "inline-flex"
                } ${
                  view === item.view
                    ? "border-brand-300 bg-brand-100 text-brand-900"
                    : "border-transparent bg-transparent text-foreground hover:bg-brand-50"
                }`}
              >
                <CalendarDays className="hidden h-3.5 w-3.5 text-brand-700 md:block" />
                {item.label}
              </motion.button>
            ))}
            <button
              className="hidden h-9 shrink-0 items-center gap-1 rounded-lg px-3 text-sm text-muted-foreground hover:bg-brand-50 sm:inline-flex"
              onClick={() => window.open("/calendar2", "_blank", "width=1200,height=800")}
            >
              <Copy className="h-3.5 w-3.5" />
              Delad vy
            </button>
            <div className="h-6 w-px shrink-0 bg-border" />
            {!lockCalendarSelection ? (
            <div className="relative">
              <button
                className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-sm hover:bg-brand-50"
                onClick={() => setFilterOpen((o) => !o)}
              >
                <Filter className="h-4 w-4" />
                Filtrera
                <ChevronDown className="h-3 w-3" />
              </button>
              <AnimatePresence>
              {filterOpen ? (
                <motion.div
                  key="calendar-filter"
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={SMOOTH}
                  className="absolute right-0 top-full z-50 mt-1 min-w-[180px] overflow-hidden rounded-lg border border-border bg-white shadow-xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  {visibleLabels.map((item) => {
                    const active = activeCalendars.includes(item.value);
                    return (
                      <button
                        key={item.value}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-brand-50"
                        onClick={() => toggleCalendarActive(item.value)}
                      >
                        <span
                          className="flex h-4 w-4 items-center justify-center rounded-full border"
                          style={{
                            borderColor: item.color,
                            backgroundColor: active ? item.color : "transparent",
                            color: "white",
                          }}
                        >
                          {active ? <Check className="h-3 w-3" /> : null}
                        </span>
                        <span className="font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </motion.div>
              ) : null}
              </AnimatePresence>
            </div>
            ) : null}
            <div className="ml-auto">
              {loading ? <span className="text-xs text-muted">Synkar...</span> : null}
            </div>
          </div>

          <div className="flex h-12 items-center gap-2 border-b border-border px-4">
            <button
              type="button"
              onClick={goToday}
              className="inline-flex h-8 items-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-semibold hover:bg-brand-50"
            >
              <CalendarDays className="h-4 w-4" />
              I dag
            </button>
            <button type="button" onClick={goPrev} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-brand-50">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={goNext} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-brand-50">
              <ChevronRight className="h-4 w-4" />
            </button>
            <h1 className="ml-2 text-xl font-semibold text-brand-900">
              {title}
              <ChevronDown className="ml-1 inline h-4 w-4" />
            </h1>
            {error ? <div className="ml-auto text-sm text-red-600">{error}</div> : null}
          </div>

          <motion.div
            layout
            transition={SPRING}
            className="min-h-0 flex-1"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.max(1, activeCalendars.length)}, minmax(0, 1fr))`,
            }}
          >
            <AnimatePresence initial={false} mode="popLayout">
            {(activeCalendars.length === 0 ? ["" as Label] : activeCalendars).map((label) => {
              const labelMeta = labelFor(label);
              const displayEvents =
                activeCalendars.length === 0
                  ? filteredEvents
                  : (eventsByLabel[label] ?? []);
              return (
                <motion.div
                  key={label}
                  layout
                  initial={{ opacity: 0, x: 18, scale: 0.985 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -18, scale: 0.985 }}
                  transition={SPRING}
                  className="flex min-h-0 flex-col border-r border-border last:border-r-0"
                >
                  {activeCalendars.length >= 2 ? (
                    <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border bg-card px-4">
                      <span className="h-2.5 w-2.5 rounded-full border border-transparent" style={{ backgroundColor: labelMeta.color }} />
                      <h3 className="text-sm font-semibold capitalize">{labelMeta.label}</h3>
                      {!lockCalendarSelection ? (
                      <button
                        type="button"
                        onClick={() => toggleCalendarActive(label)}
                        className="ml-auto rounded p-1 text-[#717b87] hover:bg-[#f3f2f1]"
                        aria-label={`Ta bort ${labelMeta.label}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                      ) : null}
                    </div>
                  ) : null}
                  <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={`${label}-${view}`}
                    initial={{ opacity: 0, y: 12, filter: "blur(3px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -10, filter: "blur(3px)" }}
                    transition={SMOOTH}
                    className="min-h-0 flex-1"
                  >
                    <FullCalendar
                      ref={setCalendarRef(label)}
                      key={`${label}-${activeCalendars.length}-${activeCalendars.join(",")}`}
                      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                      locale={svLocale}
                      initialView={view}
                      views={calendarViews}
                      weekends={view !== "timeGridWorkWeek"}
                      hiddenDays={hiddenDays}
                      headerToolbar={false}
                      height="100%"
                      nowIndicator
                      selectable
                      editable
                      eventResizableFromStart
                      selectMirror
                      slotEventOverlap={false}
                      firstDay={view === "timeGridWorkWeek" ? 1 : 0}
                      allDaySlot={false}
                      slotMinTime="00:00:00"
                      slotMaxTime="24:00:00"
                      slotDuration="00:30:00"
                      slotLabelInterval="01:00"
                      slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
                      eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
                      dayHeaderContent={(arg) => {
                        const dayNumber = arg.date.getDate();
                        if (view === "dayGridMonth") return WEEKDAYS_LONG[arg.date.getDay()];
                        return (
                          <div className="px-3 py-2 text-left">
                            <div className="text-lg font-normal text-brand-700">{dayNumber}</div>
                            <div className="text-xs text-[#717b87]">{WEEKDAYS_LONG[arg.date.getDay()]}</div>
                          </div>
                        );
                      }}
                      dayCellContent={(arg) => (
                        <div className="px-2 py-1 text-left text-sm text-[#717b87]">
                          {arg.date.getDate() === 1 ? `${MONTHS[arg.date.getMonth()].slice(0, 3)} ${arg.date.getDate()}` : arg.date.getDate()}
                        </div>
                      )}
                      datesSet={(arg) => {
                        const nextDate = arg.view.calendar.getDate();
                        setAnchorDate((current) => (current.getTime() === nextDate.getTime() ? current : nextDate));
                        setView((current) => (current === arg.view.type ? current : (arg.view.type as CalendarView)));
                      }}
                      events={displayEvents}
                      select={openFromSelect}
                      eventClick={openEvent}
                      eventDrop={eventDrop}
                      eventResize={eventDrop as any}
                      eventDidMount={(arg) => {
                        arg.el.oncontextmenu = (event) => {
                          event.preventDefault();
                          const track = arg.event.extendedProps?.track as "A" | "B" | "C" | "D" | undefined;
                          setEventMenu({
                            eventId: String(arg.event.id),
                            persistId: String(arg.event.extendedProps?.realId ?? arg.event.id),
                            x: event.clientX,
                            y: event.clientY,
                            track,
                          });
                        };
                      }}
                      eventContent={(arg) => (
                        <div className="relative h-full min-h-full truncate py-1 pl-2.5 pr-1.5 text-[12px] leading-tight">
                          <span
                            className="absolute inset-y-0 left-0 w-1"
                            style={{
                              backgroundColor:
                                (arg.event.extendedProps?.accentColor as string | undefined) ??
                                darkenHex(arg.event.backgroundColor || "#059669"),
                            }}
                          />
                          {arg.view.type === "dayGridMonth" && arg.event.start ? (
                            <span className="font-semibold">{formatTime24(arg.event.start)} </span>
                          ) : null}
                          <span>{arg.event.title || "(Inget ämne)"}</span>
                        </div>
                      )}
                    />
                  </motion.div>
                  </AnimatePresence>
                </motion.div>
              );
            })}
            </AnimatePresence>
          </motion.div>
        </main>
      </div>

      <AnimatePresence>
      {eventMenu ? (
        <motion.div
          key="event-menu"
          initial={{ opacity: 0, y: -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.97 }}
          transition={SMOOTH}
          className="fixed z-[60] min-w-[220px] overflow-hidden rounded-lg border border-border bg-white shadow-xl"
          style={{ left: eventMenu.x, top: eventMenu.y }}
          onClick={(event) => event.stopPropagation()}
          role="menu"
        >
          <div className="border-b px-3 py-2 text-xs text-muted">Sätt status</div>
          {CALENDAR_SETTABLE.map((status) => (
            <button
              key={status}
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-brand-50"
              onClick={() => void setEventStatus(eventMenu.eventId, eventMenu.persistId, status, eventMenu.track)}
              role="menuitem"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: STATUS_COLOR_PARTS[status].bgHex }}
              />
              <span className="font-medium">{STATUS_DISPLAY[status]}</span>
            </button>
          ))}

          <div className="border-y px-3 py-2 text-xs text-muted">Kalenderetikett</div>
          {visibleLabels.map((label) => (
            <button
              key={label.value}
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-brand-50"
              onClick={() => void setCalendarLabel(eventMenu.eventId, eventMenu.persistId, label.value)}
              role="menuitem"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: label.color }} />
              <span className="font-medium">{label.label}</span>
            </button>
          ))}
        </motion.div>
      ) : null}
      </AnimatePresence>

      <AnimatePresence>
      {dialogOpen ? (
        <motion.div
          key="event-dialog-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={SMOOTH}
          className="fixed inset-0 z-50 flex items-stretch justify-stretch bg-black/35 sm:items-center sm:justify-center"
        >
          <motion.div
            key="event-dialog"
            initial={{ opacity: 0, y: 26, scale: 0.965, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 18, scale: 0.975, filter: "blur(6px)" }}
            transition={SPRING}
            className="flex h-dvh w-screen flex-col overflow-hidden rounded-none bg-[#f3f2f1] shadow-2xl sm:h-[min(790px,calc(100vh-40px))] sm:w-[min(1120px,calc(100vw-32px))] sm:rounded-sm"
          >
            <div className="flex h-12 items-center border-b border-[#d4d8de] bg-[#d9f3e3] px-4">
              <span className="text-sm">
                {draft.recurrence === "none"
                  ? "Händelse"
                  : draft.recurrence === "daily"
                    ? "Daglig serie"
                    : "Veckovis serie"}
              </span>
              <button
                className="ml-auto mr-4 text-[#23272f]"
                aria-label="Öppna i nytt fönster"
                onClick={() => window.open("/calendar2", "_blank", "width=1200,height=800")}
              >
                <AppWindow className="h-4 w-4" />
              </button>
              <button onClick={() => setDialogOpen(false)} aria-label="Stäng">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mx-3 mt-2 flex h-10 shrink-0 items-center gap-2 overflow-x-auto rounded-md border border-[#d4d8de] bg-white px-2 shadow-sm sm:mx-4">
              <button
                type="button"
                onClick={() => { void saveDraft(); }}
                disabled={saving}
                className="inline-flex h-8 shrink-0 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                Spara
              </button>
              <button
                className={`inline-flex h-8 shrink-0 items-center gap-2 rounded-sm border px-3 text-sm ${
                  draft.recurrence === "none"
                    ? "border-brand-300 bg-brand-100 text-brand-900"
                    : "border-[#929ba6] bg-[#d9f3e3]"
                }`}
                onClick={() => setDraft((prev) => ({ ...prev, recurrence: "none" }))}
              >
                <CalendarDays className="h-4 w-4" />
                Händelse
              </button>
              <button
                className={`inline-flex h-8 shrink-0 items-center gap-2 rounded-sm px-2 text-sm hover:bg-[#d9f3e3] ${
                  draft.recurrence !== "none"
                    ? "border-brand-300 bg-brand-100 text-brand-900 font-semibold"
                    : ""
                }`}
                onClick={() => {
                  if (draft.recurrence === "none") {
                    setRecurrenceMode("weekly");
                    setRecurrenceEditorOpen(false);
                  } else {
                    setRecurrenceMode("none");
                    setRecurrenceEditorOpen(false);
                  }
                }}
              >
                <RefreshCw className="h-4 w-4" />
                Serie
              </button>
              <div className="relative">
                <button
                  className="inline-flex h-8 shrink-0 items-center gap-2 rounded-sm px-2 text-sm hover:bg-[#d9f3e3]"
                  onClick={() => setShowAsMenuOpen((open) => !open)}
                >
                  <MoreHorizontal className="h-4 w-4" />
                  {draft.showAs === "UPPTAGEN" ? "Upptagen" : "Ledig"}
                  <ChevronDown className="h-3 w-3" />
                </button>
                {showAsMenuOpen ? (
                  <div className="absolute left-0 top-full z-20 mt-1 min-w-[150px] rounded-md border border-[#d4d8de] bg-white py-1 shadow-lg">
                    {[
                      { value: "UPPTAGEN", label: "Upptagen" },
                      { value: "LEDIG", label: "Ledig" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[#f3f2f1] ${
                          draft.showAs === option.value ? "font-semibold text-brand-900" : ""
                        }`}
                        onClick={() => {
                          setDraft((prev) => ({ ...prev, showAs: option.value as Draft["showAs"] }));
                          setShowAsMenuOpen(false);
                        }}
                      >
                        <span>{option.label}</span>
                        {draft.showAs === option.value ? <Check className="h-4 w-4" /> : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              {draft.id ? (
                <button
                  type="button"
                  onClick={() => { void deleteDraft(); }}
                  disabled={saving}
                  className="ml-auto inline-flex h-8 shrink-0 items-center gap-2 rounded-sm px-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  Ta bort
                </button>
              ) : null}
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 sm:grid-cols-[1fr_352px] sm:gap-4 sm:p-4">
              <section className="min-h-0 rounded-md border border-[#d4d8de] bg-white p-3">
                <div className="grid grid-cols-[42px_1fr] items-center gap-y-2">
                  <UsersRound className="mx-auto h-5 w-5 text-brand-700" />
                  <input
                    value={draft.title}
                    onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                    placeholder="Lägg till rubrik"
                    className="h-12 border-b border-[#717b87] bg-transparent px-3 text-xl outline-none placeholder:text-[#929ba6]"
                  />

                  <UsersRound className="mx-auto h-5 w-5 text-[#717b87]" />
                  <input
                    placeholder="Bjud in obligatoriska deltagare"
                    className="h-12 border-b border-[#d4d8de] bg-transparent px-3 text-sm outline-none placeholder:text-[#929ba6]"
                  />

                  <Clock3 className="mx-auto h-5 w-5 text-[#717b87]" />
                  <div ref={timePopupRef} className="relative py-1">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setRecurrenceEditorOpen(true)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setRecurrenceEditorOpen(true);
                        }
                      }}
                      className={`flex h-12 w-full items-center gap-2 border-b px-3 text-left ${
                        recurrenceEditorOpen
                          ? "border-brand-600"
                          : "border-[#717b87]"
                      }`}
                    >
                      <div className="min-w-0 flex-1 truncate text-sm text-[#23272f]">
                        {draft.recurrence !== "none" ? recurrenceSummary(draft) : popupTimeSummary(draft)}
                      </div>
                      <ChevronDown className="h-4 w-4 text-[#717b87]" />
                    </div>
                    <div className="flex items-center gap-6 px-3 py-3 text-sm">
                      <label className="flex items-center gap-2 text-[#5f6b76]">
                        <input
                          type="checkbox"
                          checked={draft.allDay}
                          onChange={(event) => setDraft((prev) => ({ ...prev, allDay: event.target.checked }))}
                          className="h-4 w-4 rounded border-[#c7ccd1]"
                        />
                        Hela dagen
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (draft.recurrence === "none") {
                            setRecurrenceMode("weekly");
                            setRecurrenceEditorOpen(false);
                          } else {
                            setRecurrenceMode("none");
                            setRecurrenceEditorOpen(false);
                          }
                        }}
                        className={`inline-flex h-8 items-center gap-2 rounded-md px-3 ${
                          draft.recurrence === "none" ? "text-[#5f6b76] hover:bg-[#f3f2f1]" : "bg-[#f3f2f1] text-brand-900"
                        }`}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Återkommande
                      </button>
                    </div>
                    {recurrenceEditorOpen ? (
                      <div className="absolute left-0 right-0 top-[74px] z-40 max-h-[min(420px,calc(100dvh-220px))] overflow-y-auto rounded-md border border-[#d4d8de] border-t-brand-600 bg-white px-4 py-4 shadow-xl sm:left-3">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
                          <div>
                            <div className="mb-1 text-sm text-[#717b87]">Startdatum</div>
                            <input
                              type="date"
                              value={toDateInputValue(draft.start)}
                              onChange={(event) =>
                                setDraft((prev) => ({
                                  ...prev,
                                  start: combineDateAndTimeInput(event.target.value, toTimeInputValue(prev.start)),
                                  end: combineDateAndTimeInput(event.target.value, toTimeInputValue(prev.end)),
                                }))
                              }
                              className="w-full border-b border-[#d4d8de] bg-transparent pb-2 text-sm outline-none"
                            />
                          </div>
                          <div>
                            <div className="mb-1 text-sm text-[#717b87]">Starttid</div>
                            <input
                              type="time"
                              value={toTimeInputValue(draft.start)}
                              onChange={(event) =>
                                setDraft((prev) => ({
                                  ...prev,
                                  start: combineDateAndTimeInput(toDateInputValue(prev.start), event.target.value),
                                }))
                              }
                              className="w-full border-b border-[#d4d8de] bg-transparent pb-2 text-sm outline-none"
                            />
                          </div>
                          <div>
                            <div className="mb-1 text-sm text-[#717b87]">Sluttid</div>
                            <input
                              type="time"
                              value={toTimeInputValue(draft.end)}
                              onChange={(event) =>
                                setDraft((prev) => ({
                                  ...prev,
                                  end: combineDateAndTimeInput(toDateInputValue(prev.end), event.target.value),
                                }))
                              }
                              className="w-full border-b border-[#d4d8de] bg-transparent pb-2 text-sm outline-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setTimeZoneMode((prev) => (prev === "LOCAL" ? "UTC" : "LOCAL"))}
                            className="mt-6 inline-flex h-9 w-9 items-center justify-center rounded-full text-brand-700 hover:bg-brand-50"
                            title={timeZoneMode === "LOCAL" ? "Byt till UTC-visning" : "Byt till lokal tidszon"}
                          >
                            <Globe className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-5 flex items-center gap-6 text-sm">
                          <label className="flex items-center gap-2 text-[#5f6b76]">
                            <input
                              type="checkbox"
                              checked={draft.allDay}
                              onChange={(event) => setDraft((prev) => ({ ...prev, allDay: event.target.checked }))}
                              className="h-4 w-4 rounded border-[#c7ccd1]"
                            />
                            Hela dagen
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              if (draft.recurrence === "none") {
                                setRecurrenceMode("weekly");
                              } else {
                                setRecurrenceMode("none");
                              }
                            }}
                            className={`inline-flex h-8 items-center gap-2 rounded-md px-3 ${
                              draft.recurrence === "none" ? "bg-transparent text-[#5f6b76] hover:bg-[#f3f2f1]" : "bg-[#f3f2f1] text-brand-900"
                            }`}
                          >
                            <RefreshCw className="h-4 w-4" />
                            Återkommande
                          </button>
                        </div>

                        {draft.recurrence !== "none" ? (
                          <div className="mt-4 flex items-center gap-3">
                            <span className="text-sm text-[#717b87]">Upprepa var</span>
                            <select
                              value={draft.recurrence}
                              onChange={(event) => setRecurrenceMode(event.target.value as Draft["recurrence"])}
                              className="h-9 rounded-md border border-[#d4d8de] bg-[#f3f2f1] px-3 text-sm"
                            >
                              <option value="daily">dag</option>
                              <option value="weekly">vecka</option>
                            </select>
                          </div>
                        ) : null}

                        {draft.recurrence === "weekly" ? (
                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            {WEEKDAY_PICKER.map((day) => {
                              const active = draft.weeklyDays.includes(day.value);
                              return (
                                <button
                                  key={day.value}
                                  type="button"
                                  onClick={() => toggleWeekday(day.value)}
                                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                                    active ? "bg-brand-600 text-white" : "bg-[#f3f2f1] text-[#4b5560]"
                                  }`}
                                >
                                  {day.label}
                                </button>
                              );
                            })}
                            <span className="text-sm text-[#717b87]">Till</span>
                            <input
                              type="date"
                              value={draft.recurrenceUntil}
                              onChange={(event) => setDraft((prev) => ({ ...prev, recurrenceUntil: event.target.value }))}
                              className="h-9 rounded-md border border-transparent bg-[#f3f2f1] px-3 text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setRecurrenceMode("none");
                                setRecurrenceEditorOpen(false);
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-brand-700 hover:bg-brand-50"
                              aria-label="Ta bort återkommande"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <MapPin className="mx-auto h-5 w-5 text-[#717b87]" />
                  <input
                    value={draft.location}
                    onChange={(event) => setDraft((prev) => ({ ...prev, location: event.target.value }))}
                    placeholder="Sök efter en plats"
                    className="h-12 border-b border-[#717b87] bg-transparent px-3 text-sm outline-none placeholder:text-[#929ba6]"
                  />

                  <MoreHorizontal className="mx-auto h-5 w-5 text-[#717b87]" />
                  <div className="relative flex h-12 items-center gap-3 px-3">
                    <select
                      value={draft.status ?? ""}
                      onChange={(event) => {
                        const next = event.target.value as TrackStatus | "";
                        if (!next) {
                          setDraft((prev) => ({ ...prev, status: undefined }));
                          return;
                        }
                        setDraft((prev) => ({ ...prev, status: next, label: STATUS_TO_LABEL[next] ?? prev.label }));
                      }}
                      className="h-9 rounded-lg border border-[#d4d8de] bg-white px-3 text-sm"
                    >
                      <option value="">Ingen orderstatus</option>
                      {CALENDAR_SETTABLE.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_DISPLAY[status]}
                        </option>
                      ))}
                    </select>
                    <select
                      value={draft.label}
                      onChange={(event) => setDraft((prev) => ({ ...prev, label: event.target.value as Label, status: undefined }))}
                      className="h-9 rounded-lg border border-[#d4d8de] bg-white px-3 text-sm"
                    >
                      {visibleLabels.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mx-auto text-xs text-[#717b87]">Beskrivning</div>
                  <textarea
                    value={draft.body}
                    onChange={(event) => setDraft((prev) => ({ ...prev, body: event.target.value }))}
                    placeholder="Lägg till en beskrivning"
                    className="min-h-[360px] resize-y rounded border border-[#d4d8de] px-3 py-2 text-sm outline-none placeholder:text-[#929ba6] sm:min-h-[80px]"
                  />
                </div>
              </section>

              <aside className="hidden min-h-0 rounded-md border border-[#d4d8de] bg-white sm:block">
                <div className="flex h-12 items-center gap-2 border-b border-[#d4d8de] px-3 font-semibold">
                  <button type="button" onClick={() => goToPreviewDay(-1)} className="hover:bg-[#f3f2f1] rounded p-1">
                    <ChevronLeft className="h-4 w-4 text-[#717b87]" />
                  </button>
                  <button type="button" onClick={() => setPreviewDateAndDraftDate(new Date())} className="hover:bg-[#f3f2f1] rounded p-1">
                    <CalendarDays className="h-4 w-4 text-[#717b87]" />
                  </button>
                  <button type="button" onClick={() => goToPreviewDay(1)} className="hover:bg-[#f3f2f1] rounded p-1">
                    <ChevronRight className="h-4 w-4 text-[#717b87]" />
                  </button>
                  <span>
                    {WEEKDAYS_LONG[previewDate.getDay()].slice(0, 3)}, {MONTHS[previewDate.getMonth()].slice(0, 3)}{" "}
                    {previewDate.getDate()}, {previewDate.getFullYear()}
                  </span>
                </div>
                <div
                  data-event-preview-container
                  className="relative h-[calc(100%-48px)] overflow-y-auto select-none"
                  style={{ cursor: dragHandle === "middle" ? "grabbing" : dragHandle ? "ns-resize" : "default" }}
                >
                  {Array.from({ length: PREVIEW_HOURS }, (_, index) => index + PREVIEW_START_HOUR).map((hour) => (
                    <div key={hour} className="grid h-[60px] grid-cols-[48px_1fr] border-b border-[#d4d8de]">
                      <div className="border-r border-[#d4d8de] px-2 pt-1 text-right text-sm text-[#717b87]">
                        {`${pad(hour)}:00`}
                      </div>
                      <div className="bg-white" />
                    </div>
                  ))}
                  <div
                    data-event-preview-block
                    className="absolute left-[58px] right-5 cursor-grab rounded-sm text-sm font-semibold"
                    style={{
                      top: `${new Date(draft.start).getHours() * 60 + new Date(draft.start).getMinutes()}px`,
                      height: `${Math.max(30, (new Date(draft.end).getTime() - new Date(draft.start).getTime()) / 60_000)}px`,
                      backgroundColor: previewPalette.bg,
                      color: previewPalette.text,
                      boxShadow: `inset 4px 0 0 ${previewPalette.accent}`,
                    }}
                    onMouseDown={(e) => startDrag("middle", e)}
                  >
                    <div
                      className="absolute left-0 right-0 top-0 h-2 cursor-ns-resize"
                      onMouseDown={(e) => startDrag("top", e)}
                      aria-label="Resize start"
                    />
                    <div className="relative px-2 py-1" style={{ paddingTop: "8px" }}>
                      {formatTime24(draft.start)} - {formatTime24(draft.end)}
                    </div>
                    <div
                      className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize rounded-b-sm"
                      onMouseDown={(e) => startDrag("bottom", e)}
                      aria-label="Resize end"
                    />
                  </div>
                </div>
              </aside>

            </div>
          </motion.div>
        </motion.div>
      ) : null}
      </AnimatePresence>

      <style jsx global>{`
        .outlook2 .fc {
          --fc-border-color: #d4d8de;
          --fc-today-bg-color: transparent;
          --fc-now-indicator-color: #717b87;
          height: 100%;
          font-family: "Segoe UI", Arial, sans-serif;
          color: #23272f;
        }
        .outlook2 .fc-theme-standard td,
        .outlook2 .fc-theme-standard th {
          border-color: #d4d8de;
        }
        .outlook2 .fc-scrollgrid {
          border: 0;
        }
        .outlook2 .fc-col-header-cell {
          background: #fff;
          font-weight: 400;
          height: 46px;
          vertical-align: top;
        }
        .outlook2 .fc-timegrid-axis,
        .outlook2 .fc-timegrid-slot-label {
          width: 52px;
          color: #717b87;
          font-size: 12px;
        }
        .outlook2 .fc-timegrid-slot {
          height: 39px;
          border-top: 1px solid #e1dfdd;
        }
        .outlook2 .fc-timegrid-slot-minor {
          border-top: 1px dotted #d9f3e3;
        }
        .outlook2 .fc-timegrid-event {
          border: 0 !important;
          border-radius: 4px;
          box-shadow: none;
          margin-inline-end: 2px;
          overflow: hidden;
        }
        .outlook2 .fc-event {
          border-radius: 4px;
          box-shadow: none;
          font-weight: 400;
          cursor: pointer;
        }
        .outlook2 .fc-timegrid-event:focus,
        .outlook2 .fc-timegrid-event:focus-within,
        .outlook2 .fc-timegrid-event:active {
          outline: 2px solid #23272f;
          outline-offset: -2px;
        }
        .outlook2 .fc-daygrid-day-frame {
          min-height: 138px;
        }
        .outlook2 .fc-daygrid-day-number {
          width: 100%;
          padding: 0;
          text-align: left;
        }
        .outlook2 .fc-daygrid-day.fc-day-today {
          background: transparent;
          outline: 1px solid #059669;
          outline-offset: -1px;
        }
        .outlook2 .fc-daygrid-event {
          margin: 2px 6px;
          border-radius: 3px;
        }
        .outlook2 .fc-highlight {
          background: rgba(0, 120, 212, 0.16);
        }
        .outlook2 .fc-timegrid-now-indicator-line {
          border-color: #929ba6;
        }
        [data-event-preview-container] [data-event-preview-block] {
          transition: ${dragHandle ? "none" : "box-shadow 0.15s ease"};
        }
        [data-event-preview-container] [data-event-preview-block]:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
      `}</style>
    </div>
  );
}
