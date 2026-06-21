import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import MarketingLanding from "@/components/landing/MarketingLanding";
import { authOptions } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <div className="marketing-landing-page -mx-4 -my-4 sm:-mx-6 sm:-my-6">
        <MarketingLanding />
      </div>
    );
  }

  redirect("/dashboard");
}
