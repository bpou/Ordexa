"use client";

import { motion } from "framer-motion";
import type { Variants } from "framer-motion";

type DataCategory = {
  title: string;
  details: string;
};

type LegalBasis = {
  basis: string;
  description: string;
};

type IntegritetContentProps = {
  dataCategories: readonly DataCategory[];
  legalBases: readonly LegalBasis[];
  rights: readonly string[];
};

const sectionAnimation: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut", delay: 0.12 * index },
  }),
};

export default function IntegritetContent({ dataCategories, legalBases, rights }: IntegritetContentProps) {
  return (
    <main className="bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="space-y-4"
        >
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            Detta är för närvarande ett test och information kan komma att justeras
          </p>
          <h1 className="text-3xl font-semibold">Integritetspolicy</h1>
          <p className="text-base leading-7 text-muted-foreground">
            Din data i Ordina ska vara trygg, korrekt och användas ansvarsfullt. Nedan beskriver vi vilka
            personuppgifter vi hanterar, hur de används och vilka valmöjligheter du har.
          </p>
        </motion.header>

        <div className="mt-12 space-y-12">
          <motion.section variants={sectionAnimation} initial="hidden" animate="visible" custom={1} className="space-y-4">
            <h2 className="text-2xl font-semibold">Vilka uppgifter vi samlar in</h2>
            <div className="space-y-4 text-base leading-7 text-muted-foreground">
              <p>
                Ordina är ett ordersystem för team som behöver planera, följa upp och fakturera projekt. För att
                leverera dessa funktioner behöver vi vissa personuppgifter. Vi samlar endast in information som är
                nödvändig för att driva plattformen och hanterar den enligt GDPR.
              </p>
              <ul className="space-y-4">
                {dataCategories.map((item) => (
                  <li key={item.title} className="rounded-xl border border-border px-4 py-3">
                    <h3 className="text-lg font-medium text-foreground">{item.title}</h3>
                    <p className="mt-2 text-muted-foreground">{item.details}</p>
                  </li>
                ))}
              </ul>
            </div>
          </motion.section>

          <motion.section variants={sectionAnimation} initial="hidden" animate="visible" custom={2} className="space-y-4">
            <h2 className="text-2xl font-semibold">Hur vi använder uppgifterna</h2>
            <div className="space-y-4 text-base leading-7 text-muted-foreground">
              <ul className="list-disc space-y-2 pl-6">
                <li>För att autentisera användare och säkerställa att endast behöriga ser rätt ordrar.</li>
                <li>För att skapa tidslinjer, beläggningsöversikter och rapporter åt ditt team.</li>
                <li>För att skicka nödvändiga notifieringar om orderstatus, påminnelser och incidentinformation.</li>
                <li>För att ge support och felsöka problem som rapporteras av användare.</li>
                <li>För att analysera användningsmönster och prioritera förbättringar i produktutvecklingen.</li>
              </ul>
            </div>
          </motion.section>

          <motion.section variants={sectionAnimation} initial="hidden" animate="visible" custom={3} className="space-y-4">
            <h2 className="text-2xl font-semibold">Rättslig grund</h2>
            <div className="grid gap-4 text-base leading-7 text-muted-foreground md:grid-cols-2">
              {legalBases.map((item) => (
                <div key={item.basis} className="rounded-xl border border-border p-4">
                  <h3 className="text-lg font-medium text-foreground">{item.basis}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section variants={sectionAnimation} initial="hidden" animate="visible" custom={4} className="space-y-4">
            <h2 className="text-2xl font-semibold">Lagring och gallring</h2>
            <div className="space-y-4 text-base leading-7 text-muted-foreground">
              <p>
                Personuppgifter sparas så länge du har ett aktivt konto hos Ordina eller så länge din arbetsgivare är
                kund. Order- och fakturauppgifter sparas i upp till sju år för att uppfylla bokföringslagen. Loggar med
                IP-adresser och teknisk metadata raderas automatiskt efter 180 dagar.
              </p>
              <p>
                När ett konto avslutas anonymiserar vi information som behövs för statistik och tar bort resten inom 30
                dagar, såvida inte annan lagstiftning kräver längre lagring.
              </p>
            </div>
          </motion.section>

          <motion.section variants={sectionAnimation} initial="hidden" animate="visible" custom={5} className="space-y-4">
            <h2 className="text-2xl font-semibold">Dina rättigheter</h2>
            <div className="grid gap-4 text-sm leading-6 text-muted-foreground md:grid-cols-2">
              {rights.map((right) => (
                <div key={right} className="rounded-xl border border-border p-4">{right}</div>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Kontakta oss om du vill utöva någon av dessa rättigheter. Vi svarar normalt inom 30 dagar.
            </p>
          </motion.section>

          <motion.section variants={sectionAnimation} initial="hidden" animate="visible" custom={6} className="space-y-4">
            <h2 className="text-2xl font-semibold">Överföringar och leverantörer</h2>
            <div className="space-y-4 text-base leading-7 text-muted-foreground">
              <p>
                Ordina driftas inom EU. Vi använder svenska leverantörer för hosting och europeiska underbiträden för
                säker loggning, e-postutskick och databackuper. Samtliga avtal innehåller dataskyddsavtal och kryptering
                används i transit och vid lagring.
              </p>
              <p>
                Vid överföring utanför EU använder vi EU-kommissionens standardavtalsklausuler och gör
                adekvathetsbedömningar innan någon data flyttas.
              </p>
            </div>
          </motion.section>

          <motion.section variants={sectionAnimation} initial="hidden" animate="visible" custom={7} className="space-y-4">
            <h2 className="text-2xl font-semibold">Frågor & kontakt</h2>
            <div className="space-y-4 text-base leading-7 text-muted-foreground">
              <p>
                Ordina är personuppgiftsansvarig. Vårt utsedda dataskyddsombud nås via
                <a className="text-primary hover:underline" href="mailto:privacy@ordina.se"> privacy@ordina.se</a>.
              </p>
              <p>
                Du kan också kontakta Integritetsskyddsmyndigheten (IMY) om du är missnöjd med hur vi hanterar dina
                uppgifter.
              </p>
            </div>
          </motion.section>
        </div>
      </div>
    </main>
  );
}
