import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EventVisibility } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const track = searchParams.get("track");

    const rows = await prisma.personalCalendarEvent.findMany({
      where: {
        ...(track ? { track: track as any } : {}),
        OR: [
          { visibility: EventVisibility.PUBLIC },
          { visibility: EventVisibility.PERSONAL, ownerUserId: userId },
        ],
      },
      orderBy: { start: "asc" },
    });

    const events = rows.map((r) => {
      const visibility = r.visibility as "PUBLIC" | "PERSONAL";
      const colorMap: Record<string, string> = {
        BOKAD_TID: "#3b82f6", // blue
        KAN_FLYTTAS: "#eab308", // yellow
        LUNCH: "#22c55e", // green
        SEMESTER: "#a855f7", // purple
        TRAFIKVERKET: "#ef4444", // red
        UNDER_VECKAN: "#6366f1", // indigo
        UTFORT_ARBETE: "#6b7280", // gray
      };

      return {
        id: r.id,
        title: r.title,
        start: r.start?.toISOString(),
        end: r.end?.toISOString(),
        allDay: r.allDay,
        backgroundColor: colorMap[r.label || "BOKAD_TID"],
        borderColor: colorMap[r.label || "BOKAD_TID"],
        textColor: "#ffffff",
        extendedProps: {
          label: r.label,
          visibility,
          kind: "personal",
          realId: r.id,
          synthetic: false,
          location: null,
          ownerUserId: r.ownerUserId,
        },
      };
    });

    return NextResponse.json({ events });
  } catch (err: any) {
    console.error("Personal calendar GET error:", err);
    return NextResponse.json(
      { events: [], error: err?.message ?? "failed" },
      { status: 500 }
    );
  }
}