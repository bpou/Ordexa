import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ensureOutlookSubscriptionForUser,
  exchangeOutlookCodeForTokens,
  fetchOutlookProfile,
  isOutlookSchemaMissingError,
  syncOutlookCalendarForUser,
} from "@/lib/outlook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_COOKIE = "ordexa_outlook_oauth_state";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const cookieState = req.headers
    .get("cookie")
    ?.split(/;\s*/)
    .find((part) => part.startsWith(`${STATE_COOKIE}=`))
    ?.split("=")[1];

  if (error) {
    return NextResponse.redirect(
      new URL(`/account?outlook_error=${encodeURIComponent(error)}`, req.url)
    );
  }

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(
      new URL("/account?outlook_error=invalid_state", req.url)
    );
  }

  try {
    const tokenData = await exchangeOutlookCodeForTokens(code, url.origin);
    const profile = await fetchOutlookProfile(tokenData.access_token!);
    const expiresAt = new Date(
      Date.now() + Math.max(60, tokenData.expires_in ?? 3600) * 1000
    );

    await prisma.outlookCalendarConnection.upsert({
      where: { userId },
      update: {
        providerUserId: profile.providerUserId,
        providerEmail: profile.providerEmail,
        displayName: profile.displayName,
        accessToken: tokenData.access_token!,
        refreshToken: tokenData.refresh_token ?? "",
        tokenType: tokenData.token_type ?? null,
        scope: tokenData.scope ?? null,
        expiresAt,
        syncError: null,
      },
      create: {
        userId,
        providerUserId: profile.providerUserId,
        providerEmail: profile.providerEmail,
        displayName: profile.displayName,
        accessToken: tokenData.access_token!,
        refreshToken: tokenData.refresh_token ?? "",
        tokenType: tokenData.token_type ?? null,
        scope: tokenData.scope ?? null,
        expiresAt,
      },
    });

    await ensureOutlookSubscriptionForUser(userId, url.origin);
    await syncOutlookCalendarForUser(userId, { force: true });

    const res = NextResponse.redirect(new URL("/account?outlook=connected", req.url));
    res.cookies.set({
      name: STATE_COOKIE,
      value: "",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return res;
  } catch (callbackError: any) {
    if (isOutlookSchemaMissingError(callbackError)) {
      return NextResponse.redirect(
        new URL("/account?outlook_error=outlook_schema_missing", req.url)
      );
    }
    return NextResponse.redirect(
      new URL(
        `/account?outlook_error=${encodeURIComponent(
          String(callbackError?.message ?? "callback_failed")
        )}`,
        req.url
      )
    );
  }
}
