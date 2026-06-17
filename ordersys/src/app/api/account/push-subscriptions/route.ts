import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isWebPushConfigured, sendWebPushToUser } from "@/lib/web-push";

export const runtime = "nodejs";

type SubscriptionBody = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

function sessionUserId(session: unknown) {
  const id = (
    session as { user?: { id?: string | null } | null } | null | undefined
  )?.user?.id;
  return typeof id === "string" && id.trim() ? id : null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = sessionUserId(session);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = await prisma.webPushSubscription.count({ where: { userId } });

  return NextResponse.json({
    configured: isWebPushConfigured(),
    subscribed: count > 0,
    count,
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = sessionUserId(session);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as SubscriptionBody | null;
  const endpoint = body?.endpoint?.trim();
  const p256dh = body?.keys?.p256dh?.trim();
  const auth = body?.keys?.auth?.trim();

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });
  }

  await prisma.webPushSubscription.upsert({
    where: { endpoint },
    update: {
      userId,
      p256dh,
      auth,
      userAgent: req.headers.get("user-agent"),
    },
    create: {
      userId,
      endpoint,
      p256dh,
      auth,
      userAgent: req.headers.get("user-agent"),
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = sessionUserId(session);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { endpoint?: string } | null;
  const endpoint = body?.endpoint?.trim();

  if (endpoint) {
    await prisma.webPushSubscription.deleteMany({ where: { userId, endpoint } });
  } else {
    await prisma.webPushSubscription.deleteMany({ where: { userId } });
  }

  return NextResponse.json({ ok: true });
}

export async function PUT() {
  const session = await getServerSession(authOptions);
  const userId = sessionUserId(session);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendWebPushToUser(userId, {
    title: "Ordexa-notiser är aktiva",
    body: "Den här datorn kan ta emot notiser även när Ordexa-fliken är stängd.",
    url: "/account",
    tag: "push-test",
  });

  return NextResponse.json({ ok: true, ...result });
}
