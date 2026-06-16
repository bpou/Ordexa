import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma, Role } from "@prisma/client";
import type { OrderTrack } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { onlyRealFortnoxOrders } from "@/lib/filters";
import { prisma } from "@/lib/prisma";
import { getStoredFileUrl } from "@/lib/file-storage";
import { updateFortnoxOrder } from "@/lib/fortnox";

export const runtime = "nodejs";
const FILE_URL_TTL_SEC = 600;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id: orderId } = await ctx.params;

  const order = await prisma.order.findFirst({
    where: { orderNumber: orderId, ...onlyRealFortnoxOrders },
    include: {
      tracks: true,
      events: { orderBy: { start: "asc" } },
      fortnox: true,
      createdBy: { select: { name: true, email: true, image: true } },
      files: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const files = order.files;

  const fileUploaders = files.length
    ? await prisma.$queryRaw<
        Array<{
          id: string;
          uploadedBy: string | null;
          uploadedById: string | null;
          uploadedByName: string | null;
          uploadedByImage: string | null;
        }>
      >`
        SELECT "id", "uploadedBy", "uploadedById", "uploadedByName", "uploadedByImage"
        FROM "File"
        WHERE "id" IN (${Prisma.join(files.map((file) => file.id))})
      `
    : [];
  const uploaderByFileId = new Map(fileUploaders.map((file) => [file.id, file]));

  const signed = await Promise.all(
    files.map(async (f) => {
      const key = f.url;
      let url = key;
      let expiresAt: number | undefined;
      try {
        const stored = await getStoredFileUrl(key, FILE_URL_TTL_SEC);
        url = stored.url;
        expiresAt = stored.expiresAt ?? undefined;
      } catch (error) {
        console.warn(`[orders/${orderId}] Could not resolve file URL`, {
          fileId: f.id,
          filename: f.filename,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      const uploader = uploaderByFileId.get(f.id);
      return {
        id: f.id,
        filename: f.filename,
        url,
        track: f.track as "A" | "B" | "C" | "D" | "SHARED",
        createdAt: f.createdAt.toISOString(),
        expiresAt,
        uploadedBy: uploader?.uploadedByName ?? uploader?.uploadedBy ?? null,
        uploadedById: uploader?.uploadedById ?? null,
        uploadedByName: uploader?.uploadedByName ?? uploader?.uploadedBy ?? null,
        uploadedByImage: uploader?.uploadedByImage ?? null,
      };
    })
  );

  const tracks =
    order.tracks.map((t: OrderTrack) => ({
      track: t.track,
      status: t.status,
      plannedStartAt: t.plannedStartAt?.toISOString() ?? null,
      plannedEndAt: t.plannedEndAt?.toISOString() ?? null,
      timeSpentMinutes: t.timeSpentMinutes ?? 0,
    }));

  const timeEntries = await prisma.$queryRaw<
    Array<{
      id: string;
      orderId: string;
      track: "A" | "B" | "C" | "D" | "SHARED";
      minutes: number;
      userId: string | null;
      userName: string;
      userImage: string | null;
      createdById: string | null;
      createdByName: string;
      createdByImage: string | null;
      createdAt: Date;
    }>
  >`
    SELECT
      "id",
      "orderId",
      "track",
      "minutes",
      "userId",
      "userName",
      "userImage",
      "createdById",
      "createdByName",
      "createdByImage",
      "createdAt"
    FROM "OrderTrackTimeEntry"
    WHERE "orderId" = ${orderId}
    ORDER BY "createdAt" DESC
  `;

  const serializedTimeEntries = timeEntries.map((entry) => ({
    ...entry,
    createdAt: entry.createdAt.toISOString(),
  }));

  return NextResponse.json({
    order: {
      orderNumber: order.orderNumber,
      title: order.title,
      customerName: order.customerName ?? null,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      dueDate: order.dueDate?.toISOString() ?? null,
      deliveryAddress: order.deliveryAddress ?? null,
      deliveryMethod: order.deliveryMethod ?? null,
      createdByName: order.createdByName ?? order.createdBy?.name ?? order.createdBy?.email ?? null,
      createdByEmail: order.createdBy?.email ?? null,
      createdByImage: order.createdBy?.image ?? null,
      fortnox: order.fortnox
        ? {
            documentNumber: order.fortnox.documentNumber,
            createdAt: order.fortnox.createdAt.toISOString(),
          }
        : null,
      events: order.events.map((event) => ({
        id: event.id,
        track: event.track,
        start: event.start.toISOString(),
        end: event.end.toISOString(),
        title: event.title,
        notes: event.notes ?? null,
      })),
      notes: order.notes ?? null,
      tracks,
      timeEntries: serializedTimeEntries,
      files: signed,
      billingConfirmedAt: order.billingConfirmedAt?.toISOString() ?? null,
    },
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: orderId } = await ctx.params;

  let body: { notes?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if ((body as { order?: unknown }).order !== undefined) {
    return updateOrderMasterData(orderId, (body as { order?: unknown }).order, session.user as any);
  }

  if (body.notes !== undefined && body.notes !== null && typeof body.notes !== "string") {
    return NextResponse.json({ error: "Anteckningar måste vara text." }, { status: 400 });
  }

  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  if (notes.length > 5000) {
    return NextResponse.json({ error: "Anteckningarna är för långa." }, { status: 400 });
  }

  const updated = await prisma.order.update({
    where: { orderNumber: orderId },
    data: { notes: notes || null },
    select: {
      orderNumber: true,
      notes: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    ok: true,
    order: {
      orderNumber: updated.orderNumber,
      notes: updated.notes ?? null,
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}

async function updateOrderMasterData(orderId: string, rawPatch: unknown, user: { id?: string; role?: Role }) {
  if (typeof rawPatch !== "object" || rawPatch === null || Array.isArray(rawPatch)) {
    return NextResponse.json({ error: "Orderuppdatering måste vara ett objekt." }, { status: 400 });
  }

  const role = user?.role;
  if (role !== Role.ADMIN && role !== Role.SALJARE) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.order.findFirst({
    where: { orderNumber: orderId, ...onlyRealFortnoxOrders },
    select: {
      orderNumber: true,
      createdById: true,
      title: true,
      customerName: true,
      dueDate: true,
      deliveryAddress: true,
      deliveryMethod: true,
      billingConfirmedAt: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Order saknas." }, { status: 404 });
  }
  if (existing.billingConfirmedAt) {
    return NextResponse.json({ error: "Fakturerade ordrar kan inte ändras här." }, { status: 409 });
  }
  if (role === Role.SALJARE && existing.createdById && user?.id && existing.createdById !== user.id) {
    return NextResponse.json({ error: "Du kan bara ändra egna ordrar." }, { status: 403 });
  }

  const patch = rawPatch as Record<string, unknown>;
  const readText = (key: string, max: number) => {
    if (!(key in patch)) return undefined;
    const value = patch[key];
    if (value === null) return null;
    if (typeof value !== "string") {
      throw new Error(`${key} måste vara text.`);
    }
    const trimmed = value.trim();
    if (trimmed.length > max) {
      throw new Error(`${key} är för långt.`);
    }
    return trimmed || null;
  };

  let title: string | null | undefined;
  let customerName: string | null | undefined;
  let deliveryAddress: string | null | undefined;
  let deliveryMethod: string | null | undefined;
  try {
    title = readText("title", 180);
    customerName = readText("customerName", 180);
    deliveryAddress = readText("deliveryAddress", 800);
    deliveryMethod = readText("deliveryMethod", 120);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ogiltig orderdata." },
      { status: 400 },
    );
  }

  if (title !== undefined && !title) {
    return NextResponse.json({ error: "Titel krävs." }, { status: 400 });
  }

  let dueDate: Date | null | undefined;
  if ("dueDate" in patch) {
    const raw = patch.dueDate;
    if (raw === null || raw === "") {
      dueDate = null;
    } else if (typeof raw === "string") {
      const parsed = new Date(raw);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "Leveransdatum är ogiltigt." }, { status: 400 });
      }
      dueDate = parsed;
    } else {
      return NextResponse.json({ error: "Leveransdatum måste vara text." }, { status: 400 });
    }
  }

  const next = {
    title: title ?? existing.title,
    customerName: customerName !== undefined ? customerName : existing.customerName,
    dueDate: dueDate !== undefined ? dueDate : existing.dueDate,
    deliveryAddress: deliveryAddress !== undefined ? deliveryAddress : existing.deliveryAddress,
    deliveryMethod: deliveryMethod !== undefined ? deliveryMethod : existing.deliveryMethod,
  };

  const fortnoxPayload: Record<string, unknown> = {
    Remarks: next.title,
    YourReference: next.customerName ?? next.title,
    DeliveryName: next.customerName ?? next.title,
    DeliveryDate: next.dueDate ? next.dueDate.toISOString().slice(0, 10) : null,
    DeliveryAddress1: next.deliveryAddress || null,
    WayOfDelivery: next.deliveryMethod || null,
  };

  try {
    await updateFortnoxOrder(orderId, fortnoxPayload);
  } catch (error) {
    console.error(`[orders/${orderId}] Fortnox update failed`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fortnox kunde inte uppdatera ordern." },
      { status: 502 },
    );
  }

  const updated = await prisma.order.update({
    where: { orderNumber: orderId },
    data: {
      ...(title !== undefined ? { title: next.title } : {}),
      ...(customerName !== undefined ? { customerName: next.customerName } : {}),
      ...(dueDate !== undefined ? { dueDate: next.dueDate } : {}),
      ...(deliveryAddress !== undefined ? { deliveryAddress: next.deliveryAddress } : {}),
      ...(deliveryMethod !== undefined ? { deliveryMethod: next.deliveryMethod } : {}),
    },
    select: {
      orderNumber: true,
      title: true,
      customerName: true,
      dueDate: true,
      deliveryAddress: true,
      deliveryMethod: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    ok: true,
    order: {
      orderNumber: updated.orderNumber,
      title: updated.title,
      customerName: updated.customerName ?? null,
      dueDate: updated.dueDate?.toISOString() ?? null,
      deliveryAddress: updated.deliveryAddress ?? null,
      deliveryMethod: updated.deliveryMethod ?? null,
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}
