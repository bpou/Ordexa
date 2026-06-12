import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFortnoxAccessToken } from "@/lib/fortnox";

const API_BASE = "https://api.fortnox.se/3";

type CompanyInfo = {
  companyName: string | null;
  organizationNumber: string | null;
  databaseNumber: number | null;
};

async function resolveCompanyInfo(accessToken: string): Promise<CompanyInfo> {
  try {
    const res = await fetch(`${API_BASE}/companyinformation`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        companyName: null,
        organizationNumber: null,
        databaseNumber: null,
      };
    }

    const json = await res.json().catch(() => ({} as any));
    const info = json?.CompanyInformation ?? {};

    return {
      companyName: typeof info?.CompanyName === "string" ? info.CompanyName : null,
      organizationNumber:
        typeof info?.OrganizationNumber === "string" ? info.OrganizationNumber : null,
      databaseNumber:
        typeof info?.DatabaseNumber === "number" && Number.isFinite(info.DatabaseNumber)
          ? info.DatabaseNumber
          : null,
    };
  } catch {
    return {
      companyName: null,
      organizationNumber: null,
      databaseNumber: null,
    };
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const defaultTenantId = process.env.FORTNOX_DEFAULT_TENANT_ID?.trim();

  const connection = defaultTenantId
    ? await prisma.fortnoxConnection.findUnique({ where: { tenantId: defaultTenantId } })
    : await prisma.fortnoxConnection.findFirst({ orderBy: { updatedAt: "desc" } });

  if (!connection || !connection.accessToken || !connection.refreshToken) {
    return NextResponse.json({
      connected: false,
      tenantId: connection?.tenantId ?? defaultTenantId ?? null,
      companyName: null,
      organizationNumber: null,
      databaseNumber: null,
      scope: connection?.scope ?? null,
      expiresAt: connection?.expiresAt?.toISOString() ?? null,
      updatedAt: connection?.updatedAt?.toISOString() ?? null,
    });
  }

  try {
    const tokenInfo = await getFortnoxAccessToken(connection.tenantId);
    const freshConnection = await prisma.fortnoxConnection.findUnique({
      where: { tenantId: tokenInfo.tenantId },
    });

    const company = await resolveCompanyInfo(tokenInfo.accessToken);

    return NextResponse.json({
      connected: true,
      tenantId: tokenInfo.tenantId,
      companyName: company.companyName,
      organizationNumber: company.organizationNumber,
      databaseNumber: company.databaseNumber,
      scope: freshConnection?.scope ?? connection.scope ?? null,
      expiresAt: freshConnection?.expiresAt?.toISOString() ?? connection.expiresAt.toISOString(),
      updatedAt: freshConnection?.updatedAt?.toISOString() ?? connection.updatedAt.toISOString(),
    });
  } catch (error: any) {
    const message = String(error?.message ?? "");
    return NextResponse.json({
      connected: false,
      tenantId: connection.tenantId,
      companyName: null,
      organizationNumber: null,
      databaseNumber: null,
      scope: connection.scope ?? null,
      expiresAt: connection.expiresAt.toISOString(),
      updatedAt: connection.updatedAt.toISOString(),
      error: message || "Fortnox status error",
    });
  }
}
