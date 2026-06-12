import { cn } from "@/lib/cn";
export default function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md bg-primary text-white px-2 py-0.5 text-[12px] leading-none",
        className
      )}
      {...props}
    />
  );
}
