import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Track } from "@prisma/client";
import { createFortnoxOrder, uploadFortnoxOrderConfirmation } from "@/lib/fortnox";

// ====== Planerings-hjälpare (öppettider 07–16) ======
const WORK_START_HOUR = 7;   // 07:00
const WORK_END_HOUR   = 16;  // 16:00
const PLANNING_TRACKS: Track[] = [Track.A, Track.B, Track.C, Track.D];

type Iso = string;
type IsoOrNull = string | null | undefined;

function toDateOrNull(v: IsoOrNull) {
  return v ? new Date(v) : null;
}
function setTime(d: Date, h: number, m = 0) {
  const x = new Date(d);
  x.setHours(h, m, 0, 0);
  return x;
}
function addMinutes(d: Date, mins: number) {
  return new Date(d.getTime() + mins * 60_000);
}
function clampToBusinessHours(start: Date, end: Date) {
  const sOpen = setTime(start, WORK_START_HOUR);
  const sClose = setTime(start, WORK_END_HOUR);
  let s = start < sOpen ? sOpen : start;
  let e = end > sClose ? sClose : end;
  if (s >= e) return null;
  return { start: s, end: e };
}

function parseClientNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value !== "string") return undefined;
  const compact = value.trim().replace(/\u00A0/g, "").replace(/\s+/g, "");
  if (!compact) return undefined;

  let normalized = compact;
  if (compact.includes(",")) {
    // Swedish format: 1.234,56 -> 1234.56
    normalized = compact.replace(/\./g, "").replace(",", ".");
  } else {
    // Dot-decimal input: 1.25 should stay 1.25 (not 125).
    const dotCount = (compact.match(/\./g) || []).length;
    if (dotCount > 1) {
      normalized = compact.replace(/\./g, "");
    }
  }
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeTermsOfPayment(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  if (typeof value !== "string") return undefined;
  const raw = value.trim();
  if (!raw) return undefined;
  if (/^\d+$/.test(raw)) return raw;
  if (/f[oö]rskott/i.test(raw)) return "0";
  const match = raw.match(/\d+/);
  return match?.[0];
}

// Hitta första lediga lucka för ett spår ("A" | "B") som rymmer `minutes`
async function findEarliestSlot(track: Track, minutes: number) {
  let day = new Date();
  day.setSeconds(0, 0);

  // Prova upp till 30 dagar framåt
  for (let i = 0; i < 30; i++) {
    const dayOpen  = setTime(day, WORK_START_HOUR);
    const dayClose = setTime(day, WORK_END_HOUR);

    const events = await prisma.calendarEvent.findMany({
      where: { track, start: { lt: dayClose }, end: { gt: dayOpen } },
      select: { start: true, end: true },
      orderBy: { start: "asc" },
    });

    let cursor = new Date(Math.max(Date.now(), dayOpen.getTime()));
    if (cursor >= dayClose) {
      day = addMinutes(setTime(day, 0), 24 * 60);
      continue;
    }

    for (const ev of events) {
      const evStart = new Date(ev.start);
      const evEnd   = new Date(ev.end);

      if (evStart > cursor) {
        const candidateEnd = addMinutes(cursor, minutes);
        const clamped = clampToBusinessHours(cursor, candidateEnd);
        if (clamped && clamped.end <= evStart) return clamped;
      }
      if (evEnd > cursor) cursor = evEnd;
      if (cursor >= dayClose) break;
    }

    if (cursor < dayClose) {
      const candidateEnd = addMinutes(cursor, minutes);
      const clamped = clampToBusinessHours(cursor, candidateEnd);
      if (clamped && clamped.end <= dayClose) return clamped;
    }

    day = addMinutes(setTime(day, 0), 24 * 60);
  }

  return null;
}

// ====== Safe body parser (fixar "Unexpected end of JSON input") ======
async function parseJsonBody(req: NextRequest): Promise<any> {
  const text = await req.text();
  if (!text || !text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch (e: any) {
    throw new Error(`Invalid JSON body. ${e?.message ?? ""}`);
  }
}

// ====== GET – oförändrad logik ======
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawTrack = searchParams.get("track");
  const track = rawTrack ? rawTrack.toUpperCase() : null;

  const rawStatus = searchParams.get("status");
  const status = rawStatus ? rawStatus.toUpperCase() : null;

  const validStatuses = ["INKOMMANDE","PAGAENDE","LEVERANS","AVSLUTAD"] as const;

  const where: any = {};
  if (track || status) {
    if (track && track !== "A" && track !== "B") {
      return NextResponse.json({ error: "Invalid track" }, { status: 400 });
    }
    if (status && !validStatuses.includes(status as any)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    where.tracks = {
      some: {
        ...(track ? { track } : {}),
        ...(status ? { status } : {}),
      },
    };
  }

  const orders = await prisma.order.findMany({
    where,
    include: { tracks: true, fortnox: true, events: true, files: true, createdBy: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ orders });
}

// ====== POST – Fortnox först, använd deras DocumentNumber som orderNumber ======
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await parseJsonBody(req); // ✅ robust mot tom/icke-JSON
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Invalid JSON" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string | null; name?: string | null; email?: string | null } | undefined;
  const createdById = typeof sessionUser?.id === "string" ? sessionUser.id : null;
  const createdByName = (() => {
    const name = typeof sessionUser?.name === "string" ? sessionUser.name.trim() : "";
    if (name) return name;
    const email = typeof sessionUser?.email === "string" ? sessionUser.email.trim() : "";
    return email || null;
  })();

  let {
    // gamla fält (behåller stöd)
    title, customerName, dueDate, deliveryMethod, deliveryAddress,
    deliveryName, deliveryAddress2, deliveryZip, deliveryCity, deliveryCountry,

    tracks, colorA = "#16a34a", colorB = "#ec4899", colorC = "#6366f1", colorD = "#f97316",

    // planering
    autoSchedule = true,
    estimateA, estimateB, estimateC, estimateD,
    manualA, manualB, manualC, manualD,

    // multitenant
    tenantId,

    // Fortnox-kopplat
    customerNumber,
    orderRows,               // gamla rader (lowercase)
    fortnox: fortnoxFromClient, // nya fält (Uppercase-keys för Fortnox)
  } = body;

  const f = fortnoxFromClient ?? {};

  tracks = Array.isArray(tracks) ? tracks.map((t: string) => (t || "").toUpperCase()) : [];
  tracks = Array.from(
    new Set(
      tracks.filter((t: string) => PLANNING_TRACKS.includes((t as Track) ?? Track.A))
    )
  );

  if (!title) {
    return NextResponse.json({ error: "title krävs" }, { status: 400 });
  }
  if (!(customerNumber || f.CustomerNumber)) {
    return NextResponse.json({ error: "customerNumber krävs (Fortnox-kund)" }, { status: 400 });
  }

  // ---------------------------
  // 1) Bygg Fortnox OrderRows
  // ---------------------------
  let rows:
    | Array<{
        ArticleNumber?: string;
        Description?: string;
        OrderedQuantity: number;
        Price: number;
        Unit?: string;
      }>
    | undefined;

  if (Array.isArray(f.OrderRows) && f.OrderRows.length) {
    // Nya vägen: redan i Fortnox-format
    rows = f.OrderRows.map((r: any) => ({
      ArticleNumber: r.ArticleNumber,
      Description: r.Description ?? title,
      OrderedQuantity: Number(r.OrderedQuantity ?? 1),
      Price: Number(r.Price ?? 0),
      Unit: r.Unit || "st",
    }));
  } else if (Array.isArray(orderRows) && orderRows.length) {
    // Gamla vägen: mappa lowercase -> Fortnox
    rows = orderRows.map((r: any) => ({
      ArticleNumber: r.articleNumber || undefined,
      Description: r.description || title,
      OrderedQuantity: Number(r.OrderedQuantity ?? 1),
      Price: Number(r.price ?? 0),
      Unit: r.unit || "st",
    }));
  } else {
    // default
    rows = [
      {
        Description: title,
        OrderedQuantity: 1,
        Price: 0,
        Unit: "st",
      },
    ];
  }



  type Slot = { start: Date; end: Date };

  const parseSlot = (raw: { start?: string; end?: string } | undefined): Slot | null => {
    if (!raw?.start || !raw?.end) return null;
    const start = new Date(raw.start);
    const end = new Date(raw.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return null;
    }
    return { start, end };
  };

  const minutesOr = (value: unknown, fallback: number) => {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return fallback;
    const rounded = Math.round(num);
    const clamped = Math.min(Math.max(rounded, 15), 8 * 60); // mellan 15 min och 8 h
    return clamped;
  };

  const selectedTracks = tracks as Track[];
  const scheduleByTrack: Partial<Record<Track, Slot>> = {};
  const manualByTrack: Record<Track, { start?: string; end?: string } | undefined> = {
    [Track.A]: manualA,
    [Track.B]: manualB,
    [Track.C]: manualC,
    [Track.D]: manualD,
    [Track.SHARED]: undefined,
  };
  const estimateByTrack: Record<Track, number | undefined> = {
    [Track.A]: estimateA,
    [Track.B]: estimateB,
    [Track.C]: estimateC,
    [Track.D]: estimateD,
    [Track.SHARED]: undefined,
  };

  if (autoSchedule) {
    for (const track of selectedTracks) {
      const slot = await findEarliestSlot(track, minutesOr(estimateByTrack[track], 60));
      if (!slot) {
        return NextResponse.json(
          { error: `Kunde inte hitta ledig tid för spår ${track}. Välj tid manuellt.` },
          { status: 409 }
        );
      }
      scheduleByTrack[track] = slot;
    }
  } else {
    for (const track of selectedTracks) {
      const slot = parseSlot(manualByTrack[track]);
      if (!slot) {
        return NextResponse.json(
          { error: `Start/slut saknas för spår ${track}.` },
          { status: 400 }
        );
      }
      scheduleByTrack[track] = slot;
    }
  }

  // ---------------------------
  // 2) Normalisera leveransadress från gamla + nya fält
  // ---------------------------
  const normDelivery = {
    name: (f.DeliveryName ?? deliveryName ?? customerName ?? title) || "",
    // deliveryStreet (nytt) vinner över gamla deliveryAddress
    address1: (f.DeliveryAddress1 ?? body.deliveryStreet ?? deliveryAddress ?? "").toString(),
    address2: (f.DeliveryAddress2 ?? deliveryAddress2 ?? body.deliveryAddress ?? "").toString(), // fri text
    zip: (f.DeliveryZipCode ?? deliveryZip ?? "").toString(),
    city: (f.DeliveryCity ?? deliveryCity ?? "").toString(),
    way: f.WayOfDelivery ?? body.wayOfDelivery ?? deliveryMethod,
  };

  // ---------------------------
  // 3) Fortnox payload (merge nya fält + bakåtkomp.)
  // ---------------------------
  const paymentTerms = normalizeTermsOfPayment(f.TermsOfPayment ?? body.paymentTerms);
  const currency = String(f.Currency ?? body.currency ?? "").trim().toUpperCase();
  const currencyRate = parseClientNumber(f.CurrencyRate ?? body.exchangeRate);
  const currencyUnit = parseClientNumber(f.CurrencyUnit ?? body.unitValue);
  const effectiveCurrencyRate = currency === "SEK" ? 1 : currencyRate;
  const effectiveCurrencyUnit = currency === "SEK" ? 1 : currencyUnit;
  const orderText = f.OrderText ?? body.orderText;
  const manualDocumentNumberRaw = String(f.DocumentNumber ?? body.title ?? "").trim();
  const manualDocumentNumber = /^\d+$/.test(manualDocumentNumberRaw)
    ? manualDocumentNumberRaw
    : undefined;
  const freightValue = parseClientNumber(f.Freight ?? body.freightFee);
  const administrationFeeValue = parseClientNumber(
    f.AdministrationFee ?? f.InvoiceFee ?? body.invoiceFee
  );
  const remarks = f.Remarks ?? orderText ?? title;

  const fortnoxPayload: any = {
    CustomerNumber: String(f.CustomerNumber ?? customerNumber),
    ...(manualDocumentNumber ? { DocumentNumber: manualDocumentNumber } : {}),
    // datum
    OrderDate: f.OrderDate ?? new Date().toISOString().slice(0, 10),
    ...(f.DeliveryDate ? { DeliveryDate: f.DeliveryDate } : {}),

    // referenser/pris
    ...(f.OurReference || body.ourReference ? { OurReference: f.OurReference ?? body.ourReference } : {}),
    ...(f.YourReference || customerName || title ? { YourReference: f.YourReference ?? customerName ?? title } : {}),
    ...(f.PriceList || body.priceList ? { PriceList: f.PriceList ?? body.priceList } : {}),
    ...(typeof f.VATIncluded === "boolean"
      ? { VATIncluded: f.VATIncluded }
      : typeof body.pricesInclVAT === "boolean"
      ? { VATIncluded: body.pricesInclVAT }
      : {}),

    // faktura/kundadress
    ...(f.CustomerName || body.invoiceName ? { CustomerName: f.CustomerName ?? body.invoiceName } : {}),
    ...(f.Address1 || body.invoiceAddress1 ? { Address1: f.Address1 ?? body.invoiceAddress1 } : {}),
    ...(f.Address2 || body.invoiceAddress2 ? { Address2: f.Address2 ?? body.invoiceAddress2 } : {}),
    ...(f.ZipCode || body.invoiceZip ? { ZipCode: f.ZipCode ?? body.invoiceZip } : {}),
    ...(f.City || body.invoiceCity ? { City: f.City ?? body.invoiceCity } : {}),
    ...(f.OrganisationNumber || body.organisationNumber
      ? { OrganisationNumber: f.OrganisationNumber ?? body.organisationNumber }
      : {}),
    ...(f.Phone1 || body.phone1 ? { Phone1: f.Phone1 ?? body.phone1 } : {}),
    ...(f.EmailInformation || body.email
      ? { EmailInformation: f.EmailInformation ?? { EmailAddressTo: body.email } }
      : {}),

    // leveransadress
    DeliveryName: normDelivery.name,
    ...(normDelivery.address1 ? { DeliveryAddress1: normDelivery.address1 } : {}),
    ...(normDelivery.address2 ? { DeliveryAddress2: normDelivery.address2 } : {}),
    ...(normDelivery.zip ? { DeliveryZipCode: normDelivery.zip } : {}),
    ...(normDelivery.city ? { DeliveryCity: normDelivery.city } : {}),
    ...(normDelivery.way ? { WayOfDelivery: normDelivery.way } : {}),

    // visa din "Ordertitel" i remarks om du vill få med den i dokumentet
    ...(remarks ? { Remarks: remarks } : {}),

    ...(paymentTerms ? { TermsOfPayment: paymentTerms } : {}),
    ...(currency ? { Currency: currency } : {}),
    ...(effectiveCurrencyRate !== undefined ? { CurrencyRate: effectiveCurrencyRate } : {}),
    ...(effectiveCurrencyUnit !== undefined ? { CurrencyUnit: effectiveCurrencyUnit } : {}),
    ...(freightValue !== undefined ? { Freight: freightValue } : {}),
    ...(administrationFeeValue !== undefined ? { AdministrationFee: administrationFeeValue } : {}),

    // rader
    OrderRows: rows,
  };

  // ---------------------------
  // 4) Skapa order i Fortnox först
  // ---------------------------
  let fortnoxDoc: string;
  try {
    const { documentNumber } = await createFortnoxOrder(fortnoxPayload, tenantId);
    fortnoxDoc = documentNumber;
  } catch (err: any) {
    const msg = err?.message ?? "Okänt Fortnox-fel";
    return NextResponse.json({ ok: false, fortnoxError: msg }, { status: 400 });
  }

  // ---------------------------
  // 5) Spara lokalt
  // ---------------------------
  const orderNumber = fortnoxDoc;

  const eventTitleBase = title || `Order ${orderNumber}`;
  const eventTitle = customerName ? `${eventTitleBase} - ${customerName}` : eventTitleBase;

  const locationParts: string[] = [];
  if (body.deliveryName) {
    locationParts.push(String(body.deliveryName));
  }
  const primaryAddress = body.deliveryStreet ?? deliveryAddress ?? body.deliveryAddress;
  if (primaryAddress) {
    locationParts.push(String(primaryAddress));
  }
  const secondaryAddress = body.deliveryAddress2 ?? deliveryAddress2;
  if (secondaryAddress) {
    locationParts.push(String(secondaryAddress));
  }
  const zipCity = [body.deliveryZip ?? deliveryZip, body.deliveryCity ?? deliveryCity]
    .filter(Boolean)
    .join(" ");
  if (zipCity) {
    locationParts.push(zipCity);
  }
  const eventLocation = Array.from(new Set(locationParts.map((p) => p.trim()).filter(Boolean))).join(", ");

  const calendarEventsData = selectedTracks
    .map((track) => {
      const slot = scheduleByTrack[track];
      if (!slot) return null;
      return {
        track,
        start: slot.start,
        end: slot.end,
        title: eventTitle,
        notes: eventLocation || null,
      };
    })
    .filter((entry): entry is { track: Track; start: Date; end: Date; title: string; notes: string | null } => !!entry);


  const trackColorMap: Record<Track, string> = {
    [Track.A]: colorA,
    [Track.B]: colorB,
    [Track.C]: colorC,
    [Track.D]: colorD,
    [Track.SHARED]: colorA,
  };

  const trackCreateData = selectedTracks.map((track) => ({
    track,
    colorHex: trackColorMap[track] ?? colorA,
    plannedStartAt: scheduleByTrack[track]?.start ?? null,
    plannedEndAt: scheduleByTrack[track]?.end ?? null,
  }));

  const order = await prisma.order.create({
    data: {
      orderNumber,
      title,
      customerName,
      dueDate: toDateOrNull(dueDate),
      deliveryMethod,
      deliveryAddress: eventLocation || deliveryAddress, // samla adress i klartext
      createdById,
      createdByName: createdByName ?? null,
      tracks: {
        create: trackCreateData,
      },
      ...(calendarEventsData.length ? { events: { create: calendarEventsData } } : {}),
    },
  });

  const scheduleResponse = PLANNING_TRACKS.reduce<Record<string, { start: string; end: string } | null>>(
    (acc, track) => {
      const slot = scheduleByTrack[track];
      acc[track] = slot ? { start: slot.start.toISOString(), end: slot.end.toISOString() } : null;
      return acc;
    },
    {}
  );

  // Länktabell (valfritt)
  try {
    await prisma.fortnoxOrderLink.create({
      data: { orderId: order.orderNumber, documentNumber: fortnoxDoc },
    });
  } catch {
    // svälj tyst – tabellen kan saknas i vissa miljöer
  }

  // ---------------------------
  // 6) Hämta & ladda upp PDF direkt (robust helper) – svälj fel
  // ---------------------------
  let fileKey: string | undefined;
  let fileId: string | undefined;
  try {
    const uploaded = await uploadFortnoxOrderConfirmation(fortnoxDoc, tenantId);
    // helper kan returnera { key } eller { key, fileId } beroende på version
    fileKey = (uploaded as any)?.key;
    fileId = (uploaded as any)?.fileId;
  } catch (e) {
    console.warn("Fortnox PDF sync misslyckades:", e);
  }

  return NextResponse.json(
    {
      ok: true,
      order,
      fortnox: { documentNumber: fortnoxDoc },
      file: fileKey ? { key: fileKey, id: fileId ?? null } : null,
      schedule: scheduleResponse,
    },
    { status: 200 }
  );
}
