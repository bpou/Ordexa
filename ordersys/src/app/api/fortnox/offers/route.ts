import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createFortnoxOffer } from "@/lib/fortnox";
import { Role } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = (session.user as any)?.role as Role | undefined;
  if (role !== Role.SALJARE && role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { fortnox, tenantId } = await req.json();

    if (!fortnox?.CustomerNumber) {
      return NextResponse.json({ error: "CustomerNumber saknas" }, { status: 400 });
    }

    const offer = await createFortnoxOffer(fortnox, tenantId);
    return NextResponse.json({ fortnox: offer });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Fortnox offers error" },
      { status: 500 }
    );
  }
}
