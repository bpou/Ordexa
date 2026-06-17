// src/app/api/orders/[id]/tracks/[track]/status/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import type { Role, Track, TrackStatus } from "@prisma/client";
import { normalizeTrack } from "@/lib/tracks";
import { authOptions } from "@/lib/auth";
import { sendOrderCompletionNotification } from "@/lib/email";
import { canSendNotification, getNotificationPreferences } from "@/lib/notification-preferences";
import { sendWebPushToUser } from "@/lib/web-push";
import { canManageTrack } from "@/lib/permissions";
import { onlyActiveOrders } from "@/lib/filters";

type Params = { id: string; track: string };

const VALID_STATUS: TrackStatus[] = [
  "INKOMMANDE",
  "PAGAENDE",
  "LEVERANS",
  "AVSLUTAD",
  "PALACK",
];

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

  const role = (session.user as { role?: Role } | null | undefined)?.role;

  if (!canManageTrack(role, normalizedTrack as Track)) {
    return NextResponse.json(
      { error: "Du saknar behorighet for att uppdatera detta spar" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON i request body" }, { status: 400 });
  }

  const status = (body as { status?: TrackStatus })?.status;
  if (!status || !VALID_STATUS.includes(status)) {
    return NextResponse.json(
      { error: "Ogiltig status. Tillatna: INKOMMANDE, PAGAENDE, LEVERANS, AVSLUTAD, PALACK" },
      { status: 400 }
    );
  }

  try {
    const order = await prisma.order.findFirst({
      where: { orderNumber: orderId, ...onlyActiveOrders },
      select: { orderNumber: true },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order saknas eller ar redan fakturerad" },
        { status: 404 }
      );
    }

    const updated = await prisma.orderTrack.upsert({
      where: {
        orderId_track: { orderId: order.orderNumber, track: normalizedTrack as Track },
      },
      update: { status },
      create: {
        orderId: order.orderNumber,
        track: normalizedTrack as Track,
        status,
      },
      select: {
        orderId: true,
        track: true,
        status: true,
        calendarLabel: true,
        plannedStartAt: true,
        plannedEndAt: true,
      },
    });

    if (status === "AVSLUTAD") {
      const allTracks = await prisma.orderTrack.findMany({
        where: { orderId: order.orderNumber },
        select: { status: true },
      });

      const allCompleted = allTracks.every((track) => track.status === "AVSLUTAD");

      if (allCompleted) {
        const orderDetails = await prisma.order.findUnique({
          where: { orderNumber: order.orderNumber },
          select: {
            orderNumber: true,
            title: true,
            createdBy: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        });

        if (orderDetails?.createdBy) {
          const preferences = await getNotificationPreferences(orderDetails.createdBy.id);
          const viewLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/orders/${orderDetails.orderNumber}`;

          if (orderDetails.createdBy.email && canSendNotification(preferences, "orderUpdates", "email")) {
            try {
              await sendOrderCompletionNotification({
                orderId: orderDetails.orderNumber,
                completionDate: new Date().toLocaleDateString("sv-SE"),
                viewLink,
                sellerEmail: orderDetails.createdBy.email,
                sellerName: orderDetails.createdBy.name || undefined,
              });
            } catch (emailError) {
              console.error("Failed to send completion notification:", emailError);
            }
          }

          if (canSendNotification(preferences, "orderUpdates", "desktop")) {
            await sendWebPushToUser(orderDetails.createdBy.id, {
              title: "Redo for fakturering",
              body: `Order #${orderDetails.orderNumber} ${orderDetails.title} ar avslutad i alla spar.`,
              url: `/orders/${orderDetails.orderNumber}`,
              tag: `billing-${orderDetails.orderNumber}`,
            });
          }
        }
      }
    }

    return NextResponse.json({ ok: true, track: updated });
  } catch (error) {
    console.error(`[orders/${orderId}/tracks/${normalizedTrack}]`, error);
    return NextResponse.json(
      { error: "Kunde inte uppdatera status for spar" },
      { status: 500 }
    );
  }
}
