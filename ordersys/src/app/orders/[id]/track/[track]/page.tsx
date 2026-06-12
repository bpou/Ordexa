import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import OrderTrackClient from "./OrderTrackClient";
import { normalizeTrack } from "@/lib/tracks";
import { canManageTrack } from "@/lib/permissions";
import type { Role, Track } from "@prisma/client";

export default async function Page({
  params,
}: { params: { id: string; track: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const track = normalizeTrack(params.track);
  if (!track) notFound();
  const role = (session.user as { role?: Role } | null | undefined)?.role;
  if (!canManageTrack(role, track as Track)) redirect("/403");

  return <OrderTrackClient id={params.id} track={track} />;
}
