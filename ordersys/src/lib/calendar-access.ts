import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Role, type Track } from "@prisma/client";
import { canManageTrack } from "@/lib/permissions";

export async function getSessionAndRole(): Promise<{
  session: Session | null;
  role: Role | undefined;
}> {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as Role | undefined;
  return { session, role };
}

export function canAccessCalendarTrack(
  role: Role | undefined,
  track: Track | null | undefined
): boolean {
  return canManageTrack(role, track);
}
