import type { Metadata } from "next";
import IntegritetContent from "./IntegritetContent";

const dataCategories = [
  {
    title: "Kontouppgifter",
    details:
      "Namn, e-postadress, telefonnummer och teamtillhörighet som du själv eller din administratör registrerar.",
  },
  {
    title: "Order- och projekthistorik",
    details:
      "Information om ordrar du skapar, uppdateringar du gör i flödet samt kopplade bilagor och kommentarer.",
  },
  {
    title: "Tekniska loggar",
    details:
      "IP-adress, enhetstyp, webbläsare och tidsstämplar som används för att säkra ordsystemet och felsöka incidenter.",
  },
  {
    title: "Support- och kommunikationsdata",
    details:
      "Konversationer via chat, e-post eller ärenden till vår support.",
  },
] as const;

const legalBases = [
  {
    basis: "Avtal",
    description:
      "För att leverera Ordina till ditt företag, hantera orderflöden och leverera funktioner som ingår i abonnemanget.",
  },
  {
    basis: "Berättigat intresse",
    description:
      "För att utveckla plattformen, förbättra användarupplevelsen och skydda mot bedrägerier.",
  },
  {
    basis: "Rättslig förpliktelse",
    description:
      "När vi måste spara data för att följa bokföringslagen eller andra myndighetskrav.",
  },
  {
    basis: "Samtycke",
    description:
      "För frivilliga tjänster såsom produktnyhetsbrev eller kundreferenser. Samtycket kan återkallas när som helst.",
  },
] as const;

const rights = [
  "Tillgång till registerutdrag",
  "Rättelse av felaktiga uppgifter",
  "Radering (rätten att bli bortglömd)",
  "Begränsning av behandling",
  "Dataportabilitet",
  "Invändning mot viss behandling",
] as const;

export const metadata: Metadata = {
  title: "Integritet | Ordina",
  description:
    "Så skyddar Ordina personuppgifter i order- och resursplanering. Läs om vilka data vi samlar in, varför och vilka rättigheter du har.",
};

export default function IntegritetPage() {
  return <IntegritetContent dataCategories={dataCategories} legalBases={legalBases} rights={rights} />;
}
