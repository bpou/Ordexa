"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

import {
  DASHBOARD_PERMS,
  getDashboardRole,
} from "@/components/dashboard-content-config";
import { OrdinaLogoSpinner } from "@/components/OrdinaLoader";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { getRecentOrderIds } from "@/lib/recentOrders";
import { APP_TRACKS, type AppTrack } from "@/lib/tracks";
import { cn } from "@/lib/utils";

type OrderSummary = {
  orderNumber: string;
  title: string;
  customerName: string | null;
  createdAt: string | null;
  tracks: AppTrack[];
};

const dateFmt = new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium" });

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function isTrack(value: unknown): value is AppTrack {
  return typeof value === "string" && (APP_TRACKS as readonly string[]).includes(value);
}

function toDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function DashboardRecentOrders({
  className,
}: {
  className?: string;
}) {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [recentOrderIds, setRecentOrderIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let canceled = false;

    (async () => {
      setLoading(true);

      try {
        const response = await fetch("/api/orders", { cache: "no-store" });
        const data = response.ok ? await response.json() : { orders: [] };

        const parsedOrders = (Array.isArray(data?.orders) ? data.orders : [])
          .map((raw: unknown) => {
            if (!raw || typeof raw !== "object") return null;

            const row = raw as Record<string, unknown>;
            if (row.billingConfirmedAt) return null;

            const orderNumber = text(row.orderNumber);
            if (!orderNumber) return null;

            const tracks = (Array.isArray(row.tracks) ? row.tracks : [])
              .map((rawTrack: unknown) => {
                if (!rawTrack || typeof rawTrack !== "object") return null;
                const trackRow = rawTrack as Record<string, unknown>;
                return isTrack(trackRow.track) ? trackRow.track : null;
              })
              .filter((track): track is AppTrack => Boolean(track));

            return {
              orderNumber,
              title: text(row.title, `Order ${orderNumber}`),
              customerName: text(row.customerName) || null,
              createdAt: text(row.createdAt) || null,
              tracks,
            } satisfies OrderSummary;
          })
          .filter((order: OrderSummary | null): order is OrderSummary => Boolean(order));

        if (!canceled) {
          setOrders(parsedOrders);
        }
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    const refreshRecentOrders = () => setRecentOrderIds(getRecentOrderIds(6));

    refreshRecentOrders();
    window.addEventListener("focus", refreshRecentOrders);
    window.addEventListener("storage", refreshRecentOrders);

    return () => {
      window.removeEventListener("focus", refreshRecentOrders);
      window.removeEventListener("storage", refreshRecentOrders);
    };
  }, []);

  const visibleTracks =
    DASHBOARD_PERMS[
      getDashboardRole(
        (session?.user as { role?: string | null } | undefined)?.role
      )
    ].tracks;

  const scopedOrders = useMemo(
    () =>
      orders.filter((order) =>
        order.tracks.some((track) => visibleTracks.includes(track))
      ),
    [orders, visibleTracks]
  );

  const recentOpenedOrders = useMemo(() => {
    const orderByNumber = new Map(
      scopedOrders.map((order) => [order.orderNumber, order])
    );

    return recentOrderIds
      .map((orderNumber) => {
        const order = orderByNumber.get(orderNumber);
        if (!order) return null;

        return {
          id: order.orderNumber,
          href: `/orders/${encodeURIComponent(order.orderNumber)}`,
          title: order.title,
          customer: order.customerName ?? "Okand kund",
          createdAt: toDate(order.createdAt),
        };
      })
      .filter(
        (
          order
        ): order is {
          id: string;
          href: string;
          title: string;
          customer: string;
          createdAt: Date | null;
        } => Boolean(order)
      )
      .slice(0, 6);
  }, [recentOrderIds, scopedOrders]);

  return (
    <Card
      className={cn(
        "flex h-full flex-col rounded-2xl border-neutral-200 bg-white shadow-sm",
        className
      )}
    >
      <CardHeader className="border-neutral-200 px-6 py-5">
        <h2 className="text-lg font-semibold text-neutral-900">
          Senaste ordrar
        </h2>
        <p className="text-sm text-neutral-600">
          De 6 senaste ordrarna du klickade in i.
        </p>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-5 pt-4 sm:px-6">
        {loading ? (
          <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
            <OrdinaLogoSpinner size={20} />
            Laddar senaste ordrar...
          </div>
        ) : null}

        {!loading && !recentOpenedOrders.length ? (
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
            Inga nyligen oppnade ordrar an.
          </div>
        ) : null}

        {!loading
          ? recentOpenedOrders.map((order) => (
              <Link
                key={order.id}
                href={order.href}
                className="group flex items-start justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-neutral-300 hover:bg-neutral-50"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-neutral-900">
                    {order.title}
                  </p>
                  <p className="text-sm text-neutral-600">
                    #{order.id} - {order.customer}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {order.createdAt
                      ? `Skapad ${dateFmt.format(order.createdAt)}`
                      : ""}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-neutral-600">
                  Oppna
                  <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))
          : null}
      </CardContent>
    </Card>
  );
}
