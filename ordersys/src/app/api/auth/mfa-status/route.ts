import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptTotpSecret } from "@/lib/totp-secrets";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { email?: string } | null;
    const rawEmail = body?.email?.trim();
    if (!rawEmail) {
      return NextResponse.json({ requiresOtp: false });
    }

    const email = rawEmail.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
      select: { totpEnabled: true, totpSecret: true },
    });

    let secret: string | null = null;
    try {
      secret = decryptTotpSecret(user?.totpSecret ?? null);
    } catch (error) {
      console.error("Failed to decrypt TOTP secret when checking MFA status", error);
      return NextResponse.json({ requiresOtp: false }, { status: 200 });
    }

    const requiresOtp = Boolean(user?.totpEnabled && secret);
    return NextResponse.json({ requiresOtp });
  } catch (error) {
    console.error("Failed to check MFA status", error);
    return NextResponse.json({ requiresOtp: false }, { status: 200 });
  }
}
