import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CalendarLabel, Track } from "@prisma/client";
import { getSessionAndRole, canAccessCalendarTrack } from "@/lib/calendar-access";

type ParamsPromise = Promise<{ id: string }>;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALLOWED_LABELS = [
  "BOKAD_TID",
  "KAN_FLYTTAS",
  "LUNCH",
  "SEMESTER",
  "TRAFIKVERKET",
  "UNDER_VECKAN",
  "UTFORT_ARBETE",
] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: ParamsPromise }
) {
  const { id } = await params;
  const { label, track } = (await req.json()) as {
    label: CalendarLabel | null;
    track: Track;
  };

  const { session, role } = await getSessionAndRole();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (track !== "A" && track !== "B" && track !== "C" && track !== "D") {
    return NextResponse.json({ error: "Invalid track" }, { status: 400 });
  }

  let orderId: string;
  let eventTrack: Track;

  // Check if it's a synthetic event id
  const syntheticMatch = id.match(/^pending-([^-]+)-([^-]+)$/);
  if (syntheticMatch) {
    orderId = syntheticMatch[1];
    eventTrack = syntheticMatch[2] as Track;
  } else {
    // Real calendar event
    const evt = await prisma.calendarEvent.findUnique({
      where: { id },
      select: { orderId: true, track: true },
    });

    if (!evt) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    orderId = evt.orderId;
    eventTrack = evt.track;
  }

  if (!canAccessCalendarTrack(role, eventTrack)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (eventTrack !== track) {
    return NextResponse.json({ error: "Track mismatch for this event" }, { status: 400 });
  }

  if (label !== null && !ALLOWED_LABELS.includes(label)) {
    return NextResponse.json({ error: "Invalid label" }, { status: 400 });
  }

  await prisma.orderTrack.update({
    where: { orderId_track: { orderId, track: eventTrack } },
    data: { calendarLabel: label },
  });

  return NextResponse.json({ ok: true });
}
