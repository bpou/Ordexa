import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

function resolveTenantId(param: string | null) {
  if (param === null) return null;
  const trimmed = param.trim();
  return trimmed.length ? trimmed : null;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any)?.role as Role | undefined;
  if (role !== Role.SALJARE && role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: "Missing reference id" }, { status: 400 });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const tenantId = resolveTenantId(typeof payload?.tenantId === "string" ? payload.tenantId : null);
  const data: Record<string, string | null | undefined> = {};

  if (Object.prototype.hasOwnProperty.call(payload, "name")) {
    const name = typeof payload?.name === "string" ? payload.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    data.name = name;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "email")) {
    const email = typeof payload?.email === "string" ? payload.email.trim() : "";
    data.email = email || null;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "phone")) {
    const phone = typeof payload?.phone === "string" ? payload.phone.trim() : "";
    data.phone = phone || null;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "note")) {
    const note = typeof payload?.note === "string" ? payload.note.trim() : "";
    data.note = note || null;
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
  }

  try {
    const existing = await prisma.customerReference.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Reference not found" }, { status: 404 });
    }
    const existingTenant = existing.tenantId ?? null;
    if (tenantId !== null && existingTenant !== tenantId) {
      return NextResponse.json({ error: "Reference not found" }, { status: 404 });
    }
    if (tenantId === null && existingTenant !== null) {
      return NextResponse.json({ error: "Reference not found" }, { status: 404 });
    }

    const reference = await prisma.customerReference.update({
      where: { id },
      data,
    });
    return NextResponse.json({ reference });
  } catch (error) {
    console.error(`Failed to update customer reference ${id}:`, error);
    return NextResponse.json({ error: "Failed to update customer reference" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any)?.role as Role | undefined;
  if (role !== Role.SALJARE && role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: "Missing reference id" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const tenantParam = searchParams.get("tenantId");
  const tenantId = resolveTenantId(tenantParam);

  try {
    const existing = await prisma.customerReference.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Reference not found" }, { status: 404 });
    }
    const existingTenant = existing.tenantId ?? null;
    if (tenantId !== null && existingTenant !== tenantId) {
      return NextResponse.json({ error: "Reference not found" }, { status: 404 });
    }
    if (tenantId === null && existingTenant !== null) {
      return NextResponse.json({ error: "Reference not found" }, { status: 404 });
    }

    await prisma.customerReference.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Failed to delete customer reference ${id}:`, error);
    return NextResponse.json({ error: "Failed to delete customer reference" }, { status: 500 });
  }
}
