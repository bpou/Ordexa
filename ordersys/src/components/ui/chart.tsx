"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    color?: string;
  }
>;

type ChartContextValue = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextValue | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("Chart components must be used within a ChartContainer.");
  }

  return context;
}

type ChartContainerProps = React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ReactNode;
};

export function ChartContainer({
  config,
  className,
  children,
  style,
  ...props
}: ChartContainerProps) {
  const chartStyles = React.useMemo(() => {
    return Object.fromEntries(
      Object.entries(config)
        .filter(([, item]) => Boolean(item.color))
        .map(([key, item]) => [`--color-${key}`, item.color])
    ) as React.CSSProperties;
  }, [config]);

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/60 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className
        )}
        style={{ ...chartStyles, ...style }}
        {...props}
      >
        <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

export const ChartTooltip = RechartsPrimitive.Tooltip;

type ChartTooltipPayloadItem = {
  color?: string;
  dataKey?: string | number;
  name?: string | number;
  value?: string | number | null;
};

type ChartTooltipContentProps = React.HTMLAttributes<HTMLDivElement> & {
  active?: boolean;
  payload?: ChartTooltipPayloadItem[];
  label?: string | number;
  hideLabel?: boolean;
  hideIndicator?: boolean;
  formatter?: (
    value: ChartTooltipPayloadItem["value"],
    name: string,
    item: ChartTooltipPayloadItem,
    index: number
  ) => React.ReactNode;
  labelFormatter?: (
    label: string | number,
    payload: ChartTooltipPayloadItem[]
  ) => React.ReactNode;
};

export function ChartTooltipContent({
  active,
  payload,
  label,
  className,
  hideLabel = false,
  hideIndicator = false,
  formatter,
  labelFormatter,
}: ChartTooltipContentProps) {
  const { config } = useChart();

  if (!active || !payload?.length) {
    return null;
  }

  const renderedLabel = labelFormatter
    ? labelFormatter(label ?? "", payload)
    : label;

  return (
    <div
      className={cn(
        "grid min-w-[8rem] gap-2 rounded-lg border border-border/70 bg-card px-3 py-2 text-xs shadow-xl",
        className
      )}
    >
      {!hideLabel && renderedLabel ? (
        <div className="font-medium text-foreground">{renderedLabel}</div>
      ) : null}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = String(item.dataKey ?? item.name ?? index);
          const labelText =
            config[key]?.label ??
            (typeof item.name === "string" ? item.name : key);

          return (
            <div key={key} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                {!hideIndicator ? (
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color ?? `var(--color-${key})` }}
                  />
                ) : null}
                <span>{labelText}</span>
              </div>
              <div className="font-mono font-medium text-foreground">
                {formatter
                  ? formatter(item.value, String(labelText), item, index)
                  : item.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
