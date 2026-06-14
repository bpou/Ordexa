import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStoredFileUrl } from "@/lib/file-storage";

export const runtime = "nodejs";
const FILE_URL_TTL_SEC = 600;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id: orderId } = await ctx.params;
    const { ids } = (await req.json()) as { ids: string[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ urls: [] });
    }

    const rows = await prisma.file.findMany({
      where: { id: { in: ids }, orderId },
      select: { id: true, url: true }, // url = S3 key
    });

    const urls = await Promise.all(
      rows.map(async (r) => {
        const stored = await getStoredFileUrl(r.url, FILE_URL_TTL_SEC);
        return { id: r.id, url: stored.url, expiresAt: stored.expiresAt ?? Date.now() + 3_600_000 };
      })
    );

    return NextResponse.json({ urls });
  } catch (e) {
    console.error("renew error", e);
    return NextResponse.json({ urls: [] }, { status: 200 });
  }
}
