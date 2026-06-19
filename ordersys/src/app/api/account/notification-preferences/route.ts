import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendNotificationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { canSendNotification, notificationPreferenceDefaults } from "@/lib/notification-preferences";
import { Track } from "@prisma/client";

export const runtime = "nodejs";

const preferenceKeys = [
  "desktopEnabled",
  "emailEnabled",
  "orderUpdates",
  "calendarDigest",
  "securityAlerts",
  "trackFilters",
  "userFilters",
] as const;

type PreferenceKey = (typeof preferenceKeys)[number];
type BooleanPreferenceKey = "desktopEnabled" | "emailEnabled" | "orderUpdates" | "calendarDigest" | "securityAlerts";
const preferenceSelect = {
  desktopEnabled: true,
  emailEnabled: true,
  orderUpdates: true,
  calendarDigest: true,
  securityAlerts: true,
  trackFilters: true,
  userFilters: true,
} as const;

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

function responseBody(
  preferences: Record<BooleanPreferenceKey, boolean> & {
    trackFilters: Track[];
    userFilters: string[];
  }
) {
  return {
    preferences: {
      desktopEnabled: preferences.desktopEnabled,
      emailEnabled: preferences.emailEnabled,
      orderUpdates: preferences.orderUpdates,
      calendarDigest: preferences.calendarDigest,
      securityAlerts: preferences.securityAlerts,
      trackFilters: preferences.trackFilters,
      userFilters: preferences.userFilters,
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
    select: preferenceSelect,
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

  const data: Partial<Record<BooleanPreferenceKey, boolean> & { trackFilters: Track[]; userFilters: string[] }> = {};
  for (const key of preferenceKeys) {
    if (key in body) {
      if (key === "trackFilters") {
        if (!Array.isArray(body[key]) || body[key].some((value) => !Object.values(Track).includes(value as Track))) {
          return NextResponse.json({ error: `Invalid value for ${key}.` }, { status: 400 });
        }
        data[key] = [...new Set((body[key] as Track[]).map((value) => value as Track))];
        continue;
      }
      if (key === "userFilters") {
        if (!Array.isArray(body[key]) || body[key].some((value) => typeof value !== "string")) {
          return NextResponse.json({ error: `Invalid value for ${key}.` }, { status: 400 });
        }
        data[key] = [...new Set((body[key] as string[]).map((value) => value.trim()).filter(Boolean))];
        continue;
      }
      if (typeof body[key] !== "boolean") {
        return NextResponse.json({ error: `Invalid value for ${key}.` }, { status: 400 });
      }
      data[key] = body[key] as boolean;
    }
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "No preferences to update." }, { status: 400 });
  }

  const preferences = await prisma.notificationPreference.upsert({
    where: { userId },
    select: preferenceSelect,
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
    select: preferenceSelect,
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
