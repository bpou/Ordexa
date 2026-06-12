// src/app/api/fortnox/customers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { createFortnoxCustomer, listFortnoxCustomers } from "@/lib/fortnox";
import { canCreateRegisters } from "@/lib/permissions";

function isReconnectRequiredError(message: string) {
  return message.toLowerCase().includes("koppla om fortnox");
}

function getTrimmed(searchParams: URLSearchParams, key: string) {
  const value = searchParams.get(key);
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toBoundedNumber(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function toOptionalTrimmedString(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toOptionalNumber(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed =
    typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${field} must be numeric.`);
  }
  return parsed;
}

function toOptionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return undefined;
    if (["true", "1", "ja", "yes"].includes(normalized)) return true;
    if (["false", "0", "nej", "no"].includes(normalized)) return false;
  }
  throw new Error(`${field} must be boolean.`);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") ?? "";
  const page = toBoundedNumber(searchParams.get("page"), 1, 1, 10000);
  const limit = toBoundedNumber(searchParams.get("limit"), 50, 1, 500);
  const tenantId = getTrimmed(searchParams, "tenantId");

  const filterRaw = getTrimmed(searchParams, "filter")?.toLowerCase();
  const filter =
    filterRaw === "active" || filterRaw === "inactive" ? filterRaw : undefined;

  const sortByRaw = getTrimmed(searchParams, "sortby")?.toLowerCase();
  const sortBy =
    sortByRaw === "customernumber" || sortByRaw === "name"
      ? sortByRaw
      : undefined;

  try {
    const { items, meta } = await listFortnoxCustomers({
      query,
      filter,
      customerNumber: getTrimmed(searchParams, "customernumber"),
      name: getTrimmed(searchParams, "name"),
      zipCode: getTrimmed(searchParams, "zipcode"),
      city: getTrimmed(searchParams, "city"),
      email: getTrimmed(searchParams, "email"),
      phone: getTrimmed(searchParams, "phone"),
      organisationNumber: getTrimmed(searchParams, "organisationnumber"),
      gln: getTrimmed(searchParams, "gln"),
      glnDelivery: getTrimmed(searchParams, "glndelivery"),
      lastModified: getTrimmed(searchParams, "lastmodified"),
      sortBy,
      page,
      limit,
      tenantId,
    });
    return NextResponse.json({ customers: items, meta });
  } catch (e: any) {
    const message = e?.message ?? "Fortnox customers error";
    if (isReconnectRequiredError(String(message))) {
      return NextResponse.json(
        { error: message, code: "fortnox_reconnect_required", customers: [] },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
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
  const customerRaw =
    raw.Customer && typeof raw.Customer === "object" && !Array.isArray(raw.Customer)
      ? (raw.Customer as Record<string, unknown>)
      : raw;
  const tenantId =
    toOptionalTrimmedString(raw.tenantId) ??
    new URL(req.url).searchParams.get("tenantId") ??
    undefined;

  const customerNumber =
    toOptionalTrimmedString(customerRaw.customerNumber) ??
    toOptionalTrimmedString(customerRaw.CustomerNumber);
  const name =
    toOptionalTrimmedString(customerRaw.name) ??
    toOptionalTrimmedString(customerRaw.Name);

  if (!customerNumber) {
    return NextResponse.json({ error: "customerNumber is required." }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }

  try {
    const existing = await listFortnoxCustomers({
      customerNumber,
      page: 1,
      limit: 1,
      tenantId,
    });
    const alreadyExists = existing.items.some(
      (item) => String(item.customerNumber ?? "").trim() === customerNumber
    );
    if (alreadyExists) {
      return NextResponse.json(
        { error: `customerNumber "${customerNumber}" already exists.` },
        { status: 409 }
      );
    }

    const defaultDeliveryTypesRaw =
      (customerRaw.defaultDeliveryTypes as Record<string, unknown> | undefined) ??
      (customerRaw.DefaultDeliveryTypes as Record<string, unknown> | undefined);
    const defaultTemplatesRaw =
      (customerRaw.defaultTemplates as Record<string, unknown> | undefined) ??
      (customerRaw.DefaultTemplates as Record<string, unknown> | undefined);

    const customer = await createFortnoxCustomer({
      tenantId,
      data: {
        customerNumber,
        name,
        active: toOptionalBoolean(customerRaw.active ?? customerRaw.Active, "active"),
        address1:
          toOptionalTrimmedString(customerRaw.address1) ??
          toOptionalTrimmedString(customerRaw.Address1),
        address2:
          toOptionalTrimmedString(customerRaw.address2) ??
          toOptionalTrimmedString(customerRaw.Address2),
        city:
          toOptionalTrimmedString(customerRaw.city) ??
          toOptionalTrimmedString(customerRaw.City),
        comments:
          toOptionalTrimmedString(customerRaw.comments) ??
          toOptionalTrimmedString(customerRaw.Comments),
        costCenter:
          toOptionalTrimmedString(customerRaw.costCenter) ??
          toOptionalTrimmedString(customerRaw.CostCenter),
        country:
          toOptionalTrimmedString(customerRaw.country) ??
          toOptionalTrimmedString(customerRaw.Country),
        countryCode:
          toOptionalTrimmedString(customerRaw.countryCode) ??
          toOptionalTrimmedString(customerRaw.CountryCode),
        currency:
          toOptionalTrimmedString(customerRaw.currency) ??
          toOptionalTrimmedString(customerRaw.Currency),
        defaultDeliveryTypes: defaultDeliveryTypesRaw
          ? {
              invoice:
                toOptionalTrimmedString(defaultDeliveryTypesRaw.invoice) ??
                toOptionalTrimmedString(defaultDeliveryTypesRaw.Invoice),
              offer:
                toOptionalTrimmedString(defaultDeliveryTypesRaw.offer) ??
                toOptionalTrimmedString(defaultDeliveryTypesRaw.Offer),
              order:
                toOptionalTrimmedString(defaultDeliveryTypesRaw.order) ??
                toOptionalTrimmedString(defaultDeliveryTypesRaw.Order),
            }
          : undefined,
        defaultTemplates: defaultTemplatesRaw
          ? {
              cashInvoice:
                toOptionalTrimmedString(defaultTemplatesRaw.cashInvoice) ??
                toOptionalTrimmedString(defaultTemplatesRaw.CashInvoice),
              invoice:
                toOptionalTrimmedString(defaultTemplatesRaw.invoice) ??
                toOptionalTrimmedString(defaultTemplatesRaw.Invoice),
              offer:
                toOptionalTrimmedString(defaultTemplatesRaw.offer) ??
                toOptionalTrimmedString(defaultTemplatesRaw.Offer),
              order:
                toOptionalTrimmedString(defaultTemplatesRaw.order) ??
                toOptionalTrimmedString(defaultTemplatesRaw.Order),
            }
          : undefined,
        deliveryAddress1:
          toOptionalTrimmedString(customerRaw.deliveryAddress1) ??
          toOptionalTrimmedString(customerRaw.DeliveryAddress1),
        deliveryAddress2:
          toOptionalTrimmedString(customerRaw.deliveryAddress2) ??
          toOptionalTrimmedString(customerRaw.DeliveryAddress2),
        deliveryCity:
          toOptionalTrimmedString(customerRaw.deliveryCity) ??
          toOptionalTrimmedString(customerRaw.DeliveryCity),
        deliveryCountry:
          toOptionalTrimmedString(customerRaw.deliveryCountry) ??
          toOptionalTrimmedString(customerRaw.DeliveryCountry),
        deliveryCountryCode:
          toOptionalTrimmedString(customerRaw.deliveryCountryCode) ??
          toOptionalTrimmedString(customerRaw.DeliveryCountryCode),
        deliveryFax:
          toOptionalTrimmedString(customerRaw.deliveryFax) ??
          toOptionalTrimmedString(customerRaw.DeliveryFax),
        deliveryName:
          toOptionalTrimmedString(customerRaw.deliveryName) ??
          toOptionalTrimmedString(customerRaw.DeliveryName),
        deliveryPhone1:
          toOptionalTrimmedString(customerRaw.deliveryPhone1) ??
          toOptionalTrimmedString(customerRaw.DeliveryPhone1),
        deliveryPhone2:
          toOptionalTrimmedString(customerRaw.deliveryPhone2) ??
          toOptionalTrimmedString(customerRaw.DeliveryPhone2),
        deliveryZipCode:
          toOptionalTrimmedString(customerRaw.deliveryZipCode) ??
          toOptionalTrimmedString(customerRaw.DeliveryZipCode),
        email:
          toOptionalTrimmedString(customerRaw.email) ??
          toOptionalTrimmedString(customerRaw.Email),
        emailInvoice:
          toOptionalTrimmedString(customerRaw.emailInvoice) ??
          toOptionalTrimmedString(customerRaw.EmailInvoice),
        emailInvoiceBCC:
          toOptionalTrimmedString(customerRaw.emailInvoiceBCC) ??
          toOptionalTrimmedString(customerRaw.EmailInvoiceBCC),
        emailInvoiceCC:
          toOptionalTrimmedString(customerRaw.emailInvoiceCC) ??
          toOptionalTrimmedString(customerRaw.EmailInvoiceCC),
        emailOffer:
          toOptionalTrimmedString(customerRaw.emailOffer) ??
          toOptionalTrimmedString(customerRaw.EmailOffer),
        emailOfferBCC:
          toOptionalTrimmedString(customerRaw.emailOfferBCC) ??
          toOptionalTrimmedString(customerRaw.EmailOfferBCC),
        emailOfferCC:
          toOptionalTrimmedString(customerRaw.emailOfferCC) ??
          toOptionalTrimmedString(customerRaw.EmailOfferCC),
        emailOrder:
          toOptionalTrimmedString(customerRaw.emailOrder) ??
          toOptionalTrimmedString(customerRaw.EmailOrder),
        emailOrderBCC:
          toOptionalTrimmedString(customerRaw.emailOrderBCC) ??
          toOptionalTrimmedString(customerRaw.EmailOrderBCC),
        emailOrderCC:
          toOptionalTrimmedString(customerRaw.emailOrderCC) ??
          toOptionalTrimmedString(customerRaw.EmailOrderCC),
        externalReference:
          toOptionalTrimmedString(customerRaw.externalReference) ??
          toOptionalTrimmedString(customerRaw.ExternalReference),
        fax:
          toOptionalTrimmedString(customerRaw.fax) ??
          toOptionalTrimmedString(customerRaw.Fax),
        gln:
          toOptionalTrimmedString(customerRaw.gln) ??
          toOptionalTrimmedString(customerRaw.GLN),
        glnDelivery:
          toOptionalTrimmedString(customerRaw.glnDelivery) ??
          toOptionalTrimmedString(customerRaw.GLNDelivery),
        invoiceAdministrationFee:
          toOptionalTrimmedString(customerRaw.invoiceAdministrationFee) ??
          toOptionalTrimmedString(customerRaw.InvoiceAdministrationFee),
        invoiceDiscount: toOptionalNumber(
          customerRaw.invoiceDiscount ?? customerRaw.InvoiceDiscount,
          "invoiceDiscount"
        ),
        invoiceFreight:
          toOptionalTrimmedString(customerRaw.invoiceFreight) ??
          toOptionalTrimmedString(customerRaw.InvoiceFreight),
        invoiceRemark:
          toOptionalTrimmedString(customerRaw.invoiceRemark) ??
          toOptionalTrimmedString(customerRaw.InvoiceRemark),
        organisationNumber:
          toOptionalTrimmedString(customerRaw.organisationNumber) ??
          toOptionalTrimmedString(customerRaw.OrganisationNumber),
        ourReference:
          toOptionalTrimmedString(customerRaw.ourReference) ??
          toOptionalTrimmedString(customerRaw.OurReference),
        phone1:
          toOptionalTrimmedString(customerRaw.phone1) ??
          toOptionalTrimmedString(customerRaw.Phone1),
        phone2:
          toOptionalTrimmedString(customerRaw.phone2) ??
          toOptionalTrimmedString(customerRaw.Phone2),
        priceList:
          toOptionalTrimmedString(customerRaw.priceList) ??
          toOptionalTrimmedString(customerRaw.PriceList),
        project:
          toOptionalTrimmedString(customerRaw.project) ??
          toOptionalTrimmedString(customerRaw.Project),
        salesAccount:
          toOptionalTrimmedString(customerRaw.salesAccount) ??
          toOptionalTrimmedString(customerRaw.SalesAccount),
        showPriceVATIncluded: toOptionalBoolean(
          customerRaw.showPriceVATIncluded ?? customerRaw.ShowPriceVATIncluded,
          "showPriceVATIncluded"
        ),
        termsOfDelivery:
          toOptionalTrimmedString(customerRaw.termsOfDelivery) ??
          toOptionalTrimmedString(customerRaw.TermsOfDelivery),
        termsOfPayment:
          toOptionalTrimmedString(customerRaw.termsOfPayment) ??
          toOptionalTrimmedString(customerRaw.TermsOfPayment),
        type:
          toOptionalTrimmedString(customerRaw.type) ??
          toOptionalTrimmedString(customerRaw.Type),
        vatNumber:
          toOptionalTrimmedString(customerRaw.vatNumber) ??
          toOptionalTrimmedString(customerRaw.VATNumber),
        vatType:
          toOptionalTrimmedString(customerRaw.vatType) ??
          toOptionalTrimmedString(customerRaw.VATType),
        visitingAddress:
          toOptionalTrimmedString(customerRaw.visitingAddress) ??
          toOptionalTrimmedString(customerRaw.VisitingAddress),
        visitingCity:
          toOptionalTrimmedString(customerRaw.visitingCity) ??
          toOptionalTrimmedString(customerRaw.VisitingCity),
        visitingCountry:
          toOptionalTrimmedString(customerRaw.visitingCountry) ??
          toOptionalTrimmedString(customerRaw.VisitingCountry),
        visitingCountryCode:
          toOptionalTrimmedString(customerRaw.visitingCountryCode) ??
          toOptionalTrimmedString(customerRaw.VisitingCountryCode),
        visitingZipCode:
          toOptionalTrimmedString(customerRaw.visitingZipCode) ??
          toOptionalTrimmedString(customerRaw.VisitingZipCode),
        www:
          toOptionalTrimmedString(customerRaw.www) ??
          toOptionalTrimmedString(customerRaw.WWW),
        wayOfDelivery:
          toOptionalTrimmedString(customerRaw.wayOfDelivery) ??
          toOptionalTrimmedString(customerRaw.WayOfDelivery),
        yourReference:
          toOptionalTrimmedString(customerRaw.yourReference) ??
          toOptionalTrimmedString(customerRaw.YourReference),
        zipCode:
          toOptionalTrimmedString(customerRaw.zipCode) ??
          toOptionalTrimmedString(customerRaw.ZipCode),
      },
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error: any) {
    const message = error?.message ?? "Fortnox create customer error";
    const status = /required|must be/i.test(message)
      ? 400
      : /already exists|duplicate|already in use/i.test(message)
      ? 409
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
