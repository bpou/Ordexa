import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma, Role } from "@prisma/client";
import type { OrderTrack } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { onlyRealFortnoxOrders } from "@/lib/filters";
import { prisma } from "@/lib/prisma";
import { getStoredFileUrl } from "@/lib/file-storage";
import { getFortnoxOrder, updateFortnoxOrder } from "@/lib/fortnox";
import { createOrderHistoryEvent } from "@/lib/order-history";

export const runtime = "nodejs";
const FILE_URL_TTL_SEC = 600;

type Ctx = { params: Promise<{ id: string }> };

type EditableFortnoxOrderRow = {
  rowId?: string | number | null;
  articleNumber?: string | null;
  description: string;
  orderedQuantity: number;
  unit?: string | null;
  price: number;
  discount?: number | null;
  discountType?: string | null;
  accountNumber?: string | number | null;
  costCenter?: string | null;
};

function readFortnoxOrderRows(order: any): EditableFortnoxOrderRow[] {
  const rawRows = Array.isArray(order?.OrderRows)
    ? order.OrderRows
    : Array.isArray(order?.orderRows)
      ? order.orderRows
      : [];

  return rawRows.map((row: any, index: number) => ({
    rowId: row.RowId ?? row.RowNumber ?? row.rowId ?? index + 1,
    articleNumber: row.ArticleNumber ?? row.articleNumber ?? null,
    description: String(row.Description ?? row.description ?? "").trim(),
    orderedQuantity: Number(row.OrderedQuantity ?? row.Quantity ?? row.orderedQuantity ?? 0),
    unit: row.Unit ?? row.unit ?? null,
    price: Number(row.Price ?? row.price ?? 0),
    discount:
      row.Discount !== undefined || row.discount !== undefined ? Number(row.Discount ?? row.discount ?? 0) : null,
    discountType: row.DiscountType ?? row.discountType ?? null,
    accountNumber: row.AccountNumber ?? row.accountNumber ?? null,
    costCenter: row.CostCenter ?? row.costCenter ?? null,
  }));
}

function parseFortnoxOrderRows(rawRows: unknown): EditableFortnoxOrderRow[] | undefined {
  if (rawRows === undefined) return undefined;
  if (!Array.isArray(rawRows)) {
    throw new Error("Orderrader måste vara en lista.");
  }
  if (rawRows.length === 0) {
    throw new Error("Ordern måste ha minst en orderrad.");
  }
  if (rawRows.length > 100) {
    throw new Error("Max 100 orderrader kan sparas åt gången.");
  }

  return rawRows.map((rawRow, index) => {
    if (typeof rawRow !== "object" || rawRow === null || Array.isArray(rawRow)) {
      throw new Error(`Orderrad ${index + 1} är ogiltig.`);
    }
    const row = rawRow as Record<string, unknown>;
    const description = typeof row.description === "string" ? row.description.trim() : "";
    if (!description) {
      throw new Error(`Orderrad ${index + 1} saknar beskrivning.`);
    }

    const quantity = Number(row.orderedQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(`Orderrad ${index + 1} måste ha ett antal större än 0.`);
    }

    const price = Number(row.price);
    if (!Number.isFinite(price)) {
      throw new Error(`Orderrad ${index + 1} har ett ogiltigt pris.`);
    }

    const discount = row.discount === null || row.discount === undefined || row.discount === "" ? null : Number(row.discount);
    if (discount !== null && !Number.isFinite(discount)) {
      throw new Error(`Orderrad ${index + 1} har en ogiltig rabatt.`);
    }

    const readOptionalText = (key: string, max = 120) => {
      const value = row[key];
      if (value === null || value === undefined) return null;
      const text = String(value).trim();
      if (!text) return null;
      if (text.length > max) {
        throw new Error(`Orderrad ${index + 1}: ${key} är för långt.`);
      }
      return text;
    };

    return {
      rowId: row.rowId === undefined ? null : (row.rowId as string | number | null),
      articleNumber: readOptionalText("articleNumber", 80),
      description,
      orderedQuantity: quantity,
      unit: readOptionalText("unit", 40) ?? "st",
      price,
      discount,
      discountType: readOptionalText("discountType", 40),
      accountNumber: readOptionalText("accountNumber", 40),
      costCenter: readOptionalText("costCenter", 40),
    };
  });
}

function toFortnoxOrderRows(rows: EditableFortnoxOrderRow[]) {
  return rows.map((row) => {
    const payload: Record<string, unknown> = {
      Description: row.description,
      OrderedQuantity: row.orderedQuantity,
      Unit: row.unit || "st",
      Price: row.price,
    };
    if (row.articleNumber) payload.ArticleNumber = row.articleNumber;
    if (row.discount !== null && row.discount !== undefined) payload.Discount = row.discount;
    if (row.discountType) payload.DiscountType = row.discountType;
    if (row.accountNumber) payload.AccountNumber = row.accountNumber;
    if (row.costCenter) payload.CostCenter = row.costCenter;
    return payload;
  });
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: Role } | undefined)?.role;
  const canReadFortnoxRows = role === Role.ADMIN || role === Role.SALJARE;
  const { id: orderId } = await ctx.params;

  const order = await prisma.order.findFirst({
    where: { orderNumber: orderId, ...onlyRealFortnoxOrders },
    include: {
      tracks: true,
      events: { orderBy: { start: "asc" } },
      fortnox: true,
      historyEvents: { orderBy: { createdAt: "desc" } },
      createdBy: { select: { name: true, email: true, image: true } },
      files: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  let fortnoxOrderRows: EditableFortnoxOrderRow[] = Array.isArray(order.fortnoxOrderRows)
    ? (order.fortnoxOrderRows as EditableFortnoxOrderRow[])
    : [];
  let fortnoxRowsError: string | null = order.fortnoxOrderRowsSyncError ?? null;

  if (canReadFortnoxRows) {
    try {
      const fortnoxOrder = await getFortnoxOrder(orderId);
      fortnoxOrderRows = readFortnoxOrderRows(fortnoxOrder);
      fortnoxRowsError = null;
    } catch (error) {
      fortnoxRowsError = error instanceof Error ? error.message : "Fortnox orderrader kunde inte hämtas.";
      console.warn(`[orders/${orderId}] Could not fetch Fortnox order rows`, error);
    }
  }

  const files = order.files;

  const fileUploaders = files.length
    ? await prisma.$queryRaw<
        Array<{
          id: string;
          uploadedBy: string | null;
          uploadedById: string | null;
          uploadedByName: string | null;
          uploadedByImage: string | null;
        }>
      >`
        SELECT "id", "uploadedBy", "uploadedById", "uploadedByName", "uploadedByImage"
        FROM "File"
        WHERE "id" IN (${Prisma.join(files.map((file) => file.id))})
      `
    : [];
  const uploaderByFileId = new Map(fileUploaders.map((file) => [file.id, file]));

  const signed = await Promise.all(
    files.map(async (f) => {
      const key = f.url;
      let url = key;
      let expiresAt: number | undefined;
      try {
        const stored = await getStoredFileUrl(key, FILE_URL_TTL_SEC);
        url = stored.url;
        expiresAt = stored.expiresAt ?? undefined;
      } catch (error) {
        console.warn(`[orders/${orderId}] Could not resolve file URL`, {
          fileId: f.id,
          filename: f.filename,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      const uploader = uploaderByFileId.get(f.id);
      return {
        id: f.id,
        filename: f.filename,
        url,
        track: f.track as "A" | "B" | "C" | "D" | "SHARED",
        createdAt: f.createdAt.toISOString(),
        expiresAt,
        uploadedBy: uploader?.uploadedByName ?? uploader?.uploadedBy ?? null,
        uploadedById: uploader?.uploadedById ?? null,
        uploadedByName: uploader?.uploadedByName ?? uploader?.uploadedBy ?? null,
        uploadedByImage: uploader?.uploadedByImage ?? null,
      };
    })
  );

  const tracks =
    order.tracks.map((t: OrderTrack) => ({
      track: t.track,
      status: t.status,
      plannedStartAt: t.plannedStartAt?.toISOString() ?? null,
      plannedEndAt: t.plannedEndAt?.toISOString() ?? null,
      timeSpentMinutes: t.timeSpentMinutes ?? 0,
    }));

  const timeEntries = await prisma.$queryRaw<
    Array<{
      id: string;
      orderId: string;
      track: "A" | "B" | "C" | "D" | "SHARED";
      minutes: number;
      userId: string | null;
      userName: string;
      userImage: string | null;
      createdById: string | null;
      createdByName: string;
      createdByImage: string | null;
      createdAt: Date;
    }>
  >`
    SELECT
      "id",
      "orderId",
      "track",
      "minutes",
      "userId",
      "userName",
      "userImage",
      "createdById",
      "createdByName",
      "createdByImage",
      "createdAt"
    FROM "OrderTrackTimeEntry"
    WHERE "orderId" = ${orderId}
    ORDER BY "createdAt" DESC
  `;

  const serializedTimeEntries = timeEntries.map((entry) => ({
    ...entry,
    createdAt: entry.createdAt.toISOString(),
  }));

  return NextResponse.json({
    order: {
      orderNumber: order.orderNumber,
      title: order.title,
      customerName: order.customerName ?? null,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      dueDate: order.dueDate?.toISOString() ?? null,
      deliveryAddress: order.deliveryAddress ?? null,
      deliveryMethod: order.deliveryMethod ?? null,
      createdByName: order.createdByName ?? order.createdBy?.name ?? order.createdBy?.email ?? null,
      createdByEmail: order.createdBy?.email ?? null,
      createdByImage: order.createdBy?.image ?? null,
      fortnox: order.fortnox
        ? {
            documentNumber: order.fortnox.documentNumber,
            createdAt: order.fortnox.createdAt.toISOString(),
          }
        : null,
      events: order.events.map((event) => ({
        id: event.id,
        track: event.track,
        start: event.start.toISOString(),
        end: event.end.toISOString(),
        title: event.title,
        notes: event.notes ?? null,
      })),
      historyEvents: order.historyEvents.map((event) => ({
        id: event.id,
        type: event.type,
        title: event.title,
        description: event.description,
        actorId: event.actorId ?? null,
        actorName: event.actorName ?? null,
        metadata: event.metadata ?? null,
        createdAt: event.createdAt.toISOString(),
      })),
      notes: order.notes ?? null,
      tracks,
      timeEntries: serializedTimeEntries,
      files: signed,
      fortnoxOrderRows,
      fortnoxRowsError,
      fortnoxOrderRowsSyncedAt: order.fortnoxOrderRowsSyncedAt?.toISOString() ?? null,
      billingConfirmedAt: order.billingConfirmedAt?.toISOString() ?? null,
    },
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: orderId } = await ctx.params;

  let body: { notes?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if ((body as { order?: unknown }).order !== undefined) {
    return updateOrderMasterData(orderId, (body as { order?: unknown }).order, session.user as any);
  }

  if (body.notes !== undefined && body.notes !== null && typeof body.notes !== "string") {
    return NextResponse.json({ error: "Anteckningar måste vara text." }, { status: 400 });
  }

  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  if (notes.length > 5000) {
    return NextResponse.json({ error: "Anteckningarna är för långa." }, { status: 400 });
  }

  const existing = await prisma.order.findUnique({
    where: { orderNumber: orderId },
    select: { notes: true },
  });

  const updated = await prisma.order.update({
    where: { orderNumber: orderId },
    data: { notes: notes || null },
    select: {
      orderNumber: true,
      notes: true,
      updatedAt: true,
    },
  });

  if ((existing?.notes ?? "") !== (updated.notes ?? "")) {
    await createOrderHistoryEvent({
      orderId,
      type: "notes",
      title: "Anteckningar uppdaterade",
      description: `${(session.user as { name?: string | null; email?: string | null } | undefined)?.name ?? (session.user as { email?: string | null } | undefined)?.email ?? "Okänd användare"} uppdaterade orderns anteckningar.`,
      actor: session.user as { id?: string | null; name?: string | null; email?: string | null },
    });
  }

  return NextResponse.json({
    ok: true,
    order: {
      orderNumber: updated.orderNumber,
      notes: updated.notes ?? null,
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}

async function updateOrderMasterData(
  orderId: string,
  rawPatch: unknown,
  user: { id?: string; role?: Role; name?: string | null; email?: string | null }
) {
  if (typeof rawPatch !== "object" || rawPatch === null || Array.isArray(rawPatch)) {
    return NextResponse.json({ error: "Orderuppdatering måste vara ett objekt." }, { status: 400 });
  }

  const role = user?.role;
  if (role !== Role.ADMIN && role !== Role.SALJARE) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.order.findFirst({
    where: { orderNumber: orderId, ...onlyRealFortnoxOrders },
    select: {
      orderNumber: true,
      createdById: true,
      title: true,
      customerName: true,
      dueDate: true,
      deliveryAddress: true,
      deliveryMethod: true,
      fortnoxOrderRows: true,
      fortnoxOrderRowsSyncedAt: true,
      fortnoxOrderRowsSyncError: true,
      billingConfirmedAt: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Order saknas." }, { status: 404 });
  }
  if (existing.billingConfirmedAt) {
    return NextResponse.json({ error: "Fakturerade ordrar kan inte ändras här." }, { status: 409 });
  }
  if (role === Role.SALJARE && existing.createdById && user?.id && existing.createdById !== user.id) {
    return NextResponse.json({ error: "Du kan bara ändra egna ordrar." }, { status: 403 });
  }

  const patch = rawPatch as Record<string, unknown>;
  const readText = (key: string, max: number) => {
    if (!(key in patch)) return undefined;
    const value = patch[key];
    if (value === null) return null;
    if (typeof value !== "string") {
      throw new Error(`${key} måste vara text.`);
    }
    const trimmed = value.trim();
    if (trimmed.length > max) {
      throw new Error(`${key} är för långt.`);
    }
    return trimmed || null;
  };

  let title: string | null | undefined;
  let customerName: string | null | undefined;
  let deliveryAddress: string | null | undefined;
  let deliveryMethod: string | null | undefined;
  try {
    title = readText("title", 180);
    customerName = readText("customerName", 180);
    deliveryAddress = readText("deliveryAddress", 800);
    deliveryMethod = readText("deliveryMethod", 120);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ogiltig orderdata." },
      { status: 400 },
    );
  }

  if (title !== undefined && !title) {
    return NextResponse.json({ error: "Titel krävs." }, { status: 400 });
  }

  let orderRows: EditableFortnoxOrderRow[] | undefined;
  try {
    orderRows = parseFortnoxOrderRows(patch.orderRows);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Orderraderna är ogiltiga." },
      { status: 400 },
    );
  }

  let dueDate: Date | null | undefined;
  if ("dueDate" in patch) {
    const raw = patch.dueDate;
    if (raw === null || raw === "") {
      dueDate = null;
    } else if (typeof raw === "string") {
      const parsed = new Date(raw);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "Leveransdatum är ogiltigt." }, { status: 400 });
      }
      dueDate = parsed;
    } else {
      return NextResponse.json({ error: "Leveransdatum måste vara text." }, { status: 400 });
    }
  }

  const next = {
    title: title ?? existing.title,
    customerName: customerName !== undefined ? customerName : existing.customerName,
    dueDate: dueDate !== undefined ? dueDate : existing.dueDate,
    deliveryAddress: deliveryAddress !== undefined ? deliveryAddress : existing.deliveryAddress,
    deliveryMethod: deliveryMethod !== undefined ? deliveryMethod : existing.deliveryMethod,
  };

  const changedFields = [
    title !== undefined && title !== existing.title ? "titel" : null,
    customerName !== undefined && customerName !== existing.customerName ? "kund" : null,
    dueDate !== undefined && (dueDate?.toISOString() ?? null) !== (existing.dueDate?.toISOString() ?? null) ? "leveransdatum" : null,
    deliveryAddress !== undefined && deliveryAddress !== existing.deliveryAddress ? "leveransadress" : null,
    deliveryMethod !== undefined && deliveryMethod !== existing.deliveryMethod ? "leveranssätt" : null,
    orderRows !== undefined ? "orderrader" : null,
  ].filter(Boolean) as string[];

  const fortnoxPayload: Record<string, unknown> = {
    Remarks: next.title,
    YourReference: next.customerName ?? next.title,
    DeliveryName: next.customerName ?? next.title,
    DeliveryDate: next.dueDate ? next.dueDate.toISOString().slice(0, 10) : null,
    DeliveryAddress1: next.deliveryAddress || null,
    WayOfDelivery: next.deliveryMethod || null,
  };
  if (orderRows) {
    fortnoxPayload.OrderRows = toFortnoxOrderRows(orderRows);
  }

  try {
    await updateFortnoxOrder(orderId, fortnoxPayload);
  } catch (error) {
    console.error(`[orders/${orderId}] Fortnox update failed`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fortnox kunde inte uppdatera ordern." },
      { status: 502 },
    );
  }

  const updated = await prisma.order.update({
    where: { orderNumber: orderId },
    data: {
      ...(title !== undefined ? { title: next.title } : {}),
      ...(customerName !== undefined ? { customerName: next.customerName } : {}),
      ...(dueDate !== undefined ? { dueDate: next.dueDate } : {}),
      ...(deliveryAddress !== undefined ? { deliveryAddress: next.deliveryAddress } : {}),
      ...(deliveryMethod !== undefined ? { deliveryMethod: next.deliveryMethod } : {}),
      ...(orderRows
        ? {
            fortnoxOrderRows: orderRows as unknown as Prisma.InputJsonValue,
            fortnoxOrderRowsSyncedAt: new Date(),
            fortnoxOrderRowsSyncError: null,
          }
        : {}),
    },
    select: {
      orderNumber: true,
      title: true,
      customerName: true,
      dueDate: true,
      deliveryAddress: true,
      deliveryMethod: true,
      fortnoxOrderRows: true,
      fortnoxOrderRowsSyncedAt: true,
      updatedAt: true,
    },
  });

  if (changedFields.length > 0) {
    await createOrderHistoryEvent({
      orderId,
      type: orderRows ? "fortnox" : "order",
      title: orderRows ? "Orderrader uppdaterade" : "Order uppdaterad",
      description: `${orderHistoryUserName(user)} ändrade ${changedFields.join(", ")}.`,
      actor: user,
      metadata: { changedFields },
    });
  }

  return NextResponse.json({
    ok: true,
    order: {
      orderNumber: updated.orderNumber,
      title: updated.title,
      customerName: updated.customerName ?? null,
      dueDate: updated.dueDate?.toISOString() ?? null,
      deliveryAddress: updated.deliveryAddress ?? null,
      deliveryMethod: updated.deliveryMethod ?? null,
      fortnoxOrderRows: Array.isArray(updated.fortnoxOrderRows)
        ? (updated.fortnoxOrderRows as EditableFortnoxOrderRow[])
        : orderRows ?? [],
      fortnoxOrderRowsSyncedAt: updated.fortnoxOrderRowsSyncedAt?.toISOString() ?? null,
      fortnoxRowsError: null,
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}

function orderHistoryUserName(user: { name?: string | null; email?: string | null }) {
  return user.name || user.email || "Okänd användare";
}
