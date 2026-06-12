"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { Sora } from "next/font/google";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Eye,
  EyeOff,
  Files,
  Loader2,
  Lock,
  Mail,
  Receipt,
  ShieldCheck,
} from "lucide-react";

import { cn } from "@/lib/utils";

const sora = Sora({ subsets: ["latin"], variable: "--font-login-heading" });

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-neutral-900">
        {label}
        {hint ? <span className="text-xs font-medium text-neutral-500">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

function InputShell({
  icon,
  right,
  children,
  invalid = false,
}: {
  icon: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  invalid?: boolean;
}) {
  return (
    <div
      className={cn(
        "group flex min-h-12 items-center rounded-xl border bg-white shadow-sm transition",
        "focus-within:border-brand-400 focus-within:ring-3 focus-within:ring-brand-500/20",
        invalid ? "border-red-300 bg-red-50/40" : "border-neutral-200",
      )}
    >
      <div className="pl-4 text-neutral-400 transition group-focus-within:text-brand-700">{icon}</div>
      <div className="flex-1 px-3">{children}</div>
      {right ? <div className="pr-3">{right}</div> : null}
    </div>
  );
}

function WorkspacePreview() {
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-brand-100 bg-white shadow-[0_34px_90px_-55px_rgba(15,23,42,0.45)]">
      <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-950 px-5 py-4 text-white">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </div>
        <span className="text-xs font-medium text-white/70">Ordexa arbetsyta</span>
      </div>

      <div className="space-y-4 p-5">
        <div className="rounded-2xl border border-neutral-200 bg-[#fbfdfb] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Order #4281</p>
              <h2 className="mt-2 text-xl font-semibold text-neutral-950">Fasadskylt och montage</h2>
              <p className="mt-1 text-sm text-neutral-600">Nästa steg visas direkt efter inloggning.</p>
            </div>
            <span className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">
              Live
            </span>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {[
              ["Ateljé", "Klar", "100%"],
              ["Produktion", "Pågår", "62%"],
              ["Montage", "Planerad", "20%"],
            ].map(([track, status, progress]) => (
              <div key={track} className="rounded-xl border border-neutral-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-neutral-900">{track}</p>
                  <CheckCircle2 className={cn("h-4 w-4", status === "Klar" ? "text-brand-600" : "text-neutral-300")} />
                </div>
                <p className="mt-1 text-xs text-neutral-500">{status}</p>
                <div className="mt-3 h-2 rounded-full bg-neutral-100">
                  <div className="h-full rounded-full bg-brand-600" style={{ width: progress }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: Files, label: "Underlag", value: "3 filer" },
            { icon: CalendarDays, label: "Kalender", value: "Tis 09:30" },
            { icon: Receipt, label: "Fakturering", value: "Väntar" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                <Icon className="h-4 w-4 text-brand-700" />
                <p className="mt-3 text-xs font-medium text-neutral-500">{item.label}</p>
                <p className="mt-1 text-sm font-semibold text-neutral-950">{item.value}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [needsOtp, setNeedsOtp] = useState(false);
  const [checkingOtp, setCheckingOtp] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastCheckedEmail = useRef<string | null>(null);
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (needsOtp) otpRef.current?.focus();
  }, [needsOtp]);

  useEffect(() => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      setNeedsOtp(false);
      setOtp("");
      lastCheckedEmail.current = null;
      return;
    }

    if (lastCheckedEmail.current === normalized) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setCheckingOtp(true);
        const res = await fetch("/api/auth/mfa-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalized }),
          signal: controller.signal,
        });

        if (!res.ok) return;

        const data = (await res.json()) as { requiresOtp?: boolean };
        const requiresOtp = Boolean(data?.requiresOtp);
        setNeedsOtp(requiresOtp);
        if (!requiresOtp) setOtp("");
        lastCheckedEmail.current = normalized;
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Failed to check MFA status", err);
        }
      } finally {
        setCheckingOtp(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [email]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const normalizedEmail = email.trim().toLowerCase();

    if (needsOtp && !otp.trim()) {
      setError("Fyll i engångskoden från din authenticator-app.");
      return;
    }

    setLoading(true);

    if (!needsOtp) {
      try {
        const mfaRes = await fetch("/api/auth/mfa-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail }),
        });
        if (mfaRes.ok) {
          const data = (await mfaRes.json()) as { requiresOtp?: boolean };
          if (data?.requiresOtp) {
            setNeedsOtp(true);
            setLoading(false);
            setError("Ange koden från din authenticator-app.");
            return;
          }
        }
      } catch (err) {
        console.error("Failed to check MFA status before login", err);
      }
    }

    const res = await signIn("credentials", {
      email: normalizedEmail,
      password,
      otp: otp.trim() || undefined,
      callbackUrl: "/",
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      if (res.error === "MFA_REQUIRED") {
        setNeedsOtp(true);
        setError("Ange koden från din authenticator-app.");
        return;
      }
      if (res.error === "INVALID_OTP") {
        setNeedsOtp(true);
        setError("Fel engångskod. Försök igen.");
        return;
      }
      setError("Fel e-post eller lösenord.");
      return;
    }

    if (res?.ok) {
      window.location.href = "/";
    }
  }

  return (
    <div className={cn(sora.variable, "relative -mx-4 -my-4 overflow-hidden bg-white sm:-mx-6 sm:-my-6")}>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#f1fbf5_0%,#ffffff_48%,#f6fbf7_100%)]" />

      <div className="relative mx-auto grid min-h-[calc(100dvh-6rem)] max-w-7xl gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
        <motion.section
          className="mx-auto w-full max-w-md lg:mx-0"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <div className="mb-7">
            <h1 className={cn(sora.className, "mt-5 text-4xl font-semibold leading-tight text-neutral-950 sm:text-5xl")}>
              Logga in i Ordexa.
            </h1>
            <p className="mt-4 text-base leading-7 text-neutral-600">
              Fortsätt där teamet är: order, filer, kalender och fakturaunderlag samlat i samma flöde.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-[1.5rem] border border-brand-100 bg-white p-5 shadow-[0_30px_80px_-52px_rgba(15,23,42,0.45)] sm:p-6"
          >
            <div className="space-y-5">
              <Field label="E-post" hint={checkingOtp ? "Kontrollerar MFA..." : undefined}>
                <InputShell icon={<Mail className="h-4 w-4" />}>
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="namn@example.com"
                    value={email}
                    onChange={(e) => {
                      const next = e.target.value;
                      setEmail(next);
                      setError(null);
                      if (!next.trim()) {
                        setNeedsOtp(false);
                        setOtp("");
                        lastCheckedEmail.current = null;
                        return;
                      }
                      lastCheckedEmail.current = null;
                    }}
                    className="h-12 w-full bg-transparent text-sm text-neutral-950 placeholder:text-neutral-400 focus:outline-none"
                  />
                </InputShell>
              </Field>

              <Field label="Lösenord">
                <InputShell
                  icon={<Lock className="h-4 w-4" />}
                  right={
                    <button
                      type="button"
                      onClick={() => setReveal((value) => !value)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-500/20"
                      aria-label={reveal ? "Dölj lösenord" : "Visa lösenord"}
                    >
                      {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                >
                  <input
                    type={reveal ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Ange lösenord"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 w-full bg-transparent text-sm text-neutral-950 placeholder:text-neutral-400 focus:outline-none"
                  />
                </InputShell>
              </Field>

              <AnimatePresence initial={false}>
                {needsOtp ? (
                  <motion.div
                    key="otp"
                    initial={{ opacity: 0, height: 0, y: -8 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -8 }}
                    transition={{ duration: 0.28, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <Field label="Engångskod" hint="Authenticator-app">
                      <InputShell icon={<ShieldCheck className="h-4 w-4" />} invalid={Boolean(error && needsOtp)}>
                        <input
                          ref={otpRef}
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          placeholder="123456"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                          className="h-12 w-full bg-transparent text-sm text-neutral-950 placeholder:text-neutral-400 focus:outline-none"
                        />
                      </InputShell>
                    </Field>
                    <p className="mt-2 text-xs leading-5 text-neutral-500">
                      Fältet visas automatiskt när kontot kräver tvåstegsverifiering.
                    </p>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <AnimatePresence initial={false}>
                {error ? (
                  <motion.div
                    role="status"
                    aria-live="polite"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                  >
                    {error}
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex select-none items-center gap-2 text-sm text-neutral-600">
                  <input type="checkbox" className="h-4 w-4 rounded border-neutral-300 text-brand-700 focus:ring-brand-500/30" />
                  Håll mig inloggad
                </label>
                <Link href="/reset" className="text-sm font-medium text-brand-700 hover:text-brand-800 hover:underline">
                  Glömt lösenord?
                </Link>
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileTap={{ scale: 0.985 }}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 text-sm font-semibold text-white shadow-[0_18px_34px_-24px_rgba(16,46,37,0.8)] transition hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loggar in...
                  </>
                ) : (
                  <>
                    Logga in
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </motion.button>
            </div>
          </form>

          <p className="mt-4 text-center text-sm text-neutral-500">
            Behöver du ett konto? Kontakta administratör.
          </p>
        </motion.section>

        <motion.aside
          className="hidden lg:block"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 }}
          aria-label="Förhandsvisning av Ordexa"
        >
          <div className="mb-7 max-w-xl">
            <h2 className={cn(sora.className, "mt-3 text-3xl font-semibold leading-tight text-neutral-950")}>
              Allt du behöver för nästa ordersteg.
            </h2>
            <p className="mt-4 text-base leading-7 text-neutral-600">
              Vyn speglar landningssidans arbetsyta: status, filer, kalender och fakturering i ett snabbt sammanhang.
            </p>
          </div>
          <WorkspacePreview />
        </motion.aside>
      </div>
    </div>
  );
}
