"use client";

import { TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type DashboardCreatedOrdersChartClientProps = {
  chartData: Array<{
    month: string;
    orders: number;
  }>;
  periodLabel: string;
  summaryLine: string;
  detailLine: string;
  trendDirection: "up" | "down" | "flat";
};

const chartConfig = {
  orders: {
    label: "Ordrar",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export default function DashboardCreatedOrdersChartClient({
  chartData,
  periodLabel,
  summaryLine,
  detailLine,
  trendDirection,
}: DashboardCreatedOrdersChartClientProps) {
  return (
    <Card className="rounded-2xl border-neutral-200 bg-white shadow-sm">
      <CardHeader className="border-neutral-200 px-6 py-5">
        <CardTitle>Skapade ordrar</CardTitle>
        <CardDescription>{periodLabel}</CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-0 pt-4 sm:px-6">
        <ChartContainer
          config={chartConfig}
          className="h-[200px] w-full aspect-auto sm:h-[220px]"
        >
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
              top: 8,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Line
              dataKey="orders"
              type="natural"
              stroke="var(--color-orders)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 px-6 pb-5 pt-4 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium text-foreground">
          {summaryLine}
          <TrendingUp
            className={
              trendDirection === "down"
                ? "h-4 w-4 rotate-180"
                : "h-4 w-4"
            }
          />
        </div>
        <div className="leading-none text-muted-foreground">{detailLine}</div>
      </CardFooter>
    </Card>
  );
}
