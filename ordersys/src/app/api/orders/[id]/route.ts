import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import type { OrderTrack } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStoredFileUrl } from "@/lib/file-storage";

export const runtime = "nodejs";
const FILE_URL_TTL_SEC = 600;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id: orderId } = await ctx.params;

  const order = await prisma.order.findUnique({
    where: { orderNumber: orderId },
    include: {
      tracks: true,
      files: { orderBy: { createdAt: "desc" } },
    },
  });

  const files = order
    ? order.files
    : await prisma.file.findMany({
        where: { orderId },
        orderBy: { createdAt: "desc" },
      });

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
    order?.tracks?.map((t: OrderTrack) => ({
      track: t.track,
      status: t.status,
      plannedStartAt: t.plannedStartAt?.toISOString() ?? null,
      plannedEndAt: t.plannedEndAt?.toISOString() ?? null,
      timeSpentMinutes: t.timeSpentMinutes ?? 0,
    })) ??
    ([
      { track: "A", status: "INKOMMANDE", plannedStartAt: null, plannedEndAt: null, timeSpentMinutes: 0 },
      { track: "B", status: "INKOMMANDE", plannedStartAt: null, plannedEndAt: null, timeSpentMinutes: 0 },
    ] as const);

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
      orderNumber: order?.orderNumber ?? orderId,
      title: order?.title ?? `Order ${orderId}`,
      customerName: order?.customerName ?? null,
      notes: order?.notes ?? null,
      tracks,
      timeEntries: serializedTimeEntries,
      files: signed,
      billingConfirmedAt: order?.billingConfirmedAt?.toISOString() ?? null,
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
