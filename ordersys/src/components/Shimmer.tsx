"use client";

import { cn } from "@/lib/cn";

interface ShimmerProps {
  className?: string;
  children?: React.ReactNode;
  isLoading?: boolean;
  duration?: number;
  disabled?: boolean;
  variant?: "default" | "pill";
}

/**
 * Shimmer animation component for loading states.
 * Provides a subtle, sweeping highlight effect similar to skeleton loaders.
 * Respects user's reduced motion preferences.
 */
export function Shimmer({
  className,
  children,
  isLoading = true,
  duration = 1.5,
  disabled = false,
  variant = "default",
}: ShimmerProps) {
const shimmerClasses =
  variant === "pill"
    ? "absolute inset-0 z-20 animate-shimmer-pill rounded-[inherit] overflow-hidden bg-gradient-to-r from-transparent via-white/30 to-transparent"
    : "absolute -inset-2 z-20 animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-[inherit] overflow-hidden";


  return (
    <span className={cn("relative inline-block overflow-hidden", className)}>
      {/* Base content */}
      <span className="relative z-10">{children}</span>

      {/* Shimmer overlay - only show when loading and not disabled */}
      {isLoading && !disabled && (
        <span
          className={cn("absolute inset-0", shimmerClasses)}
          style={{
            animationDuration: `${duration}s`,
            borderRadius: "inherit",
          }}
        />
      )}
    </span>
  );
}

/**
 * Hook to detect if user prefers reduced motion
 */
export function useReducedMotion() {
  if (typeof window === "undefined") return false;

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Shimmer wrapper that automatically respects reduced motion preferences
 */
export function ShimmerAuto({
  className,
  children,
  isLoading = true,
  duration = 1.5,
}: Omit<ShimmerProps, "disabled">) {
  const reducedMotion = useReducedMotion();

  return (
    <Shimmer
      className={className}
      isLoading={isLoading}
      duration={duration}
      disabled={reducedMotion}
    >
      {children}
    </Shimmer>
  );
}