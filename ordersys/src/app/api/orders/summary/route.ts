// src/app/api/orders/summary/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TrackStatus } from "@prisma/client";
import { APP_TRACKS, normalizeTrack, type AppTrack } from "@/lib/tracks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Summary = Partial<Record<TrackStatus, number>>;

type TrackStatusMap = Partial<Record<AppTrack, TrackStatus | null>>;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const normalizedTrack = normalizeTrack(searchParams.get("track") ?? undefined);

  const whereBase = {
    order: { billingConfirmedAt: null },
  } as const;

  const where = normalizedTrack
    ? { ...whereBase, track: normalizedTrack }
    : whereBase;

  try {
    const grouped = await prisma.orderTrack.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    });

    const summary: Summary = { INKOMMANDE: 0, PAGAENDE: 0, LEVERANS: 0, AVSLUTAD: 0 };
    for (const row of grouped) summary[row.status] = row._count._all;

    const tracks = await prisma.orderTrack.findMany({
      where: {
        track: { in: [...APP_TRACKS] },
        order: { billingConfirmedAt: null },
      },
      select: { orderId: true, track: true, status: true },
    });

    const orderMap = new Map<string, TrackStatusMap>();
    for (const t of tracks) {
      if (!APP_TRACKS.includes(t.track as AppTrack)) continue;
      const current = orderMap.get(t.orderId) ?? {};
      current[t.track as AppTrack] = t.status;
      orderMap.set(t.orderId, current);
    }

    const individuals: Summary = { INKOMMANDE: 0, PAGAENDE: 0, LEVERANS: 0, AVSLUTAD: 0 };
    for (const map of orderMap.values()) {
      const statuses = APP_TRACKS.map((track) => map[track]).filter((s): s is TrackStatus => !!s);
      if (statuses.length < 2) continue;
      const first = statuses[0];
      if (statuses.every((s) => s === first)) {
        individuals[first]! += 1;
      }
    }

    return NextResponse.json({ summary, individuals }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[orders/summary]", error);
    return NextResponse.json(
      { error: "Kunde inte hämta order-sammanfattning" },
      { status: 500 }
    );
  }
}
