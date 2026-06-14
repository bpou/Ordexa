import { NextResponse } from "next/server";
import { onlyRealFortnoxOrders } from "@/lib/filters";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const orders = await prisma.order.findMany({
    where: {
      ...onlyRealFortnoxOrders,
      billingConfirmedAt: { not: null },
    },
    orderBy: { billingConfirmedAt: "desc" },
    select: {
      orderNumber: true,
      title: true,
      customerName: true,
      billingConfirmedAt: true,
    },
  });

  return NextResponse.json({ orders }, { headers: { "Cache-Control": "no-store" } });
}
