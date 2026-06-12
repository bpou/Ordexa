"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import svLocale from "@fullcalendar/core/locales/sv";
import type { CalendarApi, EventApi, EventContentArg, EventInput } from "@fullcalendar/core";
import { CalendarRange, ChevronLeft, ChevronRight, MapPin } from "lucide-react";

import CalendarSkin from "@/components/calendar/CalendarSkin";
import { APP_TRACKS, TRACK_NAMES, type AppTrack } from "@/lib/tracks";

type PreviewView = "timeGridWorkWeek" | "timeGridDay" | "timeGridWeek" | "dayGridMonth";
type DummyStatus = "PAGAENDE" | "LEVERANS" | "PALACK";
type DummyLabel = "BOKAD_TID" | "KAN_FLYTTAS" | "UNDER_VECKAN";

type Palette = {
  bgHex: string;
  borderHex: string;
  textHex: string;
};

type CalendarRefInstance = {
  getApi: () => CalendarApi;
} | null;

type PreviewEvent = EventInput & {
  extendedProps: {
    orderId: string;
    orderTitle: string;
    location: string;
    sellerInitials: string;
    status: DummyStatus;
    label: DummyLabel;
  };
};

const VIEW_OPTIONS: { key: PreviewView; label: string }[] = [
  { key: "timeGridDay", label: "Dag" },
  { key: "timeGridWorkWeek", label: "Arbetsvecka" },
  { key: "timeGridWeek", label: "Vecka" },
  { key: "dayGridMonth", label: "Månad" },
];

const STATUS_PALETTE: Record<DummyStatus, Palette> = {
  PAGAENDE: { bgHex: "#dcfce7", borderHex: "#86efac", textHex: "#111827" },
  LEVERANS: { bgHex: "#d1fae5", borderHex: "#6ee7b7", textHex: "#111827" },
  PALACK: { bgHex: "#fef3c7", borderHex: "#fcd34d", textHex: "#111827" },
};

const LABEL_TEXT: Record<DummyLabel, string> = {
  BOKAD_TID: "Bokad tid",
  KAN_FLYTTAS: "Kan flyttas",
  UNDER_VECKAN: "Under veckan",
};

const TRACK_EVENT_MAP: Record<AppTrack, PreviewEvent[]> = {
  A: [
    {
      id: "A-46210",
      title: "Northside Retail",
      start: "2026-04-14T08:00:00",
      end: "2026-04-14T10:30:00",
      extendedProps: {
        orderId: "46210",
        orderTitle: "Original och korrektur",
        location: "Kungsholmen",
        sellerInitials: "ML",
        status: "PAGAENDE",
        label: "BOKAD_TID",
      },
    },
    {
      id: "A-46244",
      title: "City Decor",
      start: "2026-04-16T13:00:00",
      end: "2026-04-16T16:00:00",
      extendedProps: {
        orderId: "46244",
        orderTitle: "Tryck och färdig originalfil",
        location: "Sundbyberg",
        sellerInitials: "EH",
        status: "LEVERANS",
        label: "UNDER_VECKAN",
      },
    },
  ],
  B: [
    {
      id: "B-46218",
      title: "Northside Retail",
      start: "2026-04-14T07:30:00",
      end: "2026-04-14T11:30:00",
      extendedProps: {
        orderId: "46218",
        orderTitle: "Fasadskylt och montage",
        location: "Bromma",
        sellerInitials: "ML",
        status: "PAGAENDE",
        label: "BOKAD_TID",
      },
    },
    {
      id: "B-46252",
      title: "Atria Build",
      start: "2026-04-16T13:00:00",
      end: "2026-04-16T16:30:00",
      extendedProps: {
        orderId: "46252",
        orderTitle: "Verkstadsförberedelse",
        location: "Järfälla",
        sellerInitials: "NS",
        status: "PALACK",
        label: "KAN_FLYTTAS",
      },
    },
  ],
  C: [
    {
      id: "C-46263",
      title: "Stockholm Expo",
      start: "2026-04-17T08:00:00",
      end: "2026-04-17T10:30:00",
      extendedProps: {
        orderId: "46263",
        orderTitle: "Monterleverans",
        location: "Älvsjö",
        sellerInitials: "EH",
        status: "LEVERANS",
        label: "BOKAD_TID",
      },
    },
    {
      id: "C-46270",
      title: "Freja Signs",
      start: "2026-04-15T12:30:00",
      end: "2026-04-15T16:00:00",
      extendedProps: {
        orderId: "46270",
        orderTitle: "Montage på plats",
        location: "Solna",
        sellerInitials: "AK",
        status: "PAGAENDE",
        label: "UNDER_VECKAN",
      },
    },
  ],
  D: [
    {
      id: "D-46281",
      title: "Berg & Co",
      start: "2026-04-15T09:30:00",
      end: "2026-04-15T12:30:00",
      extendedProps: {
        orderId: "46281",
        orderTitle: "Bildekor och applicering",
        location: "Täby",
        sellerInitials: "NS",
        status: "PAGAENDE",
        label: "KAN_FLYTTAS",
      },
    },
    {
      id: "D-46284",
      title: "Harbor Office",
      start: "2026-04-17T11:00:00",
      end: "2026-04-17T14:30:00",
      extendedProps: {
        orderId: "46284",
        orderTitle: "Fordonsprofil till leveransbil",
        location: "Nacka",
        sellerInitials: "ML",
        status: "LEVERANS",
        label: "BOKAD_TID",
      },
    },
  ],
};

function applyPalette(el: HTMLElement, palette: Palette) {
  el.style.backgroundColor = palette.bgHex;
  el.style.borderColor = palette.borderHex;
  el.style.color = palette.textHex;
  el.style.setProperty("--ordina-accent", palette.borderHex);
  el.style.setProperty("--ordina-accent-width", "12px");
  el.style.setProperty("--ordina-divider", palette.borderHex);
}

function TrackCalendar({
  track,
  view,
  onMount,
  onDatesSet,
}: {
  track: AppTrack;
  view: PreviewView;
  onMount: (track: AppTrack, instance: CalendarRefInstance) => void;
  onDatesSet: (title: string, viewType: PreviewView) => void;
}) {
  const events = useMemo(() => TRACK_EVENT_MAP[track], [track]);

  const renderEventContent = (arg: EventContentArg) => {
    const xp = arg.event.extendedProps as PreviewEvent["extendedProps"];

    return (
      <div className="ordina-calendar-event-inner flex h-full flex-col gap-2 rounded-xl px-3 py-2 text-[11px] leading-tight text-neutral-900">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold uppercase tracking-tight">{xp.orderId}</div>
            <div className="text-[11px] font-medium leading-tight break-words">{xp.orderTitle}</div>
          </div>
          <span className="text-[11px] font-semibold opacity-80">/{xp.sellerInitials}</span>
        </div>

        <div className="flex items-start gap-1 text-[10px] opacity-90">
          <MapPin className="mt-[2px] h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden />
          <span className="min-w-0 flex-1 break-words">{xp.location}</span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 text-[10px]">
          <span className="font-semibold tracking-tight">{arg.timeText}</span>
          <span className="rounded-full bg-white/50 px-2 py-0.5 font-semibold">{LABEL_TEXT[xp.label]}</span>
        </div>
      </div>
    );
  };

  const eventDidMount = (arg: { el: HTMLElement; event: EventApi }) => {
    const status = arg.event.extendedProps?.status as DummyStatus | undefined;
    const palette = status ? STATUS_PALETTE[status] : STATUS_PALETTE.PAGAENDE;
    applyPalette(arg.el, palette);
    arg.el.style.padding = "0";
    arg.el.style.display = "flex";
    arg.el.style.flexDirection = "column";
  };

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="min-w-0 rounded-[24px] border border-brand-100 bg-white p-3 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <h3 className="text-sm font-semibold text-neutral-900">
          Spår {track}: {TRACK_NAMES[track]}
        </h3>
        <span className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700">
          {events.length} händelser
        </span>
      </div>

      <CalendarSkin>
        <div className="calendar-zoom-out relative h-[0px] min-h-[620px]">
          <FullCalendar
            ref={(instance) => onMount(track, instance)}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            locales={[svLocale]}
            locale="sv"
            initialDate="2026-04-14"
            initialView={view}
            headerToolbar={false}
            allDaySlot={false}
            views={{
              timeGridWorkWeek: { type: "timeGridWeek", weekends: false },
              timeGridWeek: { type: "timeGridWeek", weekends: true },
            }}
            titleFormat={{ month: "long", year: "numeric" }}
            dayHeaderContent={(args) => {
              const date = args.date;
              const weekday = date.toLocaleDateString("sv-SE", { weekday: "short" });
              return (
                <div className="flex w-full flex-col items-start gap-0.5 py-1 pl-2 text-left">
                  <span className="text-2xl font-semibold">{date.getDate()}</span>
                  <span className="text-xs uppercase tracking-wide text-neutral-500">{weekday}</span>
                </div>
              );
            }}
            slotDuration="01:00:00"
            snapDuration="00:30:00"
            slotLabelFormat={{ hour: "numeric", hour12: false }}
            eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
            scrollTime="06:00:00"
            scrollTimeReset={false}
            slotMinTime="06:00:00"
            slotMaxTime="18:00:00"
            stickyHeaderDates
            selectable={false}
            selectMirror={false}
            editable={false}
            nowIndicator
            expandRows
            events={events}
            height="100%"
            contentHeight="100%"
            datesSet={(arg) => onDatesSet(arg.view.title, arg.view.type as PreviewView)}
            eventContent={renderEventContent}
            eventClassNames={() => [
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
            ]}
            eventDidMount={eventDidMount}
          />
        </div>
      </CalendarSkin>
    </motion.section>
  );
}

export default function LandingCalendarPreview({
  className = "",
}: {
  className?: string;
}) {
  const calendarRefs = useRef<Record<AppTrack, CalendarApi | null>>({
    A: null,
    B: null,
    C: null,
    D: null,
  });
  const [selectedTrack, setSelectedTrack] = useState<AppTrack>("B");
  const [currentView, setCurrentView] = useState<PreviewView>("timeGridWorkWeek");
  const [toolbarTitle, setToolbarTitle] = useState("april 2026");

  const visibleTracks = useMemo(() => [selectedTrack], [selectedTrack]);

  const syncCalendars = (action: (api: CalendarApi) => void) => {
    visibleTracks.forEach((track) => {
      const api = calendarRefs.current[track];
      if (api) action(api);
    });
  };

  const handleMount = (track: AppTrack, instance: CalendarRefInstance) => {
    calendarRefs.current[track] = instance?.getApi() ?? null;
  };

  const handleToday = () => syncCalendars((api) => api.today());
  const handlePrev = () => syncCalendars((api) => api.prev());
  const handleNext = () => syncCalendars((api) => api.next());

  const handleViewChange = (view: PreviewView) => {
    setCurrentView(view);
    syncCalendars((api) => api.changeView(view));
  };

  return (
    <motion.div
      layout
      transition={{ layout: { duration: 0.35, ease: "easeInOut" } }}
      className={`landing-calendar-preview w-full rounded-[24px] border border-brand-100 bg-white p-4 sm:p-5 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-neutral-800">{toolbarTitle}</span>
          <span className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs text-neutral-600">
            Spår {selectedTrack}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs text-neutral-600">
          <CalendarRange className="h-4 w-4 text-brand-600" />
          Riktig kalendervy med dummydata
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
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
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-sm font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-100"
          aria-label="Nästa period"
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
                  active ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {APP_TRACKS.map((track) => {
          const active = selectedTrack === track;
          return (
            <button
              key={track}
              type="button"
              onClick={() => setSelectedTrack(track)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-1 ${
                active
                  ? "border-neutral-900 bg-neutral-900 text-white shadow-[0_6px_16px_-8px_rgba(23,23,23,0.7)]"
                  : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400 hover:bg-neutral-100"
              }`}
              aria-pressed={active}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  active ? "bg-white/85" : "bg-neutral-300"
                }`}
                aria-hidden="true"
              />
              <span>{track}</span>
              <span className="hidden sm:inline">{TRACK_NAMES[track]}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 overflow-x-auto pb-2">
        <motion.div
          layout
          transition={{ layout: { duration: 0.35, ease: "easeInOut" } }}
          className="w-full min-w-full"
        >
          <motion.div
            layout
            transition={{ layout: { duration: 0.35, ease: "easeInOut" } }}
            className="grid grid-cols-1 gap-4"
          >
            {visibleTracks.map((track) => (
              <TrackCalendar
                key={track}
                track={track}
                view={currentView}
                onMount={handleMount}
                onDatesSet={(title, viewType) => {
                  setToolbarTitle(title);
                  setCurrentView(viewType);
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      </div>

      <style jsx global>{`
        .landing-calendar-preview .ordina-calendar-event,
        .landing-calendar-preview .ordina-calendar-event .fc-event-main,
        .landing-calendar-preview .ordina-calendar-event .fc-event-title,
        .landing-calendar-preview .ordina-calendar-event .fc-event-time,
        .landing-calendar-preview .ordina-calendar-event .ordina-calendar-event-inner,
        .landing-calendar-preview .ordina-calendar-event .ordina-calendar-event-inner * {
          color: #111827 !important;
        }
      `}</style>
    </motion.div>
  );
}
