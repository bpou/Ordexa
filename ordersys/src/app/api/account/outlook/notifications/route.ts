import { NextResponse } from "next/server";
import {
  handleOutlookTrackWebhookNotification,
  handleOutlookWebhookNotification,
} from "@/lib/outlook";
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
  const updatedTracks = new Set<string>();

  for (const notification of notifications) {
    try {
      const personalResult = await handleOutlookWebhookNotification(notification);
      if (personalResult.handled && personalResult.userId) {
        updatedUserIds.add(personalResult.userId);
      }

      const trackResult = await handleOutlookTrackWebhookNotification(notification);
      if (
        trackResult.handled &&
        "track" in trackResult &&
        typeof trackResult.track === "string"
      ) {
        updatedTracks.add(trackResult.track);
      }
    } catch (error) {
      console.error("Outlook webhook handling failed:", error);
    }
  }

  await Promise.all(
    [
      ...Array.from(updatedUserIds).map((userId) =>
        pusherServer.trigger(`user-${userId}-calendar`, "calendar:refresh", {
          source: "outlook",
          at: new Date().toISOString(),
        })
      ),
      ...Array.from(updatedTracks).map((track) =>
        pusherServer.trigger(`track-${track}-calendar`, "calendar:refresh", {
          source: "outlook",
          at: new Date().toISOString(),
          track,
        })
      ),
    ]
  ).catch((error) => {
    console.error("Outlook webhook realtime push failed:", error);
  });

  return NextResponse.json({ ok: true });
}
