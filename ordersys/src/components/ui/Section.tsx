import { cn } from "@/lib/cn";

export function Section({ title, className, children }:{
  title: string; className?: string; children: React.ReactNode;
}) {
  return (
    <section className={cn("space-y-2", className)}>
      <h3 className="text-[12px] tracking-wide font-semibold text-foreground/80 uppercase">
        {title}
      </h3>
      <div className="rounded-[var(--radius)] border bg-card p-3">{children}</div>
    </section>
  );
}
