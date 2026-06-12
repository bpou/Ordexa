import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const clientId = process.env.FORTNOX_CLIENT_ID!;
  const redirectUri = process.env.FORTNOX_REDIRECT_URI!;
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenantId") || process.env.FORTNOX_DEFAULT_TENANT_ID!;

  // Scope is optional. If configured, pass exactly what is configured.
  // If omitted, Fortnox uses app/default scopes.
  const scope = (process.env.FORTNOX_SCOPES || "").trim();

  const state = encodeURIComponent(JSON.stringify({ tenantId }));

  const authUrl = new URL("https://apps.fortnox.se/oauth-v1/auth");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  if (scope) {
    authUrl.searchParams.set("scope", scope);
  }
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}
