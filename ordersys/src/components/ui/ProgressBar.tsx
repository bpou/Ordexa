"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

type ProgressBarProps = {
  value?: number; // 0-100 for determinate, undefined for indeterminate
  className?: string;
  ariaLabel?: string;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
};

export default function ProgressBar({
  value,
  className,
  ariaLabel = "Progress",
  size = "md",
}: ProgressBarProps) {
  const isIndeterminate = value === undefined;

  return (
    <div
      role="progressbar"
      aria-valuenow={isIndeterminate ? undefined : value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      className={cn(
        "relative w-full overflow-hidden rounded-full bg-muted",
        sizeClasses[size],
        className
      )}
    >
      <motion.div
        className="absolute left-0 top-0 h-full bg-primary rounded-full"
        initial={{ width: isIndeterminate ? "0%" : "0%" }}
        animate={
          isIndeterminate
            ? {
                x: ["-100%", "100%"],
                transition: {
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              }
            : {
                width: `${value}%`,
                transition: { duration: 0.3, ease: "easeOut" },
              }
        }
        style={isIndeterminate ? { width: "50%" } : undefined}
      />
    </div>
  );
}