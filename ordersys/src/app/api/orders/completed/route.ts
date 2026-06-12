// src/app/api/orders/completed/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageBilling } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as { role?: Role } | null | undefined)?.role;
  if (!canManageBilling(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = (session.user as { id?: string } | null | undefined)?.id;
  if (role === Role.SALJARE && !userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orders = await prisma.order.findMany({
    where: {
      ...(role === Role.SALJARE ? { createdById: userId } : {}),
      billingConfirmedAt: null,                     // ⬅️ ännu inte arkiverad
      AND: [
        { tracks: { some: { track: "A", status: "AVSLUTAD" } } },
        { tracks: { some: { track: "B", status: "AVSLUTAD" } } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    select: { orderNumber: true, title: true, customerName: true, updatedAt: true },
  });

  return NextResponse.json({ orders }, { headers: { "Cache-Control": "no-store" } });
}
