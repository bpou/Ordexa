// src/app/api/fortnox-test/route.ts
import { NextResponse } from "next/server";
import { getFortnoxAccessToken, listFortnoxCustomers } from "@/lib/fortnox";

export async function GET() {
  try {
    const tokenInfo = await getFortnoxAccessToken();
    const customers = await listFortnoxCustomers({ limit: 1 });
    return NextResponse.json({ ok: true, tokenInfo: { tenantId: tokenInfo.tenantId }, customers });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
