// src/lib/fortnox.ts
import { Track } from "@prisma/client";      // Prisma enum
import { prisma } from "@/lib/prisma";       // Your PrismaClient instance
import { s3UploadObject } from "@/lib/s3";

/**
 * Fortnox REST base och OAuth-token endpoint.
 * AnvÃ¤nd /3 (nuvarande stabila base).
 */
const API_BASE = "https://api.fortnox.se/3";
const TOKEN_URL = "https://apps.fortnox.se/oauth-v1/token";

/* ----------------------- HjÃ¤lpare ----------------------- */
function b64(s: string) {
  return Buffer.from(s).toString("base64");
}

function parseFortnoxNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isNaN(value) ? undefined : value;
  }
  if (typeof value === "string") {
    const normalized = Number(value.replace(",", "."));
    return Number.isNaN(normalized) ? undefined : normalized;
  }
  return undefined;
}

function parseFortnoxBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (Number.isNaN(value)) return undefined;
    return value > 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return undefined;
    if (["true", "1", "ja", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "nej", "no", "off"].includes(normalized)) return false;
  }
  return undefined;
}

async function fortnoxFetch(
  url: string,
  accessToken: string,
  init?: RequestInit
): Promise<{ text: string; ok: boolean; status: number }> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  return { text, ok: res.ok, status: res.status };
}

async function fortnoxRequestWithRefresh(
  tenantId: string | undefined,
  url: string,
  init?: RequestInit
): Promise<{ text: string; ok: boolean; status: number; tenantId: string }> {
  let tokenInfo = await getFortnoxAccessToken(tenantId);
  let response = await fortnoxFetch(url, tokenInfo.accessToken, init);

  if (response.status === 401) {
    tokenInfo = await getFortnoxAccessToken(tokenInfo.tenantId, { force: true });
    response = await fortnoxFetch(url, tokenInfo.accessToken, init);

    if (response.status === 401) {
      await resetFortnoxConnection(tokenInfo.tenantId, `401 efter forced refresh pÃ¥ ${url}: ${response.text}`);
      throw new Error(FORTNOX_RESET_MESSAGE);
    }
  }

  return { ...response, tenantId: tokenInfo.tenantId };
}

/** FÃ¶rsÃ¶k parsa Fortnox-respons utan att krascha klienten. */
function safeJSON<T = any>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Kunde inte parsa Fortnox-svar: " + text);
  }
}

const FORTNOX_RESET_MESSAGE =
  "Fortnox-anslutningen har gÃ¥tt ut. Koppla om Fortnox under instÃ¤llningar.";

async function resetFortnoxConnection(tenantId: string, reason?: string) {
  try {
    await prisma.fortnoxConnection.updateMany({
      where: { tenantId },
      data: {
        accessToken: "",
        refreshToken: "",
        scope: null,
        expiresAt: new Date(0),
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error(`[Fortnox] Misslyckades att Ã¥terstÃ¤lla koppling fÃ¶r ${tenantId}:`, error);
    return;
  }

  const context = reason ? ` (${reason})` : "";
  console.warn(`[Fortnox] Kopplingen Ã¥terstÃ¤lld fÃ¶r ${tenantId}${context}`);
}

/* ----------------------- Typer ----------------------- */
type FortnoxTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number; // sekunder
  scope?: string;
  token_type: "Bearer";
};

type FortnoxOrderResponse = {
  Order?: {
    DocumentNumber?: string | number;
    [k: string]: unknown;
  };
  [k: string]: unknown;
};

export type FortnoxListItem = { code: string; description?: string };
export type FortnoxAccountItem = { accountNumber: string; description?: string };
export type FortnoxCostCenterItem = { code: string; description?: string };
export type FortnoxSupplier = {
  supplierNumber: string;
  name: string;
  organisationNumber?: string;
  city?: string;
  currency?: string;
  active?: boolean;
};
export type FortnoxCustomer = {
  customerNumber: string;
  name: string;
  organisationNumber?: string;
  zipCode?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  active?: boolean;
};
type FortnoxCustomerDefaultDeliveryTypes = {
  invoice?: string;
  offer?: string;
  order?: string;
};

type FortnoxCustomerDefaultTemplates = {
  cashInvoice?: string;
  invoice?: string;
  offer?: string;
  order?: string;
};

export type FortnoxCustomerCreateInput = {
  active?: boolean;
  address1?: string;
  address2?: string;
  city?: string;
  comments?: string;
  costCenter?: string;
  country?: string;
  countryCode?: string;
  currency?: string;
  customerNumber: string;
  defaultDeliveryTypes?: FortnoxCustomerDefaultDeliveryTypes;
  defaultTemplates?: FortnoxCustomerDefaultTemplates;
  deliveryAddress1?: string;
  deliveryAddress2?: string;
  deliveryCity?: string;
  deliveryCountry?: string;
  deliveryCountryCode?: string;
  deliveryFax?: string;
  deliveryName?: string;
  deliveryPhone1?: string;
  deliveryPhone2?: string;
  deliveryZipCode?: string;
  email?: string;
  emailInvoice?: string;
  emailInvoiceBCC?: string;
  emailInvoiceCC?: string;
  emailOffer?: string;
  emailOfferBCC?: string;
  emailOfferCC?: string;
  emailOrder?: string;
  emailOrderBCC?: string;
  emailOrderCC?: string;
  externalReference?: string;
  fax?: string;
  gln?: string;
  glnDelivery?: string;
  invoiceAdministrationFee?: string;
  invoiceDiscount?: number;
  invoiceFreight?: string;
  invoiceRemark?: string;
  name: string;
  organisationNumber?: string;
  ourReference?: string;
  phone1?: string;
  phone2?: string;
  priceList?: string;
  project?: string;
  salesAccount?: string;
  showPriceVATIncluded?: boolean;
  termsOfDelivery?: string;
  termsOfPayment?: string;
  type?: string;
  vatNumber?: string;
  vatType?: string;
  visitingAddress?: string;
  visitingCity?: string;
  visitingCountry?: string;
  visitingCountryCode?: string;
  visitingZipCode?: string;
  www?: string;
  wayOfDelivery?: string;
  yourReference?: string;
  zipCode?: string;
};
export type FortnoxArticle = {
  articleNumber: string;
  description?: string;
  salesPrice?: number;
  unit?: string;
  active?: boolean;
  priceListA?: number;
  calculationCost?: number;
  inStock?: number;
  reserved?: number;
  available?: number;
  stockValue?: number;
  ean?: string;
  manufacturer?: string;
  manufacturerArticleNumber?: string;
  notes?: string;
  articleType?: string;
  stockGoods?: boolean;
  packageArticle?: boolean;
  externalWebshop?: boolean;
  endOfLife?: boolean;
};

const accountsCache = new Map<
  string,
  {
    fetchedAt: number;
    items: FortnoxAccountItem[];
  }
>();

function getStaticFortnoxTokenFromEnv(tenantId?: string) {
  const accessToken = process.env.FORTNOX_ACCESS_TOKEN?.trim();
  if (!accessToken) return null;

  return {
    accessToken,
    tenantId: tenantId ?? process.env.FORTNOX_DEFAULT_TENANT_ID ?? "default",
  };
}

/* =======================================================
   OAuth: hÃ¤mta (och ev. fÃ¶rnya) access token fÃ¶r en tenant
   ======================================================= */
export async function getFortnoxAccessToken(
  tenantId?: string,
  opts: { force?: boolean } = {}
): Promise<{ accessToken: string; tenantId: string }> {
  const forceRefresh = opts.force ?? false;
  const staticToken = getStaticFortnoxTokenFromEnv(tenantId);
  const tId = tenantId ?? process.env.FORTNOX_DEFAULT_TENANT_ID!;
  if (!tId) {
    if (staticToken) return staticToken;
    throw new Error("Sätt FORTNOX_DEFAULT_TENANT_ID i miljön eller ange tenantId.");
  }

  let row: Awaited<ReturnType<typeof prisma.fortnoxConnection.findFirst>>;
  try {
    row = await prisma.fortnoxConnection.findFirst({ where: { tenantId: tId } });
  } catch (error: any) {
    if (staticToken) {
      console.warn("[Fortnox] DB otillgänglig, använder FORTNOX_ACCESS_TOKEN.");
      return staticToken;
    }

    const message = String(error?.message ?? "");
    if (message.includes("Can't reach database server")) {
      throw new Error(
        "Databasen är inte tillgänglig (localhost:5432). Starta Postgres eller sätt FORTNOX_ACCESS_TOKEN i miljön."
      );
    }
    throw error;
  }
  if (!row) throw new Error("FortnoxConnection saknas fÃ¶r tenantId=" + tId);
  const resolvedTenantId = row.tenantId;

  if (!row.accessToken || !row.refreshToken) {
    await resetFortnoxConnection(resolvedTenantId, "saknar tokens");
    throw new Error(FORTNOX_RESET_MESSAGE);
  }

  const willExpireSoon =
    !row.expiresAt || row.expiresAt.getTime() < Date.now() + 5 * 60_000; // < 5 min kvar
  const shouldRefresh = forceRefresh || willExpireSoon;

  // Returnera cachead token om den Ã¤r giltig
  if (!shouldRefresh) {
    return { accessToken: row.accessToken, tenantId: resolvedTenantId };
  }

  // Refresh token-flÃ¶det
  const clientId = process.env.FORTNOX_CLIENT_ID!;
  const clientSecret = process.env.FORTNOX_CLIENT_SECRET!;
  if (!clientId || !clientSecret) {
    throw new Error("FORTNOX_CLIENT_ID / FORTNOX_CLIENT_SECRET saknas i miljÃ¶n.");
  }

  const basic = b64(`${clientId}:${clientSecret}`);

  const params = new URLSearchParams();
  params.set("grant_type", "refresh_token");
  params.set("refresh_token", row.refreshToken);
  const redirect = process.env.FORTNOX_REDIRECT_URI;
  if (redirect) params.set("redirect_uri", redirect);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const text = await res.text();
  if (!res.ok) {
    await resetFortnoxConnection(resolvedTenantId, `refresh ${res.status}: ${text}`);
    throw new Error(FORTNOX_RESET_MESSAGE);
  }

  const json = safeJSON<FortnoxTokenResponse>(text);
  if (!json.access_token) {
    await resetFortnoxConnection(resolvedTenantId, "refresh saknade access_token");
    throw new Error(FORTNOX_RESET_MESSAGE);
  }
  const nextRefreshToken = json.refresh_token || row.refreshToken;
  if (!nextRefreshToken) {
    await resetFortnoxConnection(resolvedTenantId, "refresh saknade refresh_token");
    throw new Error(FORTNOX_RESET_MESSAGE);
  }
  const expiresAt = new Date(Date.now() + (json.expires_in ?? 3600) * 1000);

  await prisma.fortnoxConnection.update({
    where: { id: row.id },
    data: {
      accessToken: json.access_token,
      refreshToken: nextRefreshToken,
      scope: json.scope ?? row.scope ?? undefined,
      expiresAt,
      updatedAt: new Date(),
    },
  });

  return { accessToken: json.access_token, tenantId: resolvedTenantId };
}

/* =======================================================
   Skapa order (Orders v2) och returnera DocumentNumber
   ======================================================= */
export async function createFortnoxOrder(
  payload: any,
  tenantId?: string
): Promise<{ documentNumber: string }> {
  const { text, ok, status } = await fortnoxRequestWithRefresh(
    tenantId,
    `${API_BASE}/orders-v2`,
    {
      method: "POST",
      body: JSON.stringify({ Order: payload }),
    }
  );

  if (!ok) throw new Error(`Fortnox create order failed (${status}): ${text}`);

  const json = safeJSON<FortnoxOrderResponse>(text);
  const raw = json?.Order?.DocumentNumber;
  const documentNumber = raw != null ? String(raw) : "";
  if (!documentNumber) {
    throw new Error("Fortnox svar saknar Order.DocumentNumber: " + text);
  }
  return { documentNumber };
}

type FortnoxDocumentResource = "orders" | "offers";

export async function listAllFortnoxDocumentNumbers({
  resource = "orders",
  tenantId,
  limit = 100,
  maxPages = 200,
}: {
  resource?: FortnoxDocumentResource;
  tenantId?: string;
  limit?: number;
  maxPages?: number;
}): Promise<number[]> {
  const numbers = new Set<number>();
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  let page = 1;

  for (let i = 0; i < maxPages; i += 1) {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(safeLimit));

    const { text, ok, status } = await fortnoxRequestWithRefresh(
      tenantId,
      `${API_BASE}/${resource}?${params}`
    );
    if (!ok) throw new Error(`Fortnox ${resource} failed (${status}): ${text}`);

    const json: any = safeJSON(text);
    const rows: any[] =
      resource === "offers"
        ? json?.Offers ?? json?.OfferSubset ?? json?.Items ?? []
        : json?.Orders ?? json?.OrderSubset ?? json?.Items ?? [];

    for (const row of rows) {
      const raw = row?.DocumentNumber ?? row?.documentNumber;
      const parsed =
        typeof raw === "number"
          ? raw
          : typeof raw === "string"
          ? Number(raw.trim())
          : Number.NaN;
      if (Number.isInteger(parsed) && parsed > 0) {
        numbers.add(parsed);
      }
    }

    const currentPage = Number(
      json?.MetaInformation?.CurrentPage ?? json?.Meta?.CurrentPage ?? page
    );
    const totalPages = Number(
      json?.MetaInformation?.TotalPages ?? json?.Meta?.TotalPages ?? Number.NaN
    );

    if (Number.isFinite(totalPages) && currentPage >= totalPages) break;
    if ((!Number.isFinite(totalPages) || totalPages <= 0) && rows.length < safeLimit) break;

    page = currentPage + 1;
  }

  return Array.from(numbers).sort((a, b) => a - b);
}

/* =======================================================
   Lista kunder
   ======================================================= */
export async function listFortnoxCustomers({
  query = "",
  filter,
  customerNumber,
  name,
  zipCode,
  city,
  email,
  phone,
  organisationNumber,
  gln,
  glnDelivery,
  lastModified,
  sortBy,
  page = 1,
  limit = 50,
  tenantId,
}: {
  query?: string;
  filter?: "active" | "inactive";
  customerNumber?: string;
  name?: string;
  zipCode?: string;
  city?: string;
  email?: string;
  phone?: string;
  organisationNumber?: string;
  gln?: string;
  glnDelivery?: string;
  lastModified?: string;
  sortBy?: "customernumber" | "name";
  page?: number;
  limit?: number;
  tenantId?: string;
}): Promise<{
  items: FortnoxCustomer[];
  meta: {
    currentPage: number;
    totalPages?: number;
    totalResources?: number;
    pageSize?: number;
  };
}> {
  const params = new URLSearchParams();
  const trimmedQuery = query.trim();
  const hasExplicitFilters = Boolean(
    customerNumber ||
      name ||
      zipCode ||
      city ||
      email ||
      phone ||
      organisationNumber ||
      gln ||
      glnDelivery ||
      lastModified
  );

  if (filter) params.set("filter", filter);
  if (customerNumber) params.set("customernumber", customerNumber);
  if (name) params.set("name", name);
  if (zipCode) params.set("zipcode", zipCode);
  if (city) params.set("city", city);
  if (email) params.set("email", email);
  if (phone) params.set("phone", phone);
  if (organisationNumber) params.set("organisationnumber", organisationNumber);
  if (gln) params.set("gln", gln);
  if (glnDelivery) params.set("glndelivery", glnDelivery);
  if (lastModified) params.set("lastmodified", lastModified);
  if (sortBy) params.set("sortby", sortBy);

  // Keep backward compatibility for q/query by mapping it to name when no explicit fields are set.
  if (trimmedQuery && !hasExplicitFilters) {
    params.set("name", trimmedQuery);
  }

  params.set("page", String(page));
  params.set("limit", String(limit));

  const { text, ok, status } = await fortnoxRequestWithRefresh(
    tenantId,
    `${API_BASE}/customers?${params}`
  );
  if (!ok) throw new Error(`Fortnox customers failed (${status}): ${text}`);

  const json: any = safeJSON(text);
  const customers = json.Customers ?? json.CustomerSubset ?? json.Items ?? [];
  const items: FortnoxCustomer[] = customers.map((c: any) =>
    normalizeFortnoxCustomer(c)
  );

  const meta = {
    currentPage: Number(
      json?.MetaInformation?.CurrentPage ??
        json?.Meta?.CurrentPage ??
        json?.currentPage ??
        page
    ),
    totalPages: parseFortnoxNumber(
      json?.MetaInformation?.TotalPages ??
        json?.Meta?.TotalPages ??
        json?.totalPages
    ),
    totalResources: parseFortnoxNumber(
      json?.MetaInformation?.TotalResources ??
        json?.Meta?.TotalResources ??
        json?.totalResources
    ),
    pageSize: parseFortnoxNumber(
      json?.MetaInformation?.CurrentPageItems ??
        json?.MetaInformation?.PageSize ??
        json?.Meta?.PageSize ??
        json?.pageSize
    ),
  };

  return { items, meta };
}

function normalizeFortnoxCustomer(raw: any): FortnoxCustomer {
  return {
    customerNumber:
      raw?.CustomerNumber ?? raw?.customerNumber ?? raw?.Number ?? "",
    name: raw?.Name ?? raw?.name ?? "",
    organisationNumber:
      raw?.OrganisationNumber ?? raw?.organisationNumber ?? raw?.OrganizationNumber ?? "",
    zipCode: raw?.ZipCode ?? raw?.zipCode ?? raw?.PostalCode ?? "",
    city: raw?.City ?? raw?.city ?? "",
    country: raw?.Country ?? raw?.country ?? "",
    phone:
      raw?.Phone1 ??
      raw?.Phone ??
      raw?.phone ??
      raw?.PhoneNumber ??
      raw?.Telephone ??
      raw?.telephone ??
      "",
    email: raw?.Email ?? raw?.email ?? raw?.EMail ?? "",
    active: parseFortnoxBoolean(raw?.Active ?? raw?.active),
  };
}

function assignCustomerField(
  payload: Record<string, unknown>,
  targetKey: string,
  value: unknown
) {
  if (value === undefined) return;
  payload[targetKey] = value;
}

function normalizeDefaultDeliveryType(value: string | undefined) {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) return undefined;
  if (normalized === "PRINT" || normalized === "EMAIL" || normalized === "PRINTSERVICE") {
    return normalized;
  }

  // UI compatibility aliases that should end up as a valid Fortnox enum.
  if (
    normalized === "EINVOICE" ||
    normalized === "E-FAKTURA" ||
    normalized === "EFAKTURA" ||
    normalized === "EDI"
  ) {
    return "PRINTSERVICE";
  }

  return undefined;
}

export async function createFortnoxCustomer({
  tenantId,
  data,
}: {
  tenantId?: string;
  data: FortnoxCustomerCreateInput;
}): Promise<FortnoxCustomer> {
  const customerNumber = String(data?.customerNumber ?? "").trim();
  const name = String(data?.name ?? "").trim();

  if (!customerNumber) {
    throw new Error("Customer number is required.");
  }
  if (!name) {
    throw new Error("Customer name is required.");
  }

  const payload: Record<string, unknown> = {
    CustomerNumber: customerNumber,
    Name: name,
  };

  assignCustomerField(payload, "Active", data.active);
  assignCustomerField(payload, "Address1", data.address1);
  assignCustomerField(payload, "Address2", data.address2);
  assignCustomerField(payload, "City", data.city);
  assignCustomerField(payload, "Comments", data.comments);
  assignCustomerField(payload, "CostCenter", data.costCenter);
  assignCustomerField(payload, "CountryCode", data.countryCode);
  assignCustomerField(payload, "Currency", data.currency);
  assignCustomerField(payload, "DeliveryAddress1", data.deliveryAddress1);
  assignCustomerField(payload, "DeliveryAddress2", data.deliveryAddress2);
  assignCustomerField(payload, "DeliveryCity", data.deliveryCity);
  assignCustomerField(payload, "DeliveryCountry", data.deliveryCountry);
  assignCustomerField(payload, "DeliveryCountryCode", data.deliveryCountryCode);
  assignCustomerField(payload, "DeliveryFax", data.deliveryFax);
  assignCustomerField(payload, "DeliveryName", data.deliveryName);
  assignCustomerField(payload, "DeliveryPhone1", data.deliveryPhone1);
  assignCustomerField(payload, "DeliveryPhone2", data.deliveryPhone2);
  assignCustomerField(payload, "DeliveryZipCode", data.deliveryZipCode);
  assignCustomerField(payload, "Email", data.email);
  assignCustomerField(payload, "EmailInvoice", data.emailInvoice);
  assignCustomerField(payload, "EmailInvoiceBCC", data.emailInvoiceBCC);
  assignCustomerField(payload, "EmailInvoiceCC", data.emailInvoiceCC);
  assignCustomerField(payload, "EmailOffer", data.emailOffer);
  assignCustomerField(payload, "EmailOfferBCC", data.emailOfferBCC);
  assignCustomerField(payload, "EmailOfferCC", data.emailOfferCC);
  assignCustomerField(payload, "EmailOrder", data.emailOrder);
  assignCustomerField(payload, "EmailOrderBCC", data.emailOrderBCC);
  assignCustomerField(payload, "EmailOrderCC", data.emailOrderCC);
  assignCustomerField(payload, "ExternalReference", data.externalReference);
  assignCustomerField(payload, "Fax", data.fax);
  assignCustomerField(payload, "GLN", data.gln);
  assignCustomerField(payload, "GLNDelivery", data.glnDelivery);
  assignCustomerField(
    payload,
    "InvoiceAdministrationFee",
    data.invoiceAdministrationFee
  );
  assignCustomerField(payload, "InvoiceDiscount", data.invoiceDiscount);
  assignCustomerField(payload, "InvoiceFreight", data.invoiceFreight);
  assignCustomerField(payload, "InvoiceRemark", data.invoiceRemark);
  assignCustomerField(payload, "OrganisationNumber", data.organisationNumber);
  assignCustomerField(payload, "OurReference", data.ourReference);
  assignCustomerField(payload, "Phone1", data.phone1);
  assignCustomerField(payload, "Phone2", data.phone2);
  assignCustomerField(payload, "PriceList", data.priceList);
  assignCustomerField(payload, "Project", data.project);
  assignCustomerField(payload, "SalesAccount", data.salesAccount);
  assignCustomerField(payload, "ShowPriceVATIncluded", data.showPriceVATIncluded);
  assignCustomerField(payload, "TermsOfDelivery", data.termsOfDelivery);
  assignCustomerField(payload, "TermsOfPayment", data.termsOfPayment);
  assignCustomerField(payload, "Type", data.type);
  assignCustomerField(payload, "VATNumber", data.vatNumber);
  assignCustomerField(payload, "VATType", data.vatType);
  assignCustomerField(payload, "VisitingAddress", data.visitingAddress);
  assignCustomerField(payload, "VisitingCity", data.visitingCity);
  assignCustomerField(payload, "VisitingCountry", data.visitingCountry);
  assignCustomerField(payload, "VisitingCountryCode", data.visitingCountryCode);
  assignCustomerField(payload, "VisitingZipCode", data.visitingZipCode);
  assignCustomerField(payload, "WWW", data.www);
  assignCustomerField(payload, "WayOfDelivery", data.wayOfDelivery);
  assignCustomerField(payload, "YourReference", data.yourReference);
  assignCustomerField(payload, "ZipCode", data.zipCode);

  if (data.defaultDeliveryTypes) {
    const deliveryTypes: Record<string, string> = {};
    const invoice = normalizeDefaultDeliveryType(data.defaultDeliveryTypes.invoice);
    const offer = normalizeDefaultDeliveryType(data.defaultDeliveryTypes.offer);
    const order = normalizeDefaultDeliveryType(data.defaultDeliveryTypes.order);
    if (invoice) deliveryTypes.Invoice = invoice;
    if (offer) deliveryTypes.Offer = offer;
    if (order) deliveryTypes.Order = order;
    if (Object.keys(deliveryTypes).length > 0) {
      payload.DefaultDeliveryTypes = deliveryTypes;
    }
  }

  if (data.defaultTemplates) {
    const templates: Record<string, string> = {};
    const cashInvoice = data.defaultTemplates.cashInvoice?.trim();
    const invoice = data.defaultTemplates.invoice?.trim();
    const offer = data.defaultTemplates.offer?.trim();
    const order = data.defaultTemplates.order?.trim();
    if (cashInvoice) templates.CashInvoice = cashInvoice;
    if (invoice) templates.Invoice = invoice;
    if (offer) templates.Offer = offer;
    if (order) templates.Order = order;
    if (Object.keys(templates).length > 0) {
      payload.DefaultTemplates = templates;
    }
  }

  const { text, ok, status } = await fortnoxRequestWithRefresh(
    tenantId,
    `${API_BASE}/customers`,
    {
      method: "POST",
      body: JSON.stringify({ Customer: payload }),
    }
  );
  if (!ok) {
    throw new Error(`Fortnox create customer failed (${status}): ${text}`);
  }

  const json: any = safeJSON(text);
  const customer = json?.Customer ?? json?.customer ?? json ?? {};
  return normalizeFortnoxCustomer(customer);
}

function normalizeFortnoxArticle(raw: any, fallbackArticleNumber?: string): FortnoxArticle {
  const articleNumber =
    raw?.ArticleNumber ??
    raw?.Article ??
    raw?.Id ??
    raw?.articleNumber ??
    fallbackArticleNumber ??
    "";

  const salesPrice = parseFortnoxNumber(raw?.SalesPrice ?? raw?.Price);

  return {
    articleNumber: String(articleNumber ?? "").trim(),
    description: raw?.Description ?? raw?.Name ?? raw?.description ?? undefined,
    salesPrice,
    unit: raw?.Unit ?? raw?.UnitName ?? raw?.unit ?? undefined,
    active: parseFortnoxBoolean(raw?.Active ?? raw?.active),
    priceListA:
      parseFortnoxNumber(raw?.PriceListA ?? raw?.Price1 ?? raw?.priceListA) ??
      salesPrice,
    calculationCost: parseFortnoxNumber(
      raw?.CalculationPrice ??
        raw?.CalculationCost ??
        raw?.CostPrice ??
        raw?.costPrice
    ),
    inStock: parseFortnoxNumber(
      raw?.StockBalance ?? raw?.QuantityInStock ?? raw?.InStock ?? raw?.inStock
    ),
    reserved: parseFortnoxNumber(raw?.Reserved ?? raw?.reserved),
    available: parseFortnoxNumber(raw?.Available ?? raw?.available),
    stockValue: parseFortnoxNumber(
      raw?.StockValue ?? raw?.InventoryValue ?? raw?.stockValue
    ),
    ean: raw?.EAN ?? raw?.Ean ?? raw?.ean ?? undefined,
    manufacturer: raw?.Manufacturer ?? raw?.manufacturer ?? undefined,
    manufacturerArticleNumber:
      raw?.ManufacturerArticleNumber ??
      raw?.manufacturerArticleNumber ??
      undefined,
    notes: raw?.Note ?? raw?.note ?? raw?.Notes ?? undefined,
    articleType: raw?.Type ?? raw?.type ?? undefined,
    stockGoods: parseFortnoxBoolean(
      raw?.StockGoods ?? raw?.stockGoods ?? raw?.StockArticle
    ),
    packageArticle: parseFortnoxBoolean(
      raw?.PackageArticle ?? raw?.packageArticle
    ),
    externalWebshop: parseFortnoxBoolean(
      raw?.WebShopArticle ??
        raw?.WebshopArticle ??
        raw?.ExternalWebshop ??
        raw?.webShopArticle
    ),
    endOfLife: parseFortnoxBoolean(raw?.EndOfLife ?? raw?.Expired ?? raw?.endOfLife),
  };
}

/* =======================================================
   Lista artiklar
   ======================================================= */
export async function listFortnoxArticles({
  query = "",
  page = 1,
  limit = 50,
  tenantId,
}: {
  query?: string;
  page?: number;
  limit?: number;
  tenantId?: string;
}): Promise<{ items: FortnoxArticle[] }> {
  const params = new URLSearchParams();
  if (query) params.set("filter", `description=${query}`);
  params.set("page", String(page));
  params.set("limit", String(limit));

  const { text, ok, status } = await fortnoxRequestWithRefresh(
    tenantId,
    `${API_BASE}/articles?${params}`
  );
  if (!ok) throw new Error(`Fortnox articles failed (${status}): ${text}`);

  const json: any = safeJSON(text);
  const arr = json.Articles ?? json.Items ?? [];
  const items = arr.map((raw: any) => normalizeFortnoxArticle(raw));

  return { items };
}

export async function listFortnoxSuppliers({
  query = "",
  page = 1,
  limit = 50,
  tenantId,
}: {
  query?: string;
  page?: number;
  limit?: number;
  tenantId?: string;
}): Promise<{ items: FortnoxSupplier[] }> {
  const params = new URLSearchParams();
  if (query) {
    params.set("filter", `name=${query}`);
  }
  params.set("page", String(page));
  params.set("limit", String(limit));

  const { text, ok, status } = await fortnoxRequestWithRefresh(
    tenantId,
    `${API_BASE}/suppliers?${params}`
  );
  if (!ok) throw new Error(`Fortnox suppliers failed (${status}): ${text}`);

  const json: any = safeJSON(text);
  const suppliers = json.Suppliers ?? json.SupplierSubset ?? json.Items ?? [];
  const items = suppliers.map((supplier: any) => ({
    supplierNumber:
      supplier.SupplierNumber ??
      supplier.supplierNumber ??
      supplier.Number ??
      "",
    name: supplier.Name ?? supplier.name ?? "",
    organisationNumber:
      supplier.OrganisationNumber ?? supplier.organisationNumber ?? undefined,
    city: supplier.City ?? supplier.city ?? undefined,
    currency: supplier.Currency ?? supplier.currency ?? undefined,
    active: parseFortnoxBoolean(supplier.Active ?? supplier.active),
  }));

  return { items };
}

type FortnoxArticleUpdateInput = {
  description?: string;
  salesPrice?: number | null;
  unit?: string;
  active?: boolean;
  priceListA?: number | null;
  calculationCost?: number | null;
  ean?: string | null;
  manufacturer?: string | null;
  manufacturerArticleNumber?: string | null;
  notes?: string | null;
  articleType?: string;
  stockGoods?: boolean;
  packageArticle?: boolean;
  externalWebshop?: boolean;
  endOfLife?: boolean;
  [key: string]: unknown;
};

type FortnoxArticleCreateInput = {
  articleNumber: string;
  ean?: string;
  description?: string;
  manufacturer?: string;
  manufacturerArticleNumber?: string;
  notes?: string;
  salesPrice?: number | null;
  unit?: string;
  active?: boolean;
  articleType?: string;
  stockGoods?: boolean;
  packageArticle?: boolean;
  externalWebshop?: boolean;
  endOfLife?: boolean;
  priceListA?: number | null;
  calculationCost?: number | null;
  [key: string]: unknown;
};

async function upsertFortnoxArticlePrice({
  tenantId,
  articleNumber,
  priceList,
  price,
}: {
  tenantId?: string;
  articleNumber: string;
  priceList: string;
  price: number;
}) {
  const payload = {
    Price: {
      ArticleNumber: articleNumber,
      PriceList: priceList,
      FromQuantity: 0,
      Price: price,
    },
  };

  const createResponse = await fortnoxRequestWithRefresh(
    tenantId,
    `${API_BASE}/prices`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

  if (createResponse.ok) return;

  const updateResponse = await fortnoxRequestWithRefresh(
    tenantId,
    `${API_BASE}/prices/${encodeURIComponent(priceList)}/${encodeURIComponent(articleNumber)}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );

  if (!updateResponse.ok) {
    throw new Error(
      `Fortnox price upsert failed (${updateResponse.status}): ${updateResponse.text}`
    );
  }
}

const FORTNOX_ARTICLE_NATIVE_KEYS = new Set([
  "Active",
  "ArticleNumber",
  "Bulky",
  "ConstructionAccount",
  "CostCalculationMethod",
  "DefaultStockLocation",
  "DefaultStockPoint",
  "Depth",
  "Description",
  "DirectCost",
  "DisposableQuantity",
  "EAN",
  "EUAccount",
  "EUVATAccount",
  "Expired",
  "ExportAccount",
  "FreightCost",
  "Height",
  "Housework",
  "HouseworkType",
  "Manufacturer",
  "ManufacturerArticleNumber",
  "Note",
  "OtherCost",
  "PurchaseAccount",
  "PurchasePrice",
  "QuantityInStock",
  "ReservedQuantity",
  "SalesAccount",
  "SalesPrice",
  "StockAccount",
  "StockChangeAccount",
  "StockGoods",
  "StockPlace",
  "StockValue",
  "StockWarning",
  "SupplierName",
  "SupplierNumber",
  "Type",
  "Unit",
  "VAT",
  "WebshopArticle",
  "Weight",
  "Width",
]);

export async function createFortnoxArticle({
  tenantId,
  data,
}: {
  tenantId?: string;
  data: FortnoxArticleCreateInput;
}) {
  const articleNumber = data?.articleNumber?.trim();
  if (!articleNumber) {
    throw new Error("Article number is required to create an article.");
  }

  const payload: Record<string, unknown> = { ArticleNumber: articleNumber };
  for (const [key, value] of Object.entries(data ?? {})) {
    if (value === undefined || key === "articleNumber") continue;
    switch (key) {
      case "description":
        payload.Description = value;
        break;
      case "ean":
        payload.EAN = value;
        break;
      case "manufacturer":
        payload.Manufacturer = value;
        break;
      case "manufacturerArticleNumber":
        payload.ManufacturerArticleNumber = value;
        break;
      case "notes":
        payload.Note = value;
        break;
      case "salesPrice":
        // SalesPrice can be read-only on /3/articles for some Fortnox setups.
        // Price is handled via /3/prices instead.
        break;
      case "unit":
        payload.Unit = value;
        break;
      case "active":
        payload.Active = value;
        break;
      case "articleType":
        payload.Type = value;
        break;
      case "stockGoods":
        payload.StockGoods = value;
        break;
      case "packageArticle":
        // Not supported on /3/articles payload for current API contract.
        break;
      case "externalWebshop":
        payload.WebshopArticle = value;
        break;
      case "endOfLife":
        payload.Expired = value;
        break;
      case "priceListA":
        break;
      case "calculationCost":
        payload.DirectCost = value;
        break;
      case "BulkyGoods":
        payload.Bulky = value;
        break;
      default:
        // Allow passthrough for exact native Fortnox /3/articles keys.
        if (FORTNOX_ARTICLE_NATIVE_KEYS.has(key)) {
          payload[key] = value;
        }
    }
  }

  const { text, ok, status } = await fortnoxRequestWithRefresh(
    tenantId,
    `${API_BASE}/articles`,
    {
      method: "POST",
      body: JSON.stringify({ Article: payload }),
    }
  );
  if (!ok) throw new Error(`Fortnox create article failed (${status}): ${text}`);

  const priceListA =
    parseFortnoxNumber(data?.priceListA) ?? parseFortnoxNumber(data?.salesPrice);
  if (priceListA !== undefined) {
    const targetPriceList = process.env.FORTNOX_DEFAULT_PRICE_LIST?.trim() || "A";
    await upsertFortnoxArticlePrice({
      tenantId,
      articleNumber,
      priceList: targetPriceList,
      price: priceListA,
    });
  }

  const json: any = safeJSON(text);
  const article = json?.Article ?? json?.article ?? json ?? {};
  return normalizeFortnoxArticle(article, articleNumber);
}

export async function updateFortnoxArticle({
  articleNumber,
  tenantId,
  data,
}: {
  articleNumber: string;
  tenantId?: string;
  data: FortnoxArticleUpdateInput;
}) {
  if (!articleNumber) {
    throw new Error("Article number is required to update an article.");
  }

  const payload: Record<string, unknown> = { ArticleNumber: articleNumber };
  for (const [key, value] of Object.entries(data ?? {})) {
    if (value === undefined) continue;
    switch (key) {
      case "description":
        payload.Description = value;
        break;
      case "salesPrice":
        // SalesPrice can be read-only on /3/articles for some Fortnox setups.
        // Price is handled via /3/prices instead.
        break;
      case "unit":
        payload.Unit = value;
        break;
      case "active":
        payload.Active = value;
        break;
      case "priceListA":
        break;
      case "calculationCost":
        payload.DirectCost = value;
        break;
      case "ean":
        payload.EAN = value;
        break;
      case "manufacturer":
        payload.Manufacturer = value;
        break;
      case "manufacturerArticleNumber":
        payload.ManufacturerArticleNumber = value;
        break;
      case "notes":
        payload.Note = value;
        break;
      case "articleType":
        payload.Type = value;
        break;
      case "stockGoods":
        payload.StockGoods = value;
        break;
      case "packageArticle":
        // Not supported on /3/articles payload for current API contract.
        break;
      case "externalWebshop":
        payload.WebshopArticle = value;
        break;
      case "endOfLife":
        payload.Expired = value;
        break;
      case "BulkyGoods":
        payload.Bulky = value;
        break;
      default:
        // Allow passthrough for exact native Fortnox /3/articles keys.
        if (FORTNOX_ARTICLE_NATIVE_KEYS.has(key)) {
          payload[key] = value;
        }
    }
  }

  const { text, ok, status } = await fortnoxRequestWithRefresh(
    tenantId,
    `${API_BASE}/articles/${encodeURIComponent(articleNumber)}`,
    {
      method: "PUT",
      body: JSON.stringify({ Article: payload }),
    }
  );
  if (!ok) throw new Error(`Fortnox update article failed (${status}): ${text}`);

  const priceListA =
    parseFortnoxNumber(data?.priceListA) ?? parseFortnoxNumber(data?.salesPrice);
  if (priceListA !== undefined) {
    const targetPriceList = process.env.FORTNOX_DEFAULT_PRICE_LIST?.trim() || "A";
    await upsertFortnoxArticlePrice({
      tenantId,
      articleNumber,
      priceList: targetPriceList,
      price: priceListA,
    });
  }

  const json: any = safeJSON(text);
  const article = json?.Article ?? json?.article ?? json ?? {};

  return normalizeFortnoxArticle(article, articleNumber);
}

export async function getFortnoxArticle({
  articleNumber,
  tenantId,
}: {
  articleNumber: string;
  tenantId?: string;
}): Promise<FortnoxArticle> {
  if (!articleNumber) {
    throw new Error("Article number is required.");
  }

  const { text, ok, status } = await fortnoxRequestWithRefresh(
    tenantId,
    `${API_BASE}/articles/${encodeURIComponent(articleNumber)}`
  );
  if (!ok) {
    throw new Error(`Fortnox get article failed (${status}): ${text}`);
  }

  const json: any = safeJSON(text);
  const raw = json?.Article ?? json?.article ?? json ?? {};
  return normalizeFortnoxArticle(raw, articleNumber);
}

/* =======================================================
   Lista leveranssÃ¤tt (WayOfDeliveries)
   ======================================================= */
export async function listFortnoxWayOfDeliveries({
  page = 1,
  limit = 100,
  tenantId,
}: {
  page?: number;
  limit?: number;
  tenantId?: string;
}): Promise<{ items: FortnoxListItem[] }> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));

  const { text, ok, status } = await fortnoxRequestWithRefresh(
    tenantId,
    `${API_BASE}/wayofdeliveries?${params}`
  );
  if (!ok) throw new Error(`Fortnox wayofdeliveries failed (${status}): ${text}`);

  const json: any = safeJSON(text);

  // Fortnox varierar: ibland { WayOfDeliveries: [...] }, ibland wrapper-objekt
  const arr =
    json?.WayOfDeliveries?.WayOfDelivery ??
    json?.WayOfDeliveries ??
    json?.wayOfDeliveries ??
    json?.Items ??
    [];

  const items: FortnoxListItem[] = arr
    .map((w: any) => ({
      code: w.Code ?? w.WayOfDeliveryCode ?? w.code ?? w.id ?? "",
      description: w.Description ?? w.Name ?? w.description ?? "",
    }))
    .filter((x: FortnoxListItem) => x.code);

  return { items };
}

/* =======================================================
   Skapa offert (Offers) och returnera hela Offer-objektet
   ======================================================= */
type FortnoxOfferResponse = {
  Offer?: { DocumentNumber?: string | number; [k: string]: unknown };
  [k: string]: unknown;
};

export async function createFortnoxOffer(
  payload: any,
  tenantId?: string
): Promise<any> {
  // Fortnox vill ha { Offer: ... }
  const { text, ok, status } = await fortnoxRequestWithRefresh(
    tenantId,
    `${API_BASE}/offers`,
    {
      method: "POST",
      body: JSON.stringify({ Offer: payload }),
    }
  );

  if (!ok) throw new Error(`Fortnox create offer failed (${status}): ${text}`);

  const json = safeJSON<FortnoxOfferResponse>(text);
  const offer = json?.Offer ?? (json as any)?.offer ?? json;
  return offer;
}

/* =======================================================================
   Ladda ned och lagra orderbekrÃ¤ftelse som PDF i S3/MinIO (legacy print)
   ======================================================================= */
export async function uploadFortnoxOrderConfirmation(
  documentNumber: string,
  tenantId?: string
): Promise<{ key: string; fileId: string }> {
  const { accessToken, tenantId: resolvedTenantId } = await getFortnoxAccessToken(tenantId);

  // Try a few Accept variants so Fortnox doesnâ€™t 1000030 us
  const candidates: Array<{ url: string; headers: Record<string, string> }> = [
    { url: `${API_BASE}/orders/${documentNumber}/print`, headers: { Accept: "application/pdf" } },
    { url: `${API_BASE}/orders/${documentNumber}/print`, headers: { Accept: "application/octet-stream" } },
    { url: `${API_BASE}/orders/${documentNumber}/print`, headers: { Accept: "*/*" } },
    { url: `${API_BASE}/orders/${documentNumber}/print?format=pdf`, headers: { Accept: "application/pdf" } },
  ];

  let pdfBuffer: Buffer | null = null;
  let lastErr: string | null = null;

  for (const c of candidates) {
    try {
      const res = await fetch(c.url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Client-Secret": process.env.FORTNOX_CLIENT_SECRET || "",
          ...c.headers,
        },
        cache: "no-store",
      });
      if (!res.ok) {
        const body = await res.text();
        if (res.status === 401) {
          await resetFortnoxConnection(resolvedTenantId, `order print 401: ${body}`);
          throw new Error(FORTNOX_RESET_MESSAGE);
        }
        lastErr = `(${res.status}) ${body}`;
        continue;
      }
      const ab = await res.arrayBuffer();
      if (!ab || (ab as any).byteLength === 0) { lastErr = "Empty body."; continue; }
      pdfBuffer = Buffer.from(ab);
      break;
    } catch (e: any) {
      if (e?.message === FORTNOX_RESET_MESSAGE) throw e;
      lastErr = e?.message || String(e);
    }
  }

  if (!pdfBuffer) {
    throw new Error(`Fortnox order print failed for ${documentNumber}. Last error: ${lastErr}`);
  }

  const key = `orders/${documentNumber}.pdf`;
  await s3UploadObject({ key, body: pdfBuffer, contentType: "application/pdf" });

  // ðŸ”½ Upsert a File row so your GET route will list it
  const existing = await prisma.file.findFirst({
    where: { orderId: documentNumber, url: key },
    select: { id: true },
  });

  const file =
    existing ??
    (await prisma.file.create({
      data: {
        orderId: documentNumber,
        track: Track.SHARED,                 // show in both lanes
        filename: `Order-${documentNumber}.pdf`,
        url: key,                            // you store the S3 key in `url`
        uploadedBy: "system:fortnox",
      },
      select: { id: true },
    }));

  return { key, fileId: file.id };
}


/**
 * Skapa order i Fortnox (v2) och ladda direkt upp orderbekrÃ¤ftelse till S3,
 * samt skapa File-rad sÃ¥ den visas i UI:t.
 */
export async function createFortnoxOrderAndSync(
  payload: any,
  tenantId?: string
): Promise<{
  documentNumber: string;
  fileKey?: string;
  fileId?: string;
}> {
  // 1) Skapa ordern i Fortnox
  const { documentNumber } = await createFortnoxOrder(payload, tenantId);

  // 2) FÃ¶rsÃ¶k hÃ¤mta/printa PDF:n och lÃ¤gga den i S3 + DB
  try {
    const { key, fileId } = await uploadFortnoxOrderConfirmation(documentNumber, tenantId);
    return { documentNumber, fileKey: key, fileId };
  } catch (err) {
    // GÃ¶r inte hela orderflÃ¶det rÃ¶tt bara fÃ¶r att PDF:en fallerar â€“ returnera Ã¤ndÃ¥
    console.warn("Fortnox PDF sync misslyckades:", err);
    return { documentNumber };
  }
}




/* =======================================================================================
   Orders v2 / okÃ¤nd tenant-konfiguration: fÃ¶rsÃ¶k flera vÃ¤gar och spara fÃ¶rsta PDF vi hittar
   ======================================================================================= */

async function fxFetch(url: string, accessToken: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Client-Secret": process.env.FORTNOX_CLIENT_SECRET!,
      ...(init?.headers || {}),
    },
  });
  return res;
}

async function savePdfAndUpsertFile(documentNumber: string, pdf: Buffer, name: string) {
  const key = `orders/${documentNumber}.pdf`;
  await s3UploadObject({ key, body: pdf, contentType: "application/pdf" });

  const existing = await prisma.file.findFirst({
    where: { orderId: documentNumber, url: key },
    select: { id: true },
  });

  const file =
    existing ??
    (await prisma.file.create({
      data: {
        orderId: documentNumber,
        track: Track.SHARED,
        filename: name,
        url: key,
        uploadedBy: "system:fortnox",
      },
      select: { id: true },
    }));

  return { key, fileId: file.id };
}

/**
 * FÃ¶rsÃ¶k:
 * 1) Legacy print (om ordern Ã¤r skapad via legacy API)
 * 2) v2 subroutes: /orders-v2/{doc}/attachments eller /documents
 * 3) Arkiv-sÃ¶kning efter PDF som innehÃ¥ller ordernumret
 */
export async function uploadFortnoxOrderConfirmationAuto(
  documentNumber: string,
  tenantId?: string
): Promise<{ key: string; fileId: string }> {
  const { accessToken, tenantId: resolvedTenantId } = await getFortnoxAccessToken(tenantId);

  // Try 1: legacy /orders/{doc}/print
  try {
    const p = await fxFetch(`${API_BASE}/orders/${documentNumber}/print`, accessToken, {
      method: "GET",
      headers: { Accept: "application/pdf" },
    });
    if (p.status === 401) {
      const body = await p.text();
      await resetFortnoxConnection(resolvedTenantId, `legacy print auto 401: ${body}`);
      throw new Error(FORTNOX_RESET_MESSAGE);
    }
    if (p.ok) {
      const pdf = Buffer.from(await p.arrayBuffer());
      return await savePdfAndUpsertFile(documentNumber, pdf, `Order-${documentNumber}.pdf`);
    }
  } catch (error: any) {
    if (error?.message === FORTNOX_RESET_MESSAGE) throw error;
    /* fallthrough */
  }

  // Try 2: v2 subresources (tenanter skiljer sig ibland i namngivning)
  for (const sub of ["attachments", "documents"]) {
    try {
      const r = await fxFetch(
        `${API_BASE}/orders-v2/${documentNumber}/${sub}`,
        accessToken,
        { method: "GET", headers: { Accept: "application/json" } }
      );
      if (r.status === 401) {
        const body = await r.text();
        await resetFortnoxConnection(resolvedTenantId, `orders-v2 ${sub} 401: ${body}`);
        throw new Error(FORTNOX_RESET_MESSAGE);
      }
      if (!r.ok) continue;
      const json: any = await r.json();
      const list = json?.Attachments ?? json?.Documents ?? json?.Items ?? [];
      const first = Array.isArray(list) ? list[0] : undefined;
      const fileId = first?.FileId ?? first?.Id ?? first?.fileId ?? first?.id;
      const name = first?.Name ?? first?.name ?? `Order-${documentNumber}.pdf`;
      if (!fileId) continue;

      const f = await fxFetch(
        `${API_BASE}/archive/filecontents?fileid=${encodeURIComponent(fileId)}`,
        accessToken,
        { method: "GET", headers: { Accept: "application/pdf" } }
      );
      if (f.status === 401) {
        const body = await f.text();
        await resetFortnoxConnection(resolvedTenantId, `archive filecontents 401: ${body}`);
        throw new Error(FORTNOX_RESET_MESSAGE);
      }
      if (!f.ok) throw new Error(await f.text());
      const pdf = Buffer.from(await f.arrayBuffer());
      return await savePdfAndUpsertFile(documentNumber, pdf, name);
    } catch (error: any) {
      if (error?.message === FORTNOX_RESET_MESSAGE) throw error;
      /* try next */
    }
  }

  // Try 3: Arkiv-sÃ¶k (leta PDF vars namn innehÃ¥ller ordernumret)
  for (const q of [
    `searchstring=${encodeURIComponent(documentNumber)}`,
    `q=${encodeURIComponent(documentNumber)}`,
  ]) {
    try {
      const a = await fxFetch(`${API_BASE}/archive?${q}`, accessToken, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (a.status === 401) {
        const body = await a.text();
        await resetFortnoxConnection(resolvedTenantId, `archive search 401: ${body}`);
        throw new Error(FORTNOX_RESET_MESSAGE);
      }
      if (!a.ok) continue;
      const js: any = await a.json();
      const entries: any[] = js?.Files ?? js?.Items ?? js?.files ?? [];
      const match = entries.find((e) => {
        const name = (e.Name || e.name || "").toLowerCase();
        const mime = (e.MimeType || e.mimeType || "").toLowerCase();
        return name.includes(String(documentNumber).toLowerCase()) &&
          (mime.includes("pdf") || name.endsWith(".pdf"));
      });
      const fid = match?.FileId ?? match?.Id ?? match?.fileId ?? match?.id;
      const name = match?.Name ?? match?.name ?? `Order-${documentNumber}.pdf`;
      if (!fid) continue;

      const f = await fxFetch(
        `${API_BASE}/archive/filecontents?fileid=${encodeURIComponent(fid)}`,
        accessToken,
        { method: "GET", headers: { Accept: "application/pdf" } }
      );
      if (f.status === 401) {
        const body = await f.text();
        await resetFortnoxConnection(resolvedTenantId, `archive filecontents 401: ${body}`);
        throw new Error(FORTNOX_RESET_MESSAGE);
      }
      if (!f.ok) throw new Error(await f.text());
      const pdf = Buffer.from(await f.arrayBuffer());
      return await savePdfAndUpsertFile(documentNumber, pdf, name);
    } catch (error: any) {
      if (error?.message === FORTNOX_RESET_MESSAGE) throw error;
      /* try next */
    }
  }

  throw new Error(
    `Kunde inte hitta nÃ¥gon orderbekrÃ¤ftelse fÃ¶r order ${documentNumber}. ` +
    `Ingen legacy print, inga v2-attachments/documents och ingen trÃ¤ff i arkivet.`
  );
}

/* =======================================================
   Lista prislistor (PriceLists)
   ======================================================= */
export async function listFortnoxPriceLists({
  page = 1,
  limit = 100,
  tenantId,
}: {
  page?: number;
  limit?: number;
  tenantId?: string;
}): Promise<{ items: FortnoxListItem[] }> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));

  const { text, ok, status } = await fortnoxRequestWithRefresh(
    tenantId,
    `${API_BASE}/pricelists?${params}`
  );
  if (!ok) throw new Error(`Fortnox pricelists failed (${status}): ${text}`);

  const json: any = safeJSON(text);

  // Fortnox varierar: { PriceLists: [...] } eller wrapper
  const arr =
    json?.PriceLists?.PriceList ??
    json?.PriceLists ??
    json?.priceLists ??
    json?.Items ??
    [];

  const items: FortnoxListItem[] = arr
    .map((p: any) => ({
      code: p.Code ?? p.PriceListCode ?? p.code ?? p.id ?? "",
      description: p.Description ?? p.Name ?? p.description ?? "",
    }))
    .filter((x: FortnoxListItem) => x.code);

  return { items };
}

export async function listFortnoxCostCenters({
  page = 1,
  limit = 100,
  tenantId,
}: {
  page?: number;
  limit?: number;
  tenantId?: string;
}): Promise<{ items: FortnoxCostCenterItem[] }> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));

  const { text, ok, status } = await fortnoxRequestWithRefresh(
    tenantId,
    `${API_BASE}/costcenters?${params.toString()}`
  );
  if (!ok) throw new Error(`Fortnox costcenters failed (${status}): ${text}`);

  const json: any = safeJSON(text);

  const arr =
    json?.CostCenters?.CostCenter ??
    json?.CostCenters ??
    json?.costCenters ??
    json?.Items ??
    [];

  const items: FortnoxCostCenterItem[] = arr
    .map((center: any) => ({
      code: center?.Code ?? center?.CostCenter ?? center?.code ?? center?.id ?? "",
      description:
        center?.Description ??
        center?.Name ??
        center?.description ??
        center?.name ??
        undefined,
    }))
    .filter((x: FortnoxCostCenterItem) => x.code);

  return { items };
}

export async function listFortnoxAccounts({
  tenantId,
  query,
  limit = 500,
  forceRefresh = false,
}: {
  tenantId?: string;
  query?: string;
  limit?: number;
  forceRefresh?: boolean;
}): Promise<{ items: FortnoxAccountItem[] }> {
  const cacheKey = tenantId ?? "default";
  const cacheEntry = accountsCache.get(cacheKey);
  const now = Date.now();
  const cacheIsFresh = cacheEntry && now - cacheEntry.fetchedAt < 5 * 60 * 1000; // 5 minutes

  if (!forceRefresh && cacheIsFresh) {
    const items = cacheEntry!.items;
    return {
      items: query
        ? items.filter((item) => {
            const needle = query.toLowerCase();
            return `${item.accountNumber} ${item.description ?? ""}`.toLowerCase().includes(needle);
          })
        : items,
    };
  }

  const collected: FortnoxAccountItem[] = [];
  const seen = new Set<string>();
  let page = 1;
  const maxPages = 20; // safety guard (~10k accounts at limit 500)

  while (page <= maxPages) {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));

    const { text, ok, status } = await fortnoxRequestWithRefresh(
      tenantId,
      `${API_BASE}/accounts?${params.toString()}`,
    );
    if (!ok) throw new Error(`Fortnox accounts failed (${status}): ${text}`);

    const json: any = safeJSON(text);
    const rawAccounts =
      json?.Accounts?.Account ??
      json?.Accounts ??
      json?.accounts ??
      json?.Items ??
      json?.items ??
      [];

    if (!Array.isArray(rawAccounts) || rawAccounts.length === 0) break;

    for (const raw of rawAccounts) {
      const accountNumber =
        raw?.AccountNumber ??
        raw?.accountNumber ??
        raw?.Number ??
        raw?.number ??
        raw?.Id ??
        raw?.id ??
        null;
      if (!accountNumber) continue;
      const normalized: FortnoxAccountItem = {
        accountNumber: String(accountNumber),
        description:
          raw?.Description ??
          raw?.description ??
          raw?.Name ??
          raw?.name ??
          undefined,
      };
      if (normalized.accountNumber && !seen.has(normalized.accountNumber)) {
        seen.add(normalized.accountNumber);
        collected.push(normalized);
      }
    }

    const totalPages =
      Number(json?.MetaInformation?.TotalPages ?? json?.Meta?.TotalPages ?? json?.totalPages ?? 0) || null;
    if (totalPages && page >= totalPages) break;
    if (rawAccounts.length < limit) break;
    page += 1;
  }

  accountsCache.set(cacheKey, { fetchedAt: now, items: collected });

  const filtered = query
    ? collected.filter((item) => {
        const needle = query.toLowerCase();
        return `${item.accountNumber} ${item.description ?? ""}`.toLowerCase().includes(needle);
      })
    : collected;

  return { items: filtered };
}



