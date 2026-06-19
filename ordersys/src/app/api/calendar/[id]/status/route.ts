import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { TrackStatus, Track } from "@prisma/client";
import { getSessionAndRole, canAccessCalendarTrack } from "@/lib/calendar-access";
import {
  createOrderHistoryEvent,
  statusHistoryLabel,
  trackHistoryLabel,
} from "@/lib/order-history";

const ALLOWED: TrackStatus[] = ["PAGAENDE", "PALACK", "LEVERANS", "AVSLUTAD"];

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

  const syntheticMatch = id.match(/^pending-([^-]+)-([^-]+)$/);
  if (syntheticMatch) {
    orderId = syntheticMatch[1];
    eventTrack = syntheticMatch[2] as Track;
  } else {
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

  const previous = await prisma.orderTrack.findUnique({
    where: { orderId_track: { orderId, track: eventTrack } },
    select: { status: true },
  });
  const sessionUser = session.user as { id?: string | null; name?: string | null; email?: string | null };

  await prisma.$transaction(async (tx) => {
    await tx.orderTrack.update({
      where: { orderId_track: { orderId, track: eventTrack } },
      data: {
        status,
        calendarLabel: null,
      },
    });

    if (previous?.status !== status) {
      const trackLabel = trackHistoryLabel(eventTrack);
      await createOrderHistoryEvent({
        db: tx,
        orderId,
        type: "status",
        title: `${trackLabel} status ändrad`,
        description: `${sessionUser.name || sessionUser.email || "Okänd användare"} ändrade ${trackLabel} från ${previous?.status ? statusHistoryLabel(previous.status) : "Ingen status"} till ${statusHistoryLabel(status)}.`,
        actor: sessionUser,
        metadata: {
          track: eventTrack,
          previousStatus: previous?.status ?? null,
          status,
        },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
