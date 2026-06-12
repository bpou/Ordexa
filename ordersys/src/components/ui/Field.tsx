import { cn } from "@/lib/cn";

type BaseProps = { label: string; className?: string; children?: React.ReactNode };
export function Field({ label, className, children }: BaseProps) {
  return (
    <label className={cn("flex flex-col gap-1", className)}>
      <span className="text-[13px] text-foreground/80">{label}</span>
      {children}
    </label>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;
export function Input(props: InputProps) {
  return (
    <input
      {...props}
      className={cn(
        "h-7 rounded-md border bg-white/90 px-2 text-[13px] shadow-[inset_0_1px_0_rgba(0,0,0,.03)]",
        "placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-primary/25"
      )}
    />
  );
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;
export function Select(props: SelectProps) {
  return (
    <select
      {...props}
      className={cn(
        "h-7 rounded-md border bg-white/90 px-2 text-[13px]",
        "focus:outline-none focus:ring-2 focus:ring-primary/25"
      )}
    />
  );
}
