"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Transition, Variants } from "framer-motion";

import NavLinks from "./NavLinks";
import { getSidebarConfig } from "./sidebar-config";

export default function MobileMenu() {
  const { data: session } = useSession();
  const pathname = usePathname() ?? "/dashboard";
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = `app-menu-${useId().replaceAll(":", "")}`;
  const shouldReduceMotion = useReducedMotion();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const canCreateRegisters = role === "ADMIN" || role === "SALJARE";
  const navigation = getSidebarConfig(pathname).navMain.map((item) => ({
    ...item,
    items: canCreateRegisters
      ? item.items
      : item.items?.filter(
          (subItem) =>
            subItem.url !== "/customers/new" && subItem.url !== "/articles/new",
        ),
  }));

  useEffect(() => {
    if (!open) return;

    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [open]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(() => closeBtnRef.current?.focus(), 0);
    return () => clearTimeout(timeout);
  }, [open]);

  function trapFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const overlayVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: shouldReduceMotion ? 0 : 0.18 },
    },
    exit: {
      opacity: 0,
      transition: { duration: shouldReduceMotion ? 0 : 0.12 },
    },
  };
  const panelTransition: Transition = shouldReduceMotion
    ? { duration: 0 }
    : { type: "spring", stiffness: 520, damping: 40 };
  const panelVariants: Variants = {
    hidden: { x: -28, opacity: 0, scale: 0.98 },
    visible: { x: 0, opacity: 1, scale: 1, transition: panelTransition },
    exit: {
      x: -24,
      opacity: 0,
      scale: 0.98,
      transition: { duration: shouldReduceMotion ? 0 : 0.14 },
    },
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Öppna meny"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(true)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white transition-colors duration-200 hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          className="shrink-0"
          aria-hidden
        >
          <path
            d="M4 6.5h16M4 12h16M4 17.5h16"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <AnimatePresence>
        {open ? (
          <div className="fixed inset-0 z-[100]" role="presentation">
            <motion.button
              type="button"
              aria-label="Stäng meny"
              className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"
              onClick={() => setOpen(false)}
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={overlayVariants}
            />

            <motion.div
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-label="Navigeringsmeny"
              ref={panelRef}
              onKeyDown={trapFocus}
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={panelVariants}
              className="absolute left-0 top-0 flex h-dvh w-[19rem] max-w-[88vw] flex-col border-r border-border bg-card p-4 pt-[max(1rem,env(safe-area-inset-top))] shadow-2xl"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <Image
                  src="/logo.png"
                  alt="Ordina"
                  width={84}
                  height={28}
                  className="h-7 w-auto object-contain"
                  priority
                />
                <button
                  ref={closeBtnRef}
                  type="button"
                  aria-label="Stäng meny"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white transition-colors duration-200 hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>

              <div className="-mx-4 mb-4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

              <nav
                aria-label="Huvudnavigering"
                className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1"
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest("a"))
                    setOpen(false);
                }}
              >
                {session ? (
                  navigation.map((item) => (
                    <section key={`${item.title}-${item.url}`}>
                      <div className="flex items-center gap-2 px-3 pb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        <span className="[&_svg]:h-4 [&_svg]:w-4" aria-hidden>
                          {item.icon}
                        </span>
                        {item.title}
                      </div>
                      <div className="grid gap-1">
                        {item.items?.length ? (
                          item.items.map((subItem) => {
                            const active =
                              pathname === subItem.url ||
                              pathname.startsWith(`${subItem.url}/`);
                            return (
                              <Link
                                key={`${subItem.title}-${subItem.url}`}
                                href={subItem.url}
                                aria-current={active ? "page" : undefined}
                                className="rounded-xl px-3 py-2 text-sm font-medium text-foreground/90 transition hover:bg-brand-50 hover:text-brand-700 aria-[current=page]:bg-brand-50 aria-[current=page]:text-brand-700 dark:hover:bg-brand-950/50 dark:aria-[current=page]:bg-brand-950/50"
                              >
                                {subItem.title}
                              </Link>
                            );
                          })
                        ) : (
                          <Link
                            href={item.url}
                            className="rounded-xl px-3 py-2 text-sm font-medium text-foreground/90 transition hover:bg-brand-50 hover:text-brand-700"
                          >
                            {item.title}
                          </Link>
                        )}
                      </div>
                    </section>
                  ))
                ) : (
                  <NavLinks />
                )}
              </nav>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
