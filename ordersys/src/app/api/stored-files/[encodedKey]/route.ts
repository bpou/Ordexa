import { NextResponse } from "next/server";
import {
  decodeDatabaseStoredFileKey,
  ensureDatabaseStoredFileTable,
  isDatabaseStoredFileKey,
} from "@/lib/file-storage";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ encodedKey: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { encodedKey } = await ctx.params;
  let key: string;

  try {
    key = decodeDatabaseStoredFileKey(encodedKey);
  } catch {
    return NextResponse.json({ error: "Invalid file key" }, { status: 400 });
  }

  if (!isDatabaseStoredFileKey(key)) {
    return NextResponse.json({ error: "Invalid file key" }, { status: 400 });
  }

  await ensureDatabaseStoredFileTable();
  const file = await prisma.storedFile.findUnique({
    where: { key },
    select: { body: true, contentType: true },
  });

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  return new Response(Buffer.from(file.body), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "private, max-age=300",
    },
  });
}
