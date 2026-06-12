"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { signOut, signIn } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, UserCog } from "lucide-react";

export default function UserMenu({
  name,
  email,
  image,
  isLoggedIn,
}: {
  name?: string;
  email?: string;
  image?: string;
  isLoggedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => firstItemRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

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

  // Shared trigger styles:
  // - Mobile (default): perfect circle avatar button (h-10 w-10), no text/chevron
  // - Desktop (sm+): pill with avatar + name + chevron
  const triggerBase =
    "flex items-center rounded-full border border-border bg-card/80 backdrop-blur shadow-sm transition " +
    "hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";

  const triggerResponsive =
    "h-10 w-10 p-0 justify-center gap-0 " + // mobile -> circle
    "sm:h-auto sm:w-auto sm:px-2 sm:py-1 sm:pr-2.5 sm:gap-2"; // desktop -> pill

  if (!isLoggedIn) {
    return (
      <button
        ref={buttonRef}
        onClick={() => signIn()}
        className={`${triggerBase} ${triggerResponsive}`}
        aria-label="Logga in"
      >
        {/* Avatar always shown; text only on desktop */}
        <Image
          src={image || "/default-avatar.png"}
          alt="Profilbild"
          width={32}
          height={32}
          className="rounded-full border border-neutral-300"
        />
        <span className="hidden sm:inline max-w-[9rem] truncate text-sm font-medium text-foreground/85">
          Logga in
        </span>
        <ChevronDown className="hidden sm:inline h-4 w-4 text-muted-foreground" aria-hidden />
      </button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        className={`${triggerBase} ${triggerResponsive}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="user-menu"
        aria-label="Användarmeny"
      >
        <Image
          src={image || "/default-avatar.png"}
          alt="Profilbild"
          width={32}
          height={32}
          className="rounded-full border border-neutral-300"
        />
        {/* Name visible only on desktop */}
        <span className="hidden sm:inline max-w-[9rem] truncate text-sm text-foreground/85">
          {name || email || "Användare"}
        </span>
        <ChevronDown
          className={`hidden sm:inline h-4 w-4 text-muted-foreground transition ${open ? "rotate-180" : "rotate-0"}`}
          aria-hidden
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="user-menu"
            role="menu"
            aria-orientation="vertical"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={menuVariants}
            className="absolute right-0 z-[120] mt-2 w-64 rounded-2xl border border-border bg-popover p-3 shadow-xl ring-1 ring-black/5"
          >
            <div className="relative flex items-center gap-3 rounded-xl border border-border bg-gradient-to-br from-card to-muted p-3">
              <Image
                src={image || "/default-avatar.png"}
                alt="Profil"
                width={44}
                height={44}
                className="rounded-full border border-neutral-300"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{name || "Användare"}</p>
                <p className="truncate text-xs text-muted-foreground">{email}</p>
              </div>
            </div>

            <div className="my-3 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

            <button
              ref={firstItemRef}
              onClick={() => {
                router.push("/account");
                setOpen(false);
              }}
              className="group flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-foreground/85 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              role="menuitem"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card shadow-sm">
                <UserCog className="h-4 w-4" aria-hidden />
              </span>
              Konto & inställningar
            </button>

            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="group mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-foreground/85 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              role="menuitem"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card shadow-sm">
                <LogOut className="h-4 w-4" aria-hidden />
              </span>
              Logga ut
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
