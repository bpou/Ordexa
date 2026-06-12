"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { useSidebar } from "@/components/ui/sidebar";
import { TextReveal } from "@/components/unlumen-ui/text-reveal";
import { cn } from "@/lib/utils";

export function SidebarRevealText({
  text,
  className,
  revealClassName,
}: {
  text: string;
  className?: string;
  revealClassName?: string;
}) {
  const { state } = useSidebar();
  const reduceMotion = useReducedMotion();

  if (!text) {
    return null;
  }

  return (
    <AnimatePresence initial={false} mode="wait">
      {state === "expanded" ? (
        <motion.span
          key={`${text}-${state}`}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -10, filter: "blur(6px)" }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0, filter: "blur(0px)" }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -10, filter: "blur(6px)" }}
          transition={{
            duration: reduceMotion ? 0 : 0.22,
            ease: [0.22, 1, 0.36, 1],
          }}
          className={cn("min-w-0 overflow-hidden whitespace-nowrap", className)}
        >
          <TextReveal
            text={text}
            as="span"
            splitBy="characters"
            staggerDelay={reduceMotion ? 0 : 0.008}
            duration={reduceMotion ? 0 : 0.16}
            once={false}
            className={cn("block whitespace-nowrap leading-none", revealClassName)}
          />
        </motion.span>
      ) : null}
    </AnimatePresence>
  );
}
