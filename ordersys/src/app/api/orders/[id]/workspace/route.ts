import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { createOrderHistoryEvent } from "@/lib/order-history";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

function userDetails(session: Session | null) {
  const user = session?.user as
    | { id?: string | null; name?: string | null; email?: string | null; image?: string | null }
    | undefined;
  return {
    id: user?.id ?? null,
    name: user?.name || user?.email || "Okänd användare",
    image: user?.image ?? null,
  };
}

async function requireOrder(orderId: string) {
  return prisma.order.findUnique({
    where: { orderNumber: orderId },
    select: { orderNumber: true },
  });
}

export async function GET(_request: Request, context: Context) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  if (!(await requireOrder(id))) {
    return NextResponse.json({ error: "Ordern saknas." }, { status: 404 });
  }

  const [tasks, comments] = await Promise.all([
    prisma.orderWorkspaceTask.findMany({
      where: { orderId: id },
      orderBy: [{ completed: "asc" }, { createdAt: "asc" }],
    }),
    prisma.orderComment.findMany({
      where: { orderId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return NextResponse.json({ tasks, comments });
}

export async function POST(request: Request, context: Context) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  if (!(await requireOrder(id))) {
    return NextResponse.json({ error: "Ordern saknas." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as
    | { kind?: string; title?: string; body?: string }
    | null;
  const actor = userDetails(session);

  if (body?.kind === "task") {
    const title = body.title?.trim() ?? "";
    if (!title || title.length > 240) {
      return NextResponse.json({ error: "Uppgiften måste vara 1–240 tecken." }, { status: 400 });
    }
    const task = await prisma.orderWorkspaceTask.create({
      data: { orderId: id, title, createdById: actor.id, createdByName: actor.name },
    });
    await createOrderHistoryEvent({
      orderId: id,
      type: "task",
      title: "Uppgift tillagd",
      description: `${actor.name} lade till “${title}”.`,
      actor: { id: actor.id, name: actor.name },
    });
    return NextResponse.json({ task }, { status: 201 });
  }

  if (body?.kind === "comment") {
    const text = body.body?.trim() ?? "";
    if (!text || text.length > 2000) {
      return NextResponse.json({ error: "Kommentaren måste vara 1–2000 tecken." }, { status: 400 });
    }
    const comment = await prisma.orderComment.create({
      data: {
        orderId: id,
        body: text,
        authorId: actor.id,
        authorName: actor.name,
        authorImage: actor.image,
      },
    });
    await createOrderHistoryEvent({
      orderId: id,
      type: "comment",
      title: "Kommentar tillagd",
      description: `${actor.name} kommenterade ordern.`,
      actor: { id: actor.id, name: actor.name },
    });
    return NextResponse.json({ comment }, { status: 201 });
  }

  return NextResponse.json({ error: "Ogiltig typ." }, { status: 400 });
}

export async function PATCH(request: Request, context: Context) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | { taskId?: string; completed?: boolean }
    | null;
  if (!body?.taskId || typeof body.completed !== "boolean") {
    return NextResponse.json({ error: "Ogiltig uppgift." }, { status: 400 });
  }

  const existing = await prisma.orderWorkspaceTask.findFirst({
    where: { id: body.taskId, orderId: id },
  });
  if (!existing) return NextResponse.json({ error: "Uppgiften saknas." }, { status: 404 });

  const task = await prisma.orderWorkspaceTask.update({
    where: { id: existing.id },
    data: { completed: body.completed, completedAt: body.completed ? new Date() : null },
  });
  const actor = userDetails(session);
  await createOrderHistoryEvent({
    orderId: id,
    type: "task",
    title: body.completed ? "Uppgift slutförd" : "Uppgift återöppnad",
    description: `${actor.name} ${body.completed ? "slutförde" : "återöppnade"} “${task.title}”.`,
    actor: { id: actor.id, name: actor.name },
  });
  return NextResponse.json({ task });
}

export async function DELETE(request: Request, context: Context) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const url = new URL(request.url);
  const taskId = url.searchParams.get("taskId");
  if (!taskId) return NextResponse.json({ error: "Uppgift saknas." }, { status: 400 });

  const result = await prisma.orderWorkspaceTask.deleteMany({ where: { id: taskId, orderId: id } });
  if (!result.count) return NextResponse.json({ error: "Uppgiften saknas." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
