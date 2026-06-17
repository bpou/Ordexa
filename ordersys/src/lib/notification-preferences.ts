import { prisma } from "@/lib/prisma";

export const notificationPreferenceDefaults = {
  desktopEnabled: true,
  emailEnabled: true,
  orderUpdates: true,
  calendarDigest: true,
  securityAlerts: true,
};

export type NotificationPreferences = typeof notificationPreferenceDefaults;
export type NotificationCategory = "orderUpdates" | "calendarDigest" | "securityAlerts";
export type NotificationChannel = "desktop" | "email";

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const preferences = await prisma.notificationPreference.findUnique({
    where: { userId },
    select: {
      desktopEnabled: true,
      emailEnabled: true,
      orderUpdates: true,
      calendarDigest: true,
      securityAlerts: true,
    },
  });

  return preferences ?? notificationPreferenceDefaults;
}

export function canSendNotification(
  preferences: NotificationPreferences,
  category: NotificationCategory,
  channel: NotificationChannel
) {
  const channelEnabled = channel === "desktop" ? preferences.desktopEnabled : preferences.emailEnabled;
  return channelEnabled && preferences[category];
}
