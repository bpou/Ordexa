import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import SupplierInvoicesClient from "./SupplierInvoicesClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SupplierInvoicesPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session || (role !== "ADMIN" && role !== "SALJARE")) {
    redirect("/403");
  }

  return <SupplierInvoicesClient />;
}
