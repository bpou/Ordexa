import { NextRequest, NextResponse } from "next/server";
import { getFortnoxArticle, updateFortnoxArticle } from "@/lib/fortnox";

type RouteParams = { articleNumber?: string };

export async function PATCH(
  req: NextRequest,
  { params }: { params: RouteParams }
) {
  const articleNumber = decodeURIComponent(params?.articleNumber ?? "").trim();
  if (!articleNumber) {
    return NextResponse.json(
      { error: "Missing article number in request path." },
      { status: 400 }
    );
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

  const raw = { ...(body as Record<string, unknown>) };
  delete raw.articleNumber;
  delete raw.ArticleNumber;

  if ("Description" in raw && raw.description === undefined) {
    raw.description = raw.Description;
  }
  if ("Unit" in raw && raw.unit === undefined) {
    raw.unit = raw.Unit;
  }
  if ("SalesPrice" in raw && raw.salesPrice === undefined) {
    raw.salesPrice = raw.SalesPrice;
  }
  if ("Active" in raw && raw.active === undefined) {
    raw.active = raw.Active;
  }
  if ("PriceListA" in raw && raw.priceListA === undefined) {
    raw.priceListA = raw.PriceListA;
  }
  if ("EAN" in raw && raw.ean === undefined) {
    raw.ean = raw.EAN;
  }
  if ("Manufacturer" in raw && raw.manufacturer === undefined) {
    raw.manufacturer = raw.Manufacturer;
  }
  if (
    "ManufacturerArticleNumber" in raw &&
    raw.manufacturerArticleNumber === undefined
  ) {
    raw.manufacturerArticleNumber = raw.ManufacturerArticleNumber;
  }
  if ("Note" in raw && raw.notes === undefined) {
    raw.notes = raw.Note;
  }
  if ("Type" in raw && raw.articleType === undefined) {
    raw.articleType = raw.Type;
  }
  if ("StockGoods" in raw && raw.stockGoods === undefined) {
    raw.stockGoods = raw.StockGoods;
  }
  if ("PackageArticle" in raw && raw.packageArticle === undefined) {
    raw.packageArticle = raw.PackageArticle;
  }
  if ("WebShopArticle" in raw && raw.externalWebshop === undefined) {
    raw.externalWebshop = raw.WebShopArticle;
  }
  if ("ExternalWebshop" in raw && raw.externalWebshop === undefined) {
    raw.externalWebshop = raw.ExternalWebshop;
  }
  if ("EndOfLife" in raw && raw.endOfLife === undefined) {
    raw.endOfLife = raw.EndOfLife;
  }
  if ("CalculationPrice" in raw && raw.calculationCost === undefined) {
    raw.calculationCost = raw.CalculationPrice;
  }
  if ("CalculationCost" in raw && raw.calculationCost === undefined) {
    raw.calculationCost = raw.CalculationCost;
  }
  if ("CostPrice" in raw && raw.calculationCost === undefined) {
    raw.calculationCost = raw.CostPrice;
  }
  delete raw.Description;
  delete raw.Unit;
  delete raw.SalesPrice;
  delete raw.Active;
  delete raw.PriceListA;
  delete raw.CalculationPrice;
  delete raw.CalculationCost;
  delete raw.CostPrice;
  delete raw.EAN;
  delete raw.Manufacturer;
  delete raw.ManufacturerArticleNumber;
  delete raw.Note;
  delete raw.Type;
  delete raw.StockGoods;
  delete raw.PackageArticle;
  delete raw.WebShopArticle;
  delete raw.ExternalWebshop;
  delete raw.EndOfLife;

  if (typeof raw.description === "string") {
    raw.description = raw.description.trim();
  }
  if (typeof raw.unit === "string") {
    raw.unit = raw.unit.trim();
  }
  if (typeof raw.ean === "string") {
    raw.ean = raw.ean.trim();
  }
  if (typeof raw.manufacturer === "string") {
    raw.manufacturer = raw.manufacturer.trim();
  }
  if (typeof raw.manufacturerArticleNumber === "string") {
    raw.manufacturerArticleNumber = raw.manufacturerArticleNumber.trim();
  }
  if (typeof raw.notes === "string") {
    raw.notes = raw.notes.trim();
  }
  if (typeof raw.articleType === "string") {
    raw.articleType = raw.articleType.trim().toUpperCase();
  }
  if ("salesPrice" in raw) {
    const value = raw.salesPrice;
    if (value === null) {
      raw.salesPrice = null;
    } else {
      const numeric =
        typeof value === "string" ? Number(value.replace(",", ".")) : value;
      if (typeof numeric !== "number" || Number.isNaN(numeric)) {
        return NextResponse.json(
          { error: "salesPrice must be a numeric value." },
          { status: 400 }
        );
      }
      raw.salesPrice = numeric;
    }
  }
  if ("priceListA" in raw) {
    const value = raw.priceListA;
    if (value === null) {
      raw.priceListA = null;
    } else {
      const numeric =
        typeof value === "string" ? Number(value.replace(",", ".")) : value;
      if (typeof numeric !== "number" || Number.isNaN(numeric)) {
        return NextResponse.json(
          { error: "priceListA must be a numeric value." },
          { status: 400 }
        );
      }
      raw.priceListA = numeric;
    }
  }
  if ("calculationCost" in raw) {
    const value = raw.calculationCost;
    if (value === null) {
      raw.calculationCost = null;
    } else {
      const numeric =
        typeof value === "string" ? Number(value.replace(",", ".")) : value;
      if (typeof numeric !== "number" || Number.isNaN(numeric)) {
        return NextResponse.json(
          { error: "calculationCost must be a numeric value." },
          { status: 400 }
        );
      }
      raw.calculationCost = numeric;
    }
  }
  if ("active" in raw) {
    const value = raw.active;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (!normalized) {
        delete raw.active;
      } else if (["true", "1", "ja", "yes"].includes(normalized)) {
        raw.active = true;
      } else if (["false", "0", "nej", "no"].includes(normalized)) {
        raw.active = false;
      } else {
        return NextResponse.json(
          { error: "active must be a boolean value." },
          { status: 400 }
        );
      }
    } else if (typeof value !== "boolean") {
      raw.active = Boolean(value);
    }
  }
  const booleanKeys: Array<keyof typeof raw> = [
    "stockGoods",
    "packageArticle",
    "externalWebshop",
    "endOfLife",
  ];
  for (const key of booleanKeys) {
    if (!(key in raw)) continue;
    const value = raw[key];
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (!normalized) {
        delete raw[key];
      } else if (["true", "1", "ja", "yes"].includes(normalized)) {
        raw[key] = true;
      } else if (["false", "0", "nej", "no"].includes(normalized)) {
        raw[key] = false;
      } else {
        return NextResponse.json(
          { error: `${String(key)} must be a boolean value.` },
          { status: 400 }
        );
      }
    } else if (typeof value !== "boolean") {
      raw[key] = Boolean(value);
    }
  }

  if (Object.keys(raw).length === 0) {
    return NextResponse.json(
      { error: "Nothing to update for the article." },
      { status: 400 }
    );
  }

  const tenantId = new URL(req.url).searchParams.get("tenantId") ?? undefined;

  try {
    const article = await updateFortnoxArticle({
      articleNumber,
      tenantId,
      data: raw,
    });
    return NextResponse.json({ article });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ?? "Fortnox update article error. Please try again.",
      },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: RouteParams }
) {
  const articleNumber = decodeURIComponent(params?.articleNumber ?? "").trim();
  if (!articleNumber) {
    return NextResponse.json(
      { error: "Missing article number in request path." },
      { status: 400 }
    );
  }

  const tenantId = new URL(req.url).searchParams.get("tenantId") ?? undefined;

  try {
    const article = await getFortnoxArticle({ articleNumber, tenantId });
    return NextResponse.json({ article });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ?? "Fortnox get article error. Please try again.",
      },
      { status: 500 }
    );
  }
}
