import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  PlusCircle,
  Quote,
  type LucideIcon,
} from "lucide-react";
import { getServerSession } from "next-auth";

import {
  DASHBOARD_PERMS,
  type DashboardQuickLinkKey,
  getDashboardRole,
} from "@/components/dashboard-content-config";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TRACK_SLUGS, type AppTrack } from "@/lib/tracks";
import { cn } from "@/lib/utils";

type QuickMeta = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

const QUICK_META: Record<DashboardQuickLinkKey, QuickMeta> = {
  new: {
    title: "Ny order",
    description: "Skapa en ny order",
    href: "/orders/new",
    icon: PlusCircle,
  },
  newQuote: {
    title: "Ny offert",
    description: "Skapa en offert",
    href: "/quotes/new",
    icon: Quote,
  },
  overview: {
    title: "Alla ordrar",
    description: "\u00d6ppna order\u00f6versikt",
    href: "/orders/overview",
    icon: LayoutDashboard,
  },
  planner: {
    title: "\u00d6ppna planering",
    description: "Visa teamets schema",
    href: "/calendar/a",
    icon: CalendarDays,
  },
  completed: {
    title: "Fakturering",
    description: "Granska f\u00e4rdiga ordrar",
    href: "/orders/completed",
    icon: ClipboardList,
  },
};

const CALENDAR_LABELS: Record<AppTrack, string> = {
  A: "Kalender Atelj\u00e9",
  B: "Kalender Verkstad",
  C: "Kalender Montage",
  D: "Kalender Bildekor",
};

export default async function DashboardQuickActions({
  className,
}: {
  className?: string;
}) {
  const session = await getServerSession(authOptions);
  const role = getDashboardRole(
    (session?.user as { role?: string | null } | undefined)?.role
  );
  const perms = DASHBOARD_PERMS[role];

  const plannerLink = `/calendar/${TRACK_SLUGS[perms.calendar]}`;
  const plannerLabel = CALENDAR_LABELS[perms.calendar];

  const invoiceReady = await prisma.order.count({
    where: {
      billingConfirmedAt: null,
      AND: [
        { tracks: { some: { track: "A", status: "AVSLUTAD" } } },
        { tracks: { some: { track: "B", status: "AVSLUTAD" } } },
      ],
    },
  });

  return (
    <Card
      className={cn(
        "flex h-full flex-col rounded-2xl border-neutral-200 bg-white shadow-sm",
        className
      )}
    >
      <CardHeader className="border-neutral-200 px-6 py-5">
        <h2 className="text-lg font-semibold text-neutral-900">
          Snabb\u00e5tg\u00e4rder
        </h2>
      </CardHeader>
      <CardContent className="flex-1 px-4 pb-5 pt-4 sm:px-6">
        <div className="grid gap-2">
          {perms.quick.map((key) => {
            const meta =
              key === "planner"
                ? {
                    ...QUICK_META.planner,
                    href: plannerLink,
                    description: plannerLabel,
                  }
                : QUICK_META[key];
            const Icon = meta.icon;

            return (
              <Link
                key={key}
                href={meta.href}
                className="group flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3 transition hover:shadow-sm"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-700">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-neutral-900">
                      {meta.title}
                    </span>
                    <span className="block truncate text-xs text-neutral-500">
                      {meta.description}
                    </span>
                  </span>
                </span>
                <span className="inline-flex items-center gap-2 text-xs text-neutral-500">
                  {key === "completed" ? `${invoiceReady}` : ""}
                  <ChevronRight className="h-4 w-4" />
                </span>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
