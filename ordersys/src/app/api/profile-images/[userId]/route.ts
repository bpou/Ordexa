import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { s3GetObject } from "@/lib/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ userId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { userId } = await ctx.params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { image: true },
  });

  if (!user?.image) {
    return NextResponse.redirect(new URL("/uploads/profiles/default-avatar.png", _req.url));
  }

  if (
    /^https?:\/\//i.test(user.image) ||
    user.image.startsWith("/uploads/") ||
    user.image.startsWith("/api/stored-files/")
  ) {
    return NextResponse.redirect(new URL(user.image, _req.url));
  }

  try {
    const object = await s3GetObject(`profiles/${userId}/avatar`);
    return new Response(object.body, {
      headers: {
        "Content-Type": object.contentType,
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    console.warn(`Could not load profile image for user ${userId}:`, error);
    return NextResponse.redirect(new URL("/uploads/profiles/default-avatar.png", _req.url));
  }
}
