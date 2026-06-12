import { NextRequest, NextResponse } from "next/server";
import { listFortnoxAccounts } from "@/lib/fortnox";

function isReconnectRequiredError(message: string) {
  return message.toLowerCase().includes("koppla om fortnox");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const tenantId = searchParams.get("tenantId") ?? undefined;
  const query = searchParams.get("query") ?? undefined;
  const refresh = searchParams.get("refresh") === "1";

  try {
    const { items } = await listFortnoxAccounts({
      tenantId,
      query: query ?? undefined,
      forceRefresh: refresh,
    });
    return NextResponse.json({ accounts: items });
  } catch (error: any) {
    const message: string = error?.message ?? "";
    if (isReconnectRequiredError(message)) {
      return NextResponse.json(
        { accounts: [], error: message, code: "fortnox_reconnect_required" },
        { status: 503 },
      );
    }
    if (message.includes("2000663") || message.toLowerCase().includes("scope")) {
      return NextResponse.json({ accounts: [], warning: "missing_scope" });
    }

    return NextResponse.json(
      { error: message || "Fortnox accounts error" },
      { status: 500 },
    );
  }
}
