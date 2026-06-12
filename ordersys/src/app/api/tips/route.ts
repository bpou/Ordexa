import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const ROLE_TIPS: Record<string, string[]> = {
  ADMIN: [
    "Granska ordrar som ar klara for fakturering.",
    "Kontrollera resurslaget for kommande veckan.",
  ],
  SALJARE: [
    "Folj upp nya kundforfragningar innan dagens slut.",
    "Se over aktiva ordrar och uppdatera kundstatus vid behov.",
  ],
  A_TEAM: [
    "Prioritera inkommande arbeten med narmast deadline.",
    "Bekrafta att material finns for dagens produktion.",
  ],
  B_TEAM: [
    "Kontrollera arbetsbelastningen i verkstaden.",
    "Verifiera att leveransklara jobb ar markerade korrekt.",
  ],
  C_TEAM: [
    "Bekrafta dagens leveranser och montagefonstren.",
    "Sakra att kundinformation ar uppdaterad innan avfard.",
  ],
  D_TEAM: [
    "Ga igenom specialmontage innan arbetet startar.",
    "Kontrollera fordonsrelaterade noter pa dagens jobb.",
  ],
  default: [
    "Kontrollera dagens viktigaste ordrar och deadlines.",
    "Uppdatera orderstatus nar arbete blir klart.",
  ],
};

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = new URL(req.url).searchParams.get("role") || "default";
  const roleTips = ROLE_TIPS[role] || ROLE_TIPS.default;
  const tip = roleTips[Math.floor(Math.random() * roleTips.length)];

  return NextResponse.json({ tip });
}
