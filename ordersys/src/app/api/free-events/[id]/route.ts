import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/* ---------- helpers ---------- */
const iso = z.string().datetime();

function safeDate(s?: string) {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

/* ---------- schemas ---------- */
const PatchSchema = z.object({
  // sent by drag/resize
  start: iso.optional(),
  end: iso.optional(),

  // optional extra edits (not required for drag/resize)
  title: z.string().min(1).optional(),
  allDay: z.boolean().optional(),
  label: z
    .enum([
      "BOKAD_TID",
      "KAN_FLYTTAS",
      "LUNCH",
      "SEMESTER",
      "TRAFIKVERKET",
      "UNDER_VECKAN",
      "UTFORT_ARBETE",
    ])
    .nullable()
    .optional(),
  visibility: z.enum(["PUBLIC", "PERSONAL"]).optional(),

  // the client might include this; we ignore for updates
  track: z.enum(["A", "B"]).optional(),
});

type RouteCtx = { params: Promise<{ id: string }> };

/* ---------- PATCH /api/free-events/[id] ---------- */
export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;

    const json = await req.json().catch(() => ({}));
    const body = PatchSchema.parse(json);

    const existing = await prisma.personalCalendarEvent.findUnique({
      where: { id },
      select: { id: true, ownerUserId: true, visibility: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Optional: if your table is user-scoped, enforce ownership
    if (existing.visibility === "PERSONAL" && existing.ownerUserId && existing.ownerUserId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data: any = {};
    if (body.start !== undefined) data.start = safeDate(body.start);
    if (body.end !== undefined) data.end = safeDate(body.end);
    if (body.title !== undefined) data.title = body.title;
    if (body.allDay !== undefined) data.allDay = body.allDay;
    if (body.label !== undefined) data.label = body.label;
    if (body.visibility !== undefined) {
      if (body.visibility === "PERSONAL" && !userId) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }

      data.visibility = body.visibility;
      data.ownerUserId = body.visibility === "PERSONAL" ? userId : null;
    }

    // guard against invalid dates
    if ("start" in data && !data.start) {
      return NextResponse.json({ error: "Invalid start datetime" }, { status: 400 });
    }
    if ("end" in data && !data.end) {
      return NextResponse.json({ error: "Invalid end datetime" }, { status: 400 });
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No changes" }, { status: 400 });
    }

    const updated = await prisma.personalCalendarEvent.update({
      where: { id },
      data,
    });

    return NextResponse.json({ ok: true, updated });
  } catch (err: any) {
    console.error("PATCH /free-events/[id] failed:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

/* ---------- DELETE /api/free-events/[id] ---------- */
export async function DELETE(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;

    const existing = await prisma.personalCalendarEvent.findUnique({
      where: { id },
      select: { id: true, ownerUserId: true, visibility: true },
    });

    if (!existing) {
      // idempotent: return 200 so UI doesn't "bounce back"
      return NextResponse.json({ ok: true, deleted: false });
    }

    if (existing.visibility === "PERSONAL" && existing.ownerUserId && existing.ownerUserId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.personalCalendarEvent.delete({ where: { id } });
    return NextResponse.json({ ok: true, deleted: true });
  } catch (err: any) {
    console.error("DELETE /free-events/[id] failed:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

/* ---------- (optional) GET one free event ---------- */
export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const row = await prisma.personalCalendarEvent.findUnique({ where: { id } });
    if (!row) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    return NextResponse.json({
      event: {
        id: row.id,
        title: row.title,
        start: row.start?.toISOString?.() ?? null,
        end: row.end?.toISOString?.() ?? null,
        allDay: row.allDay ?? false,
        extendedProps: {
          label: row.label ?? null,
          visibility: row.visibility ?? "PUBLIC",
          kind: "free",
          realId: row.id,
        },
      },
    });
  } catch (err: any) {
    console.error("GET /free-events/[id] failed:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

