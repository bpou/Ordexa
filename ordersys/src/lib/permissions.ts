import { Role, type Track } from "@prisma/client";
import { isAppTrack, TRACK_TEAM_ROLE } from "@/lib/tracks";

export function canManageAllTracks(role: Role | undefined): boolean {
  return role === Role.ADMIN || role === Role.SALJARE;
}

export function canManageTrack(role: Role | undefined, track: Track | null | undefined): boolean {
  if (!role || !track) return false;
  if (canManageAllTracks(role)) return true;
  if (track === "SHARED") return true;
  if (!isAppTrack(track)) return false;

  const required = TRACK_TEAM_ROLE[track];
  return !!required && role === required;
}

export function canManageBilling(role: Role | undefined): boolean {
  return role === Role.ADMIN || role === Role.SALJARE;
}

export function canDeleteOrderFiles(role: Role | undefined): boolean {
  return role === Role.ADMIN || role === Role.SALJARE;
}

export function canCreateRegisters(role: Role | undefined): boolean {
  return role === Role.ADMIN || role === Role.SALJARE;
}
