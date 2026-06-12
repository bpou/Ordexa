// src/app/api/fortnox/articles/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { createFortnoxArticle, getFortnoxArticle, listFortnoxArticles } from "@/lib/fortnox";
import { canCreateRegisters } from "@/lib/permissions";

function isReconnectRequiredError(message: string) {
  return message.toLowerCase().includes("koppla om fortnox");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const qParam        = searchParams.get("q") ?? undefined;
  const articleNumber = searchParams.get("articleNumber") ?? undefined;
  const page          = Number(searchParams.get("page") ?? 1);
  const limit         = Number(searchParams.get("limit") ?? 50);
  const tenantId      = searchParams.get("tenantId") ?? undefined;

  // Build a query Fortnox understands — prefer explicit articleNumber if provided
  // Adjust the syntax if your fortnox client expects something else.
  try {
    if (articleNumber && articleNumber.trim() !== "") {
      const article = await getFortnoxArticle({
        articleNumber: articleNumber.trim(),
        tenantId,
      });
      return NextResponse.json({ articles: article ? [article] : [] });
    }

    const query =
      qParam && qParam.trim() !== ""
        ? qParam.trim()
        : undefined;

    const { items } = await listFortnoxArticles({
      query,
      page,
      limit,
      tenantId,
    });
    return NextResponse.json({ articles: items ?? [] });
  } catch (e: any) {
    const message = e?.message ?? "Fortnox articles error";
    if (isReconnectRequiredError(String(message))) {
      return NextResponse.json(
        { error: message, code: "fortnox_reconnect_required", articles: [] },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

function toOptionalTrimmedString(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toOptionalFortnoxUnit(value: unknown) {
  const unit = toOptionalTrimmedString(value);
  if (!unit) return undefined;
  // Guard against numeric placeholders like "1" which Fortnox rejects as unknown unit.
  if (/^\d+$/.test(unit)) return undefined;
  return unit;
}

function toOptionalNumber(value: unknown, field: string): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const numeric =
    typeof value === "string" ? Number(value.replace(",", ".")) : value;
  if (typeof numeric !== "number" || Number.isNaN(numeric)) {
    throw new Error(`${field} must be a numeric value.`);
  }
  return numeric;
}

function toOptionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return undefined;
    if (["true", "1", "ja", "yes"].includes(normalized)) return true;
    if (["false", "0", "nej", "no"].includes(normalized)) return false;
  }
  throw new Error(`${field} must be a boolean value.`);
}

function toOptionalArticleType(value: unknown): "STOCK" | "SERVICE" | undefined {
  const raw = toOptionalTrimmedString(value);
  if (!raw) return undefined;
  const normalized = raw.toUpperCase();
  if (normalized === "STOCK" || normalized === "SERVICE") {
    return normalized;
  }
  throw new Error("articleType must be STOCK or SERVICE.");
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any)?.role as Role | undefined;
  if (!canCreateRegisters(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = undefined;
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Invalid request body. Expected JSON object." },
      { status: 400 }
    );
  }

  const raw = body as Record<string, unknown>;
  const articleRaw =
    raw.Article && typeof raw.Article === "object" && !Array.isArray(raw.Article)
      ? (raw.Article as Record<string, unknown>)
      : raw;
  const tenantId =
    toOptionalTrimmedString(raw.tenantId) ??
    new URL(req.url).searchParams.get("tenantId") ??
    undefined;

  const articleNumber =
    toOptionalTrimmedString(articleRaw.articleNumber) ??
    toOptionalTrimmedString(articleRaw.ArticleNumber);
  if (!articleNumber) {
    return NextResponse.json(
      { error: "articleNumber is required." },
      { status: 400 }
    );
  }

  try {
    try {
      const existingArticle = await getFortnoxArticle({ articleNumber, tenantId });
      if (String(existingArticle?.articleNumber ?? "").trim() === articleNumber) {
        return NextResponse.json(
          { error: `articleNumber "${articleNumber}" already exists.` },
          { status: 409 }
        );
      }
    } catch (lookupError: any) {
      const lookupMessage = String(lookupError?.message ?? "");
      if (!/\(404\)/.test(lookupMessage)) {
        throw lookupError;
      }
    }

    const data = {
      articleNumber,
      ean: toOptionalTrimmedString(articleRaw.ean) ?? toOptionalTrimmedString(articleRaw.EAN),
      description:
        toOptionalTrimmedString(articleRaw.description) ??
        toOptionalTrimmedString(articleRaw.Description),
      manufacturer:
        toOptionalTrimmedString(articleRaw.manufacturer) ??
        toOptionalTrimmedString(articleRaw.Manufacturer),
      manufacturerArticleNumber:
        toOptionalTrimmedString(articleRaw.manufacturerArticleNumber) ??
        toOptionalTrimmedString(articleRaw.ManufacturerArticleNumber),
      notes: toOptionalTrimmedString(articleRaw.notes) ?? toOptionalTrimmedString(articleRaw.Note),
      unit:
        toOptionalFortnoxUnit(articleRaw.unit) ??
        toOptionalFortnoxUnit(articleRaw.Unit),
      articleType: toOptionalArticleType(articleRaw.articleType ?? articleRaw.Type),
      stockGoods: toOptionalBoolean(articleRaw.stockGoods ?? articleRaw.StockGoods, "stockGoods"),
      externalWebshop: toOptionalBoolean(
        articleRaw.externalWebshop ?? articleRaw.ExternalWebshop ?? articleRaw.WebShopArticle,
        "externalWebshop"
      ),
      endOfLife: toOptionalBoolean(articleRaw.endOfLife ?? articleRaw.EndOfLife, "endOfLife"),
      salesPrice: toOptionalNumber(
        articleRaw.salesPrice ?? articleRaw.SalesPrice,
        "salesPrice"
      ),
      priceListA: toOptionalNumber(articleRaw.priceListA ?? articleRaw.PriceListA, "priceListA"),
      calculationCost: toOptionalNumber(
        articleRaw.calculationCost ?? articleRaw.CalculationCost ?? articleRaw.CalculationPrice,
        "calculationCost"
      ),
      active: toOptionalBoolean(articleRaw.active ?? articleRaw.Active, "active"),
      SupplierNumber:
        toOptionalTrimmedString(articleRaw.supplierNumber) ??
        toOptionalTrimmedString(articleRaw.SupplierNumber),
      SupplierName:
        toOptionalTrimmedString(articleRaw.supplierName) ??
        toOptionalTrimmedString(articleRaw.SupplierName),
      PurchasePrice: toOptionalNumber(
        articleRaw.supplierPrice ??
          articleRaw.SupplierPrice ??
          articleRaw.supplierPriceSek ??
          articleRaw.supplierPriceSEK ??
          articleRaw.SupplierPriceSEK,
        "supplierPrice"
      ),
      Width: toOptionalNumber(articleRaw.width ?? articleRaw.Width, "width"),
      Height: toOptionalNumber(articleRaw.height ?? articleRaw.Height, "height"),
      Depth: toOptionalNumber(articleRaw.depth ?? articleRaw.Depth, "depth"),
      Weight: toOptionalNumber(articleRaw.weight ?? articleRaw.Weight, "weight"),
      BulkyGoods: toOptionalBoolean(articleRaw.bulkyGoods ?? articleRaw.BulkyGoods, "bulkyGoods"),
    };

    const article = await createFortnoxArticle({ tenantId, data });
    return NextResponse.json({ article }, { status: 201 });
  } catch (error: any) {
    const message =
      error?.message ?? "Fortnox create article error. Please try again.";
    const status = /must be (a )?(numeric|boolean) value/i.test(message)
      ? 400
      : /already exists|duplicate|already in use/i.test(message)
      ? 409
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
