import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

type StatePayload = { tenantId?: string };

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const oauthError = url.searchParams.get("error");
  const oauthErrorDescription = url.searchParams.get("error_description");
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");

  if (oauthError) {
    return NextResponse.json(
      {
        ok: false,
        error: oauthError,
        error_description: oauthErrorDescription ?? null,
      },
      { status: 400 }
    );
  }

  if (!code) {
    return NextResponse.json({ ok: false, error: "Missing code" }, { status: 400 });
  }
  if (!stateRaw) {
    return NextResponse.json({ ok: false, error: "Missing state" }, { status: 400 });
  }

  let state: StatePayload = {};
  try {
    state = JSON.parse(decodeURIComponent(stateRaw));
  } catch {
    // Fall back to env default below.
  }

  const TENANT_ID = state.tenantId || process.env.FORTNOX_DEFAULT_TENANT_ID || "DEFAULT";

  const clientId = process.env.FORTNOX_CLIENT_ID!;
  const clientSecret = process.env.FORTNOX_CLIENT_SECRET!;
  const redirectUri = process.env.FORTNOX_REDIRECT_URI!;

  const tokenRes = await fetch("https://apps.fortnox.se/oauth-v1/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  const text = await tokenRes.text();
  if (!tokenRes.ok) {
    return NextResponse.json(
      { ok: false, error: `Token exchange failed: ${text}` },
      { status: 500 }
    );
  }

  let json: {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: "Bearer";
    scope?: string;
  };
  try {
    json = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON from Fortnox: " + text },
      { status: 500 }
    );
  }

  if (!json.access_token) {
    return NextResponse.json(
      { ok: false, error: "Fortnox did not return access_token." },
      { status: 500 }
    );
  }

  if (!json.refresh_token) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Fortnox returned no refresh_token. Reconnect with scope offline_access enabled (FORTNOX_SCOPES).",
        scope: json.scope ?? null,
      },
      { status: 500 }
    );
  }

  const expiresAt = new Date(Date.now() + (json.expires_in ?? 3600) * 1000);

  await prisma.fortnoxConnection.upsert({
    where: { tenantId: TENANT_ID },
    create: {
      tenantId: TENANT_ID,
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      scope: json.scope ?? undefined,
      expiresAt,
    },
    update: {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      scope: json.scope ?? undefined,
      expiresAt,
      updatedAt: new Date(),
    },
  });

  const redirectTo = process.env.FORTNOX_POST_LOGIN_REDIRECT ?? "/orders/overview";
  return NextResponse.redirect(new URL(redirectTo, url));
}
