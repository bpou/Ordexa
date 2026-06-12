"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export default function RegisterMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const role = (session?.user as { role?: string } | undefined)?.role;
  const canCreateRegisters = role === "ADMIN" || role === "SALJARE";

  const menuVariants = {
    hidden: { opacity: 0, y: -6, scale: 0.98, filter: "blur(4px)" },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: { type: "spring", stiffness: 420, damping: 28 },
    },
    exit: { opacity: 0, y: -6, scale: 0.98, filter: "blur(4px)", transition: { duration: 0.12 } },
  } as const;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (status === "loading" || !canCreateRegisters) {
    return null;
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="register-menu"
        className="inline-flex items-center gap-1 rounded-full border border-border bg-card/80 px-3 py-2 text-sm font-medium text-foreground shadow-sm backdrop-blur transition hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        Register
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : "rotate-0"}`} aria-hidden />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            id="register-menu"
            role="menu"
            aria-orientation="vertical"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={menuVariants}
            className="absolute right-0 z-50 mt-2 w-44 rounded-2xl border border-border bg-popover/95 p-2 shadow-xl ring-1 ring-black/5 backdrop-blur"
          >
            <div className="relative">
              <Link
                href="/articles/new"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm text-foreground/85 transition hover:bg-muted"
              >
                Artiklar
              </Link>
              <Link
                href="/customers/new"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm text-foreground/85 transition hover:bg-muted"
              >
                Kunder
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
