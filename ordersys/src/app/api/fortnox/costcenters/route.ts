import { NextRequest, NextResponse } from "next/server";
import { listFortnoxCostCenters } from "@/lib/fortnox";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenantId") ?? undefined;

  try {
    const { items } = await listFortnoxCostCenters({ tenantId });
    return NextResponse.json({ items });
  } catch (error: any) {
    const message: string = error?.message ?? "";
    if (message.includes("2000663") || message.toLowerCase().includes("scope")) {
      return NextResponse.json({ items: [], warning: "missing_scope" });
    }

    return NextResponse.json(
      { error: message || "Fortnox costcenters error" },
      { status: 500 },
    );
  }
}
