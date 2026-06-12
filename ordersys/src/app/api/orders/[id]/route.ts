import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { s3PresignGetUrl } from "@/lib/s3";
import { Prisma } from "@prisma/client";
import type { OrderTrack } from "@prisma/client";   // ✅ Prisma model type

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

  const now = Date.now();
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
      const key = f.url; // we stored the S3 key in the url field
      const url = await s3PresignGetUrl(key, FILE_URL_TTL_SEC);
      const uploader = uploaderByFileId.get(f.id);
      return {
        id: f.id,
        filename: f.filename,
        url,
        track: f.track as "A" | "B" | "SHARED",
        createdAt: f.createdAt.toISOString(),
        expiresAt: now + FILE_URL_TTL_SEC * 1000,
        uploadedBy: uploader?.uploadedByName ?? uploader?.uploadedBy ?? null,
        uploadedById: uploader?.uploadedById ?? null,
        uploadedByName: uploader?.uploadedByName ?? uploader?.uploadedBy ?? null,
        uploadedByImage: uploader?.uploadedByImage ?? null,
      };
    })
  );

  const tracks =
    order?.tracks?.map((t: OrderTrack) => ({
      track: t.track,   // t.track is of enum type Prisma.Track
      status: t.status, // t.status is of enum type Prisma.TrackStatus
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
      tracks,
      timeEntries: serializedTimeEntries,
      files: signed,
      billingConfirmedAt: order?.billingConfirmedAt?.toISOString() ?? null,
    },
  });
}
