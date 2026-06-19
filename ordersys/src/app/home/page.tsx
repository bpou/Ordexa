"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Feature = {
  title: string;
  description: string;
  benefits: string[];
  accent: string;
};

type Persona = {
  key: string;
  heading: string;
  body: string;
  link: { href: string; label: string };
  highlights: string[];
};

type JourneyStep = {
  id: string;
  title: string;
  text: string;
};

type FaqItem = {
  question: string;
  answer: string;
};

const FEATURE_SETS: Feature[] = [
  {
    title: "Överblick i realtid",
    description:
      "Samla varje order, spår och fil i samma vy. Filtrera på Ateljé eller Verkstad och få ett kontrollrum för vardagens beslut.",
    benefits: [
      "Dashboard som summerar kommande leveranser",
      "Statuschip som lyfter fram flaskhalsar",
      "Delade filer och kommentarer i samma flöde",
    ],
    accent: "from-brand-200/60 to-brand-400/50",
  },
  {
    title: "Planering som håller",
    description:
      "Schemalägg spår A och B med drag-and-drop eller låt Ordina föreslå luckor automatiskt baserat på kapacitet och öppettider.",
    benefits: [
      "Automatiska slotförslag när kalendern är tight",
      "Tidslinje med färger per team och status",
      "Pushnotiser via Pusher när filer läggs till",
    ],
    accent: "from-info-200/60 to-info-400/50",
  },
  {
    title: "Trygg fakturering",
    description:
      "Följ upp avslutade ordrar och markera dem för fakturering när båda spår är klara. Kopplingen mot Fortnox sparar dubbelarbete.",
    benefits: [
      "Klarmarkera spår A/B individuellt",
      "Bekräfta flera ordrar åt gången",
      "Direktlänk tillbaka till Fortnox-dokumentet",
    ],
    accent: "from-warning-200/60 to-warning-400/50",
  },
];

const METRICS = [
  { label: "+40% snabbare upplägg", note: "med färdiga mallar och smidig Fortnox-export" },
  { label: "97% färre missade filer", note: "tack vare notifieringar och delad dokumentyta" },
  { label: "< 2 min", note: "att hitta status på vilken order som helst" },
] as const;

const SOLUTIONS: Persona[] = [
  {
    key: "project",
    heading: "För projektledare",
    body:
      "Planera kapacitet, synka teamen och ge svar direkt till kund. Du ser vilket spår som ligger efter och kan omplanera på sekunder.",
    link: { href: "/orders/overview", label: "Utforska orderöversikten" },
    highlights: ["Kapacitetsöversikt", "Filtrering på status", "Leveransprognoser"],
  },
  {
    key: "workshop",
    heading: "För verkstad och montage",
    body:
      "Visualisera dagens arbete, ladda upp foton från mobilen och följ checklistor per order. Allt uppdateras i realtid.",
    link: { href: "/orders/track/A", label: "Gå till spårvyn" },
    highlights: ["Drag-and-drop i spår", "Fildelning på minuten", "Notiser när ordern ändras"],
  },
  {
    key: "sales",
    heading: "För ekonomi och sälj",
    body:
      "Få full kontroll över vad som är redo att faktureras och vad som blockerar. Kvittera avslutade ordrar och skicka direkt till Fortnox.",
    link: { href: "/orders/completed", label: "Se avslutade ordrar" },
    highlights: ["Faktureringslista", "Fortnox-länkar", "Historik per order"],
  },
];

const JOURNEY: JourneyStep[] = [
  {
    id: "create",
    title: "1. Skapa ordning på minuter",
    text:
      "Sök upp kunden i Fortnox, importera artikelrader och komplettera med leveransadress. Ordina fyller i spår, färger och planering åt dig.",
  },
  {
    id: "track",
    title: "2. Följ jobbet i realtid",
    text:
      "Verkstad och ateljé markerar status, laddar upp filer och loggar händelser. Du ser tidslinjen fylld av färger i stället för gissningar.",
  },
  {
    id: "invoice",
    title: "3. Leverera och fakturera",
    text:
      "När båda spår är avslutade ligger ordern redo för fakturering. Ett klick skickar kvittens till ekonomiavdelningen.",
  },
];

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Kan vi använda våra egna Fortnox-mallar?",
    answer:
      "Ja. Ordina hämtar prislistor, kunder och artiklar från Fortnox. Ordern skapas med samma mallar som ni använder idag.",
  },
  {
    question: "Behöver verkstaden installera en app?",
    answer:
      "Nej. Allt körs i webbläsaren och är optimerat för surfplattor och mobiler. Filuppladdning och statusändring fungerar direkt.",
  },
  {
    question: "Hur snabbt kommer vi igång?",
    answer:
      "Vi sätter upp er miljö på under en timme: koppling till Fortnox, spår, färger och de första användarna. Resten kan ni styra själva.",
  },
];

export default function HomeLandingPage() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [activePersona, setActivePersona] = useState(SOLUTIONS[0].key);
  const [activeStep, setActiveStep] = useState(JOURNEY[0].id);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % FEATURE_SETS.length);
    }, 12_000);
    return () => window.clearInterval(id);
  }, []);

  const persona = useMemo(
    () => SOLUTIONS.find((solution) => solution.key === activePersona) ?? SOLUTIONS[0],
    [activePersona],
  );
  const step = useMemo(
    () => JOURNEY.find((item) => item.id === activeStep) ?? JOURNEY[0],
    [activeStep],
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 via-neutral-50 to-white text-neutral-900">
      <main className="relative isolate overflow-hidden">
        {/* Animated green radial gradient layer */}
        <div className="absolute inset-x-0 -top-40 z-0 pointer-events-none transform-gpu blur-3xl">
          <div className="mx-auto h-[520px] w-[820px] moving-radial" />
        </div>

        {/* Content above the glow */}
        <div className="relative z-10">
          <section className="px-4 py-14 sm:px-6 lg:px-12 lg:py-20">
            <div className="mx-auto flex w-full flex-col items-center gap-6 text-center lg:w-[min(75vw,60rem)]">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/85 px-4 py-1.5 text-xs font-medium text-brand-700 shadow-sm sm:text-sm">
                <span>Ordinas ordersystem</span>
                <span className="text-neutral-500">â€“ byggt för fönster & montage</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Håll ihop hela orderresan från offert till montage
              </h1>
              <p className="max-w-2xl text-base text-neutral-600 sm:text-lg">
                Ordina samlar planering, filer, statusar och Fortnox-koppling i ett mobilvänligt
                flöde. Sälj, ateljé, verkstad och ekonomi jobbar i samma vy och kunden får besked
                snabbare.
              </p>
              <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-brand-600 px-6 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:-translate-y-0.5 hover:bg-brand-700"
                >
                  Logga in och börja planera
                </Link>
                <Link
                  href="/orders/overview"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-brand-600/40 px-6 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
                >
                  Se orderöversikten
                </Link>
              </div>
              <div className="grid w-full gap-3 sm:grid-cols-3">
                {METRICS.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-2xl border border-brand-100/70 bg-white px-5 py-4 text-left shadow-sm shadow-brand-100/60"
                  >
                    <div className="text-lg font-semibold text-brand-700 sm:text-xl">
                      {metric.label}
                    </div>
                    <div className="text-xs text-neutral-600 sm:text-sm">{metric.note}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="px-4 pb-16 sm:px-6 lg:px-12 lg:pb-20">
            <div className="mx-auto max-w-6xl space-y-12 lg:space-y-16">
              <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-3xl border border-brand-100/60 bg-white p-6 shadow-xl shadow-brand-100/40 sm:p-8">
                  <div className="flex snap-x gap-2 overflow-x-auto pb-2">
                    {FEATURE_SETS.map((feature, index) => {
                      const active = index === activeFeature;
                      return (
                        <button
                          key={feature.title}
                          type="button"
                          onClick={() => setActiveFeature(index)}
                          className={`min-w-[150px] rounded-full border px-3 py-1.5 text-xs font-semibold transition sm:px-4 sm:py-2 sm:text-sm ${
                            active
                              ? "border-brand-600 bg-brand-100 text-brand-800"
                              : "border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
                          }`}
                          aria-pressed={active}
                        >
                          {feature.title}
                        </button>
                      );
                    })}
                  </div>

                  <article
                    className={`mt-6 rounded-3xl border border-neutral-200 bg-gradient-to-br ${FEATURE_SETS[activeFeature].accent} p-6 shadow-inner sm:p-8`}
                  >
                    <h2 className="text-xl font-semibold text-neutral-900 sm:text-2xl">
                      {FEATURE_SETS[activeFeature].title}
                    </h2>
                    <p className="mt-3 text-sm text-neutral-700 sm:text-base">
                      {FEATURE_SETS[activeFeature].description}
                    </p>
                    <ul className="mt-5 space-y-3 text-sm text-neutral-700 sm:mt-6">
                      {FEATURE_SETS[activeFeature].benefits.map((benefit) => (
                        <li key={benefit} className="flex items-start gap-2">
                          <span className="mt-1 h-2.5 w-2.5 rounded-full bg-brand-500" aria-hidden />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                </div>

                <aside className="flex flex-col gap-6">
                  <div className="rounded-3xl border border-brand-200 bg-brand-50/85 p-6 shadow-lg shadow-brand-100 sm:p-8">
                    <h3 className="text-lg font-semibold text-brand-800">Rollbaserad vy</h3>
                    <p className="mt-2 text-sm text-brand-900/80">
                      Välj din roll för att se hur Ordina hjälper just dig. Kortet uppdateras direkt.
                    </p>
                    <div className="mt-4 flex snap-x gap-2 overflow-x-auto pb-1">
                      {SOLUTIONS.map((solution) => {
                        const active = solution.key === activePersona;
                        return (
                          <button
                            key={solution.key}
                            type="button"
                            onClick={() => setActivePersona(solution.key)}
                            className={`min-w-[120px] rounded-full border px-3 py-1.5 text-xs font-semibold transition sm:min-w-[140px] sm:px-4 sm:py-2 ${
                              active
                                ? "border-brand-700 bg-brand-100 text-brand-900"
                                : "border-brand-200 bg-white text-brand-700 hover:bg-brand-100"
                            }`}
                            aria-pressed={active}
                          >
                            {solution.heading.split(" ")[1] ?? solution.heading}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-5 rounded-2xl border border-brand-200 bg-white/90 p-5 sm:p-6">
                      <h4 className="text-lg font-semibold text-brand-900">{persona.heading}</h4>
                      <p className="mt-2 text-sm text-brand-900/80">{persona.body}</p>
                      <ul className="mt-4 space-y-2 text-sm text-brand-900/80">
                        {persona.highlights.map((item) => (
                          <li key={item} className="flex items-start gap-2">
                            <span className="mt-1 h-2 w-2 rounded-full bg-brand-500" aria-hidden />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                      <Link
                        href={persona.link.href}
                        className="mt-5 inline-flex items-center text-sm font-medium text-brand-700 underline-offset-4 hover:underline"
                      >
                        {persona.link.label}
                      </Link>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-brand-100/60 bg-white p-6 shadow-lg shadow-brand-100/40 sm:p-8">
                    <h3 className="text-lg font-semibold">Hur funkar det i praktiken?</h3>
                    <div className="mt-4 flex flex-col gap-2">
                      {JOURNEY.map((journeyItem) => {
                        const active = journeyItem.id === activeStep;
                        return (
                          <button
                            key={journeyItem.id}
                            type="button"
                            onClick={() => setActiveStep(journeyItem.id)}
                            className={`rounded-xl border px-4 py-3 text-left text-sm transition sm:text-base ${
                              active
                                ? "border-brand-500 bg-brand-50 text-brand-900"
                                : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100"
                            }`}
                            aria-pressed={active}
                          >
                            <div className="font-medium">{journeyItem.title}</div>
                            {active && <p className="mt-1 text-sm">{journeyItem.text}</p>}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-4 text-xs uppercase tracking-[0.2em] text-neutral-500">
                      {step.title}
                    </p>
                  </div>
                </aside>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {SOLUTIONS.map((item) => (
                  <div
                    key={item.key}
                    className="rounded-3xl border border-brand-100/70 bg-white p-6 shadow-lg shadow-brand-100/40 transition hover:-translate-y-1 hover:shadow-xl sm:p-8"
                  >
                    <h3 className="text-xl font-semibold">{item.heading}</h3>
                    <p className="mt-3 text-sm text-neutral-600">{item.body}</p>
                    <ul className="mt-4 space-y-2 text-sm text-neutral-600">
                      {item.highlights.map((point) => (
                        <li key={point} className="flex items-start gap-2">
                          <span className="mt-1 h-2 w-2 rounded-full bg-brand-500" aria-hidden />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={item.link.href}
                      className="mt-6 inline-flex items-center text-sm font-medium text-brand-700 underline-offset-4 hover:underline"
                    >
                      {item.link.label}
                    </Link>
                  </div>
                ))}
              </div>

              <div className="rounded-3xl border border-brand-100 bg-white/95 p-6 shadow-lg shadow-brand-100/40 sm:p-8">
                <h2 className="text-2xl font-semibold">Vanliga frågor</h2>
                <div className="mt-5 space-y-3">
                  {FAQ_ITEMS.map((item, index) => {
                    const open = openFaq === index;
                    return (
                      <div key={item.question} className="rounded-2xl border border-brand-100 bg-brand-50/80">
                        <button
                          type="button"
                          onClick={() => setOpenFaq((prev) => (prev === index ? null : index))}
                          className="flex w-full items-center justify-between px-4 py-4 text-left text-sm font-medium text-neutral-700 sm:px-6"
                          aria-expanded={open}
                        >
                          <span>{item.question}</span>
                          <span className="text-xl text-neutral-400">{open ? "â€“" : "+"}</span>
                        </button>
                        {open && (
                          <p className="px-4 pb-4 text-sm text-neutral-600 sm:px-6">{item.answer}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-brand-700 px-4 py-16 text-white sm:px-6 lg:px-12 lg:py-20">
            <div className="mx-auto flex w-full flex-col items-center gap-6 text-center lg:w-[min(75vw,60rem)]">
              <h2 className="text-2xl font-semibold sm:text-3xl">Redo att förenkla din ordervardag?</h2>
              <p className="text-base text-brand-50/90 sm:text-lg">
                Boka en demo med Ordina-teamet eller logga in och börja där du står. På under en timme
                sätter vi upp spåren, Fortnox-kopplingen och hjälper dig importera dina första ordrar.
              </p>
              <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
                <Link
                  href="mailto:info@ordina.se"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-brand-700 shadow-lg shadow-brand-900/40 transition hover:-translate-y-0.5"
                >
                  Boka demo
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/60 px-6 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  Logga in
                </Link>
              </div>
            </div>
          </section>
        </div>

        {/* Animated gradient styles */}
        <style jsx global>{`
          .moving-radial {
            background: radial-gradient(
              circle at 30% 30%,
              rgba(16, 185, 129, 0.85),
              rgba(16, 185, 129, 0.35) 10%,
              transparent 65%
            );
            background-size: 160% 160%;
            animation: radialFloat 810s ease-in-out infinite;
            will-change: transform, background-position, filter;
            filter: blur(0.5px);
          }

:root {
  --radial-amp: 150px;  /* ðŸ‘ˆ increase for more distance */
}
.moving-radial {
  animation: radialFloat 8s linear infinite;
}
@keyframes radialFloat {
  0%   { transform: translate3d(0,0,0) scale(1); }
  25%  { transform: translate3d(var(--radial-amp), calc(var(--radial-amp) * -0.6), 0) scale(1.03); }
  50%  { transform: translate3d(0, var(--radial-amp), 0) scale(1.05); }
  75%  { transform: translate3d(calc(var(--radial-amp) * -0.9), calc(var(--radial-amp) * -0.5), 0) scale(1.02); }
  100% { transform: translate3d(0,0,0) scale(1); }
}

        `}</style>
      </main>
    </div>
  );
}
