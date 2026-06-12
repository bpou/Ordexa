import { getServerSession } from "next-auth";

import MarketingLanding from "@/components/landing/MarketingLanding";
import { authOptions } from "@/lib/auth";
import HomeClient from "./HomeClient";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as "ADMIN" | "SALJARE" | "A_TEAM" | "B_TEAM" | "C_TEAM" | "D_TEAM" | undefined;

  if (!session) {
    return (
      <div className="-mx-4 -my-4 sm:-mx-6 sm:-my-6">
        <MarketingLanding />
      </div>
    );
  }

  return (
    <HomeClient
      name={session.user?.name ?? "Användare"}
      role={role ?? "SALJARE"}
    />
  );
}
