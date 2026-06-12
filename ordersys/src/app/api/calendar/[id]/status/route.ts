import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { TrackStatus, Track } from "@prisma/client";
import { getSessionAndRole, canAccessCalendarTrack } from "@/lib/calendar-access";

const ALLOWED: TrackStatus[] = ["PAGAENDE", "PALACK", "LEVERANS", "AVSLUTAD"]; // Calendar-compatible

type ParamsPromise = Promise<{ id: string }>;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(req: NextRequest, ctx: { params: ParamsPromise }) {
  const { id } = await ctx.params;
  const { status, track } = (await req.json()) as { status: TrackStatus; track: Track };

  const { session, role } = await getSessionAndRole();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!ALLOWED.includes(status)) {
    return NextResponse.json(
      { error: "Only PAGAENDE/PALACK/LEVERANS/AVSLUTAD can be set from calendar" },
      { status: 400 }
    );
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

    if (!evt) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    orderId = evt.orderId;
    eventTrack = evt.track;
  }

  if (!canAccessCalendarTrack(role, eventTrack)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (track && track !== eventTrack) {
    return NextResponse.json({ error: "Track mismatch for this event" }, { status: 400 });
  }

  // Byt status och rensa kalenderetikett på OrderTrack
  await prisma.orderTrack.update({
  where: { orderId_track: { orderId, track: eventTrack } },
  data: {
    status,
    calendarLabel: null,   // ⬅️ rensa etiketten i DB
  },
});


  return NextResponse.json({ ok: true });
}
