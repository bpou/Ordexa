import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  clearOutlookSubscriptionForUser,
  ensureOutlookSubscriptionForUser,
  isOutlookConfigured,
  isManagedTrackOutlookSyncUser,
  isOutlookSchemaMissingError,
} from "@/lib/outlook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userManaged = !(await isManagedTrackOutlookSyncUser(userId));
    if (userManaged) {
      await ensureOutlookSubscriptionForUser(userId, new URL(req.url).origin);
    }
    const connection = await prisma.outlookCalendarConnection.findUnique({
      where: { userId },
    });

    return NextResponse.json({
      configured: isOutlookConfigured(new URL(req.url).origin),
      connected: Boolean(connection),
      userManaged,
      displayName: connection?.displayName ?? null,
      providerEmail: connection?.providerEmail ?? null,
      expiresAt: connection?.expiresAt?.toISOString() ?? null,
      lastSyncedAt: connection?.lastSyncedAt?.toISOString() ?? null,
      syncError: connection?.syncError ?? null,
    });
  } catch (error) {
    if (isOutlookSchemaMissingError(error)) {
      return NextResponse.json({
        configured: isOutlookConfigured(new URL(req.url).origin),
        connected: false,
        userManaged: true,
        displayName: null,
        providerEmail: null,
        expiresAt: null,
        lastSyncedAt: null,
        syncError: "Outlook-tabellerna saknas lokalt. Kör Prisma-migrationen först.",
      });
    }
    throw error;
  }
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let connection;
  try {
    connection = await prisma.outlookCalendarConnection.findUnique({
      where: { userId },
      include: {
        syncedEvents: true,
        _count: {
          select: {
            trackSyncedEvents: true,
            trackSubscriptions: true,
          },
        },
      },
    });
  } catch (error) {
    if (isOutlookSchemaMissingError(error)) {
      return NextResponse.json({ ok: true });
    }
    throw error;
  }

  if (!connection) {
    return NextResponse.json({ ok: true });
  }

  const isManagedTrackSync =
    (await isManagedTrackOutlookSyncUser(userId)) ||
    connection._count.trackSyncedEvents > 0 ||
    connection._count.trackSubscriptions > 0;

  if (isManagedTrackSync) {
    return NextResponse.json(
      { error: "Track Outlook calendars are managed by the backend and cannot be disconnected here." },
      { status: 403 }
    );
  }

  await clearOutlookSubscriptionForUser(userId);

  await prisma.$transaction([
    prisma.outlookCalendarSync.deleteMany({
      where: { connectionId: connection.id },
    }),
    prisma.personalCalendarEvent.deleteMany({
      where: {
        id: { in: connection.syncedEvents.map((item) => item.personalEventId) },
      },
    }),
    prisma.outlookCalendarConnection.delete({
      where: { id: connection.id },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
