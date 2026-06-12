// src/app/api/calendar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Track, TrackStatus, CalendarLabel } from "@prisma/client";
import { normalizeTrack } from "@/lib/tracks";
import { getSessionAndRole, canAccessCalendarTrack } from "@/lib/calendar-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type FeedEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  url?: string;
  extendedProps: {
    location: string | null;
    synthetic: boolean;
    status: TrackStatus | null;
    label: CalendarLabel | null;
    orderId: string;
    orderTitle: string | null;
    customerName: string | null;
    sellerName: string | null;
    sellerInitials: string | null;
  };
};

type EventRow = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  orderId: string;
  notes: string | null;
  track: Track;
  order: {
    orderNumber: string;
    title: string;
    customerName: string | null;
    deliveryAddress: string | null;
    createdByName: string | null;
    createdBy: {
      name: string | null;
    } | null;
  } | null;
};

function initialsFromName(name: string | null | undefined) {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/\s+/g);
  const chars = parts.map((p) => p.charAt(0).toUpperCase());
  if (chars.length === 0) return null;
  return chars.join("").slice(0, 3);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const normalized = normalizeTrack(searchParams.get("track") ?? undefined);

  if (!normalized) {
    return NextResponse.json({ error: "Missing or invalid track" }, { status: 400 });
  }

  const trackFilter = normalized as Track;

  const { session, role } = await getSessionAndRole();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!role || !canAccessCalendarTrack(role, trackFilter)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const events: EventRow[] = await prisma.calendarEvent.findMany({
    where: { track: trackFilter },
    select: {
      id: true,
      title: true,
      start: true,
      end: true,
      orderId: true,
      notes: true,
      track: true,
      order: {
        select: {
          orderNumber: true,
          title: true,
          customerName: true,
          deliveryAddress: true,
          createdByName: true,
          createdBy: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: { start: "asc" },
  });

  const orderIds = Array.from(new Set(events.map((e) => e.orderId)));
  const trackMeta = orderIds.length
    ? await prisma.orderTrack.findMany({
        where: { orderId: { in: orderIds }, track: trackFilter },
        select: { orderId: true, status: true, calendarLabel: true },
      })
    : [];

  const metaByOrderId = new Map<string, { status: TrackStatus | null; label: CalendarLabel | null }>(
    trackMeta.map((t) => [t.orderId, { status: t.status, label: t.calendarLabel ?? null }])
  );

  const handledKeys = new Set<string>(events.map((e) => `${e.orderId}:${normalized}`));

  const pending = await prisma.orderTrack.findMany({
    where: {
      track: trackFilter,
      plannedStartAt: { not: null },
      plannedEndAt: { not: null },
      status: { not: "AVSLUTAD" },
      order: { billingConfirmedAt: null },
    },
    select: {
      orderId: true,
      plannedStartAt: true,
      plannedEndAt: true,
      status: true,
      calendarLabel: true,
      order: {
        select: {
          title: true,
          customerName: true,
          deliveryAddress: true,
          createdByName: true,
          createdBy: { select: { name: true } },
        },
      },
    },
  });

  const existing: FeedEvent[] = events
    .filter((e) => e.start && e.end)
    .map((e) => {
      const meta = metaByOrderId.get(e.orderId) ?? { status: null, label: null };
      const order = e.order;
      const sellerName = order?.createdByName ?? order?.createdBy?.name ?? null;
      const location = e.notes ?? order?.deliveryAddress ?? null;
      const orderTitle = order?.title ?? e.title ?? "";
      return {
        id: e.id,
        title: e.title ?? "",
        start: e.start.toISOString(),
        end: e.end.toISOString(),
        url: e.orderId ? `/orders/${e.orderId}` : undefined,
        extendedProps: {
          location,
          synthetic: false,
          status: meta.status,
          label: meta.label,
          orderId: e.orderId,
          orderTitle,
          customerName: order?.customerName ?? null,
          sellerName,
          sellerInitials: initialsFromName(sellerName),
        },
      };
    });

  const synthetic: FeedEvent[] = pending
    .filter((r) => r.plannedStartAt && r.plannedEndAt && !handledKeys.has(`${r.orderId}:${normalized}`))
    .map((r) => {
      const baseTitle = r.order?.title ?? `Order ${r.orderId}`;
      const title = r.order?.customerName ? `${baseTitle} - ${r.order.customerName}` : baseTitle;
      const sellerName = r.order?.createdByName ?? r.order?.createdBy?.name ?? null;
      const location = r.order?.deliveryAddress ?? null;
      return {
        id: `pending-${r.orderId}-${normalized}`,
        title,
        start: r.plannedStartAt!.toISOString(),
        end: r.plannedEndAt!.toISOString(),
        url: `/orders/${r.orderId}`,
        extendedProps: {
          location,
          synthetic: true,
          status: r.status,
          label: r.calendarLabel ?? null,
          orderId: r.orderId,
          orderTitle: title,
          customerName: r.order?.customerName ?? null,
          sellerName,
          sellerInitials: initialsFromName(sellerName),
        },
      };
    });

  const fc = [...existing, ...synthetic].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  return NextResponse.json({ events: fc });
}
