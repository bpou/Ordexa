import { NextResponse } from "next/server";
import { handleOutlookWebhookNotification } from "@/lib/outlook";
import { pusherServer } from "@/lib/pusher-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const validationToken = url.searchParams.get("validationToken");

  if (validationToken) {
    return new Response(validationToken, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }

  const body = (await req.json().catch(() => ({}))) as {
    value?: Array<{
      subscriptionId?: string;
      clientState?: string;
      changeType?: string;
      resource?: string;
    }>;
  };

  const notifications = Array.isArray(body.value) ? body.value : [];
  const updatedUserIds = new Set<string>();

  for (const notification of notifications) {
    try {
      const result = await handleOutlookWebhookNotification(notification);
      if (result.handled && result.userId) {
        updatedUserIds.add(result.userId);
      }
    } catch (error) {
      console.error("Outlook webhook handling failed:", error);
    }
  }

  await Promise.all(
    Array.from(updatedUserIds).map((userId) =>
      pusherServer.trigger(`user-${userId}-calendar`, "calendar:refresh", {
        source: "outlook",
        at: new Date().toISOString(),
      })
    )
  ).catch((error) => {
    console.error("Outlook webhook realtime push failed:", error);
  });

  return NextResponse.json({ ok: true });
}
