// src/app/quotes/new/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import NewQuoteFortnoxClient from "../new2.0/NewQuoteFortnoxClient";

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = (session.user as any)?.role;
  if (role !== "SALJARE" && role !== "ADMIN") redirect("/403");

  const user = session.user as any;
  const defaultOurReference = user?.name ?? user?.email ?? "";

  return <NewQuoteFortnoxClient defaultOurReference={defaultOurReference} />;
}
