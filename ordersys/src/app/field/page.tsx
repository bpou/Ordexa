import type { Role, Track } from "@prisma/client";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import FieldModeClient from "./FieldModeClient";
import { authOptions } from "@/lib/auth";
import { onlyActiveOrders } from "@/lib/filters";
import { prisma } from "@/lib/prisma";

const ROLE_TRACK: Partial<Record<Role, Track>> = {
  A_TEAM: "A",
  B_TEAM: "B",
  C_TEAM: "C",
  D_TEAM: "D",
};

export default async function FieldPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?callbackUrl=/field");

  const role = (session.user as { role?: Role } | undefined)?.role ?? "SALJARE";
  const roleTrack = ROLE_TRACK[role];
  const rows = await prisma.orderTrack.findMany({
    where: {
      ...(roleTrack ? { track: roleTrack } : {}),
      track: roleTrack ?? { in: ["A", "B", "C", "D"] },
      status: { not: "AVSLUTAD" },
      order: onlyActiveOrders,
    },
    select: {
      id: true,
      track: true,
      status: true,
      plannedStartAt: true,
      plannedEndAt: true,
      order: {
        select: {
          orderNumber: true,
          title: true,
          customerName: true,
          deliveryAddress: true,
          dueDate: true,
        },
      },
    },
    orderBy: [{ plannedStartAt: "asc" }, { order: { dueDate: "asc" } }],
    take: 80,
  });

  return (
    <FieldModeClient
      initialJobs={rows.map((row) => ({
        ...row,
        track: row.track as "A" | "B" | "C" | "D",
        status: row.status as "INKOMMANDE" | "PAGAENDE" | "LEVERANS" | "PALACK",
        plannedStartAt: row.plannedStartAt?.toISOString() ?? null,
        plannedEndAt: row.plannedEndAt?.toISOString() ?? null,
        order: { ...row.order, dueDate: row.order.dueDate?.toISOString() ?? null },
      }))}
      role={role}
    />
  );
}
