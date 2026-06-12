import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import TrackBoardClient from "./TrackBoardClient";
import { normalizeTrack } from "@/lib/tracks";
import { canManageTrack } from "@/lib/permissions";
import type { Role, Track } from "@prisma/client";

export default async function Page({ params }: { params: { track: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const track = normalizeTrack(params.track);
  if (!track) notFound();
  const role = (session.user as { role?: Role } | null | undefined)?.role;
  if (!canManageTrack(role, track as Track)) redirect("/403");

  return <TrackBoardClient track={track} />;
}
