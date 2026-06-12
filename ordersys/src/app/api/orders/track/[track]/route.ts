// src/app/api/orders/track/[track]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { Prisma, type Role, type Track, type TrackStatus } from "@prisma/client";
import { normalizeTrack } from "@/lib/tracks";
import { authOptions } from "@/lib/auth";
import { canManageTrack } from "@/lib/permissions";
import { s3PresignGetUrl } from "@/lib/s3";

type Params = { track: string };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
const FILE_URL_TTL_SEC = 600;

export async function GET(
  _req: Request,
  ctx: { params: Promise<Params> }
) {
  const { track } = await ctx.params;
  const normalized = normalizeTrack(track);

  if (!normalized) {
    return NextResponse.json({ error: "Ogiltigt spår" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as { role?: Role } | null | undefined)?.role;
  if (!canManageTrack(role, normalized as Track)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let rows;
  try {
    rows = await prisma.orderTrack.findMany({
      where: {
        track: normalized as Track,
        order: {
          billingConfirmedAt: null,
        },
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            title: true,
            customerName: true,
            createdAt: true,
            billingConfirmedAt: true,
            files: {
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                filename: true,
                url: true,
              },
            },
          },
        },
      },
      orderBy: { order: { createdAt: "desc" } },
    });
  } catch (error) {
    console.error(`[orders/track/${normalized}]`, error);
    return NextResponse.json(
      { error: "Kunde inte hämta order-spår" },
      { status: 500 }
    );
  }

  const fileIds = rows.flatMap((row) => row.order.files.map((file) => file.id));
  const fileUploaders = fileIds.length
    ? await prisma.$queryRaw<
        Array<{
          id: string;
          uploadedBy: string | null;
          uploadedByName: string | null;
          uploadedByImage: string | null;
        }>
      >`
        SELECT "id", "uploadedBy", "uploadedByName", "uploadedByImage"
        FROM "File"
        WHERE "id" IN (${Prisma.join(fileIds)})
      `
    : [];
  const uploaderByFileId = new Map(fileUploaders.map((file) => [file.id, file]));

  const hydratedRows = await Promise.all(
    rows.map(async (row) => ({
      ...row,
      order: {
        ...row.order,
        files: await Promise.all(
          row.order.files.map(async (file) => ({
            ...file,
            url: await s3PresignGetUrl(file.url, FILE_URL_TTL_SEC),
            uploadedBy: uploaderByFileId.get(file.id)?.uploadedBy ?? null,
            uploadedByName: uploaderByFileId.get(file.id)?.uploadedByName ?? null,
            uploadedByImage: uploaderByFileId.get(file.id)?.uploadedByImage ?? null,
          }))
        ),
      },
    }))
  );

  const STATI = ["INKOMMANDE", "PAGAENDE", "LEVERANS", "AVSLUTAD"] as const;
  type Status = typeof STATI[number];

  const grouped: Record<Status, typeof hydratedRows> = {
    INKOMMANDE: [],
    PAGAENDE: [],
    LEVERANS: [],
    AVSLUTAD: [],
  };

  for (const r of hydratedRows) {
    const s = r.status as TrackStatus;
    const key = (STATI.includes(s as Status) ? (s as Status) : "INKOMMANDE") as Status;
    grouped[key].push(r);
  }

  return NextResponse.json(
    { track: normalized, grouped },
    { headers: { "Cache-Control": "no-store" } }
  );
}
