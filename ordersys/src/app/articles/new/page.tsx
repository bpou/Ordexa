import NewArticleFortnoxClient from "./NewArticleFortnoxClient";
import { Role } from "@prisma/client";
import { requireRoles } from "@/lib/requireRoles";

export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  await requireRoles([Role.ADMIN, Role.SALJARE]);

  return (
    <main className="min-h-[calc(100vh-6rem)]">
      <div className="opacity-95">
        <NewArticleFortnoxClient defaultOurReference="" />
      </div>
    </main>
  );
}
