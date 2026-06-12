import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionAndRole, canAccessCalendarTrack } from "@/lib/calendar-access";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

type PatchBody = {
  start?: string;
  end?: string;
};

const invalidPayload = NextResponse.json(
  { error: "Start and end must be provided" },
  { status: 400 }
);

function parseIsoDate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;

  let body: PatchBody | null = null;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return invalidPayload;
  }

  if (!body?.start || !body?.end) {
    return invalidPayload;
  }

  const start = parseIsoDate(body.start);
  const end = parseIsoDate(body.end);

  if (!start || !end) {
    return NextResponse.json(
      { error: "Invalid date format (expected ISO-8601)" },
      { status: 400 }
    );
  }
  if (end <= start) {
    return NextResponse.json(
      { error: "Invalid interval: end must be after start" },
      { status: 400 }
    );
  }

  const { session, role } = await getSessionAndRole();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.calendarEvent.findUnique({
    where: { id },
    select: { orderId: true, track: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (!canAccessCalendarTrack(role, existing.track)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const event = await tx.calendarEvent.update({
      where: { id },
      data: { start, end },
      select: {
        id: true,
        orderId: true,
        track: true,
        title: true,
        notes: true,
        start: true,
        end: true,
      },
    });

    if (event.orderId) {
      await tx.orderTrack.upsert({
        where: {
          orderId_track: {
            orderId: event.orderId,
            track: event.track,
          },
        },
        update: {
          plannedStartAt: start,
          plannedEndAt: end,
        },
        create: {
          orderId: event.orderId,
          track: event.track,
          plannedStartAt: start,
          plannedEndAt: end,
        },
      });
    }

    return event;
  });

  return NextResponse.json({
    ok: true,
    event: {
      id: updated.id,
      start: updated.start.toISOString(),
      end: updated.end.toISOString(),
      title: updated.title,
      notes: updated.notes ?? null,
    },
  });
}
