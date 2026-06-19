import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma, Role, Track } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { onlyRealFortnoxOrders } from "@/lib/filters";
import { getNotificationPreferences, type NotificationPreferences } from "@/lib/notification-preferences";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type NotificationTone = "critical" | "warning" | "success" | "info";

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  tone: NotificationTone;
  kind: "order" | "planning" | "file" | "billing" | "calendar";
  createdAt: string;
};

const ROLE_TRACK: Partial<Record<Role, Track>> = {
  A_TEAM: Track.A,
  B_TEAM: Track.B,
  C_TEAM: Track.C,
  D_TEAM: Track.D,
};

function orderVisibilityWhere(sessionUser: { id?: string | null; email?: string | null; role?: Role | string }) {
  const role = sessionUser.role as Role | undefined;
  const base: Prisma.OrderWhereInput = { ...onlyRealFortnoxOrders };

  if (role === Role.ADMIN) return base;

  if (role === Role.SALJARE) {
    const ownerFilters = [
      sessionUser.id ? { createdById: sessionUser.id } : {},
      sessionUser.email ? { createdBy: { email: sessionUser.email } } : {},
      sessionUser.email ? { createdByName: sessionUser.email } : {},
    ].filter((entry) => Object.keys(entry).length > 0);
    if (!ownerFilters.length) return { ...base, orderNumber: "__no_access__" };

    return {
      ...base,
      OR: ownerFilters,
    };
  }

  const track = role ? ROLE_TRACK[role] : null;
  if (track) {
    return {
      ...base,
      tracks: { some: { track } },
    };
  }

  return { ...base, orderNumber: "__no_access__" };
}

function iso(value: Date | null | undefined) {
  return value ? value.toISOString() : new Date().toISOString();
}

function trackLabel(track: Track) {
  if (track === Track.A) return "Atelje";
  if (track === Track.B) return "Verkstad";
  if (track === Track.C) return "Montage";
  if (track === Track.D) return "Bildekor";
  return "Delad";
}

function isKindEnabled(kind: NotificationItem["kind"], preferences: NotificationPreferences) {
  if (kind === "calendar" || kind === "planning") return preferences.calendarDigest;
  if (kind === "order" || kind === "file" || kind === "billing") return preferences.orderUpdates;
  return preferences.securityAlerts;
}

async function getSessionUser() {
  const session = await getServerSession(authOptions);
  return session?.user as
    | { id?: string | null; email?: string | null; role?: Role | string }
    | undefined;
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [orders, outlookConnection, preferences, dismissals] = await Promise.all([
    prisma.order.findMany({
      where: {
        ...orderVisibilityWhere(sessionUser),
        billingConfirmedAt: null,
      },
      include: {
        tracks: true,
        files: { orderBy: { createdAt: "desc" }, take: 3 },
        events: { orderBy: { start: "asc" } },
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
    sessionUser.id
      ? prisma.outlookCalendarConnection.findUnique({
          where: { userId: sessionUser.id },
          select: { syncError: true, lastSyncedAt: true, updatedAt: true },
        })
      : Promise.resolve(null),
    sessionUser.id ? getNotificationPreferences(sessionUser.id) : Promise.resolve(null),
    sessionUser.id
      ? prisma.notificationDismissal.findMany({
          where: { userId: sessionUser.id },
          select: { notificationId: true },
        })
      : Promise.resolve([]),
  ]);

  const now = Date.now();
  const soon = now + 3 * 24 * 60 * 60 * 1000;
  const items: NotificationItem[] = [];
  const dismissedIds = new Set(dismissals.map((item) => item.notificationId));

  if (outlookConnection?.syncError) {
    items.push({
      id: "outlook-sync-error",
      title: "Kalendersynk behöver åtgärdas",
      description: outlookConnection.syncError.slice(0, 140),
      href: "/account",
      tone: "critical",
      kind: "calendar",
      createdAt: iso(outlookConnection.updatedAt),
    });
  }

  for (const order of orders) {
    const href = `/orders/${encodeURIComponent(order.orderNumber)}`;
    const orderLabel = `#${order.orderNumber} ${order.title}`;
    const plannedTracks = new Set(order.events.map((event) => event.track));
    const unplanned = order.tracks.filter((track) => !track.plannedStartAt && !plannedTracks.has(track.track));
    const blocked = order.tracks.filter((track) => track.status === "PALACK");
    const finished = order.tracks.length > 0 && order.tracks.every((track) => track.status === "AVSLUTAD");

    if (blocked.length) {
      items.push({
        id: `blocked-${order.orderNumber}`,
        title: "Order ligger på paus",
        description: `${orderLabel} har ${blocked.map((track) => trackLabel(track.track)).join(", ")} på paus.`,
        href,
        tone: "warning",
        kind: "order",
        createdAt: iso(order.updatedAt),
      });
    }

    if (unplanned.length) {
      items.push({
        id: `unplanned-${order.orderNumber}`,
        title: "Planering saknas",
        description: `${orderLabel} saknar tid för ${unplanned.map((track) => trackLabel(track.track)).join(", ")}.`,
        href,
        tone: "warning",
        kind: "planning",
        createdAt: iso(order.updatedAt),
      });
    }

    if (order.dueDate) {
      const due = order.dueDate.getTime();
      if (due < now || due <= soon) {
        items.push({
          id: `due-${order.orderNumber}`,
          title: due < now ? "Leveransdatum har passerat" : "Leverans närmar sig",
          description: `${orderLabel} har leverans ${order.dueDate.toLocaleDateString("sv-SE")}.`,
          href,
          tone: due < now ? "critical" : "info",
          kind: "planning",
          createdAt: iso(order.dueDate),
        });
      }
    }

    if (finished && !order.billingConfirmedAt) {
      items.push({
        id: `billing-${order.orderNumber}`,
        title: "Redo för fakturering",
        description: `${orderLabel} är avslutad i alla spår.`,
        href,
        tone: "success",
        kind: "billing",
        createdAt: iso(order.updatedAt),
      });
    }

    for (const file of order.files) {
      items.push({
        id: `file-${file.id}`,
        title: "Ny fil uppladdad",
        description: `${file.filename} på ${orderLabel}.`,
        href,
        tone: "info",
        kind: "file",
        createdAt: iso(file.createdAt),
      });
    }
  }

  const sorted = items
    .filter((item) => (preferences ? isKindEnabled(item.kind, preferences) : true))
    .filter((item) => !dismissedIds.has(item.id))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 12);

  return NextResponse.json({
    items: sorted,
    unreadCount: sorted.filter((item) => item.tone === "critical" || item.tone === "warning").length,
    generatedAt: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawIds = Array.isArray((body as { ids?: unknown }).ids)
    ? (body as { ids: unknown[] }).ids
    : typeof (body as { id?: unknown }).id === "string"
      ? [(body as { id: string }).id]
      : [];

  const ids = [...new Set(rawIds.filter((id): id is string => typeof id === "string").map((id) => id.trim()).filter(Boolean))];
  if (!ids.length) {
    return NextResponse.json({ error: "No notification ids supplied" }, { status: 400 });
  }

  await prisma.$transaction(
    ids.map((notificationId) =>
      prisma.notificationDismissal.upsert({
        where: {
          userId_notificationId: {
            userId: sessionUser.id!,
            notificationId,
          },
        },
        update: { dismissedAt: new Date() },
        create: { userId: sessionUser.id!, notificationId },
      })
    )
  );

  return NextResponse.json({ dismissedIds: ids });
}
