import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  ensureOutlookSubscriptionForUser,
  isOutlookSchemaMissingError,
  syncOutlookCalendarForUser,
} from "@/lib/outlook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureOutlookSubscriptionForUser(userId, new URL(req.url).origin);
    const result = await syncOutlookCalendarForUser(userId, { force: true });
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    if (isOutlookSchemaMissingError(error)) {
      return NextResponse.json(
        {
          error: "Outlook-tabellerna saknas lokalt. Kör Prisma-migrationen först.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      {
        error: String(error?.message ?? "Outlook sync failed"),
      },
      { status: 500 }
    );
  }
}
