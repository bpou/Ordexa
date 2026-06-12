import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EventVisibility } from "@prisma/client";
import { APP_TRACKS, type AppTrack, normalizeTrack } from "@/lib/tracks";
import {
  isOutlookSchemaMissingError,
  upsertPersonalEventToOutlook,
} from "@/lib/outlook";

/* =========================
   Local types (match your UI)
========================= */
type Track = AppTrack;
type Label =
  | "BOKAD_TID"
  | "KAN_FLYTTAS"
  | "LUNCH"
  | "SEMESTER"
  | "TRAFIKVERKET"
  | "UNDER_VECKAN"
  | "UTFORT_ARBETE";
type Visibility = EventVisibility;

/* =========================
   Validation schema
========================= */
const TRACK_VALUES = [...APP_TRACKS] as [AppTrack, ...AppTrack[]];

const BodySchema = z.object({
  track: z.enum(TRACK_VALUES),
  title: z.string().min(1),
  label: z
    .enum([
      "BOKAD_TID",
      "KAN_FLYTTAS",
      "LUNCH",
      "SEMESTER",
      "TRAFIKVERKET",
      "UNDER_VECKAN",
      "UTFORT_ARBETE",
    ])
    .nullable()
    .optional(),
  allDay: z.boolean().optional().default(false),
  visibility: z.enum(["PUBLIC", "PERSONAL"]),

  // repeat mode
  repeat: z.enum(["none", "daily", "weekly"]).optional().default("none"),

  // one-off
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),

  // recurrence inputs
  startRecur: z.string().datetime().optional(),
  endRecur: z.string().datetime().nullable().optional(), // allow null
  startTime: z.string().optional(), // "HH:MM:SS"
  endTime: z.string().optional(),   // "HH:MM:SS"

  // weekly days as strings "0".."6" (0=Sun)
  weeklyDays: z.array(z.enum(["0", "1", "2", "3", "4", "5", "6"])).optional(),
});

/* =========================
   Helpers
========================= */
function safeDate(s?: string) {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

function combineDateAndTime(day: Date, time: string) {
  // time: "HH:MM:SS"
  const [hh, mm, ss] = time.split(":").map((v) => parseInt(v, 10) || 0);
  const d = new Date(day);
  d.setHours(hh, mm, ss, 0);
  return d;
}

function* iterateDays(from: Date, toExclusive: Date) {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0); // normalize to midnight
  while (d < toExclusive) {
    yield new Date(d);
    d.setDate(d.getDate() + 1);
  }
}

/* =========================
   GET: list free events
========================= */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;

    const { searchParams } = new URL(req.url);
    const trackParam = searchParams.get("track");

    const normalizedParam = normalizeTrack(trackParam ?? undefined);
    const track: Track | undefined = normalizedParam ?? undefined;

    const rows = await prisma.personalCalendarEvent.findMany({
      where: {
        ...(track ? { track } : {}),
        OR: [
          { visibility: EventVisibility.PUBLIC },
          ...(userId
            ? [{ visibility: EventVisibility.PERSONAL, ownerUserId: userId }]
            : []),
        ],
        // If you support soft-deletes, add: deletedAt: null
      },
      orderBy: { start: "asc" },
    });

    const events = rows.map((r) => {
      const visibility = (r.visibility as Visibility) ?? "PUBLIC";
      return {
        id: r.id,
        title: r.title,
        start: r.start?.toISOString?.(),
        end: r.end?.toISOString?.(),
        allDay: !!r.allDay,
        visibility,
        extendedProps: {
          label: (r.label as Label | null) ?? null,
          visibility,
          kind: "free",
          realId: r.id,
          synthetic: false,
          location: null,
          ownerUserId: r.ownerUserId ?? null,
        },
      };
    });
    return NextResponse.json({ events });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { events: [], error: err?.message ?? "failed" },
      { status: 500 }
    );
  }
}

/* =========================
   POST: create free events (one-off or expanded recurrence)
========================= */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const json = await req.json().catch(() => ({}));
    const body = BodySchema.parse(json);

    const visibility: Visibility =
      body.visibility === "PERSONAL"
        ? EventVisibility.PERSONAL
        : EventVisibility.PUBLIC;
    const repeat = body.repeat ?? "none";
    const ownerUserId = visibility === "PERSONAL" ? userId : null;

    /* ----- ONE-OFF ----- */
    if (repeat === "none") {
      // Provide sane defaults to avoid "Invalid Date"
      let start = safeDate(body.start);
      let end = safeDate(body.end);

      if (!start) start = new Date();
      if (!end) end = new Date(start.getTime() + 60 * 60 * 1000);
      if (end <= start) end = new Date(start.getTime() + 15 * 60 * 1000);

      const created = await prisma.personalCalendarEvent.create({
        data: {
          title: body.title,
          start,
          end,
          allDay: !!body.allDay,
          label: body.label ?? null,
          track: body.track,
          visibility,
          ownerUserId,
        },
      });

      try {
        await upsertPersonalEventToOutlook(created.id);
      } catch (error) {
        if (!isOutlookSchemaMissingError(error)) {
          console.error("Outlook push for created personal event failed:", error);
        }
      }

      return NextResponse.json({ ok: true, created });
    }

    /* ----- RECURRENCE (DAILY/WEEKLY) ----- */
    if (!body.startTime || !body.endTime) {
      return NextResponse.json(
        { error: "Missing startTime/endTime for recurring event" },
        { status: 400 }
      );
    }

    // Expansion horizon (8 weeks forward)
    const horizonWeeks = 8;
    const horizonEnd = new Date();
    horizonEnd.setDate(horizonEnd.getDate() + horizonWeeks * 7);

    const baseStart: Date = safeDate(body.startRecur) ?? new Date();

    // endRecur can be string | null | undefined in schema – coerce to string | undefined for safeDate
    const endRecurStr: string | undefined = body.endRecur ?? undefined;
    const rangeEnd: Date = safeDate(endRecurStr) ?? horizonEnd;

    const allowedWeekdays =
      repeat === "daily"
        ? new Set(["0", "1", "2", "3", "4", "5", "6"])
        : new Set(
            body.weeklyDays && body.weeklyDays.length ? body.weeklyDays : ["1"] // Monday default
          );

    const toCreate: {
      title: string;
      start: Date;
      end: Date;
      allDay: boolean;
      label: Label | null;
      track: Track;
      visibility: Visibility;
      ownerUserId: string | null;
    }[] = [];

    for (const day of iterateDays(baseStart, rangeEnd)) {
      const weekday = String(day.getDay()) as
        | "0"
        | "1"
        | "2"
        | "3"
        | "4"
        | "5"
        | "6";
      if (!allowedWeekdays.has(weekday)) continue;

      const start = combineDateAndTime(day, body.startTime);
      const end = combineDateAndTime(day, body.endTime);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;
      if (end <= start) continue;

      toCreate.push({
        title: body.title,
        start,
        end,
        allDay: !!body.allDay,
        label: body.label ?? null,
        track: body.track,
        visibility,
        ownerUserId,
      });
    }

    if (!toCreate.length) {
      return NextResponse.json(
        { error: "No occurrences generated for the selected period" },
        { status: 400 }
      );
    }

    const createdRows = await prisma.$transaction(
      toCreate.map((e) =>
        prisma.personalCalendarEvent.create({
          data: {
            title: e.title,
            start: e.start,
            end: e.end,
            allDay: e.allDay,
            label: e.label,
            track: e.track,
            visibility: e.visibility,
            ownerUserId: e.ownerUserId,
          },
        })
      )
    );

    for (const created of createdRows) {
      try {
        await upsertPersonalEventToOutlook(created.id);
      } catch (error) {
        if (!isOutlookSchemaMissingError(error)) {
          console.error("Outlook push for recurring personal event failed:", error);
        }
      }
    }

    return NextResponse.json({ ok: true, createdCount: createdRows.length });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
