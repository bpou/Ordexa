import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function ProductPage({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-screen-2xl space-y-6 pb-10 [--page-accent:var(--primary)]",
        className,
      )}
      {...props}
    />
  );
}

export function ProductHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "relative isolate overflow-hidden rounded-3xl border border-border/80 bg-card px-5 py-6 shadow-[0_24px_80px_-56px_rgba(8,47,36,0.65)] sm:px-7 sm:py-7",
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/12 blur-3xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? (
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-balance text-2xl font-semibold tracking-[-0.035em] text-foreground sm:text-3xl lg:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function ProductSection({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/80 bg-card shadow-[0_20px_60px_-48px_rgba(15,23,42,0.7)]",
        className,
      )}
      {...props}
    />
  );
}

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  detail: string;
  icon: LucideIcon;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const toneClasses = {
    default: "bg-primary/10 text-primary",
    warning: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
    danger: "bg-red-500/12 text-red-700 dark:text-red-300",
    success: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  }[tone];
  return (
    <ProductSection className="group p-4 transition duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_28px_70px_-48px_rgba(5,150,105,0.65)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-foreground">{value}</p>
        </div>
        <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl", toneClasses)}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{detail}</p>
    </ProductSection>
  );
}

export function ProductEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-5 py-10 text-center", className)}>
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary shadow-sm">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-5 text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
