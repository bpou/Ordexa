"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Sora } from "next/font/google";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  FileText,
  Files,
  LockKeyhole,
  Menu,
  PanelRightOpen,
  Receipt,
  Route,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  Workflow,
  X,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const sora = Sora({ subsets: ["latin"], variable: "--font-marketing-heading" });

const demoHref = "mailto:hello@ordina.se?subject=Boka%20demo%20av%20Ordexa";

const navItems = [
  { label: "Produkt", href: "#produkt" },
  { label: "Flöde", href: "#flode" },
  { label: "Kalender", href: "#kalender" },
  { label: "Fortnox", href: "#fortnox" },
  { label: "Priser", href: "#demo" },
];

const trustItems = [
  "Fortnox-koppling",
  "Kalenderplanering",
  "Rollbaserad åtkomst",
  "Filer på ordern",
];

const painItems = [
  "Order i mailen",
  "Bilder i sms",
  "Frågor i telefon",
  "Planering i Excel",
  "Status i huvudet",
  "Fakturering väntar på svar",
];

const solutionItems = [
  "Allt kopplas till ordern",
  "Rätt team ser rätt sak",
  "Nästa steg blir tydligt",
  "Underlag finns kvar",
  "Planeringen hänger ihop",
  "Fakturering blir enklare",
];

const workflowSteps = [
  {
    title: "Skapa eller importera order",
    body: "Lägg grunden med kund, ordernummer, leveranssätt och ansvarig direkt.",
    icon: ClipboardCheck,
  },
  {
    title: "Samla filer och referenser",
    body: "Bilder, ritningar, kundgodkännanden och kontaktpersoner följer ordern.",
    icon: Files,
  },
  {
    title: "Planera produktion och montage",
    body: "Lägg jobbet i rätt spår och se tider, avdelningar och konflikter.",
    icon: CalendarDays,
  },
  {
    title: "Team uppdaterar status",
    body: "Varje avdelning markerar läge, saknade underlag och färdiga steg.",
    icon: Workflow,
  },
  {
    title: "Markera fakturaklar",
    body: "När underlagen är på plats blir ekonomi inte sista stoppklossen.",
    icon: CircleDollarSign,
  },
];

const featureBlocks = [
  {
    id: "office",
    eyebrow: "För kontoret",
    title: "Från förfrågan till order utan dubbelarbete.",
    body: "Ordexa hjälper sälj, ordermottagning och administration att få in rätt information från början.",
    points: [
      "Skapa order snabbt",
      "Samla kund, filer och referenser",
      "Koppla mot Fortnox",
      "Se vad som saknas innan jobbet går vidare",
    ],
    icon: Building2,
    visual: "order" as const,
  },
  {
    id: "production",
    eyebrow: "För produktion",
    title: "Varje avdelning ser bara det som är relevant.",
    body: "Produktionsspår, statusar och överlämningar gör det tydligt vad teamet ska göra härnäst.",
    points: [
      "Produktionsspår",
      "Status per steg",
      "Kommentarer och filer",
      "Tydliga överlämningar",
    ],
    icon: Route,
    visual: "tracks" as const,
  },
  {
    id: "planning",
    eyebrow: "För planering och montage",
    title: "Planera jobb, tider och resurser utan kalenderkaos.",
    body: "Planeringen sitter ihop med ordern, avdelningarna och personliga kalenderhändelser.",
    points: [
      "Kalender för avdelningar",
      "Personlig kalender",
      "Drag-and-drop",
      "Konfliktvarningar",
      "Business-hours logic",
    ],
    icon: CalendarDays,
    visual: "calendar" as const,
  },
  {
    id: "billing",
    eyebrow: "För ekonomi",
    title: "Vet när ordern faktiskt är klar att fakturera.",
    body: "Saknade bilder, kundgodkännanden och leveransunderlag syns innan faktureringen kör fast.",
    points: [
      "Fakturaklar status",
      "Saknade underlag syns",
      "Koppling till Fortnox",
      "Mindre jagande i efterhand",
    ],
    icon: Receipt,
    visual: "billing" as const,
  },
];

const proofItems = [
  {
    title: "Byggt för svenska arbetsflöden",
    body: "Språk, roller, orderflöden och Fortnox-kontext utgår från svensk B2B-vardag.",
    icon: BadgeCheck,
  },
  {
    title: "Rollbaserad åtkomst",
    body: "Kontor, produktion, montage och admin kan ha olika vyer och behörigheter.",
    icon: UserRoundCheck,
  },
  {
    title: "MFA-stöd",
    body: "TOTP MFA och NextAuth-baserad inloggning ger ett tydligare skydd runt orderdata.",
    icon: ShieldCheck,
  },
  {
    title: "PostgreSQL-backed data",
    body: "Order, filer, kalenderhändelser och statusar ligger i en riktig datamodell.",
    icon: LockKeyhole,
  },
];

type VisualType = (typeof featureBlocks)[number]["visual"];

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.22 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  body: string;
  align?: "left" | "center";
}) {
  return (
    <Reveal
      className={cn(
        "space-y-4",
        align === "center" && "mx-auto max-w-3xl text-center",
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-700">
        {eyebrow}
      </p>
      <h2
        className={cn(
          sora.className,
          "text-3xl font-semibold leading-tight text-neutral-950 sm:text-4xl lg:text-5xl",
        )}
      >
        {title}
      </h2>
      <p className="text-base leading-7 text-neutral-600 sm:text-lg">{body}</p>
    </Reveal>
  );
}

function LogoMark() {
  return (
    <Link
      href="/"
      aria-label="Gå till startsidan"
      className="inline-flex items-center leading-none transition hover:opacity-90"
    >
      <Image
        src="/logo.png"
        alt="Ordina"
        width={175}
        height={30}
        className="block object-contain"
      />
    </Link>
  );
}

function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const [showLogo, setShowLogo] = useState(false);

  useEffect(() => {
    const updateLogoVisibility = () => {
      const normalHeader = document.querySelector("body > div header");
      const threshold =
        normalHeader instanceof HTMLElement ? normalHeader.offsetHeight : 72;

      setShowLogo(window.scrollY > threshold);
    };

    updateLogoVisibility();

    window.addEventListener("scroll", updateLogoVisibility, { passive: true });
    window.addEventListener("resize", updateLogoVisibility);

    return () => {
      window.removeEventListener("scroll", updateLogoVisibility);
      window.removeEventListener("resize", updateLogoVisibility);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-brand-100/80 bg-[#f6fbf7]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            "transition duration-200",
            showLogo ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          aria-hidden={!showLogo}
        >
          <LogoMark />
        </div>

        <nav
          className="hidden items-center gap-7 lg:flex"
          aria-label="Huvudnavigering"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-neutral-700 transition hover:text-brand-800"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Button
            asChild
            variant="ghost"
            className="rounded-xl px-4 text-neutral-700 hover:bg-brand-50 hover:text-brand-900"
          >
            <Link href="/login">Logga in</Link>
          </Button>

          <Button
            asChild
            className="rounded-xl bg-brand-700 px-5 text-white shadow-sm hover:bg-brand-800 focus-visible:ring-brand-500/30"
          >
            <Link href={demoHref}>
              Boka demo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <button
          type="button"
          aria-label={open ? "Stäng meny" : "Öppna meny"}
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand-100 bg-white text-neutral-900 shadow-sm transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-500/25 lg:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-brand-100 bg-white px-4 py-4 shadow-lg lg:hidden">
          <nav
            className="mx-auto grid max-w-7xl gap-2"
            aria-label="Mobil navigering"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-semibold text-neutral-800 hover:bg-brand-50"
              >
                {item.label}
              </Link>
            ))}

            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <Button
                asChild
                variant="outline"
                className="h-11 rounded-xl border-brand-100"
              >
                <Link href="/login">Logga in</Link>
              </Button>

              <Button
                asChild
                className="h-11 rounded-xl bg-brand-700 text-white hover:bg-brand-800"
              >
                <Link href={demoHref}>Boka demo</Link>
              </Button>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

function HeroProductMockup() {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-brand-300/25 blur-3xl" />

      <div className="relative overflow-hidden rounded-[1.8rem] border border-brand-100 bg-white shadow-[0_34px_90px_-46px_rgba(16,46,37,0.7)]">
        <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-950 px-4 py-3 text-white sm:px-5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </div>

          <span className="text-xs font-medium text-white/70">
            Ordexa arbetsyta
          </span>
        </div>

        <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-neutral-200 bg-[#fbfdfb] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                    Order #4281
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-neutral-950">
                    Fasadskylt och montage
                  </h3>
                  <p className="mt-1 text-sm text-neutral-600">
                    Kund: Norrlands Bygg
                  </p>
                </div>

                <span className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">
                  I produktion
                </span>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                {[
                  ["Ateljé", "Klar", "100%"],
                  ["Produktion", "Pågår", "62%"],
                  ["Montage", "Planerad", "20%"],
                ].map(([track, status, progress]) => (
                  <div
                    key={track}
                    className="rounded-xl border border-neutral-200 bg-white p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-neutral-900">
                        {track}
                      </p>
                      <CheckCircle2
                        className={cn(
                          "h-4 w-4",
                          status === "Klar"
                            ? "text-brand-600"
                            : "text-neutral-300",
                        )}
                      />
                    </div>

                    <p className="mt-1 text-xs text-neutral-500">{status}</p>

                    <div className="mt-3 h-2 rounded-full bg-neutral-100">
                      <div
                        className="h-full rounded-full bg-brand-600"
                        style={{ width: progress }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                <div className="flex items-center gap-2">
                  <Files className="h-4 w-4 text-brand-700" />
                  <p className="text-sm font-semibold text-neutral-950">
                    Underlag
                  </p>
                </div>

                <div className="mt-4 space-y-2">
                  {["Ritning_fasad.pdf", "Logo_original.ai", "Montagefoto_01.jpg"].map(
                    (file) => (
                      <div
                        key={file}
                        className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-700"
                      >
                        <FileText className="h-3.5 w-3.5 text-neutral-400" />
                        {file}
                      </div>
                    ),
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-amber-700" />
                  <p className="text-sm font-semibold text-amber-950">
                    Saknas
                  </p>
                </div>

                <div className="mt-4 space-y-2 text-sm text-amber-900">
                  <p>Kundgodkännande</p>
                  <p>2 bilder från montage</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <CalendarMiniCard />
            <BillingMiniCard />

            <div className="rounded-2xl border border-brand-100 bg-brand-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-brand-900">
                <Sparkles className="h-4 w-4" />
                Nästa steg
              </div>

              <p className="mt-2 text-sm leading-6 text-brand-900/80">
                Produktion laddar upp sista bilden. Montage får automatiskt rätt
                underlag inför tisdag 09:30.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarMiniCard() {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-brand-700" />
          <p className="text-sm font-semibold text-neutral-950">Kalender</p>
        </div>

        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800">
          Montage
        </span>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-1 text-center text-[11px] text-neutral-500">
        {["Mån", "Tis", "Ons", "Tor", "Fre"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-5 gap-1">
        {Array.from({ length: 10 }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "h-10 rounded-lg border border-neutral-100 bg-neutral-50",
              index === 3 && "border-brand-300 bg-brand-100",
            )}
          />
        ))}
      </div>

      <p className="mt-3 text-xs font-medium text-neutral-700">
        Montage tis 09:30
      </p>
    </div>
  );
}

function BillingMiniCard() {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-brand-700" />
          <p className="text-sm font-semibold text-neutral-950">Fakturering</p>
        </div>

        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
          Väntar
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-neutral-600">
        Fakturaklar: väntar på underlag från montage.
      </p>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(5,150,105,0.18),transparent_32%),radial-gradient(circle_at_85%_8%,rgba(141,216,175,0.35),transparent_36%),linear-gradient(180deg,#f1fbf5_0%,#ffffff_72%)]" />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-8 lg:pb-24">
        <Reveal className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/90 px-4 py-2 text-xs font-semibold text-brand-800 shadow-sm">
            <PanelRightOpen className="h-4 w-4" />
            Ordersystem för skylt-, montage- och produktionsflöden
          </div>

          <h1
            className={cn(
              sora.className,
              "mt-7 text-5xl font-semibold leading-[0.98] tracking-[-0.04em] text-neutral-950 sm:text-6xl lg:text-7xl",
            )}
          >
            Sluta jaga orderstatus, filer och foton.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-neutral-700 sm:text-xl">
            Ordexa samlar order, planering, produktion, filer och överlämningar
            i ett tydligt flöde från första förfrågan till fakturaklar order.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-xl bg-brand-700 px-6 text-white shadow-[0_18px_34px_-22px_rgba(16,46,37,0.8)] hover:bg-brand-800 focus-visible:ring-brand-500/30"
            >
              <Link href={demoHref}>
                Boka demo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-xl border-brand-200 bg-white px-6 text-brand-900 hover:bg-brand-50"
            >
              <Link href="#flode">
                Se hur det fungerar
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {trustItems.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm"
              >
                <CheckCircle2 className="h-4 w-4 text-brand-600" />
                {item}
              </span>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.12}>
          <HeroProductMockup />
        </Reveal>
      </div>
    </section>
  );
}

function PainComparisonSection() {
  return (
    <section
      id="produkt"
      className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20"
    >
      <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <SectionHeading
          eyebrow="Varför Ordexa"
          title="När allt ligger på olika ställen blir varje order ett detektivarbete."
          body="Det fungerar tills något saknas, någon är sjuk eller kunden frågar hur det går. Ordexa gör ordern till den gemensamma platsen för status, underlag och nästa steg."
        />

        <Reveal className="grid gap-4 md:grid-cols-2">
          <ComparisonPanel title="Utan Ordexa" tone="pain" items={painItems} />
          <ComparisonPanel
            title="Med Ordexa"
            tone="solution"
            items={solutionItems}
          />
        </Reveal>
      </div>
    </section>
  );
}

function ComparisonPanel({
  title,
  tone,
  items,
}: {
  title: string;
  tone: "pain" | "solution";
  items: string[];
}) {
  const isPain = tone === "pain";

  return (
    <div
      className={cn(
        "rounded-2xl border p-5 shadow-sm",
        isPain ? "border-amber-200 bg-amber-50" : "border-brand-200 bg-brand-50",
      )}
    >
      <div className="flex items-center gap-2">
        {isPain ? (
          <XCircle className="h-5 w-5 text-amber-700" />
        ) : (
          <CheckCircle2 className="h-5 w-5 text-brand-700" />
        )}

        <h3
          className={cn(
            "text-lg font-semibold",
            isPain ? "text-amber-950" : "text-brand-950",
          )}
        >
          {title}
        </h3>
      </div>

      <div className="mt-5 space-y-2.5">
        {items.map((item) => (
          <div
            key={item}
            className="rounded-xl border border-white/70 bg-white/80 px-4 py-3 text-sm font-medium text-neutral-800 shadow-sm"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkflowSection() {
  return (
    <section id="flode" className="bg-[#f6fbf7] py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          align="center"
          eyebrow="Flödet"
          title="Från första förfrågan till fakturaklar order."
          body="Ett sammanhållet arbetsflöde gör att ordern inte behöver förklaras om varje gång den byter hand."
        />

        <div className="mt-12 grid gap-4 lg:grid-cols-5">
          {workflowSteps.map((step, index) => {
            const Icon = step.icon;

            return (
              <Reveal key={step.title} delay={index * 0.04} className="relative">
                {index < workflowSteps.length - 1 ? (
                  <div className="absolute left-[calc(100%-0.5rem)] top-10 hidden h-px w-4 bg-brand-200 lg:block" />
                ) : null}

                <div className="h-full rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-700 text-white">
                    <Icon className="h-5 w-5" />
                  </div>

                  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                    Steg {index + 1}
                  </p>

                  <h3 className="mt-2 text-lg font-semibold leading-snug text-neutral-950">
                    {step.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-neutral-600">
                    {step.body}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FeatureSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <SectionHeading
        align="center"
        eyebrow="Produkt"
        title="Byggt för kontoret, produktionen, planeringen och ekonomin."
        body="Ordexa är inte bara en orderlista. Det är ett praktiskt arbetsflöde där varje roll får rätt kontext."
      />

      <div className="mt-12 space-y-8">
        {featureBlocks.map((feature, index) => {
          const Icon = feature.icon;
          const reverse = index % 2 === 1;

          return (
            <Reveal
              key={feature.id}
              className={cn(
                "grid gap-8 rounded-[1.75rem] border border-brand-100 bg-white p-5 shadow-sm sm:p-7 lg:grid-cols-2 lg:items-center",
                reverse && "lg:[&>div:first-child]:order-2",
              )}
            >
              <div className="space-y-5">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-800">
                  <Icon className="h-6 w-6" />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                    {feature.eyebrow}
                  </p>

                  <h3
                    className={cn(
                      sora.className,
                      "mt-3 text-3xl font-semibold leading-tight text-neutral-950 sm:text-4xl",
                    )}
                  >
                    {feature.title}
                  </h3>

                  <p className="mt-4 text-base leading-7 text-neutral-600">
                    {feature.body}
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {feature.points.map((point) => (
                    <div
                      key={point}
                      className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm font-medium text-neutral-800"
                    >
                      <CheckCircle2 className="h-4 w-4 text-brand-600" />
                      {point}
                    </div>
                  ))}
                </div>
              </div>

              <ProductMockup type={feature.visual} />
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

function ProductMockup({ type }: { type: VisualType }) {
  if (type === "tracks") return <TrackMockup />;
  if (type === "calendar") return <CalendarMockup />;
  if (type === "billing") return <BillingMockup />;

  return <OrderMockup />;
}

function MockupShell({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="rounded-[1.35rem] border border-neutral-200 bg-[#fbfdfb] p-4 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.55)]">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
          {label}
        </span>

        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800">
          Live
        </span>
      </div>

      {children}
    </div>
  );
}

function OrderMockup() {
  return (
    <MockupShell label="Orderdetalj">
      <div className="space-y-3">
        {[
          ["Kund", "Norrlands Bygg"],
          ["Kontakt", "Anna Sjöberg, 070-123 45 67"],
          ["Leverans", "Montage på plats"],
          ["Referens", "NB-4281 / Fasad"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-neutral-200 bg-white p-3">
            <p className="text-xs text-neutral-500">{label}</p>
            <p className="mt-1 text-sm font-semibold text-neutral-900">{value}</p>
          </div>
        ))}

        <div className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm font-medium text-brand-900">
          Fortnox kund hittad och kopplad
        </div>
      </div>
    </MockupShell>
  );
}

function TrackMockup() {
  return (
    <MockupShell label="Produktionsspår">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Ateljé", "Avslutad", "bg-emerald-50 text-emerald-800"],
          ["Produktion", "Pågående", "bg-brand-50 text-brand-800"],
          ["Montage", "Inkommande", "bg-neutral-100 text-neutral-700"],
        ].map(([title, status, tone]) => (
          <div key={title} className="rounded-xl border border-neutral-200 bg-white p-3">
            <p className="text-sm font-semibold text-neutral-950">{title}</p>

            <span className={cn("mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", tone)}>
              {status}
            </span>

            <div className="mt-4 space-y-2">
              <div className="h-2 rounded-full bg-neutral-100" />
              <div className="h-2 w-2/3 rounded-full bg-neutral-100" />
            </div>
          </div>
        ))}
      </div>
    </MockupShell>
  );
}

function CalendarMockup() {
  return (
    <MockupShell label="Veckoplanering">
      <div className="grid grid-cols-[4rem_repeat(5,minmax(0,1fr))] gap-1 text-xs">
        <div />

        {["Mån", "Tis", "Ons", "Tor", "Fre"].map((day) => (
          <div key={day} className="rounded-lg bg-white p-2 text-center font-semibold text-neutral-700">
            {day}
          </div>
        ))}

        {["08", "10", "12", "14"].map((time, row) => (
          <div key={time} className="contents">
            <div className="py-3 text-neutral-500">{time}:00</div>

            {Array.from({ length: 5 }).map((_, col) => (
              <div
                key={`${time}-${col}`}
                className={cn(
                  "min-h-12 rounded-lg border border-neutral-100 bg-white",
                  row === 1 && col === 1 && "border-brand-300 bg-brand-100",
                  row === 2 && col === 3 && "border-amber-300 bg-amber-50",
                )}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
        <span className="rounded-full bg-brand-100 px-3 py-1 text-brand-800">
          Montage tis 09:30
        </span>

        <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">
          Konfliktvarning
        </span>
      </div>
    </MockupShell>
  );
}

function BillingMockup() {
  return (
    <MockupShell label="Fakturakontroll">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-amber-950">Order #4281</p>
            <p className="mt-1 text-sm text-amber-900">Väntar på underlag</p>
          </div>

          <Receipt className="h-6 w-6 text-amber-700" />
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {[
          ["Kundgodkännande", true],
          ["2 montagebilder", false],
          ["Tidrapport", true],
          ["Leveransnotering", false],
        ].map(([item, done]) => (
          <div
            key={String(item)}
            className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm"
          >
            <span className="font-medium text-neutral-800">{item}</span>

            {done ? (
              <CheckCircle2 className="h-4 w-4 text-brand-600" />
            ) : (
              <XCircle className="h-4 w-4 text-amber-600" />
            )}
          </div>
        ))}
      </div>
    </MockupShell>
  );
}

function FortnoxSection() {
  return (
    <section id="fortnox" className="bg-neutral-950 py-16 text-white sm:py-20 lg:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
        <Reveal className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-300">
            Fortnox
          </p>

          <h2 className={cn(sora.className, "text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl")}>
            Behåll ekonomi i Fortnox. Styr produktionen i Ordexa.
          </h2>

          <p className="text-base leading-7 text-white/70 sm:text-lg">
            Ordexa är byggt för att fungera ihop med Fortnox där det är relevant,
            så att kunddata, artiklar, offerter och orderflöden kan minska
            dubbelregistrering utan att ekonomiarbetet flyttas i onödan.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "Kunder och referenser",
              "Artiklar och prislistor",
              "Offerter och orderflöden",
              "Mindre dubbelregistrering",
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/85"
              >
                {item}
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white p-4 text-neutral-950">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  Fortnox
                </p>

                <h3 className="mt-3 text-xl font-semibold">Ekonomi och register</h3>

                <div className="mt-5 space-y-3">
                  {[
                    "Kund: Norrlands Bygg",
                    "Artikel: Fasadskylt",
                    "Offert: 1048",
                    "Order: 4281",
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-xl bg-neutral-50 px-3 py-3 text-sm font-medium text-neutral-700"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-brand-300/30 bg-brand-50 p-4 text-brand-950">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                  Ordexa
                </p>

                <h3 className="mt-3 text-xl font-semibold">Produktion och planering</h3>

                <div className="mt-5 space-y-3">
                  {[
                    "Spår: Ateljé",
                    "Kalender: Montage tis 09:30",
                    "Filer: 6 uppladdade",
                    "Status: Fakturakontroll",
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-xl bg-white px-3 py-3 text-sm font-medium text-brand-900"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function CalendarSection() {
  return (
    <section
      id="kalender"
      className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24"
    >
      <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
        <SectionHeading
          eyebrow="Kalender"
          title="Planeringen är en del av orderflödet, inte ett separat dokument."
          body="Ordexa använder kalenderplanering för avdelningar och personliga händelser, med drag-and-drop, konfliktvarningar och business-hours-logik."
        />

        <Reveal>
          <CalendarMockup />
        </Reveal>
      </div>
    </section>
  );
}

function ProofSection() {
  return (
    <section className="bg-[#f6fbf7] py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          align="center"
          eyebrow="Varför Ordexa"
          title="Praktisk trovärdighet utan påhittade loggor."
          body="Ordexa visar sin styrka i hur systemet är byggt: tydliga roller, säkrare inloggning, riktig databas, filhantering och integrationer som passar svenska företag."
        />

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {proofItems.map((item, index) => {
            const Icon = item.icon;

            return (
              <Reveal
                key={item.title}
                delay={index * 0.04}
                className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-800">
                  <Icon className="h-5 w-5" />
                </div>

                <h3 className="mt-5 text-lg font-semibold leading-snug text-neutral-950">
                  {item.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-neutral-600">
                  {item.body}
                </p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section id="demo" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <Reveal className="overflow-hidden rounded-[2rem] border border-brand-100 bg-neutral-950 p-6 text-white shadow-[0_34px_90px_-55px_rgba(15,23,42,0.85)] sm:p-10 lg:p-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-300">
              Boka demo
            </p>

            <h2 className={cn(sora.className, "mt-4 text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl")}>
              Se hur Ordexa kan passa ert flöde.
            </h2>

            <p className="mt-5 text-base leading-7 text-white/70 sm:text-lg">
              Boka en kort demo så går vi igenom hur era ordrar, avdelningar och
              överlämningar kan sättas upp.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-xl bg-white px-6 text-neutral-950 hover:bg-brand-50"
            >
              <Link href={demoHref}>
                Boka demo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-xl border-white/20 bg-white/5 px-6 text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="mailto:hello@ordina.se">Kontakta oss</Link>
            </Button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export default function MarketingLanding() {
  return (
    <div className={cn(sora.variable, "min-h-screen bg-white text-neutral-950")}>
      <MarketingHeader />

      <main>
        <HeroSection />
        <PainComparisonSection />
        <WorkflowSection />
        <FeatureSection />
        <FortnoxSection />
        <CalendarSection />
        <ProofSection />
        <FinalCtaSection />
      </main>
    </div>
  );
}