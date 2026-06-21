import Link from "next/link";
import { AlertTriangle, ArrowUpRight, CalendarClock, CircleDollarSign, Gauge, Sparkles } from "lucide-react";

import { MetricCard, ProductHeader, ProductSection } from "@/components/product-ui";
import { Button } from "@/components/ui/button";
import { onlyActiveOrders } from "@/lib/filters";
import { prisma } from "@/lib/prisma";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export default async function DashboardOperationalCockpit({ name }: { name: string }) {
  const today = startOfToday();
  const inSevenDays = new Date(today);
  inSevenDays.setDate(inSevenDays.getDate() + 7);

  const [active, overdue, dueSoon, invoiceReady, inProgress] = await Promise.all([
    prisma.order.count({ where: onlyActiveOrders }),
    prisma.order.count({ where: { ...onlyActiveOrders, dueDate: { lt: today } } }),
    prisma.order.count({ where: { ...onlyActiveOrders, dueDate: { gte: today, lt: inSevenDays } } }),
    prisma.order.count({
      where: {
        ...onlyActiveOrders,
        AND: [
          { tracks: { some: { track: "A", status: "AVSLUTAD" } } },
          { tracks: { some: { track: "B", status: "AVSLUTAD" } } },
        ],
      },
    }),
    prisma.orderTrack.count({ where: { status: "PAGAENDE", order: onlyActiveOrders } }),
  ]);

  return (
    <div className="space-y-4">
      <ProductHeader
        eyebrow="Operativ översikt"
        title={<>God dag, {name.split(" ")[0]}</>}
        description="Det viktigaste först: risker, leveranser och arbete som kan föras vidare idag."
        actions={
          <>
            <Button asChild variant="outline" size="lg" className="rounded-xl bg-card/80">
              <Link href="/field">Öppna fältläge</Link>
            </Button>
            <Button asChild variant="default" size="lg" className="rounded-xl shadow-lg shadow-primary/20">
              <Link href="/orders/new">
                Ny order <ArrowUpRight />
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Aktiva jobb" value={active} detail="Ordrar i produktion" icon={Gauge} />
        <MetricCard label="Pågående" value={inProgress} detail="Aktiva spår just nu" icon={Sparkles} />
        <MetricCard label="Denna vecka" value={dueSoon} detail="Leveranser inom sju dagar" icon={CalendarClock} tone="warning" />
        <MetricCard label="Försenade" value={overdue} detail="Behöver ett aktivt beslut" icon={AlertTriangle} tone={overdue ? "danger" : "success"} />
        <MetricCard label="Fakturaklara" value={invoiceReady} detail="Redo för ekonomi" icon={CircleDollarSign} tone="success" />
      </div>

      {overdue > 0 ? (
        <ProductSection className="flex flex-col gap-3 border-red-200/70 bg-gradient-to-r from-red-50 to-card p-4 dark:from-red-950/25 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/12 text-red-700 dark:text-red-300">
              <AlertTriangle className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">{overdue} leveranser har passerat datum</p>
              <p className="text-xs text-muted-foreground">Filtrera orderöversikten och bestäm nästa åtgärd.</p>
            </div>
          </div>
          <Button asChild variant="outline" className="rounded-xl bg-card">
            <Link href="/orders/overview">Granska risker</Link>
          </Button>
        </ProductSection>
      ) : null}
    </div>
  );
}
