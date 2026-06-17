import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notificationPreferenceDefaults } from "@/lib/notification-preferences";

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
