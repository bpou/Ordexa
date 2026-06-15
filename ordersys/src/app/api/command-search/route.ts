import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma, Role, Track } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { onlyRealFortnoxOrders } from "@/lib/filters";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type CommandItem = {
  id: string;
  type: "action" | "order" | "calendar" | "board";
  title: string;
  subtitle: string;
  href: string;
  keywords: string;
};

const ROLE_TRACK: Partial<Record<Role, Track>> = {
  A_TEAM: Track.A,
  B_TEAM: Track.B,
  C_TEAM: Track.C,
  D_TEAM: Track.D,
};

const TRACK_META: Record<"A" | "B" | "C" | "D", { name: string; slug: string }> = {
  A: { name: "Atelje", slug: "a" },
  B: { name: "Verkstad", slug: "b" },
  C: { name: "Montage", slug: "c" },
  D: { name: "Bildekor", slug: "d" },
};

function visibleTracks(role: Role | string | undefined) {
  if (role === Role.A_TEAM) return [Track.A];
  if (role === Role.B_TEAM) return [Track.B];
  if (role === Role.C_TEAM) return [Track.C];
  if (role === Role.D_TEAM) return [Track.D];
  return [Track.A, Track.B, Track.C, Track.D];
}

function orderVisibilityWhere(sessionUser: { id?: string | null; email?: string | null; role?: Role | string }) {
  const role = sessionUser.role as Role | undefined;
  const base: Prisma.OrderWhereInput = { ...onlyRealFortnoxOrders };

  if (role === Role.ADMIN) return base;
  if (role === Role.SALJARE) {
    const ownerFilters = [
      sessionUser.id ? { createdById: sessionUser.id } : {},
      sessionUser.email ? { createdBy: { email: sessionUser.email } } : {},
      sessionUser.email ? { createdByName: sessionUser.email } : {},
    ].filter((entry) => Object.keys(entry).length > 0);
    if (!ownerFilters.length) return { ...base, orderNumber: "__no_access__" };

    return {
      ...base,
      OR: ownerFilters,
    };
  }

  const track = role ? ROLE_TRACK[role] : null;
  return track ? { ...base, tracks: { some: { track } } } : { ...base, orderNumber: "__no_access__" };
}

function baseActions(role: Role | string | undefined): CommandItem[] {
  const tracks = visibleTracks(role);
  const actions: CommandItem[] = [
    {
      id: "new-order",
      type: "action",
      title: "Skapa ny order",
      subtitle: "Registrera Fortnox-order och planera spår",
      href: "/orders/new",
      keywords: "ny order skapa fortnox",
    },
    {
      id: "orders-overview",
      type: "action",
      title: "Aktiva ordrar",
      subtitle: "Öppna ordersammanställningen",
      href: "/orders/overview",
      keywords: "orders overview aktiva",
    },
    {
      id: "personal-calendar",
      type: "calendar",
      title: "Personlig kalender",
      subtitle: "Egen planering och interna händelser",
      href: "/personal-calendar",
      keywords: "personlig kalender egen",
    },
  ];

  for (const track of tracks) {
    const meta = TRACK_META[track as keyof typeof TRACK_META];
    actions.push({
      id: `calendar-${track}`,
      type: "calendar",
      title: `${meta.name} kalender`,
      subtitle: "Planering, tider och luckor",
      href: `/calendar/${meta.slug}`,
      keywords: `${meta.name} kalender planering ${track}`,
    });
    actions.push({
      id: `board-${track}`,
      type: "board",
      title: `${meta.name} översikt`,
      subtitle: "Status och arbetskö för spåret",
      href: `/orders/track/${track}`,
      keywords: `${meta.name} overview status spår ${track}`,
    });
  }

  return actions;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as
    | { id?: string | null; email?: string | null; role?: Role | string }
    | undefined;

  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const normalized = q.toLowerCase();
  const actions = baseActions(sessionUser.role).filter((item) => {
    if (!normalized) return true;
    return [item.title, item.subtitle, item.keywords].some((value) => value.toLowerCase().includes(normalized));
  });

  const orderSearch: Prisma.OrderWhereInput = q
    ? {
        OR: [
          { orderNumber: { contains: q, mode: "insensitive" } },
          { title: { contains: q, mode: "insensitive" } },
          { customerName: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const orders = await prisma.order.findMany({
    where: {
      AND: [orderVisibilityWhere(sessionUser), orderSearch],
    },
    select: {
      orderNumber: true,
      title: true,
      customerName: true,
      updatedAt: true,
      billingConfirmedAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: q ? 8 : 5,
  });

  const orderItems: CommandItem[] = orders.map((order) => ({
    id: `order-${order.orderNumber}`,
    type: "order",
    title: `#${order.orderNumber} ${order.title}`,
    subtitle: [order.customerName, order.billingConfirmedAt ? "Arkiverad" : "Aktiv"].filter(Boolean).join(" · "),
    href: order.billingConfirmedAt ? "/orders/archived" : `/orders/${encodeURIComponent(order.orderNumber)}`,
    keywords: `${order.orderNumber} ${order.title} ${order.customerName ?? ""}`,
  }));

  return NextResponse.json({ items: [...actions.slice(0, 8), ...orderItems] });
}
