// src/app/api/orders/confirm-billing/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageBilling } from "@/lib/permissions";
import { onlyActiveOrders } from "@/lib/filters";
import { createOrderHistoryEvent } from "@/lib/order-history";

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

  const where = {
    ...onlyActiveOrders,
    orderNumber: { in: orderNumbers },
    ...(role === Role.SALJARE ? { createdById: userId } : {}),
  };
  const orders = await prisma.order.findMany({
    where,
    select: { orderNumber: true },
  });
  const billingConfirmedAt = new Date();
  const sessionUser = session.user as { id?: string | null; name?: string | null; email?: string | null };

  await prisma.$transaction(async (tx) => {
    await tx.order.updateMany({
      where,
      data: { billingConfirmedAt },
    });

    await Promise.all(
      orders.map((order) =>
        createOrderHistoryEvent({
          db: tx,
          orderId: order.orderNumber,
          type: "billing",
          title: "Fakturering bekräftad",
          description: `${sessionUser.name || sessionUser.email || "Okänd användare"} markerade ordern som fakturerad.`,
          actor: sessionUser,
        })
      )
    );
  });

  return NextResponse.json({ ok: true });
}
