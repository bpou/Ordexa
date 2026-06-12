"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";

type Responsibility = {
  title: string;
  points: readonly string[];
};

type TerminationCard = {
  heading: string;
  copy: string;
};

type VillkorContentProps = {
  responsibilities: readonly Responsibility[];
  termination: readonly TerminationCard[];
};

const sectionAnimation: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut", delay: 0.12 * index },
  }),
};

export default function VillkorContent({ responsibilities, termination }: VillkorContentProps) {
  return (
    <main className="bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="space-y-4"
        >
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Version 2.1 - februari 2024</p>
          <h1 className="text-3xl font-semibold">Allmänna villkor</h1>
          <p className="text-base leading-7 text-muted-foreground">
            Dessa villkor reglerar användningen av Ordina - plattformen för ordning i orderflöden, planering och
            kunduppföljning. Genom att skapa ett konto eller använda tjänsten accepterar du villkoren nedan.
          </p>
        </motion.header>

        <div className="mt-12 space-y-12">
          <motion.section variants={sectionAnimation} initial="hidden" animate="visible" custom={1} className="space-y-4">
            <h2 className="text-2xl font-semibold">Om tjänsten</h2>
            <div className="space-y-4 text-base leading-7 text-muted-foreground">
              <p>
                Ordina tillhandahålls av Ordina AB (org.nr 559999-1234) och är ett molnbaserat ordersystem för små och
                medelstora svenska produktions- och servicebolag. Tjänsten omfattar orderregistrering, planering,
                filhantering, Fortnox-integration och kommunikationsverktyg.
              </p>
              <p>
                Tjänsten levereras "som den är" men vi arbetar kontinuerligt med förbättringar. Roadmap och större
                förändringar kommuniceras via vårt produktbrev och i appen.
              </p>
            </div>
          </motion.section>

          <motion.section variants={sectionAnimation} initial="hidden" animate="visible" custom={2} className="space-y-4">
            <h2 className="text-2xl font-semibold">Abonnemang och prissättning</h2>
            <div className="space-y-4 text-base leading-7 text-muted-foreground">
              <p>
                Abonnemang debiteras per aktiv användare och inkluderar support, hosting, uppdateringar och backup.
                Prislista framgår av offert eller den prisplan du valde vid beställning. Ordina kan justera priser med
                60 dagars varsel. Prishöjningar gäller från nästkommande förlängningsperiod.
              </p>
              <p>
                Alla priser anges exklusive moms. Vid försenad betalning tillkommer dröjsmålsränta enligt räntelagen samt
                påminnelseavgift.
              </p>
            </div>
          </motion.section>

          <motion.section variants={sectionAnimation} initial="hidden" animate="visible" custom={3} className="space-y-4">
            <h2 className="text-2xl font-semibold">Användarkonton</h2>
            <div className="space-y-4 text-base leading-7 text-muted-foreground">
              <p>
                Varje användare måste ha en unik inloggning. Du ansvarar för att lösenord hålls hemliga och att endast
                behöriga personer får åtkomst. Administratörer kan skapa, uppdatera och radera användare via
                administrationspanelen.
              </p>
              <p>
                Ordina erbjuder SSO via Microsoft Entra ID och tvåfaktorsautentisering. Vi rekommenderar att dessa
                funktioner aktiveras för ökad säkerhet.
              </p>
            </div>
          </motion.section>

          <motion.section variants={sectionAnimation} initial="hidden" animate="visible" custom={4} className="space-y-4">
            <h2 className="text-2xl font-semibold">Dataägande och integritet</h2>
            <div className="space-y-4 text-base leading-7 text-muted-foreground">
              <p>
                Du äger all data som lagras i Ordina. Vi behandlar personuppgifter i rollen som personuppgiftsbiträde
                enligt vårt personuppgiftsbiträdesavtal. Läs mer i vår
                <Link className="text-primary hover:underline" href="/integritet"> integritetspolicy</Link>.
              </p>
              <p>
                Vi använder endast kunddata för att leverera, underhålla och förbättra tjänsten. Test- och
                utvecklingsmiljöer använder anonymiserade dataset.
              </p>
            </div>
          </motion.section>

          <motion.section variants={sectionAnimation} initial="hidden" animate="visible" custom={5} className="space-y-4">
            <h2 className="text-2xl font-semibold">Ansvarsfördelning</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {responsibilities.map((group) => (
                <div key={group.title} className="rounded-xl border border-border p-4">
                  <h3 className="text-lg font-medium text-foreground">{group.title}</h3>
                  <ul className="mt-3 list-disc space-y-2 pl-4 text-sm leading-6 text-muted-foreground">
                    {group.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section variants={sectionAnimation} initial="hidden" animate="visible" custom={6} className="space-y-4">
            <h2 className="text-2xl font-semibold">Ansvarsbegränsning</h2>
            <div className="space-y-4 text-base leading-7 text-muted-foreground">
              <p>
                Ordina ansvarar inte för indirekta skador såsom utebliven vinst eller dataförlust. Vårt sammanlagda ansvar
                per kalenderår är begränsat till tolv månaders abonnemangsavgifter. Denna begränsning gäller inte vid grov
                vårdslöshet eller uppsåt.
              </p>
              <p>
                Vi arbetar förebyggande med hög tillgänglighet, men Ordina kan inte hållas ansvarigt för störningar
                orsakade av externa leverantörer, internetleverantörer eller force majeure-händelser.
              </p>
            </div>
          </motion.section>

          <motion.section variants={sectionAnimation} initial="hidden" animate="visible" custom={7} className="space-y-4">
            <h2 className="text-2xl font-semibold">Uppsägning och avstängning</h2>
            <div className="grid gap-4 text-sm leading-6 text-muted-foreground md:grid-cols-3">
              {termination.map((item) => (
                <div key={item.heading} className="rounded-xl border border-border p-4">
                  <h3 className="text-base font-medium text-foreground">{item.heading}</h3>
                  <p className="mt-2">{item.copy}</p>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section variants={sectionAnimation} initial="hidden" animate="visible" custom={8} className="space-y-4">
            <h2 className="text-2xl font-semibold">Ändringar av villkor</h2>
            <div className="space-y-4 text-base leading-7 text-muted-foreground">
              <p>
                Vi kan uppdatera dessa villkor för att spegla förändringar i lagstiftning, funktioner eller affärsmodellen.
                Vid större ändringar informerar vi minst 30 dagar i förväg via e-post och notiser i Ordina. Fortsatt
                användning efter ikraftträdandet innebär att du accepterar de nya villkoren.
              </p>
            </div>
          </motion.section>

          <motion.section variants={sectionAnimation} initial="hidden" animate="visible" custom={9} className="space-y-4">
            <h2 className="text-2xl font-semibold">Tillämplig lag och tvister</h2>
            <div className="space-y-4 text-base leading-7 text-muted-foreground">
              <p>
                Dessa villkor regleras av svensk lag. Tvister som inte kan lösas i samförstånd prövas av allmän domstol med
                Stockholms tingsrätt som första instans.
              </p>
            </div>
          </motion.section>

          <motion.section variants={sectionAnimation} initial="hidden" animate="visible" custom={10} className="space-y-4">
            <h2 className="text-2xl font-semibold">Kontakt</h2>
            <div className="space-y-2 text-base leading-7 text-muted-foreground">
              <p>Ordina AB</p>
              <p>Högbergsgatan 45, 118 26 Stockholm</p>
              <p>Organisationsnummer: 559999-1234</p>
              <p>
                Support:
                <a className="text-primary hover:underline" href="mailto:support@ordina.se"> support@ordina.se</a>
              </p>
            </div>
          </motion.section>
        </div>
      </div>
    </main>
  );
}

