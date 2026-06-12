// lib/requireRoles.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

export async function requireRoles(allowed: Role[]) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = (session.user as any)?.role as Role | undefined;
  if (!role || !allowed.includes(role)) redirect("/403");

  return session; // om du vill använda sessionen i sidan
}
