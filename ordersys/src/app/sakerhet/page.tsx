import type { Metadata } from "next";
import SakerhetContent from "./SakerhetContent";

const principles = [
  {
    title: "Säkra by default",
    description:
      "Ordinas standardinställningar prioriterar minsta möjliga behörighet, kryptering och säker infrastruktur.",
  },
  {
    title: "Transparent drift",
    description:
      "Incidenter, driftstörningar och större uppdateringar kommuniceras öppet via status.ordina.se och i appen.",
  },
  {
    title: "Kontinuerlig förbättring",
    description:
      "Vi genomför kvartalsvisa riskanalyser, penetrationstester och utbildning av utvecklings- och supportteam.",
  },
] as const;

const controls = [
  {
    heading: "Arkitektur",
    items: [
      "Ordina hostas i redundanta datacenter inom Sverige med ISO 27001-certifiering.",
      "Miljöer separeras (produktion, test och utveckling) med strikt nätsegmentering och brandväggar.",
      "All data lagras i PostgreSQL-kluster med automatiska säkerhetskopior i separata zoner.",
    ] as const,
  },
  {
    heading: "Kryptering",
    items: [
      "TLS 1.3 används för all trafik. HTTP Strict Transport Security (HSTS) är aktiverat.",
      "Vilande data krypteras med AES-256 på servernivå och kundladdade filer krypteras individuellt.",
      "Nyckelmaterial roteras automatiskt och lagras i separata nyckelvalv.",
    ] as const,
  },
  {
    heading: "Åtkomstkontroll",
    items: [
      "Administratörer kan definiera roller för säljare, produktion och ekonomi med finmaskiga behörigheter.",
      "Intern personal använder SSO med hårdvarunycklar och just-in-time-behörighet vid supportärenden.",
      "Alla förändringar loggas och går att spåra via revisionsloggar i administrationspanelen.",
    ] as const,
  },
] as const;

const sharedResponsibility = [
  "Aktivera tvåfaktorsautentisering eller SSO där det är möjligt.",
  "Använd starka lösenord och byt dem minst var sjätte månad om SSO inte används.",
  "Begränsa adminbehörigheter till personal som behöver det och stäng konton vid rollbyten.",
  "Granska bilagor innan de laddas upp för att undvika skadlig kod.",
] as const;

export const metadata: Metadata = {
  title: "Säkerhet | Ordina",
  description:
    "Läs hur Ordina arbetar med säkerhet: infrastruktur, kryptering, åtkomstkontroll och incidentprocesser.",
};

export default function SakerhetPage() {
  return (
    <SakerhetContent
      principles={principles}
      controls={controls}
      sharedResponsibility={sharedResponsibility}
    />
  );
}
