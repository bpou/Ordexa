import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { Prisma, Role, type Track } from "@prisma/client";
import { normalizeTrack } from "@/lib/tracks";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canManageTrack } from "@/lib/permissions";

type Params = { id: string; track: string };

const MAX_MINUTES_PER_REQUEST = 24 * 60; // 24 hours

type ExistingUserEntry = {
  id: string;
  minutes: number;
  createdAt: Date;
};

export async function POST(
  req: Request,
  ctx: { params: Promise<Params> }
) {
  const p = await ctx.params;
  const orderId = p?.id;
  const normalizedTrack = normalizeTrack(p?.track);

  if (!orderId) {
    return NextResponse.json({ error: "Saknar order-id" }, { status: 400 });
  }
  if (!normalizedTrack) {
    return NextResponse.json({ error: "Ogiltigt spar" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Inte inloggad" }, { status: 401 });
  }

  const sessionUser = session.user as { id?: string; role?: Role; name?: string | null; image?: string | null; email?: string | null } | null | undefined;
  const role = sessionUser?.role;
  const createdById = sessionUser?.id;
  if (!canManageTrack(role, normalizedTrack as Track)) {
    return NextResponse.json(
      { error: "Du saknar behorighet for att justera tid pa detta spar" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON i request body" }, { status: 400 });
  }

  const minutesRaw = Number((body as { minutes?: number })?.minutes);
  const targetUserIdRaw = (body as { userId?: unknown })?.userId;
  const targetUserId = typeof targetUserIdRaw === "string" && targetUserIdRaw.trim()
    ? targetUserIdRaw.trim()
    : createdById;

  if (!createdById) {
    return NextResponse.json({ error: "Saknar anvandar-id i sessionen" }, { status: 403 });
  }
  if (!targetUserId) {
    return NextResponse.json({ error: "Valj vem tiden ska registreras pa" }, { status: 400 });
  }

  if (!Number.isFinite(minutesRaw)) {
    return NextResponse.json({ error: "Tidsvardet maste vara ett tal" }, { status: 400 });
  }

  const minutes = Math.round(minutesRaw);
  if (minutes === 0) {
    return NextResponse.json({ error: "Tiden maste vara skild fran noll" }, { status: 400 });
  }
  if (Math.abs(minutes) > MAX_MINUTES_PER_REQUEST) {
    return NextResponse.json(
      { error: "Max 24 timmar (1 440 minuter) kan justeras at gangen" },
      { status: 400 }
    );
  }

  try {
    const order = await prisma.order.findFirst({
      where: { orderNumber: orderId, billingConfirmedAt: null },
      select: { orderNumber: true },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order saknas eller ar redan fakturerad" },
        { status: 404 }
      );
    }

    const trackKey = normalizedTrack as Track;
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, email: true, image: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Anvandaren finns inte" }, { status: 404 });
    }

    const existing = await prisma.orderTrack.findUnique({
      where: {
        orderId_track: { orderId: order.orderNumber, track: trackKey },
      },
      select: { orderId: true, track: true, timeSpentMinutes: true },
    });

    const updated = await prisma.$transaction(async (tx) => {
      const existingEntries = await tx.$queryRaw<ExistingUserEntry[]>`
        SELECT "id", "minutes", "createdAt"
        FROM "OrderTrackTimeEntry"
        WHERE "orderId" = ${order.orderNumber}
          AND "track" = ${trackKey}::"Track"
          AND "userId" = ${targetUser.id}
        ORDER BY "createdAt" DESC
      `;

      const canonicalEntry = existingEntries[0] ?? null;
      const duplicateIds = existingEntries.slice(1).map((entry) => entry.id);
      const currentUserMinutes = existingEntries.reduce((sum, entry) => sum + entry.minutes, 0);
      const appliedDelta = minutes > 0 ? minutes : Math.max(-currentUserMinutes, minutes);
      const nextUserMinutes = Math.max(0, currentUserMinutes + appliedDelta);
      const currentTrackMinutes = existing?.timeSpentMinutes ?? 0;
      const nextTrackMinutes = Math.max(0, currentTrackMinutes + appliedDelta);

      const track = existing
        ? await tx.orderTrack.update({
            where: {
              orderId_track: { orderId: order.orderNumber, track: trackKey },
            },
            data: { timeSpentMinutes: nextTrackMinutes },
            select: { orderId: true, track: true, timeSpentMinutes: true },
          })
        : await tx.orderTrack.create({
            data: {
              orderId: order.orderNumber,
              track: trackKey,
              timeSpentMinutes: nextTrackMinutes,
            },
            select: { orderId: true, track: true, timeSpentMinutes: true },
          });

      const entryTimestamp = new Date();
      const createdByName = sessionUser?.name ?? sessionUser?.email ?? "Okand anvandare";

      let entry = null;

      if (canonicalEntry) {
        if (nextUserMinutes === 0) {
          await tx.$executeRaw`
            DELETE FROM "OrderTrackTimeEntry"
            WHERE "id" = ${canonicalEntry.id}
          `;
        } else {
          await tx.$executeRaw`
            UPDATE "OrderTrackTimeEntry"
            SET
              "minutes" = ${nextUserMinutes},
              "userName" = ${targetUser.name ?? targetUser.email},
              "userImage" = ${targetUser.image},
              "createdById" = ${createdById},
              "createdByName" = ${createdByName},
              "createdByImage" = ${sessionUser?.image ?? null},
              "createdAt" = ${entryTimestamp}
            WHERE "id" = ${canonicalEntry.id}
          `;

          entry = {
            id: canonicalEntry.id,
            orderId: order.orderNumber,
            track: trackKey,
            minutes: nextUserMinutes,
            userId: targetUser.id,
            userName: targetUser.name ?? targetUser.email,
            userImage: targetUser.image,
            createdById,
            createdByName,
            createdByImage: sessionUser?.image ?? null,
            createdAt: entryTimestamp,
          };
        }
      } else if (nextUserMinutes > 0) {
        entry = {
          id: randomUUID(),
          orderId: order.orderNumber,
          track: trackKey,
          minutes: nextUserMinutes,
          userId: targetUser.id,
          userName: targetUser.name ?? targetUser.email,
          userImage: targetUser.image,
          createdById,
          createdByName,
          createdByImage: sessionUser?.image ?? null,
          createdAt: entryTimestamp,
        };

        await tx.$executeRaw`
          INSERT INTO "OrderTrackTimeEntry"
            ("id", "orderId", "track", "minutes", "userId", "userName", "userImage", "createdById", "createdByName", "createdByImage", "createdAt")
          VALUES
            (${entry.id}, ${entry.orderId}, ${entry.track}::"Track", ${entry.minutes}, ${entry.userId}, ${entry.userName}, ${entry.userImage}, ${entry.createdById}, ${entry.createdByName}, ${entry.createdByImage}, ${entry.createdAt})
        `;
      }

      if (duplicateIds.length > 0) {
        await tx.$executeRaw`
          DELETE FROM "OrderTrackTimeEntry"
          WHERE "id" IN (${Prisma.join(duplicateIds)})
        `;
      }

      return { track, entry, appliedDelta, replacedEntryIds: duplicateIds };
    });

    return NextResponse.json({
      ok: true,
      track: updated.track,
      entry: updated.entry,
      minutesAdded: updated.appliedDelta,
      replacedEntryIds: updated.replacedEntryIds,
    });
  } catch (error) {
    console.error(
      `[orders/${orderId}/tracks/${normalizedTrack}/time]`,
      error
    );
    return NextResponse.json(
      { error: "Kunde inte uppdatera tid for spar" },
      { status: 500 }
    );
  }
}
