// src/app/calendar/[track]/page.tsx
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import OutlookCalendarClient from "@/app/calendar2/OutlookCalendarClient";
import { normalizeTrack } from "@/lib/tracks";
import { authOptions } from "@/lib/auth";
import { canManageTrack } from "@/lib/permissions";
import type { Role, Track } from "@prisma/client";

const TRACK_CALENDAR_LABEL = {
  A: "SEMESTER",
  B: "KAN_FLYTTAS",
  C: "UNDER_VECKAN",
  D: "TRAFIKVERKET",
} as const;

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ track: string }>;
}) {
  const { track } = await params;               // vänta in params
  const normalized = normalizeTrack(track);

  if (!normalized) notFound();
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = (session.user as { role?: Role } | null | undefined)?.role;
  if (!canManageTrack(role, normalized as Track)) redirect("/403");

  return (
    <OutlookCalendarClient
      calendarTrack={normalized}
      initialCalendarLabels={[TRACK_CALENDAR_LABEL[normalized]]}
    />
  );
}
