// src/app/api/orders/recent/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { onlyActiveOrders } from "@/lib/filters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? 5);

  const orders = await prisma.order.findMany({
    where: onlyActiveOrders,          // ⬅️ här!
    take: Math.min(Math.max(limit, 1), 50),
    orderBy: { createdAt: "desc" },
    select: { orderNumber: true, title: true, customerName: true, createdAt: true },
  });

  return NextResponse.json({ orders }, { headers: { "Cache-Control": "no-store" } });
}
