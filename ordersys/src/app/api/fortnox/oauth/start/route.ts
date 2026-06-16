import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_FORTNOX_SCOPES = [
  "article",
  "bookkeeping",
  "companyinformation",
  "costcenter",
  "customer",
  "offer",
  "order",
  "price",
  "settings",
  "supplier",
  "supplierinvoice",
];

function resolveFortnoxScopes() {
  const configuredScopes = (process.env.FORTNOX_SCOPES || "")
    .split(/\s+/)
    .map((scope) => scope.trim())
    .filter(Boolean);

  return Array.from(
    new Set([...configuredScopes, ...DEFAULT_FORTNOX_SCOPES]),
  ).join(" ");
}

export async function GET(req: NextRequest) {
  const clientId = process.env.FORTNOX_CLIENT_ID!;
  const redirectUri = process.env.FORTNOX_REDIRECT_URI!;
  const { searchParams } = new URL(req.url);
  const tenantId =
    searchParams.get("tenantId") || process.env.FORTNOX_DEFAULT_TENANT_ID!;

  const scope = resolveFortnoxScopes();

  const state = encodeURIComponent(JSON.stringify({ tenantId }));

  const authUrl = new URL("https://apps.fortnox.se/oauth-v1/auth");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}
