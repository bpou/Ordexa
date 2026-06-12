import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

function resolveTenantId(param: string | null) {
  if (param === null) return null;
  const trimmed = param.trim();
  return trimmed.length ? trimmed : null;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const customerNumber = searchParams.get("customerNumber")?.trim();
  const tenantParam = searchParams.get("tenantId");
  const tenantId = resolveTenantId(tenantParam);

  if (!customerNumber) {
    return NextResponse.json({ error: "customerNumber is required" }, { status: 400 });
  }

  try {
    const references = await prisma.customerReference.findMany({
      where: tenantId === null
        ? { customerNumber, tenantId: null }
        : { customerNumber, tenantId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ references });
  } catch (error) {
    console.error("Failed to list customer references:", error);
    return NextResponse.json({ error: "Failed to list customer references" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any)?.role as Role | undefined;
  if (role !== Role.SALJARE && role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const customerNumber = typeof payload?.customerNumber === "string" ? payload.customerNumber.trim() : "";
  const name = typeof payload?.name === "string" ? payload.name.trim() : "";
  const email = typeof payload?.email === "string" ? payload.email.trim() : undefined;
  const phone = typeof payload?.phone === "string" ? payload.phone.trim() : undefined;
  const note = typeof payload?.note === "string" ? payload.note.trim() : undefined;
  const tenantId = resolveTenantId(typeof payload?.tenantId === "string" ? payload.tenantId : null);

  if (!customerNumber) {
    return NextResponse.json({ error: "customerNumber is required" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  try {
    const reference = await prisma.customerReference.create({
      data: {
        customerNumber,
        tenantId,
        name,
        email: email || null,
        phone: phone || null,
        note: note || null,
      },
    });

    return NextResponse.json({ reference }, { status: 201 });
  } catch (error) {
    console.error("Failed to create customer reference:", error);
    return NextResponse.json({ error: "Failed to create customer reference" }, { status: 500 });
  }
}
