import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildOutlookAuthorizeUrl } from "@/lib/outlook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_COOKIE = "ordexa_outlook_oauth_state";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const state = crypto.randomUUID();
    const redirectUrl = buildOutlookAuthorizeUrl(state, new URL(req.url).origin);
    const res = NextResponse.redirect(redirectUrl);

    res.cookies.set({
      name: STATE_COOKIE,
      value: state,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10,
    });

    return res;
  } catch (error: any) {
    return NextResponse.redirect(
      new URL(
        `/account?outlook_error=${encodeURIComponent(
          String(error?.message ?? "Outlook configuration error")
        )}`,
        req.url
      )
    );
  }
}
