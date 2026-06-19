import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Track, Role } from "@prisma/client";
import { pusherServer } from "@/lib/pusher-server";
import { uploadStoredFile } from "@/lib/file-storage";
import path from "path";
import { randomUUID } from "crypto";
import { normalizeTrack } from "@/lib/tracks";
import { canManageTrack } from "@/lib/permissions";
import { onlyRealFortnoxOrders } from "@/lib/filters";
import { sendNotificationEmail } from "@/lib/email";
import {
  canSendNotification,
  getNotificationPreferences,
  matchesNotificationFilters,
} from "@/lib/notification-preferences";
import { sendWebPushToUser } from "@/lib/web-push";
import { createOrderHistoryEvent, trackHistoryLabel } from "@/lib/order-history";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

function sanitize(name: string) {
  const { name: base, ext } = path.parse(name);
  const safe =
    (base || "file")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "file";
  return { base: safe, ext: ext || "" };
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id: orderId } = await ctx.params;

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const sessionUser = session.user as {
      id?: string;
      role?: Role;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    } | null | undefined;
    const role = sessionUser?.role;

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const rawTrack = (form.get("track") as string) ?? "SHARED";

    if (!orderId || !file) {
      return NextResponse.json({ error: "Missing orderId or file" }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: { orderNumber: orderId, ...onlyRealFortnoxOrders },
      select: {
        orderNumber: true,
        title: true,
        createdById: true,
        createdBy: { select: { id: true, email: true, name: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const normalizedTrack =
      rawTrack === "SHARED" ? "SHARED" : normalizeTrack(rawTrack ?? undefined);

    if (rawTrack !== "SHARED" && !normalizedTrack) {
      return NextResponse.json({ error: "Ogiltigt spar" }, { status: 400 });
    }

    const trackForSave = (normalizedTrack ?? "SHARED") as Track;

    if (!canManageTrack(role, trackForSave)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const { base, ext } = sanitize(file.name);
    const key = `orders/${orderId}/${randomUUID()}-${base}${ext || ""}`;

    const upload = await uploadStoredFile({
      key,
      body: buf,
      contentType: file.type || "application/octet-stream",
    });

    const saved = await prisma.file.create({
      data: {
        orderId,
        filename: `${base}${ext || ""}`,
        url: upload.key,
        track: trackForSave,
      },
    });

    const uploadedBy = sessionUser?.name ?? sessionUser?.email ?? null;
    const uploadedById = sessionUser?.id ?? null;
    const uploadedByName = sessionUser?.name ?? sessionUser?.email ?? null;
    const uploadedByImage = sessionUser?.image ?? null;

    await prisma.$executeRaw`
      UPDATE "File"
      SET
        "uploadedBy" = ${uploadedBy},
        "uploadedById" = ${uploadedById},
        "uploadedByName" = ${uploadedByName},
        "uploadedByImage" = ${uploadedByImage}
      WHERE "id" = ${saved.id}
    `;

    await createOrderHistoryEvent({
      orderId,
      type: "file",
      title: "Fil uppladdad",
      description: `${uploadedByName ?? "Okänd användare"} laddade upp ${saved.filename} på ${trackHistoryLabel(trackForSave)}.`,
      actor: sessionUser,
      metadata: {
        fileId: saved.id,
        filename: saved.filename,
        track: trackForSave,
      },
    });

    const payload = {
      id: saved.id,
      filename: saved.filename,
      url: upload.url,
      track: saved.track,
      createdAt: saved.createdAt.toISOString(),
      expiresAt: upload.expiresAt ?? undefined,
      uploadedBy,
      uploadedById,
      uploadedByName,
      uploadedByImage,
    };

    await pusherServer.trigger(`order-${orderId}`, "file:created", payload);

    if (order.createdBy && order.createdById !== uploadedById) {
      const preferences = await getNotificationPreferences(order.createdBy.id);
      const viewLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/orders/${order.orderNumber}`;
      const notificationBody = `${saved.filename} lades till pa order #${order.orderNumber} ${order.title}.`;
      const matchesFilters = matchesNotificationFilters(preferences, {
        tracks: [trackForSave],
        actorUserId: uploadedById,
        ownerUserId: order.createdBy.id,
      });

      if (order.createdBy.email && canSendNotification(preferences, "orderUpdates", "email") && matchesFilters) {
        await sendNotificationEmail({
          to: order.createdBy.email,
          subject: `Ny fil uppladdad pa order ${order.orderNumber}`,
          title: "Ny fil uppladdad",
          body: notificationBody,
          actionUrl: viewLink,
          actionLabel: "Oppna order",
        }).catch((error) => {
          console.error("Failed to send file upload email notification:", error);
        });
      }

      if (canSendNotification(preferences, "orderUpdates", "desktop") && matchesFilters) {
        await sendWebPushToUser(order.createdBy.id, {
          title: "Ny fil uppladdad",
          body: notificationBody,
          url: `/orders/${order.orderNumber}`,
          tag: `file-${saved.id}`,
        });
      }
    }

    return NextResponse.json({ ok: true, file: payload });
  } catch (err) {
    console.error("UPLOAD ERROR", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
