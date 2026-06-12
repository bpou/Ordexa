// src/app/api/orders/confirm-billing/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageBilling } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
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

  const { orderNumbers } = await req.json();
  if (!Array.isArray(orderNumbers) || orderNumbers.length === 0) {
    return new NextResponse("No orders provided", { status: 400 });
  }

  await prisma.order.updateMany({
    where: {
      orderNumber: { in: orderNumbers },
      ...(role === Role.SALJARE ? { createdById: userId } : {}),
    },
    data: { billingConfirmedAt: new Date() }, // ⬅️ markera som arkiverad
  });

  return NextResponse.json({ ok: true });
}
