import { getServerSession } from "next-auth";

import {
  DASHBOARD_PERMS,
  getDashboardRole,
} from "@/components/dashboard-content-config";
import DashboardCreatedOrdersChartClient from "@/components/dashboard-created-orders-chart-client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatMonthLabel(date: Date) {
  const label = new Intl.DateTimeFormat("sv-SE", { month: "short" }).format(date);
  const normalized = label.replace(".", "");

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default async function DashboardCreatedOrdersChart() {
  const session = await getServerSession(authOptions);
  const role = getDashboardRole(
    (session?.user as { role?: string | null } | undefined)?.role
  );
  const visibleTracks = DASHBOARD_PERMS[role].tracks;

  const currentMonth = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    return new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() - (5 - index),
      1
    );
  });

  const periodStart = months[0];
  const nextMonthStart = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    1
  );

  const rawOrders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: periodStart,
        lt: nextMonthStart,
      },
    },
    select: {
      createdAt: true,
      tracks: {
        select: {
          track: true,
        },
      },
    },
  });

  const counts = new Map(months.map((date) => [monthKey(date), 0]));

  for (const order of rawOrders) {
    const isVisible = order.tracks.some((track) =>
      visibleTracks.includes(track.track as (typeof visibleTracks)[number])
    );

    if (!isVisible) {
      continue;
    }

    const key = monthKey(order.createdAt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const chartData = months.map((date) => ({
    month: formatMonthLabel(date),
    orders: counts.get(monthKey(date)) ?? 0,
  }));

  const currentCount = chartData[chartData.length - 1]?.orders ?? 0;
  const previousCount = chartData[chartData.length - 2]?.orders ?? 0;
  const totalOrders = chartData.reduce((sum, item) => sum + item.orders, 0);

  let summaryLine = `${currentCount} skapade denna m\u00e5nad`;
  let trendDirection: "up" | "down" | "flat" = "flat";

  if (previousCount > 0) {
    const trendPercent = ((currentCount - previousCount) / previousCount) * 100;
    const formattedPercent = Math.abs(trendPercent).toFixed(1);

    if (trendPercent > 0) {
      summaryLine = `Upp ${formattedPercent}% mot f\u00f6rra m\u00e5naden`;
      trendDirection = "up";
    } else if (trendPercent < 0) {
      summaryLine = `Ner ${formattedPercent}% mot f\u00f6rra m\u00e5naden`;
      trendDirection = "down";
    } else {
      summaryLine = "Samma niv\u00e5 som f\u00f6rra m\u00e5naden";
    }
  } else if (currentCount === 0) {
    summaryLine = "Inga skapade ordrar denna m\u00e5nad";
  } else {
    trendDirection = "up";
  }

  return (
    <DashboardCreatedOrdersChartClient
      chartData={chartData}
      periodLabel="Senaste 6 månaderna"
      summaryLine={summaryLine}
      detailLine={`Visar antalet skapade ordrar under perioden`}
      trendDirection={trendDirection}
    />
  );
}
