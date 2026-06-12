import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import {
  decryptTotpSecret,
  encryptTotpSecret,
  hasTotpEncryptionKey,
  isEncryptedTotpSecret,
} from "@/lib/totp-secrets";

authenticator.options = { window: 1 };

async function requireUser() {
  if (!hasTotpEncryptionKey()) {
    throw new Response("MFA is not configured", { status: 500 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      totpEnabled: true,
      totpTempSecret: true,
      totpSecret: true,
    },
  });

  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  try {
    const decryptedTemp = decryptTotpSecret(user.totpTempSecret);
    const decryptedSecret = decryptTotpSecret(user.totpSecret);

    const updates: {
      totpTempSecret?: string | null;
      totpSecret?: string | null;
    } = {};

    if (user.totpTempSecret && !isEncryptedTotpSecret(user.totpTempSecret) && decryptedTemp) {
      updates.totpTempSecret = encryptTotpSecret(decryptedTemp);
    }
    if (user.totpSecret && !isEncryptedTotpSecret(user.totpSecret) && decryptedSecret) {
      updates.totpSecret = encryptTotpSecret(decryptedSecret);
    }

    if (Object.keys(updates).length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: updates,
      });
    }

    return {
      ...user,
      totpTempSecret: decryptedTemp,
      totpSecret: decryptedSecret,
    };
  } catch (error) {
    console.error("Failed to process stored TOTP secrets", error);
    throw new Response("MFA is temporarily unavailable", { status: 503 });
  }
}

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({
      enabled: user.totpEnabled,
      pending: Boolean(user.totpTempSecret),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === "start") {
      if (user.totpEnabled) {
        return NextResponse.json({ error: "Authenticator already enabled" }, { status: 400 });
      }

      const secret = authenticator.generateSecret();
      const encryptedSecret = encryptTotpSecret(secret);
      await prisma.user.update({
        where: { id: user.id },
        data: { totpTempSecret: encryptedSecret },
      });

      const issuer = "Ordina";
      const email = user.email ?? "Ordina";
      const otpAuthUrl = authenticator.keyuri(email, issuer, secret);
      const qrCode = await QRCode.toDataURL(otpAuthUrl);

      return NextResponse.json({
        otpAuthUrl,
        qrCode,
        manualKey: secret,
      });
    }

    if (action === "verify") {
      if (!user.totpTempSecret) {
        return NextResponse.json({ error: "No pending setup" }, { status: 400 });
      }

      const token = typeof body?.token === "string" ? body.token.trim() : "";
      if (!token) {
        return NextResponse.json({ error: "Missing token" }, { status: 400 });
      }

      const isValid = authenticator.verify({ token, secret: user.totpTempSecret });
      if (!isValid) {
        return NextResponse.json({ error: "Invalid code" }, { status: 400 });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          totpSecret: encryptTotpSecret(user.totpTempSecret),
          totpTempSecret: null,
          totpEnabled: true,
          totpEnabledAt: new Date(),
        },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("TOTP setup error", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const user = await requireUser();

    if (!user.totpEnabled && !user.totpSecret) {
      return NextResponse.json({ success: true });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        totpEnabled: false,
        totpSecret: null,
        totpTempSecret: null,
        totpEnabledAt: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("TOTP disable error", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
