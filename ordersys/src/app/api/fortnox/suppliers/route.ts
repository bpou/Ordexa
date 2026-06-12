import { NextRequest, NextResponse } from "next/server";
import { listFortnoxSuppliers } from "@/lib/fortnox";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") ?? "";
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 50);
  const tenantId = searchParams.get("tenantId") ?? undefined;

  try {
    const { items } = await listFortnoxSuppliers({ query, page, limit, tenantId });
    return NextResponse.json({ suppliers: items });
  } catch (error: any) {
    const message: string = error?.message ?? "";
    if (message.includes("2000663") || message.toLowerCase().includes("scope")) {
      return NextResponse.json({ suppliers: [], warning: "missing_scope" });
    }
    return NextResponse.json(
      { error: message || "Fortnox suppliers error" },
      { status: 500 }
    );
  }
}
