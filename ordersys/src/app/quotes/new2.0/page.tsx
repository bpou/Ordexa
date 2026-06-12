// src/app/quotes/new2.0/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import NewQuoteFortnoxClient from "./NewQuoteFortnoxClient";

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const role = (session.user as any)?.role;
  if (role !== "SALJARE" && role !== "ADMIN") {
    redirect("/403");
  }

  const user = session.user as any;
  const defaultOurReference = user?.name ?? user?.email ?? "";

  return <NewQuoteFortnoxClient defaultOurReference={defaultOurReference} />;
}