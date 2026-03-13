import { NextResponse } from "next/server";
import { listFortnoxWayOfDeliveries } from "@/lib/fortnox";

export async function GET() {
  try {
    const { items } = await listFortnoxWayOfDeliveries({});
    return NextResponse.json({ items });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
