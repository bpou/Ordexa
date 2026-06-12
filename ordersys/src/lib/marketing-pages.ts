export type MarketingPageSlug =
  | "features"
  | "pricing"
  | "changelog"
  | "status"
  | "about"
  | "contact"
  | "docs"
  | "guides"
  | "support"
  | "accessibility";

type Section = {
  heading: string;
  body: string;
  items?: string[];
};

type Action = {
  href: string;
  label: string;
  external?: boolean;
};

export type MarketingPageContent = {
  kicker?: string;
  title: string;
  description: string;
  sections?: Section[];
  actions?: Action[];
};

export const MARKETING_PAGE_CONTENT: Record<MarketingPageSlug, MarketingPageContent> = {
  features: {
    kicker: "Produkt",
    title: "Digitalt ordersystem med planner för team",
    description:
      "Ordina kombinerar order- och offert­hantering med planering för flera team som arbetar i samma projekt – utan krockar, papper eller parallella system.",
    sections: [
      {
        heading: "Kärnfunktioner idag",
        body: "Ordina är byggt för företag inom verkstad, tillverkning och hantverk där flera team behöver samordnas i samma flöde.",
        items: [
          "Order- och offertskapande direkt i systemet",
          "Planner med olika spår/banor för varje team",
          "Projektöversikt där alla jobb samlas",
          "Automatisk upptäckt av projektkrockar mellan spår",
        ],
      },
      {
        heading: "Planering och samarbete",
        body: "Flera team kan jobba i samma projekt utan att tappa kontroll. Varje roll har egen inloggning och kan rapportera status tillbaka till säljare eller projektägare.",
        items: [
          "Separata spår för olika team (t.ex. produktion, montage, efterarbete)",
          "Egna inloggningar för team och projektägare",
          "Statusrapportering per projekt från respektive team",
          "E-postnotiser till projektägare/säljare när ett team är klart",
        ],
      },
      {
        heading: "Integrationer och filer",
        body: "Ordina är byggt runt Fortnox och en flexibel filhantering som kan ligga hos kunden eller i molnet.",
        items: [
          "Byggt ovanpå Fortnox – idag kompatibelt med Fortnox",
          "Personlig filserver per kund – i molnet eller lokalt",
          "Projektfiler samlade per order/projekt",
          "Förberett för fler ekonomiintegrationer framåt",
        ],
      },
      {
        heading: "Anpassning per kund",
        body: "Ordina levereras inte som ett generiskt standardkonto. Varje installation anpassas efter kundens flöde och befintliga arbetssätt.",
        items: [
          "Flöden och spår som speglar verkliga team",
          "Fält och vyer kan justeras efter behov",
          "Tekniska anpassningar per kundmiljö",
        ],
      },
    ],
    actions: [
      { href: "/contact", label: "Boka genomgång" },
      { href: "/pricing", label: "Läs om prissättning" },
    ],
  },

  pricing: {
    kicker: "Priser",
    title: "Prissättning för verkliga flöden",
    description:
      "Ordina sätts upp kund för kund. Priset baseras på hur mycket som behöver skräddarsys och hur många användare som jobbar i systemet.",
    sections: [
      {
        heading: "Grundmodell",
        body: "Priset följer en enkel struktur – en löpande licenskostnad per användare, plus en engångskostnad för implementation och anpassning.",
        items: [
          "Månadspris per användarkonto (säljare, planerare, teammedlemmar m.fl.)",
          "Engångskostnad för uppsättning och anpassning",
          "Möjlighet att skala upp antal användare över tid",
        ],
      },
      {
        heading: "När krävs mer anpassning?",
        body: "Vissa verksamheter behöver en helt kundspecifik lösning, andra kan utgå från en mer standardiserad struktur med mindre justeringar.",
        items: [
          "Kundspecifika flöden för flera team och spår",
          "Integration mot kundens egna filservrar och IT-miljö",
          "Fördjupad Fortnox-integration och speciallogik",
        ],
      },
      {
        heading: "Så tar vi nästa steg",
        body: "Prissättning tas fram tillsammans med dig baserat på nuläge, antal användare och krav på integrationer.",
        items: [
          "Kort genomgång av ert nuvarande arbetssätt",
          "Gemensam bild av vilka team och flöden som ska in i Ordina",
          "Förslag på upplägg och kostnadsbild",
        ],
      },
    ],
    actions: [
      { href: "mailto:kontakt@ordina.se", label: "Be om prisförslag", external: true },
      { href: "/contact", label: "Beskriv ert behov" },
    ],
  },

  changelog: {
    kicker: "Produkt",
    title: "Uppdateringar och roadmap",
    description:
      "Här samlar vi viktiga förändringar i Ordina och ger en översikt av vad som är på väg. All utveckling utgår från konkreta behov hos kunder inom verkstad och hantverk.",
    sections: [
      {
        heading: "Senaste uppdateringar",
        body: "Funktioner som redan används i skarpa miljöer.",
        items: [
          "Planner med flera separata spår för olika team",
          "Automatisk upptäckt av projektkrockar mellan spår",
          "Order- och offertskapande direkt i systemet",
          "E-postaviseringar till projektägare/säljare när team markerat klart",
          "Integration mot kundspecifik filserver (moln eller lokal miljö)",
        ],
      },
      {
        heading: "På väg in i produkten",
        body:
          "Detta är planerade områden som inte är färdiga ännu, men som vi aktivt arbetar mot tillsammans med kunder.",
        items: [
          "Utökad Fortnox-integration med mer dataflöden",
          "Full fakturahantering kopplad till projekt och order",
          "Stöd för fler ekonomisystem utöver Fortnox",
        ],
      },
      {
        heading: "Hur vi prioriterar",
        body:
          "Utveckling sker i nära dialog med kunder som använder systemet dagligen. Roadmap uppdateras löpande utifrån verkliga behov.",
        items: [
          "Fokus på stabilitet och tydlig planering för team",
          "Förstärka funktioner som minskar manuellt arbete och papper",
          "Bygga vidare på det som fungerar bra hos befintliga kunder",
        ],
      },
    ],
    actions: [{ href: "mailto:kontakt@ordina.se", label: "Diskutera behov och roadmap", external: true }],
  },

  status: {
    kicker: "Drift",
    title: "Drift och tillgänglighet",
    description:
      "Här beskriver vi hur vi arbetar med drift, tillgänglighet och incidenter för Ordina och dess integrationer.",
    sections: [
      {
        heading: "Vad vi övervakar",
        body:
          "Ordina är beroende av både den egna applikationen och externa system som Fortnox och kundernas filservrar.",
        items: [
          "Ordina-applikationen",
          "Kommunikation mot Fortnox",
          "Åtkomst till kundspecifika filservrar (moln eller lokalt)",
          "Bakgrundsjobb kopplade till planering och notifieringar",
        ],
      },
      {
        heading: "Information vid störning",
        body:
          "Det finns i dagsläget ingen publik realtidsstatus-sida, men vi informerar berörda kunder vid större avbrott.",
        items: [
          "Direktkontakt via e-post till berörda kontaktpersoner",
          "Tydlig beskrivning av påverkan och åtgärder",
          "Uppföljning när problemet är åtgärdat",
        ],
      },
      {
        heading: "Kontakta oss om du misstänker avbrott",
        body: "Om något inte fungerar som förväntat är det alltid rätt att höra av sig.",
        items: ["E-post: kontakt@ordina.se", "Beskriv vilket projekt eller vilken vy som påverkas"],
      },
    ],
    actions: [{ href: "/support", label: "Gå till support och hjälp" }],
  },

  about: {
    kicker: "Företag",
    title: "Om Ordina",
    description:
      "Ordina hjälper företag inom verkstad, tillverkning och hantverk att gå från manuella listor och papper till ett digitalt, samlat orderflöde.",
    sections: [
      {
        heading: "Bakgrund",
        body:
          "Ordina grundades 2025 i Umeå med utgångspunkt i verkliga problem: parallella Excelark, utskrivna papper och projekt som krockar mellan team.",
        items: [
          "Grundat 2025 i Umeå",
          "Grundare med erfarenhet av praktiskt arbete och produktion",
          "Fokus på verksamheter med många projekt och flera team",
        ],
      },
      {
        heading: "Vad vi gör annorlunda",
        body:
          "Ordina är inte ett generiskt standard-ERP. Vi bygger avancerade, kundanpassade ordersystem som fortfarande är lätta att använda i vardagen.",
        items: [
          "Teknik i botten, enkel vy för användaren",
          "Planner som speglar hur teamen faktiskt jobbar",
          "Integrationer som utgår från befintliga system (t.ex. Fortnox)",
        ],
      },
      {
        heading: "Vision och mission",
        body:
          "Målet är att förenkla och digitalisera order- och säljhantering där den idag ofta är manuell, fragmenterad och pappersbaserad.",
        items: [
          "Minska manuellt dubbelarbete och fel",
          "Samla order, planering och uppföljning i samma flöde",
          "Göra komplex planering hanterbar även för mindre team",
        ],
      },
    ],
    actions: [{ href: "/contact", label: "Kontakta Ordina" }],
  },

  contact: {
    kicker: "Kontakt",
    title: "Kontakt",
    description:
      "Här når du Ordina för demo, frågor eller diskussion kring en kundanpassad lösning.",
    sections: [
      {
        heading: "E-post",
        body: "Vi arbetar helt digitalt. E-post är den bästa vägen in, både för nya förfrågningar och befintliga kunder.",
        items: ["E-post: kontakt@ordina.se", "Svar normalt inom 24 timmar helgfria vardagar"],
      },
      {
        heading: "Hur vi jobbar",
        body:
          "Möten sker digitalt i första hand. Ingen fysisk besöksadress eller drop-in – fokus ligger på lösningar som fungerar i din miljö.",
        items: [
          "Digitala genomgångar av flöden och behov",
          "Tekniska diskussioner där det behövs",
          "Praktiska exempel från verkliga projekt",
        ],
      },
    ],
    actions: [
      { href: "mailto:kontakt@ordina.se", label: "Skicka e-post", external: true },
    ],
  },

  docs: {
    kicker: "Resurser",
    title: "Dokumentation",
    description:
      "Dokumentation tas fram tillsammans med varje kund och speglar den faktiska lösning som sätts upp – inte en generisk standardmanual.",
    sections: [
      {
        heading: "För administratörer",
        body:
          "När Ordina sätts upp hos en kund tas material fram som beskriver hur just den miljön är konfigurerad.",
        items: [
          "Översikt över spår, team och behörigheter",
          "Beskrivning av projektflödet från offert till avslut",
          "Eventuella kundspecifika regler och specialfall",
        ],
      },
      {
        heading: "Integration och teknik",
        body:
          "Teknisk dokumentation anpassas efter vilka system som kopplas ihop, till exempel Fortnox och kundens filserver.",
        items: [
          "Beskrivning av vilka data som flödar mellan Ordina och Fortnox",
          "Teknisk beskrivning av filserverkoppling (moln eller lokal)",
          "API- och integrationsunderlag vid behov",
        ],
      },
      {
        heading: "Tillgång till dokumentation",
        body:
          "Dokumentationen delas direkt med respektive kund i samband med implementation och uppdateras när lösningen förändras.",
      },
    ],
    actions: [
      {
        href: "mailto:kontakt@ordina.se",
        label: "Be om dokumentation för ert konto",
        external: true,
      },
    ],
  },

  guides: {
    kicker: "Resurser",
    title: "Guider",
    description:
      "Guider och checklistor tas fram per kund och utgår från hur era team faktiskt arbetar i Ordina.",
    sections: [
      {
        heading: "Onboarding av team",
        body:
          "Under uppstarten tar vi fram enkla guider för hur varje roll jobbar i systemet.",
        items: [
          "Introduktion för säljare och projektägare",
          "Genomgång för team som arbetar i spåren",
          "Checklista för hur man följer upp projekt",
        ],
      },
      {
        heading: "Exempel på material",
        body:
          "Innehållet kan variera beroende på hur lösningen är byggd, men följer alltid era flöden.",
        items: [
          "Steg-för-steg för att skapa en order eller offert",
          "Exempel på hur man ser och undviker projektkrockar",
          "Tips för att använda planner och kalender effektivt",
        ],
      },
      {
        heading: "Uppdatering över tid",
        body:
          "När systemet utvecklas uppdateras guiderna så att de fortsätter spegla verkligheten.",
      },
    ],
    actions: [
      { href: "/support", label: "Kontakta oss för nya guider" },
    ],
  },

  support: {
    kicker: "Support",
    title: "Support och hjälp",
    description:
      "Support sker via e-post med målsättning att svara inom 24 timmar helgfria vardagar.",
    sections: [
      {
        heading: "Så kontaktar du support",
        body:
          "För att kunna hjälpa snabbt är det bra om du skickar med så mycket konkret information som möjligt.",
        items: [
          "E-post: kontakt@ordina.se",
          "Beskriv vilket projekt eller vilken order det gäller",
          "Skärmbild vid felmeddelanden om möjligt",
        ],
      },
      {
        heading: "Vad vi kan hjälpa till med",
        body:
          "Supporten täcker både användarfrågor och tekniska frågor kopplat till er installation.",
        items: [
          "Frågor kring planner, spår och projektflöden",
          "Användarhantering och behörigheter",
          "Frågor kring Fortnox-integration och filhantering",
        ],
      },
      {
        heading: "Svarstid",
        body:
          "Vi strävar efter att återkomma inom 24 timmar helgfria vardagar. Mer komplexa ärenden kan kräva uppföljande frågor och gemensamt möte.",
      },
    ],
    actions: [
      { href: "mailto:kontakt@ordina.se", label: "Skicka supportärende", external: true },
    ],
  },

  accessibility: {
    kicker: "Juridik",
    title: "Tillgänglighet",
    description:
      "Målet är att Ordina ska vara möjligt att använda för så många som möjligt. Arbetet pågår löpande och är ännu inte klart på alla områden.",
    sections: [
      {
        heading: "Hur vi arbetar med tillgänglighet",
        body:
          "Ordina utvecklas stegvis med fokus på tydliga vyer och rimliga kontraster. Vi strävar efter att närma oss riktlinjer som WCAG 2.1 AA, men är inte färdiga överallt.",
        items: [
          "Fokus på tydlig struktur och hierarki i gränssnittet",
          "Kontraster ses över när nya komponenter läggs till",
          "Löpande förbättringar baserat på faktisk användning",
        ],
      },
      {
        heading: "Kända begränsningar",
        body:
          "Eftersom systemet är under aktiv utveckling kan vissa delar upplevas svårare att använda med hjälpmedel eller enbart tangentbord.",
        items: [
          "Enskilda vyer kan sakna full tangentbordsnavigering",
          "Vissa komponenter saknar ännu kompletterande beskrivningar",
        ],
      },
      {
        heading: "Rapportera tillgänglighetshinder",
        body:
          "Om du stöter på något som gör Ordina svårt att använda är vi tacksamma om du berättar det.",
        items: [
          "E-post: kontakt@ordina.se",
          "Beskriv vilken vy eller vilket steg som är svårt att använda",
        ],
      },
    ],
    actions: [
      {
        href: "mailto:kontakt@ordina.se",
        label: "Lämna synpunkter på tillgänglighet",
        external: true,
      },
    ],
  },
};

export function getMarketingPageContent(slug: string): MarketingPageContent | null {
  const normalized = slug.toLowerCase() as MarketingPageSlug;
  return MARKETING_PAGE_CONTENT[normalized] ?? null;
}

export type FooterLink = {
  href: string;
  label: string;
};

export type FooterGroup = {
  heading: string;
  links: FooterLink[];
};

export const FOOTER_LINK_GROUPS: FooterGroup[] = [
  {
    heading: "Produkt",
    links: [
      { href: "/features", label: "Funktioner" },
      { href: "/pricing", label: "Prissättning" },
      { href: "/changelog", label: "Uppdateringar" },
      { href: "/status", label: "Drift" },
    ],
  },
  {
    heading: "Företag",
    links: [
      { href: "/about", label: "Om Ordina" },
      { href: "/contact", label: "Kontakt" },
    ],
  },
  {
    heading: "Resurser",
    links: [
      { href: "/docs", label: "Dokumentation" },
      { href: "/guides", label: "Guider" },
      { href: "/support", label: "Support" },
    ],
  },
  {
    heading: "Juridik",
    links: [
      { href: "/integritet", label: "Integritet" },
      { href: "/villkor", label: "Villkor" },
      { href: "/cookies", label: "Cookies" },
      { href: "/sakerhet", label: "Säkerhet" },
    ],
  },
];
