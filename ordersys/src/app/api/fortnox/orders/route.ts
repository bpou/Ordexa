import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Role } from "@prisma/client";
import { listAllFortnoxDocumentNumbers } from "@/lib/fortnox";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any)?.role as Role | undefined;
  if (role !== Role.SALJARE && role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenantId") ?? undefined;
  const docType = searchParams.get("docType") === "offers" ? "offers" : "orders";
  const limit = Number(searchParams.get("limit") ?? 100);

  try {
    const numbers = await listAllFortnoxDocumentNumbers({
      resource: docType,
      tenantId,
      limit,
    });

    return NextResponse.json({
      docType,
      numbers,
      total: numbers.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Fortnox orders error", numbers: [] },
      { status: 500 }
    );
  }
}

