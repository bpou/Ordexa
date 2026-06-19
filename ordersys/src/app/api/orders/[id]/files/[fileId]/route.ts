import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { canDeleteOrderFiles } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { deleteStoredFile } from "@/lib/file-storage";
import { createOrderHistoryEvent, trackHistoryLabel } from "@/lib/order-history";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string; fileId: string }> };

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id: orderId, fileId } = await ctx.params;

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as { role?: Role } | null | undefined)?.role;
    if (!canDeleteOrderFiles(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const file = await prisma.file.findUnique({ where: { id: fileId } });
    if (!file || file.orderId !== orderId) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Attempt to delete the backing S3 object, but swallow missing-object errors.
    try {
      await deleteStoredFile(file.url);
    } catch (e) {
      console.warn("File storage delete warning:", e);
    }

    await prisma.file.delete({ where: { id: fileId } });

    const sessionUser = session.user as { id?: string | null; name?: string | null; email?: string | null };
    await createOrderHistoryEvent({
      orderId,
      type: "file",
      title: "Fil borttagen",
      description: `${sessionUser.name || sessionUser.email || "Okänd användare"} tog bort ${file.filename} från ${trackHistoryLabel(file.track)}.`,
      actor: sessionUser,
      metadata: {
        fileId,
        filename: file.filename,
        track: file.track,
      },
    });

    await pusherServer.trigger(`order-${orderId}`, "file:deleted", { id: fileId });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE file error", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
