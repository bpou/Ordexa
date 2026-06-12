import { Clock3 } from "lucide-react";
import { getServerSession } from "next-auth";

import {
  DASHBOARD_PERMS,
  getDashboardRole,
} from "@/components/dashboard-content-config";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { authOptions } from "@/lib/auth";
import { type TrackStatus } from "@/lib/orderStatus";
import { prisma } from "@/lib/prisma";
import { APP_TRACKS, isAppTrack, type AppTrack } from "@/lib/tracks";

type RiskLevel = "blocked" | "risk" | "normal" | "ready";

type OrderSummaryRow = {
  dueDate: Date | null;
  tracks: Array<{
    track: AppTrack;
    status: TrackStatus | null;
    plannedStartAt: Date | null;
  }>;
};

function isDone(status: TrackStatus | null) {
  return status === "AVSLUTAD" || status === "LEVERANS";
}

function getTrackStatus(order: OrderSummaryRow, track: AppTrack) {
  return order.tracks.find((item) => item.track === track)?.status ?? null;
}

function orderRisk(order: OrderSummaryRow, tracks: AppTrack[]): RiskLevel {
  const scoped = order.tracks.filter((item) => tracks.includes(item.track));

  if (scoped.length > 0 && scoped.every((item) => isDone(item.status))) {
    return "ready";
  }

  if (order.dueDate && order.dueDate.getTime() < Date.now()) {
    return "blocked";
  }

  if (scoped.some((item) => item.status === "INKOMMANDE" || item.status === "PALACK")) {
    return "risk";
  }

  return "normal";
}

export default async function DashboardOverviewCards() {
  const session = await getServerSession(authOptions);
  const role = getDashboardRole(
    (session?.user as { role?: string | null } | undefined)?.role
  );
  const visibleTracks = DASHBOARD_PERMS[role].tracks;

  const rawOrders = await prisma.order.findMany({
    where: { billingConfirmedAt: null },
    select: {
      dueDate: true,
      tracks: {
        select: {
          track: true,
          status: true,
          plannedStartAt: true,
        },
      },
    },
  });

  const orders: OrderSummaryRow[] = rawOrders
    .map((order) => ({
      dueDate: order.dueDate,
      tracks: order.tracks
        .filter(
          (item): item is typeof item & { track: AppTrack } => isAppTrack(item.track)
        )
        .map((item) => ({
          track: item.track,
          status: item.status as TrackStatus | null,
          plannedStartAt: item.plannedStartAt,
        })),
    }))
    .filter((order) =>
      order.tracks.some((item) => visibleTracks.includes(item.track))
    );

  let urgentCount = 0;
  let warningCount = 0;
  let readyCount = 0;
  const now = Date.now();

  for (const order of orders) {
    const risk = orderRisk(order, visibleTracks);

    if (order.dueDate && order.dueDate.getTime() < now && risk !== "ready") {
      urgentCount += 1;
    }

    for (const track of APP_TRACKS) {
      if (!visibleTracks.includes(track)) {
        continue;
      }

      const current = getTrackStatus(order, track);
      const needsAttention = current === "INKOMMANDE" || current === "PALACK";

      if (!needsAttention) {
        continue;
      }

      const idx = APP_TRACKS.indexOf(track);
      if (idx > 0) {
        const previousStatus = getTrackStatus(order, APP_TRACKS[idx - 1]);
        if (previousStatus && !isDone(previousStatus)) {
          warningCount += 1;
        }
      }

      const planned =
        order.tracks.find((item) => item.track === track)?.plannedStartAt ?? null;

      if (!planned) {
        warningCount += 1;
      }
    }

    if (risk === "ready") {
      readyCount += 1;
    }
  }

  const summaryCards = [
    {
      title: "Aktiva ordrar",
      value: orders.length,
      className: "border-neutral-200 bg-white text-neutral-900",
    },
    {
      title: "P\u00e5g\u00e5ende jobb",
      value: warningCount,
      className: "border-amber-200 bg-amber-50 text-amber-900",
    },
    {
      title: "Fakturering",
      value: readyCount,
      className: "border-emerald-200 bg-emerald-50 text-emerald-900",
    },
    {
      title: "F\u00f6rsenade",
      value: urgentCount,
      className: "border-red-200 bg-red-50 text-red-900",
    },
  ];

  return (
    <Card className="rounded-2xl border-neutral-200 bg-white shadow-[0_24px_60px_-42px_rgba(15,23,42,0.35)]">
      <CardHeader className="border-b-0 px-6 pt-6 pb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
              {"\u00d6versikt"}
            </p>
            <p className="max-w-2xl text-sm text-neutral-600">
              {`${orders.length} aktiva ordrar \u00f6ver ${visibleTracks.length} sp\u00e5r`}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Clock3 className="h-4 w-4" />
            Livestatus f\u00f6r arbetsfl\u00f6de
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-4 gap-1 px-2 pb-6 pt-0 sm:gap-1.5 sm:px-3 md:gap-2 md:px-4 xl:gap-3 xl:px-6">
        {summaryCards.map((card) => (
          <div
            key={card.title}
            className={`relative flex aspect-square min-w-0 flex-col items-stretch justify-start rounded-md border p-[clamp(0.25rem,1.1vw,0.75rem)] xl:aspect-auto xl:items-start xl:justify-between xl:rounded-xl xl:p-4 ${card.className}`}
          >
            <p className="relative z-10 self-start text-left text-[clamp(0.55rem,1.6vw,0.78rem)] font-medium uppercase tracking-[0.04em] opacity-80 xl:text-xs">
              {card.title}
            </p>
            <p className="absolute inset-0 flex items-center justify-center text-[clamp(1.2rem,5.2vw,2.8rem)] font-semibold leading-none xl:relative xl:inset-auto xl:mt-3 xl:block xl:text-3xl">
              {card.value}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
