import { cn } from "@/lib/utils";

type DashboardGridItemSpan =
  | "full"
  | "main"
  | "aside"
  | "half"
  | "third";

const spanClasses: Record<DashboardGridItemSpan, string> = {
  full: "md:col-span-12",
  main: "md:col-span-12 xl:col-span-12",
  aside: "md:col-span-12 xl:col-span-5",
  half: "md:col-span-6",
  third: "md:col-span-4",
};

export function DashboardGrid({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "grid w-full flex-1 auto-rows-min grid-cols-1 items gap-4 p-4 pt-0 md:grid-cols-12 max-w-screen-2xl mx-auto",
        className
      )}
      {...props}
    />
  );
}

export function DashboardGridItem({
  span = "full",
  className,
  ...props
}: React.ComponentProps<"section"> & {
  span?: DashboardGridItemSpan;
}) {
  return (
    <section
      className={cn("min-w-0", spanClasses[span], className)}
      {...props}
    />
  );
}