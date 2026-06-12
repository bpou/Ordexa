import type { Metadata } from "next";
import CookiesContent from "./CookiesContent";

const cookieInventory = [
  {
    name: "ordina_session",
    type: "Nödvändig",
    purpose:
      "Håller användare inloggade mellan sidladdningar och skyddar sessioner från obehörig åtkomst.",
    duration: "24 timmar",
  },
  {
    name: "ordina_prefs",
    type: "Funktionell",
    purpose:
      "Sparar vyer, filter och valda spår så att du slipper konfigurera om gränssnittet vid varje besök.",
    duration: "6 månader",
  },
  {
    name: "ordina_analytics",
    type: "Analys",
    purpose:
      "Ger statistik över hur Ordina används för att förbättra flöden, prestanda och utbildningsmaterial.",
    duration: "13 månader",
  },
  {
    name: "ordina_marketing",
    type: "Marknadsföring",
    purpose:
      "Visar relevanta produktuppdateringar i appen och kommunicerar riktade onboarding-tips.",
    duration: "3 månader",
  },
] as const;

export const metadata: Metadata = {
  title: "Cookies | Ordina",
  description:
    "Lär dig hur Ordina använder cookies för att leverera säker inloggning, bättre planering och förfinade upplevelser.",
};

export default function CookiesPage() {
  return <CookiesContent cookieInventory={cookieInventory} />;
}
