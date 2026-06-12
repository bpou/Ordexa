import { NextResponse } from "next/server";
import { listFortnoxPriceLists } from "@/lib/fortnox";

function isReconnectRequiredError(message: string) {
  return message.toLowerCase().includes("koppla om fortnox");
}

export async function GET() {
  try {
    const { items } = await listFortnoxPriceLists({});
    // items = [{ code, description }]
    return NextResponse.json({ items });
  } catch (err: any) {
    const message = err?.message ?? "Unknown error";
    if (isReconnectRequiredError(String(message))) {
      return NextResponse.json(
        { error: message, code: "fortnox_reconnect_required", items: [] },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
