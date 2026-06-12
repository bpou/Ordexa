import { APP_TRACKS, type AppTrack } from "@/lib/tracks";

export type DashboardRole =
  | "ADMIN"
  | "SALJARE"
  | "A_TEAM"
  | "B_TEAM"
  | "C_TEAM"
  | "D_TEAM";

export type DashboardQuickLinkKey =
  | "new"
  | "newQuote"
  | "overview"
  | "planner"
  | "completed";

export const DASHBOARD_PERMS: Record<
  DashboardRole,
  {
    tracks: AppTrack[];
    quick: DashboardQuickLinkKey[];
    calendar: AppTrack;
  }
> = {
  ADMIN: {
    tracks: [...APP_TRACKS],
    quick: ["new", "newQuote", "overview", "planner", "completed"],
    calendar: "A",
  },
  SALJARE: {
    tracks: [...APP_TRACKS],
    quick: ["new", "newQuote", "overview", "planner", "completed"],
    calendar: "A",
  },
  A_TEAM: {
    tracks: ["A"],
    quick: ["overview", "planner"],
    calendar: "A",
  },
  B_TEAM: {
    tracks: ["B"],
    quick: ["overview", "planner"],
    calendar: "B",
  },
  C_TEAM: {
    tracks: ["C"],
    quick: ["overview", "planner"],
    calendar: "C",
  },
  D_TEAM: {
    tracks: ["D"],
    quick: ["overview", "planner"],
    calendar: "D",
  },
};

export function getDashboardRole(
  role: string | null | undefined
): DashboardRole {
  if (role && role in DASHBOARD_PERMS) {
    return role as DashboardRole;
  }

  return "SALJARE";
}
