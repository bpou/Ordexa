import ArticlesClient from "./ArticlesClient";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { canCreateRegisters } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function ArticlesPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as Role | undefined;

  return (
<main className="min-h-[calc(100vh-6rem)] px-4 py-6 sm:px-6">
  <div className="mx-auto w-full max-w-8xl space-y-6">
    <ArticlesClient canCreate={canCreateRegisters(role)} />
  </div>
</main>
  );
}
