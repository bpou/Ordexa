import { Track } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const notificationPreferenceDefaults = {
  desktopEnabled: true,
  emailEnabled: true,
  orderUpdates: true,
  calendarDigest: true,
  securityAlerts: true,
  trackFilters: [] as Track[],
  userFilters: [] as string[],
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
      trackFilters: true,
      userFilters: true,
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

export function matchesNotificationFilters(
  preferences: NotificationPreferences,
  context: {
    tracks?: Track[] | null;
    actorUserId?: string | null;
    ownerUserId?: string | null;
  }
) {
  const trackFilters = preferences.trackFilters ?? [];
  if (trackFilters.length > 0) {
    const tracks = context.tracks ?? [];
    if (!tracks.some((track) => trackFilters.includes(track))) {
      return false;
    }
  }

  const userFilters = preferences.userFilters ?? [];
  if (userFilters.length > 0) {
    const candidates = [context.actorUserId, context.ownerUserId].filter(
      (value): value is string => typeof value === "string" && value.trim().length > 0
    );
    if (!candidates.some((value) => userFilters.includes(value))) {
      return false;
    }
  }

  return true;
}
