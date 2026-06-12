import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { Role, type Track } from "@prisma/client";
import { normalizeTrack } from "@/lib/tracks";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canManageTrack } from "@/lib/permissions";

type Params = { id: string; track: string };

const MAX_MINUTES_PER_REQUEST = 24 * 60; // 24 hours

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

    if (minutes > 0) {
      const updated = await prisma.$transaction(async (tx) => {
        const track = existing
          ? await tx.orderTrack.update({
              where: {
                orderId_track: { orderId: order.orderNumber, track: trackKey },
              },
              data: { timeSpentMinutes: { increment: minutes } },
              select: { orderId: true, track: true, timeSpentMinutes: true },
            })
          : await tx.orderTrack.create({
              data: {
                orderId: order.orderNumber,
                track: trackKey,
                timeSpentMinutes: minutes,
              },
              select: { orderId: true, track: true, timeSpentMinutes: true },
            });

        const entry = {
          id: randomUUID(),
          orderId: order.orderNumber,
          track: trackKey,
          minutes,
          userId: targetUser.id,
          userName: targetUser.name ?? targetUser.email,
          userImage: targetUser.image,
          createdById,
          createdByName: sessionUser?.name ?? sessionUser?.email ?? "Okand anvandare",
          createdByImage: sessionUser?.image ?? null,
          createdAt: new Date(),
        };

        await tx.$executeRaw`
          INSERT INTO "OrderTrackTimeEntry"
            ("id", "orderId", "track", "minutes", "userId", "userName", "userImage", "createdById", "createdByName", "createdByImage", "createdAt")
          VALUES
            (${entry.id}, ${entry.orderId}, ${entry.track}::"Track", ${entry.minutes}, ${entry.userId}, ${entry.userName}, ${entry.userImage}, ${entry.createdById}, ${entry.createdByName}, ${entry.createdByImage}, ${entry.createdAt})
        `;

        return { track, entry };
      });

      return NextResponse.json({ ok: true, track: updated.track, entry: updated.entry, minutesAdded: minutes });
    }

    const currentMinutes = existing?.timeSpentMinutes ?? 0;
    const appliedDelta = Math.max(-currentMinutes, minutes); // both are <= 0
    const nextMinutes = Math.max(0, currentMinutes + appliedDelta);

    const updated = await prisma.$transaction(async (tx) => {
      const track = existing
        ? await tx.orderTrack.update({
            where: {
              orderId_track: { orderId: order.orderNumber, track: trackKey },
            },
            data: { timeSpentMinutes: nextMinutes },
            select: { orderId: true, track: true, timeSpentMinutes: true },
          })
        : {
            orderId: order.orderNumber,
            track: trackKey,
            timeSpentMinutes: 0,
          };

      const entry = appliedDelta === 0
        ? null
        : {
            id: randomUUID(),
            orderId: order.orderNumber,
            track: trackKey,
            minutes: appliedDelta,
            userId: targetUser.id,
            userName: targetUser.name ?? targetUser.email,
            userImage: targetUser.image,
            createdById,
            createdByName: sessionUser?.name ?? sessionUser?.email ?? "Okand anvandare",
            createdByImage: sessionUser?.image ?? null,
            createdAt: new Date(),
          };

      if (entry) {
        await tx.$executeRaw`
          INSERT INTO "OrderTrackTimeEntry"
            ("id", "orderId", "track", "minutes", "userId", "userName", "userImage", "createdById", "createdByName", "createdByImage", "createdAt")
          VALUES
            (${entry.id}, ${entry.orderId}, ${entry.track}::"Track", ${entry.minutes}, ${entry.userId}, ${entry.userName}, ${entry.userImage}, ${entry.createdById}, ${entry.createdByName}, ${entry.createdByImage}, ${entry.createdAt})
        `;
      }

      return { track, entry };
    });

    return NextResponse.json({ ok: true, track: updated.track, entry: updated.entry, minutesAdded: appliedDelta });
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
