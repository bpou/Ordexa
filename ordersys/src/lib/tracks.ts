import type { Track as PrismaTrack, Role } from "@prisma/client";

export const APP_TRACKS = ["A", "B", "C", "D"] as const;
export type AppTrack = (typeof APP_TRACKS)[number];

export const TRACK_SLUGS: Record<AppTrack, string> = {
  A: "a",
  B: "b",
  C: "c",
  D: "d",
};

export const TRACK_NAMES: Record<AppTrack, string> = {
  A: "Ateljé",
  B: "Verkstad",
  C: "Montage",
  D: "Bildekor",
};

export const TRACK_CALENDAR_LABELS: Record<AppTrack, string> = {
  A: "Kalender Ateljé",
  B: "Kalender Verkstad",
  C: "Kalender Montage",
  D: "Kalender Bildekor",
};

export const TRACK_OVERVIEW_LABELS: Record<AppTrack, string> = {
  A: "Översikt – Ateljé",
  B: "Översikt – Verkstad",
  C: "Översikt – Montage",
  D: "Översikt – Bildekor",
};

export const TRACK_TEAM_ROLE: Record<AppTrack, Role | null> = {
  A: "A_TEAM",
  B: "B_TEAM",
  C: "C_TEAM",
  D: "D_TEAM",
};

export function isAppTrack(value: unknown): value is AppTrack {
  return typeof value === "string" && (APP_TRACKS as readonly string[]).includes(value as string);
}

export function normalizeTrack(value: string | null | undefined): AppTrack | null {
  if (!value) return null;
  const upper = value.toUpperCase();
  return (APP_TRACKS as readonly string[]).includes(upper)
    ? (upper as AppTrack)
    : null;
}

export function assertTrack(value: string | null | undefined): AppTrack {
  const normalized = normalizeTrack(value);
  if (!normalized) {
    throw new Error(`Unknown track value: ${value ?? "<empty>"}`);
  }
  return normalized;
}

export function toPrismaTrack(track: AppTrack): PrismaTrack {
  return track as PrismaTrack;
}