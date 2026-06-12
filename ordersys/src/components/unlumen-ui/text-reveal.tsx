"use client";

import * as React from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

export interface TextRevealProps {
  text: string;
  as?: keyof React.JSX.IntrinsicElements;
  splitBy?: "words" | "characters";
  staggerDelay?: number;
  duration?: number;
  once?: boolean;
  className?: string;
}

export function TextReveal({
  text,
  as: Tag = "p",
  splitBy = "words",
  staggerDelay = 0.05,
  duration = 0.5,
  once = true,
  className,
}: TextRevealProps) {
  const ref = React.useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once, margin: "0px 0px -10% 0px" });
  const reduceMotion = useReducedMotion();
  const units =
    splitBy === "words"
      ? text
          .split(/\s+/)
          .map((unit, index, arr) => (index < arr.length - 1 ? `${unit}\u00A0` : unit))
      : text.split("");

  const AnyTag = Tag as React.ElementType;

  return (
    <AnyTag ref={ref} className={cn("leading-relaxed", className)} aria-label={text}>
      {units.map((unit, index) => (
        <motion.span
          key={`${unit}-${index}`}
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0.12, filter: "blur(8px)" }}
          animate={
            reduceMotion
              ? { opacity: 1 }
              : isInView
                ? { opacity: 1, filter: "blur(0px)" }
                : { opacity: 0.12, filter: "blur(8px)" }
          }
          transition={{
            duration: reduceMotion ? 0 : duration,
            delay: reduceMotion ? 0 : index * staggerDelay,
            ease: "easeOut",
          }}
          style={{ display: "inline-block" }}
          className="will-change-[opacity,filter]"
        >
          {unit}
        </motion.span>
      ))}
    </AnyTag>
  );
}
