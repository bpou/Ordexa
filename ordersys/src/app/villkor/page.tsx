import type { Metadata } from "next";
import VillkorContent from "./VillkorContent";

const responsibilities = [
  {
    title: "Ditt ansvar",
    points: [
      "Säkerställ att användare har korrekta roller och åtkomsträttigheter.",
      "Hantera kunddata enligt gällande lagstiftning och internt regelverk.",
      "Rapportera incidenter eller misstänkta intrång inom 24 timmar.",
      "Betala fakturor inom 30 dagar från fakturadatum.",
    ] as const,
  },
  {
    title: "Vårt ansvar",
    points: [
      "Tillhandahålla driftsäker åtkomst till Ordina med 99,5 % upptid på årsbasis.",
      "Utföra säkerhetskopiering minst var 15:e minut och lagra kopior i separata zoner.",
      "Leverera support på svenska helgfria vardagar 08-17 via e-post och chatt.",
      "Informera om planerade driftstopp minst 48 timmar i förväg.",
    ] as const,
  },
] as const;

const termination = [
  {
    heading: "Uppsägning",
    copy:
      "Abonnemang löper månadsvis med automatisk förlängning. Du kan säga upp tjänsten med 30 dagars skriftligt varsel.",
  },
  {
    heading: "Avstängning",
    copy:
      "Ordina får tillfälligt stänga av konton vid obetald faktura, säkerhetsrisk eller överträdelse av villkoren.",
  },
  {
    heading: "Export av data",
    copy:
      "Vid uppsägning kan ni exportera orderhistorik, bilagor och rapporter i öppna format under 30 dagar.",
  },
] as const;

export const metadata: Metadata = {
  title: "Villkor | Ordina",
  description:
    "Allmänna villkor för Ordina - ditt ordersystem för planering, produktion och fakturering.",
};

export default function VillkorPage() {
  return <VillkorContent responsibilities={responsibilities} termination={termination} />;
}
