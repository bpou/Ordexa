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
  MapPin,
  MoreHorizontal,
  Plus,
  Save,
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
};

type CalendarResponse = { events?: EventInput[] };

const LABELS: { value: Label; label: string; color: string }[] = [
  { value: "BOKAD_TID", label: "Calendar", color: "#059669" },
  { value: "KAN_FLYTTAS", label: "Verkstad", color: "#107c10" },
  { value: "LUNCH", label: "Birthdays", color: "#fce100" },
  { value: "SEMESTER", label: "Ateljé", color: "#ca5010" },
  { value: "TRAFIKVERKET", label: "Bilmontage", color: "#8764b8" },
  { value: "UNDER_VECKAN", label: "Montage", color: "#00b7c3" },
  { value: "UTFORT_ARBETE", label: "Utfört arbete", color: "#69797e" },
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
  };
}

export default function OutlookCalendarClient() {
  const calendarRef = useRef<FullCalendar | null>(null);
  const [events, setEvents] = useState<EventInput[]>([]);
  const [view, setView] = useState<CalendarView>("timeGridWorkWeek");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => makeDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventMenu, setEventMenu] = useState<{
    eventId: string;
    persistId: string;
    x: number;
    y: number;
    track?: "A" | "B" | "C" | "D";
  } | null>(null);

  const api = useCallback((): CalendarApi | null => calendarRef.current?.getApi() ?? null, []);

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

  const changeView = useCallback(
    (nextView: CalendarView) => {
      setView(nextView);
      const calendar = api();
      calendar?.changeView(nextView);
      if (calendar) setAnchorDate(calendar.getDate());
    },
    [api],
  );

  const goToday = useCallback(() => {
    const calendar = api();
    calendar?.today();
    setAnchorDate(calendar?.getDate() ?? new Date());
  }, [api]);

  const goPrev = useCallback(() => {
    const calendar = api();
    calendar?.prev();
    setAnchorDate(calendar?.getDate() ?? addDays(anchorDate, -7));
  }, [api, anchorDate]);

  const goNext = useCallback(() => {
    const calendar = api();
    calendar?.next();
    setAnchorDate(calendar?.getDate() ?? addDays(anchorDate, 7));
  }, [api, anchorDate]);

  const goDate = useCallback(
    (date: Date) => {
      const calendar = api();
      calendar?.gotoDate(date);
      setAnchorDate(date);
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
      }),
    );
    setDialogOpen(true);
  }, []);

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
      }),
    );
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

    const payload = {
      title: draft.title.trim() || "(Inget ämne)",
      start: toIso(draft.start),
      end: toIso(draft.end),
      allDay: draft.allDay,
      label: draft.status ? STATUS_TO_LABEL[draft.status] ?? draft.label : draft.label,
      visibility: draft.visibility,
      track: "A",
      repeat: "none",
    };

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
  }, [draft, load, saving]);

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

  return (
    <div className="outlook2 h-[calc(100dvh-128px)] min-h-[680px] overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-sm">
      <div className="flex h-full">
        <aside className="w-[260px] shrink-0 border-r border-border bg-brand-50/60">
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

            <button className="mt-5 flex items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-800">
              <CalendarDays className="h-4 w-4" />
              Lägg till kalender
            </button>

            <div className="mt-6 border-t border-brand-100 pt-3">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-900">
                <ChevronDown className="h-4 w-4" />
                Mina kalendrar
              </div>
              <div className="space-y-3">
                {LABELS.slice(0, 6).map((item, index) => (
                  <label key={item.value} className="flex items-center gap-3 text-sm">
                    <span
                      className="flex h-4 w-4 items-center justify-center rounded-full border"
                      style={{
                        borderColor: item.color,
                        backgroundColor: index === 0 ? item.color : "transparent",
                        color: "white",
                      }}
                    >
                      {index === 0 ? <Check className="h-3 w-3" /> : null}
                    </span>
                    {item.label}
                  </label>
                ))}
              </div>
              <button className="ml-7 mt-4 text-sm font-medium text-brand-700 hover:text-brand-800">Visa alla</button>
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-900">
                <ChevronDown className="h-4 w-4" />
                Grupper
              </div>
              <label className="flex items-center gap-3 text-sm">
                <span className="h-4 w-4 rounded-full border border-[#929ba6]" />
                Din familj
              </label>
              <button className="ml-7 mt-4 text-sm font-medium text-brand-700 hover:text-brand-800">Visa valda</button>
            </div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col bg-white">
          <div className="flex h-12 items-center gap-2 border-b border-border bg-card px-3 shadow-sm">
            <button
              type="button"
              onClick={() => openNew()}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <CalendarDays className="h-4 w-4" />
              Ny händelse
              <ChevronDown className="h-3 w-3" />
            </button>
            <div className="h-6 w-px bg-border" />
            {VIEW_BUTTONS.map((item) => (
              <button
                key={item.view}
                type="button"
                onClick={() => changeView(item.view)}
                className={`inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-sm ${
                  view === item.view
                    ? "border-brand-300 bg-brand-100 text-brand-900"
                    : "border-transparent bg-transparent text-foreground hover:bg-brand-50"
                }`}
              >
                <CalendarDays className="h-3.5 w-3.5 text-brand-700" />
                {item.label}
              </button>
            ))}
            <button className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-sm text-muted-foreground">
              <Copy className="h-3.5 w-3.5" />
              Delad vy
            </button>
            <div className="h-6 w-px bg-border" />
            <button className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-sm hover:bg-brand-50">
              <Filter className="h-4 w-4" />
              Filtrera
              <ChevronDown className="h-3 w-3" />
            </button>
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

          <div className="min-h-0 flex-1">
                <FullCalendar
                  ref={calendarRef}
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
              slotLabelFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
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
              events={events}
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
                  {arg.view.type === "dayGridMonth" && arg.timeText ? <span className="font-semibold">{arg.timeText} </span> : null}
                  <span>{arg.event.title || "(Inget ämne)"}</span>
                </div>
              )}
            />
          </div>
        </main>
      </div>

      {eventMenu ? (
        <div
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
          {LABELS.map((label) => (
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
        </div>
      ) : null}

      {dialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35">
          <div className="flex h-[min(790px,calc(100vh-40px))] w-[min(1120px,calc(100vw-32px))] flex-col overflow-hidden rounded-sm bg-[#f3f2f1] shadow-2xl">
            <div className="flex h-12 items-center border-b border-[#d4d8de] bg-[#d9f3e3] px-4">
              <span className="text-sm">Ny händelse - Calendar</span>
              <button className="ml-auto mr-4 text-[#23272f]" aria-label="Öppna i nytt fönster">
                <AppWindow className="h-4 w-4" />
              </button>
              <button onClick={() => setDialogOpen(false)} aria-label="Stäng">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mx-4 mt-2 flex h-10 items-center gap-2 rounded-md border border-[#d4d8de] bg-white px-2 shadow-sm">
              <button
                type="button"
                onClick={() => void saveDraft()}
                disabled={saving}
                className="inline-flex h-8 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                Spara
              </button>
              <button className="inline-flex h-8 items-center gap-2 rounded-sm border border-[#929ba6] bg-[#d9f3e3] px-3 text-sm">
                <CalendarDays className="h-4 w-4" />
                Händelse
              </button>
              <button className="inline-flex h-8 items-center gap-2 rounded-sm px-2 text-sm hover:bg-[#d9f3e3]">
                <ChevronRight className="h-4 w-4" />
                Serie
              </button>
              <button className="inline-flex h-8 items-center gap-2 rounded-sm px-2 text-sm hover:bg-[#d9f3e3]">
                <MoreHorizontal className="h-4 w-4" />
                Upptagen
                <ChevronDown className="h-3 w-3" />
              </button>
              {draft.id ? (
                <button
                  type="button"
                  onClick={() => void deleteDraft()}
                  disabled={saving}
                  className="ml-auto inline-flex h-8 items-center gap-2 rounded-sm px-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  Ta bort
                </button>
              ) : null}
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-[1fr_352px] gap-4 p-4">
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
                  <div className="flex h-12 items-center gap-2 border-b border-[#717b87] px-3">
                    <input
                      type="datetime-local"
                      value={draft.start}
                      onChange={(event) => setDraft((prev) => ({ ...prev, start: event.target.value }))}
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                    />
                    <span className="text-[#717b87]">-</span>
                    <input
                      type="datetime-local"
                      value={draft.end}
                      onChange={(event) => setDraft((prev) => ({ ...prev, end: event.target.value }))}
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                    />
                  </div>

                  <MapPin className="mx-auto h-5 w-5 text-[#717b87]" />
                  <input
                    value={draft.location}
                    onChange={(event) => setDraft((prev) => ({ ...prev, location: event.target.value }))}
                    placeholder="Sök efter en plats"
                    className="h-12 border-b border-[#717b87] bg-transparent px-3 text-sm outline-none placeholder:text-[#929ba6]"
                  />

                  <MoreHorizontal className="mx-auto h-5 w-5 text-[#717b87]" />
                  <div className="flex h-12 items-center gap-3 px-3">
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
                      {LABELS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <aside className="min-h-0 rounded-md border border-[#d4d8de] bg-white">
                <div className="flex h-12 items-center gap-2 border-b border-[#d4d8de] px-3 font-semibold">
                  <ChevronLeft className="h-4 w-4 text-[#717b87]" />
                  <CalendarDays className="h-4 w-4 text-[#717b87]" />
                  <ChevronRight className="h-4 w-4 text-[#717b87]" />
                  <span>
                    {WEEKDAYS_LONG[new Date(draft.start).getDay()].slice(0, 3)}, {MONTHS[new Date(draft.start).getMonth()].slice(0, 3)}{" "}
                    {new Date(draft.start).getDate()}, {new Date(draft.start).getFullYear()}
                  </span>
                  <ChevronDown className="h-3 w-3" />
                </div>
                <div className="relative h-[calc(100%-48px)] overflow-hidden">
                  {Array.from({ length: 17 }, (_, index) => index + 7).map((hour) => (
                    <div key={hour} className="grid h-[60px] grid-cols-[48px_1fr] border-b border-[#d4d8de]">
                      <div className="border-r border-[#d4d8de] px-2 pt-1 text-right text-sm text-[#717b87]">
                        {hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                      </div>
                      <div className="bg-white" />
                    </div>
                  ))}
                  <div
                    className="absolute left-[58px] right-5 rounded-sm bg-[#4cc773] px-2 py-1 text-sm font-semibold text-black"
                    style={{
                      top: `${Math.max(0, (new Date(draft.start).getHours() - 7) * 60 + new Date(draft.start).getMinutes())}px`,
                      height: `${Math.max(30, (new Date(draft.end).getTime() - new Date(draft.start).getTime()) / 60_000)}px`,
                    }}
                  >
                    {new Date(draft.start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} -{" "}
                    {new Date(draft.end).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </div>
                </div>
              </aside>

            </div>
          </div>
        </div>
      ) : null}

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
      `}</style>
    </div>
  );
}
