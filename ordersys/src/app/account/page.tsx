import { getServerSession } from "next-auth";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import AccountClient from "./AccountClient";

export const metadata: Metadata = {
  title: "Mitt konto | Ordina",
  description: "Hantera dina personliga uppgifter, notiser och sakerhetsinstallningar i Ordina.",
};

export default async function AccountPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const user = {
    id: (session.user as any)?.id ?? "",
    name: session.user?.name ?? "",
    email: session.user?.email ?? "",
    role: (session.user as any)?.role ?? "",
    image: session.user?.image ?? undefined,
    mfaEnabled: Boolean((session.user as any)?.mfaEnabled),
  };

  return <AccountClient user={user} />;
}
