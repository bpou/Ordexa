import webpush, { type PushSubscription } from "web-push";
import { prisma } from "@/lib/prisma";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject =
    process.env.VAPID_SUBJECT ||
    (process.env.FROM_EMAIL ? `mailto:${process.env.FROM_EMAIL}` : "mailto:ordexa.notifier@gmail.com");

  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

export function isWebPushConfigured() {
  return Boolean(getVapidConfig());
}

function configureWebPush() {
  const config = getVapidConfig();
  if (!config) return false;
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  return true;
}

export async function sendWebPushToUser(userId: string, payload: PushPayload) {
  if (!configureWebPush()) {
    console.warn("Web push is disabled because NEXT_PUBLIC_VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY is missing.");
    return { sent: 0, failed: 0 };
  }

  const subscriptions = await prisma.webPushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });

  if (subscriptions.length === 0) {
    console.info("No web push subscriptions found for user", { userId, tag: payload.tag ?? null });
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      const pushSubscription: PushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
        sent += 1;
      } catch (error) {
        failed += 1;
        const statusCode =
          typeof error === "object" && error && "statusCode" in error
            ? Number((error as { statusCode?: unknown }).statusCode)
            : null;

        if (statusCode === 404 || statusCode === 410) {
          await prisma.webPushSubscription.delete({ where: { id: subscription.id } }).catch(() => null);
          return;
        }

        console.error("Failed to send web push notification", error);
      }
    })
  );

  console.info("Web push delivery result", { userId, tag: payload.tag ?? null, sent, failed });
  return { sent, failed };
}
