import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import OrderEditClient from "./OrderEditClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const role = (session.user as { role?: string } | null | undefined)?.role;
  if (role !== "SALJARE" && role !== "ADMIN") {
    redirect("/403");
  }

  const { id } = await params;
  return <OrderEditClient orderId={id} />;
}
