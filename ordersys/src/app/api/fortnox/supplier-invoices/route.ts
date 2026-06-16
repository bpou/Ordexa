import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import {
  getFortnoxSupplierInvoice,
  listFortnoxSupplierInvoices,
} from "@/lib/fortnox";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as { role?: Role } | null | undefined)?.role;
  if (role !== Role.ADMIN && role !== Role.SALJARE) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenantId") ?? undefined;
  const number = searchParams.get("number")?.trim();
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const limit = Math.min(
    500,
    Math.max(1, Number(searchParams.get("limit") ?? 100) || 100)
  );

  try {
    if (number) {
      const invoice = await getFortnoxSupplierInvoice({
        supplierInvoiceNumber: number,
        tenantId,
      });
      return NextResponse.json({ invoice });
    }

    const result = await listFortnoxSupplierInvoices({ page, limit, tenantId });
    return NextResponse.json({
      supplierInvoices: result.items,
      meta: result.meta,
    });
  } catch (error: any) {
    const message = String(error?.message ?? "");
    if (message.includes("2000663") || message.toLowerCase().includes("scope")) {
      return NextResponse.json(
        {
          error:
            "Fortnox-kopplingen saknar scope: supplierinvoice. Koppla om Fortnox och godkänn leverantörsfakturor.",
          requiredScope: "supplierinvoice",
          supplierInvoices: [],
          warning: "missing_scope",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error: message || "Fortnox supplier invoices error",
        supplierInvoices: [],
      },
      { status: 500 }
    );
  }
}
