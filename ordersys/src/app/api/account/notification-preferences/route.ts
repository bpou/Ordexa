import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendNotificationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { canSendNotification, notificationPreferenceDefaults } from "@/lib/notification-preferences";

export const runtime = "nodejs";

const preferenceKeys = [
  "desktopEnabled",
  "emailEnabled",
  "orderUpdates",
  "calendarDigest",
  "securityAlerts",
] as const;

type PreferenceKey = (typeof preferenceKeys)[number];

function sessionUserId(session: unknown) {
  const id = (
    session as { user?: { id?: string | null } | null } | null | undefined
  )?.user?.id;
  return typeof id === "string" && id.trim() ? id : null;
}

function sessionUserEmail(session: unknown) {
  const email = (
    session as { user?: { email?: string | null } | null } | null | undefined
  )?.user?.email;
  return typeof email === "string" && email.trim() ? email : null;
}

function responseBody(preferences: Record<PreferenceKey, boolean>) {
  return {
    preferences: {
      desktopEnabled: preferences.desktopEnabled,
      emailEnabled: preferences.emailEnabled,
      orderUpdates: preferences.orderUpdates,
      calendarDigest: preferences.calendarDigest,
      securityAlerts: preferences.securityAlerts,
    },
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = sessionUserId(session);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const preferences = await prisma.notificationPreference.upsert({
    where: { userId },
    update: {},
    create: { userId, ...notificationPreferenceDefaults },
  });

  return NextResponse.json(responseBody(preferences));
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = sessionUserId(session);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Partial<Record<PreferenceKey, unknown>> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid preferences." }, { status: 400 });
  }

  const data: Partial<Record<PreferenceKey, boolean>> = {};
  for (const key of preferenceKeys) {
    if (key in body) {
      if (typeof body[key] !== "boolean") {
        return NextResponse.json({ error: `Invalid value for ${key}.` }, { status: 400 });
      }
      data[key] = body[key];
    }
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "No preferences to update." }, { status: 400 });
  }

  const preferences = await prisma.notificationPreference.upsert({
    where: { userId },
    update: data,
    create: { userId, ...notificationPreferenceDefaults, ...data },
  });

  return NextResponse.json(responseBody(preferences));
}

export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = sessionUserId(session);
  const email = sessionUserEmail(session);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!email) {
    return NextResponse.json({ error: "Kontot saknar e-postadress." }, { status: 400 });
  }

  const preferences = await prisma.notificationPreference.upsert({
    where: { userId },
    update: {},
    create: { userId, ...notificationPreferenceDefaults },
  });

  if (!canSendNotification(preferences, "orderUpdates", "email")) {
    return NextResponse.json(
      { error: "E-postnotiser eller Orderuppdateringar är avstängda." },
      { status: 400 }
    );
  }

  console.info("Sending account test email", {
    userId,
    hasSmtpHost: Boolean(process.env.SMTP_HOST),
    hasSmtpPort: Boolean(process.env.SMTP_PORT),
    hasSmtpUser: Boolean(process.env.SMTP_USER),
    hasSmtpPass: Boolean(process.env.SMTP_PASS),
    hasFromEmail: Boolean(process.env.FROM_EMAIL),
  });

  try {
    await sendNotificationEmail({
      to: email,
      subject: "Ordexa e-postnotiser är aktiva",
      title: "E-postnotiser är aktiva",
      body: "Det här är ett test från Ordexa. Om du ser detta fungerar e-postnotiser för ditt konto.",
      actionUrl: `${process.env.NEXTAUTH_URL || "https://www.ordexa.se"}/account`,
      actionLabel: "Öppna inställningar",
    });
    console.info("Account test email sent", { userId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to send account test email", error);
    return NextResponse.json({ error: "Kunde inte skicka testmail. Se produktionsloggar." }, { status: 502 });
  }
}
