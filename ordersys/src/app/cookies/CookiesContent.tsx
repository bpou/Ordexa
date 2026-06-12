"use client";

import { motion } from "framer-motion";
import type { Variants } from "framer-motion";

type Cookie = {
  name: string;
  type: string;
  purpose: string;
  duration: string;
};

type CookiesContentProps = {
  cookieInventory: readonly Cookie[];
};

const sectionAnimation: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut", delay: 0.12 * index },
  }),
};

export default function CookiesContent({ cookieInventory }: CookiesContentProps) {
  return (
    <main className="bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="space-y-4"
        >
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Uppdaterad januari 2024</p>
          <h1 className="text-3xl font-semibold">Cookiepolicy</h1>
          <p className="text-base leading-7 text-muted-foreground">
            Ordina använder cookies för att hålla ordning i dina processer, säkra sessioner och ge ett mer relevant
            arbetsflöde. Här beskriver vi vilka cookies vi använder, varför de behövs och hur du kan styra dem.
          </p>
        </motion.header>

        <div className="mt-12 space-y-12">
          <motion.section variants={sectionAnimation} initial="hidden" animate="visible" custom={1} className="space-y-4">
            <h2 className="text-2xl font-semibold">Sammanfattning i korthet</h2>
            <div className="space-y-4 text-base leading-7 text-muted-foreground">
              <p>
                Vi använder endast cookies som stödjer Ordinas kärnfunktioner: säker orderhantering, tydlig planering och
                smidigt samarbete. Ingen cookie säljs eller delas med tredje part utanför våra leverantörer för hosting,
                support och analys.
              </p>
              <ul className="list-disc space-y-2 pl-6">
                <li>Nödvändiga cookies krävs för inloggning, åtkomstkontroll och skydd mot intrång.</li>
                <li>Funktionella cookies minns dina vyer, språk, spår och filter i verktyget.</li>
                <li>Analyscookies hjälper oss förstå beläggning, flaskhalsar och prestanda i Ordina.</li>
                <li>Marknadsföringscookies används sparsamt för att visa relevanta produktuppdateringar i appen.</li>
              </ul>
            </div>
          </motion.section>

          <motion.section variants={sectionAnimation} initial="hidden" animate="visible" custom={2} className="space-y-4">
            <h2 className="text-2xl font-semibold">Typer av cookies vi använder</h2>
            <div className="space-y-4 text-base leading-7 text-muted-foreground">
              <p>
                För att göra policyn transparent listar vi samtliga cookies, kategoriserade efter deras funktion. Vi
                uppdaterar listan när nya funktioner lanseras.
              </p>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="min-w-full divide-y divide-border text-left text-sm">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Cookie</th>
                      <th className="px-4 py-3 font-medium">Kategori</th>
                      <th className="px-4 py-3 font-medium">Syfte</th>
                      <th className="px-4 py-3 font-medium">Lagringstid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {cookieInventory.map((cookie) => (
                      <tr key={cookie.name} className="align-top">
                        <td className="px-4 py-3 font-medium text-foreground">{cookie.name}</td>
                        <td className="px-4 py-3 text-foreground/90">{cookie.type}</td>
                        <td className="px-4 py-3 text-muted-foreground">{cookie.purpose}</td>
                        <td className="px-4 py-3 text-foreground/90">{cookie.duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.section>

          <motion.section variants={sectionAnimation} initial="hidden" animate="visible" custom={3} className="space-y-4">
            <h2 className="text-2xl font-semibold">Hur du kan styra cookies</h2>
            <div className="space-y-4 text-base leading-7 text-muted-foreground">
              <p>
                Du kan när som helst uppdatera dina preferenser via inbyggda inställningar i Ordina under
                <strong> Mitt konto &gt; Integritet</strong>. Här kan du avaktivera analys- och marknadsföringscookies utan att
                det påverkar kritiska funktioner.
              </p>
              <p>
                Webbplatsinställningar i din browser låter dig dessutom blockera eller ta bort cookies. Observera att
                viktiga funktioner såsom inloggning och orderflöden kräver våra nödvändiga cookies för att fungera.
              </p>
            </div>
          </motion.section>

          <motion.section variants={sectionAnimation} initial="hidden" animate="visible" custom={4} className="space-y-4">
            <h2 className="text-2xl font-semibold">Våra leverantörer</h2>
            <div className="space-y-4 text-base leading-7 text-muted-foreground">
              <p>
                För analys använder vi en självvärdad instans av Plausible Analytics, vilket gör att trafiken stannar inom EU
                och inga personuppgifter delas med tredje part. Hosting sker i svenska datacenter via vår partner ElastX, och
                logghantering sker i en krypterad instans av Grafana Cloud.
              </p>
              <p>
                Vi granskar samtliga leverantörer minst årligen med fokus på säkerhet, dataplacering och avtalsvillkor. Vid
                förändringar uppdaterar vi både denna policy och vår lista över personuppgiftsbiträden.
              </p>
            </div>
          </motion.section>

          <motion.section variants={sectionAnimation} initial="hidden" animate="visible" custom={5} className="space-y-4">
            <h2 className="text-2xl font-semibold">Kontakt</h2>
            <div className="space-y-4 text-base leading-7 text-muted-foreground">
              <p>
                Har du frågor kring cookies eller behöver ett registerutdrag? Kontakta vårt dataskyddsombud på
                <a className="text-primary hover:underline" href="mailto:privacy@ordina.se">privacy@ordina.se</a>.
              </p>
            </div>
          </motion.section>
        </div>
      </div>
    </main>
  );
}
