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
  Paperclip,
  Pencil,
  Plus,
  Save,
  Trash2,
  UsersRound,
  Video,
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
  return `${first.getDate()} ${monthPart}–${end.getDate()} ${end.getFullYear()}`;
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
    return {
      ...event,
      id: event.id,
      backgroundColor: label.color,
      borderColor: label.color,
      textColor: label.value === "LUNCH" ? "#3b3a00" : "#ffffff",
      extendedProps: {
        ...(event.extendedProps ?? {}),
        realId: event.extendedProps?.realId ?? event.id,
        label: event.extendedProps?.label ?? label.value,
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
        visibility: (arg.event.extendedProps?.visibility as Visibility) ?? "PERSONAL",
        location: (arg.event.extendedProps?.location as string | null) ?? "",
      }),
    );
    setDialogOpen(true);
  }, []);

  const saveDraft = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setError(null);

    const payload = {
      title: draft.title.trim() || "(Inget ämne)",
      start: toIso(draft.start),
      end: toIso(draft.end),
      allDay: draft.allDay,
      label: draft.label,
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
              selectMirror
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
              eventContent={(arg) => (
                <div className="truncate px-1.5 py-0.5 text-[12px] leading-tight">
                  {arg.timeText ? <span className="font-semibold">{arg.timeText} </span> : null}
                  <span>{arg.event.title || "(Inget ämne)"}</span>
                </div>
              )}
            />
          </div>
        </main>
      </div>

      {dialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35">
          <div className="flex h-[min(790px,calc(100vh-40px))] w-[min(1120px,calc(100vw-32px))] flex-col overflow-hidden rounded-sm bg-[#f3f2f1] shadow-2xl">
            <div className="flex h-12 items-center border-b border-[#d4d8de] bg-[#d9f3e3] px-4">
              <span className="text-sm">Ny händelse – Calendar</span>
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
                    <span className="text-[#717b87]">–</span>
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

                  <Video className="mx-auto h-5 w-5 text-[#717b87]" />
                  <div className="flex h-12 items-center gap-3 px-3">
                    <span className="inline-flex h-5 w-10 items-center rounded-full border border-[#929ba6] bg-white p-0.5">
                      <span className="h-4 w-4 rounded-full bg-[#717b87]" />
                    </span>
                    <span className="text-sm">Skype-möte</span>
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
                    {new Date(draft.start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} –{" "}
                    {new Date(draft.end).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </div>
                </div>
              </aside>

              <section className="col-span-2 min-h-0 rounded-md border border-[#d4d8de] bg-white">
                <div className="grid h-full grid-cols-[52px_1fr]">
                  <div className="border-r border-[#d9f3e3] p-4">
                    <Paperclip className="h-5 w-5 text-[#717b87]" />
                  </div>
                  <div className="flex min-h-0 flex-col">
                    <textarea
                      value={draft.body}
                      onChange={(event) => setDraft((prev) => ({ ...prev, body: event.target.value }))}
                      className="min-h-0 flex-1 resize-none p-4 outline-none"
                    />
                    <div className="flex h-12 items-center gap-4 border-t border-[#d9f3e3] px-4 text-[#717b87]">
                      <Paperclip className="h-4 w-4" />
                      <MapPin className="h-4 w-4" />
                      <Pencil className="h-4 w-4" />
                      <select
                        value={draft.label}
                        onChange={(event) => setDraft((prev) => ({ ...prev, label: event.target.value as Label }))}
                        className="ml-auto h-8 rounded-sm border border-[#d4d8de] bg-white px-2 text-sm"
                      >
                        {LABELS.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </section>
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
          border-radius: 0;
          box-shadow: none;
        }
        .outlook2 .fc-event {
          border-radius: 2px;
          box-shadow: none;
          font-weight: 400;
          cursor: pointer;
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
