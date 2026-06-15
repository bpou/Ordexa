import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import CalendarTracksView from "@/app/calendar/CalendarTracksView";
import { authOptions } from "@/lib/auth";
import { canManageTrack } from "@/lib/permissions";
import { normalizeTrack } from "@/lib/tracks";
import type { Role, Track } from "@prisma/client";

export default async function OldCalendarPage({
  params,
}: {
  params: Promise<{ track: string }>;
}) {
  const { track } = await params;
  const normalized = normalizeTrack(track);

  if (!normalized) notFound();
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = (session.user as { role?: Role } | null | undefined)?.role;
  if (!canManageTrack(role, normalized as Track)) redirect("/403");

  return <CalendarTracksView initialTrack={normalized} />;
}
