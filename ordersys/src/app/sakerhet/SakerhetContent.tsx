"use client";

import { motion } from "framer-motion";
import type { Variants } from "framer-motion";

type Principle = {
  title: string;
  description: string;
};

type Control = {
  heading: string;
  items: readonly string[];
};

type SakerhetContentProps = {
  principles: readonly Principle[];
  controls: readonly Control[];
  sharedResponsibility: readonly string[];
};

const sectionAnimation: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut", delay: 0.12 * index },
  }),
};

export default function SakerhetContent({ principles, controls, sharedResponsibility }: SakerhetContentProps) {
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
          <h1 className="text-3xl font-semibold">Säkerhetsöversikt</h1>
          <p className="text-base leading-7 text-muted-foreground">
            Ordina är byggt för team som kräver pålitliga orderflöden. Säkerhet och dataskydd är integrerat i varje
            lager - från infrastrukturen i molnet till rutinerna i vårt supportteam.
          </p>
        </motion.header>

        <div className="mt-12 space-y-12">
          <motion.section variants={sectionAnimation} initial="hidden" animate="visible" custom={1} className="space-y-4">
            <h2 className="text-2xl font-semibold">Våra principer</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {principles.map((principle) => (
                <div key={principle.title} className="rounded-xl border border-border p-4">
                  <h3 className="text-lg font-medium text-foreground">{principle.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{principle.description}</p>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section variants={sectionAnimation} initial="hidden" animate="visible" custom={2} className="space-y-4">
            <h2 className="text-2xl font-semibold">Tekniska kontroller</h2>
            <div className="space-y-6">
              {controls.map((control) => (
                <div key={control.heading} className="rounded-xl border border-border p-4">
                  <h3 className="text-lg font-medium text-foreground">{control.heading}</h3>
                  <ul className="mt-3 list-disc space-y-2 pl-4 text-sm leading-6 text-muted-foreground">
                    {control.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section variants={sectionAnimation} initial="hidden" animate="visible" custom={3} className="space-y-4">
            <h2 className="text-2xl font-semibold">Övervakning och incidenthantering</h2>
            <div className="space-y-4 text-base leading-7 text-muted-foreground">
              <p>
                Vi övervakar plattformen 24/7 med automatiska larm för inloggningsavvikelser, onormala API-anrop och
                resursutnyttjande. Teamet har tydliga runbooks och övningar för att agera snabbt vid incidenter.
              </p>
              <p>
                Vid säkerhetsincidenter informerar vi administratörer inom 24 timmar med detaljerad incidentrapport och
                rekommenderade åtgärder. All kommunikation loggas och analyseras för att förhindra återkommande problem.
              </p>
            </div>
          </motion.section>

          <motion.section variants={sectionAnimation} initial="hidden" animate="visible" custom={4} className="space-y-4">
            <h2 className="text-2xl font-semibold">Samarbete med kunder</h2>
            <div className="space-y-4 text-base leading-7 text-muted-foreground">
              <p>
                Säkerhet är ett delat ansvar. Följ rekommendationerna nedan för att få ut maximal skyddsnivå av Ordina.
              </p>
              <ul className="list-disc space-y-2 pl-6">
                {sharedResponsibility.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </motion.section>

          <motion.section variants={sectionAnimation} initial="hidden" animate="visible" custom={5} className="space-y-4">
            <h2 className="text-2xl font-semibold">Revisioner och regelefterlevnad</h2>
            <div className="space-y-4 text-base leading-7 text-muted-foreground">
              <p>
                Ordinas miljöer följer branschpraxis för intern kontroll enligt ISO 27001. Årliga tredjepartsrevisioner
                omfattar åtkomsthantering, kodgranskning och backupstrategi. Resultaten delas med kunder i en
                sammanfattad rapport.
              </p>
              <p>
                Vi uppfyller kraven för GDPR och stöttar kundernas ISO 9001- och ISO 14001-arbete genom tydliga loggar och
                dokumentation. Vid behov kan vi teckna skräddarsydda säkerhetsbilagor.
              </p>
            </div>
          </motion.section>

          <motion.section variants={sectionAnimation} initial="hidden" animate="visible" custom={6} className="space-y-4">
            <h2 className="text-2xl font-semibold">Kontakta säkerhetsteamet</h2>
            <div className="space-y-4 text-base leading-7 text-muted-foreground">
              <p>
                Har du hittat en sårbarhet eller vill boka en säkerhetsgenomgång? Kontakta oss på
                <a className="text-primary hover:underline" href="mailto:security@ordina.se"> security@ordina.se</a>.
                Vi använder Responsible Disclosure och återkopplar inom två arbetsdagar.
              </p>
            </div>
          </motion.section>
        </div>
      </div>
    </main>
  );
}
