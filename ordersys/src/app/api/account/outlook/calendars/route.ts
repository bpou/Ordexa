import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchOutlookCalendars, getValidAccessToken, isOutlookSchemaMissingError } from "@/lib/outlook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let connection;
  try {
    connection = await prisma.outlookCalendarConnection.findUnique({
      where: { userId },
    });
  } catch (error) {
    if (isOutlookSchemaMissingError(error)) {
      return NextResponse.json({ calendars: [], currentCalendarId: null });
    }
    throw error;
  }

  if (!connection) {
    return NextResponse.json({ error: "Not connected" }, { status: 400 });
  }

  try {
    const { accessToken } = await getValidAccessToken(connection.id);
    const calendars = await fetchOutlookCalendars(accessToken);
    
    return NextResponse.json({
      calendars,
      currentCalendarId: connection.calendarId ?? "primary",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch calendars" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { calendarId } = await req.json();

  if (!calendarId || typeof calendarId !== "string") {
    return NextResponse.json({ error: "Invalid calendar ID" }, { status: 400 });
  }

  let connection;
  try {
    connection = await prisma.outlookCalendarConnection.findUnique({
      where: { userId },
    });
  } catch (error) {
    if (isOutlookSchemaMissingError(error)) {
      return NextResponse.json({ error: "Schema missing" }, { status: 500 });
    }
    throw error;
  }

  if (!connection) {
    return NextResponse.json({ error: "Not connected" }, { status: 400 });
  }

  await prisma.outlookCalendarConnection.update({
    where: { id: connection.id },
    data: { calendarId },
  });

  return NextResponse.json({ ok: true, calendarId });
}
