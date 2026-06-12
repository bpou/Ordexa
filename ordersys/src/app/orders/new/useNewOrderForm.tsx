"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DateSelectArg, EventContentArg, EventInput } from "@fullcalendar/core";
import { STATUS_COLOR_PARTS } from "@/lib/orderStatus";
import { popEntryTransfer, stashEntryTransfer } from "@/lib/draftTransfer";

export type Customer = {
  customerNumber: string;
  name: string;
  organisationNumber?: string;
  city?: string;
  email?: string;
  phone1?: string;
  invoiceName?: string;
  invoiceAddress1?: string;
  invoiceAddress2?: string;
  invoiceZip?: string;
  invoiceCity?: string;
  deliveryName?: string;
  deliveryStreet?: string;
  deliveryAddress?: string;
  deliveryZip?: string;
  deliveryCity?: string;
  priceList?: string;
};

export type Article = {
  articleNumber: string;
  description: string;
  salesPrice?: number;
  unit?: string;
};

export type Account = {
  accountNumber: string;
  description?: string;
};

export type Row = {
  articleNumber?: string;
  description?: string;
  OrderedQuantity: number;
  price: number;
  unit?: string;
  ReservedQuantity?: number;
  DeliveredQuantity?: number;
  Discount?: number;
  VatPercent?: number;
  AccountNumber?: string;
  ContributionPercent?: number;
};

export type Option = {
  code: string;
  description?: string;
};

export type AppTrack = "A" | "B" | "C" | "D";

const PLANNER_TRACK_ORDER: AppTrack[] = ["A", "B", "C", "D"];

type ManualSlot = {
  start?: string;
  end?: string;
};

const DEFAULT_VAT_PERCENT = 25;

const DISTRIBUTION_METHOD_MAP: Record<string, string> = {
  "Utskrift": "PRINT",
  "E-post": "EMAIL",
  EDI: "EDI",
};

const VAT_SCHEMES = ["SEVAT", "SEREVERSEDVAT", "EUREVERSEDVAT", "EUVAT", "EXPORT"] as const;

function normalizeVatScheme(input?: string): (typeof VAT_SCHEMES)[number] {
  const raw = String(input ?? "").trim();
  if (!raw) return "SEVAT";
  if ((VAT_SCHEMES as readonly string[]).includes(raw)) {
    return raw as (typeof VAT_SCHEMES)[number];
  }
  if (raw === "Standard") return "SEVAT";
  if (raw === "Omvand skattskyldighet") return "SEREVERSEDVAT";
  if (raw === "Export") return "EXPORT";
  return "SEVAT";
}

function findNextAvailableDocumentNumber(existing: Set<number>): string {
  let candidate = 1;
  while (existing.has(candidate)) {
    candidate += 1;
  }
  return String(candidate);
}

function parseLocaleNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (!value) return 0;
  const normalized = value
    .toString()
    .trim()
    .replace(/\u00A0/g, "")
    .replace(/\s+/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createEmptyRow(): Row {
  return {
    articleNumber: "",
    description: "",
    OrderedQuantity: 1,
    price: 0,
    unit: "st",
    ReservedQuantity: 0,
    DeliveredQuantity: 0,
    Discount: 0,
    VatPercent: DEFAULT_VAT_PERCENT,
    AccountNumber: "",
    ContributionPercent: 0,
  };
}

type OrderTransferData = Partial<{
  title: string;
  customerName: string;
  customerNumber: string;
  customerQuery: string;
  orderDate: string;
  offerDate: string;
  deliveryDate: string;
  validUntil: string;
  ourReference: string;
  yourReference: string;
  priceList: string;
  wayOfDelivery: string;
  pricesInclVAT: boolean;
  invoiceName: string;
  invoiceAddress1: string;
  invoiceAddress2: string;
  invoiceZip: string;
  invoiceCity: string;
  organisationNumber: string;
  phone1: string;
  email: string;
  deliveryName: string;
  deliveryStreet: string;
  deliveryAddress: string;
  deliveryZip: string;
  deliveryCity: string;
  rows: Row[];
  tracks: AppTrack[];
  autoSchedule: boolean;
  estimateA: number;
  estimateB: number;
  estimateC: number;
  estimateD: number;
  manualA: ManualSlot;
  manualB: ManualSlot;
  manualC: ManualSlot;
  manualD: ManualSlot;
  paymentTerms: string;
  currency: string;
  exchangeRate: string;
  unitValue: string;
  vatScheme: string;
  orderText: string;
  freightFee: string;
  invoiceFee: string;
  invoiceDiscount: string;
  distributionMethod: string;
}>;

function normalizeRowFromTransfer(raw: any): Row {
  const base = createEmptyRow();
  const qty = Number(raw?.OrderedQuantity ?? raw?.orderedQuantity ?? raw?.quantity ?? 1);
  const price = Number(raw?.price ?? raw?.Price ?? 0);
  const reserved = Number(raw?.ReservedQuantity ?? raw?.reservedQuantity ?? 0);
  const delivered = Number(raw?.DeliveredQuantity ?? raw?.deliveredQuantity ?? 0);
  const discount = Number(raw?.Discount ?? raw?.discount ?? 0);
  const vat =
    Number(
      raw?.VatPercent ??
        raw?.VATPercent ??
        raw?.Vat ??
        raw?.VAT ??
        raw?.vat ??
        DEFAULT_VAT_PERCENT,
    );
  const contribution = Number(raw?.ContributionPercent ?? raw?.contributionPercent ?? 0);

  return {
    ...base,
    articleNumber:
      typeof raw?.articleNumber === "string"
        ? raw.articleNumber
        : typeof raw?.ArticleNumber === "string"
          ? raw.ArticleNumber
          : undefined,
    description:
      typeof raw?.description === "string"
        ? raw.description
          : typeof raw?.Description === "string"
            ? raw.Description
            : undefined,
    OrderedQuantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
    price: Number.isFinite(price) ? price : 0,
    unit:
      typeof raw?.unit === "string"
        ? raw.unit
        : typeof raw?.Unit === "string"
          ? raw.Unit
          : undefined,
    ReservedQuantity: Number.isFinite(reserved) ? reserved : base.ReservedQuantity,
    DeliveredQuantity: Number.isFinite(delivered) ? delivered : base.DeliveredQuantity,
    Discount: Number.isFinite(discount) ? discount : base.Discount,
    VatPercent: Number.isFinite(vat) ? vat : base.VatPercent,
    AccountNumber:
      typeof raw?.AccountNumber === "string"
        ? raw.AccountNumber
        : typeof raw?.accountNumber === "string"
          ? raw.accountNumber
          : base.AccountNumber,
    ContributionPercent: Number.isFinite(contribution) ? contribution : base.ContributionPercent,
  };
}

export type UseNewOrderFormOptions = {
  defaultOurReference?: string;
  submitUrl?: string;
  convertToQuotePath?: string;
  convertToOrderPath?: string;
};

export function useNewOrderForm({
  defaultOurReference = "",
  submitUrl = "/api/orders",
  convertToQuotePath = "/quotes/new?convertedFrom=order",
  convertToOrderPath = "/orders/new?convertedFrom=quote",
}: UseNewOrderFormOptions) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [titleWarning, setTitleWarning] = useState<string | null>(null);
  const [existingDocumentNumbers, setExistingDocumentNumbers] = useState<Set<number>>(
    () => new Set()
  );
  const [customerName, setCustomerName] = useState("");

  const [orderDate, setOrderDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [deliveryDate, setDeliveryDate] = useState<string>("");

  const [ourReference, setOurReference] = useState(() => defaultOurReference ?? "");
  const [yourReference, setYourReference] = useState("");

  const [priceList, setPriceList] = useState<string>("");
  const [priceListOptions, setPriceListOptions] = useState<Option[]>([]);

  const [wayOfDelivery, setWayOfDelivery] = useState<string>("");
  const [wayOfDeliveryOptions, setWayOfDeliveryOptions] = useState<Option[]>([]);

  const [pricesInclVAT, setPricesInclVAT] = useState(false);
  const [paymentTerms, setPaymentTerms] = useState("30");
  const [currency, setCurrency] = useState("SEK");
  const [exchangeRate, setExchangeRate] = useState("1.0000");
  const [unitValue, setUnitValue] = useState("1");
  const [vatScheme, setVatScheme] = useState("SEVAT");
  const [orderText, setOrderText] = useState("");
  const [freightFee, setFreightFee] = useState("0,00");
  const [invoiceFee, setInvoiceFee] = useState("0,00");
  const [invoiceDiscount, setInvoiceDiscount] = useState("0");
  const [distributionMethod, setDistributionMethod] = useState("Utskrift");

  const [invoiceName, setInvoiceName] = useState("");
  const [invoiceAddress1, setInvoiceAddress1] = useState("");
  const [invoiceAddress2, setInvoiceAddress2] = useState("");
  const [invoiceZip, setInvoiceZip] = useState("");
  const [invoiceCity, setInvoiceCity] = useState("");
  const [organisationNumber, setOrganisationNumber] = useState("");
  const [phone1, setPhone1] = useState("");
  const [email, setEmail] = useState("");

  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryName, setDeliveryName] = useState("");
  const [deliveryStreet, setDeliveryStreet] = useState("");
  const [deliveryZip, setDeliveryZip] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");

  const [tracks, setTracks] = useState<AppTrack[]>(["A", "B"]);
  const [autoSchedule, setAutoSchedule] = useState(true);

  const [estimateA, setEstimateA] = useState<number>(60);
  const [estimateB, setEstimateB] = useState<number>(60);
  const [estimateC, setEstimateC] = useState<number>(60);
  const [estimateD, setEstimateD] = useState<number>(60);

  const [manualA, setManualA] = useState<ManualSlot>({});
  const [manualB, setManualB] = useState<ManualSlot>({});
  const [manualC, setManualC] = useState<ManualSlot>({});
  const [manualD, setManualD] = useState<ManualSlot>({});

  const [activeTrack, setActiveTrack] = useState<AppTrack>("A");
  const [plannerEvents, setPlannerEvents] = useState<EventInput[]>([]);
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [plannerError, setPlannerError] = useState<string | null>(null);

  const plannerTracks = useMemo(
    () => PLANNER_TRACK_ORDER.filter((track) => tracks.includes(track)),
    [tracks]
  );

  const manualSlots = useMemo(
    () => ({
      A: manualA,
      B: manualB,
      C: manualC,
      D: manualD,
    }),
    [manualA, manualB, manualC, manualD]
  );

  useEffect(() => {
    if (!plannerTracks.length) return;
    if (!plannerTracks.includes(activeTrack)) {
      setActiveTrack(plannerTracks[0]);
    }
  }, [plannerTracks, activeTrack]);

  useEffect(() => {
    if (!plannerTracks.length) {
      setPlannerEvents([]);
      return;
    }
    if (!plannerTracks.includes(activeTrack)) return;

    let cancelled = false;
    setPlannerLoading(true);
    setPlannerError(null);

    fetch(`/api/calendar?track=${activeTrack}`)
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || "Kunde inte hÃ¤mta kalendern");
        }
        const data = await res.json();
        if (!cancelled) {
          const items = Array.isArray(data?.events) ? (data.events as EventInput[]) : [];
          setPlannerEvents(items);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setPlannerError(err?.message ?? "Kunde inte hÃ¤mta kalendern");
          setPlannerEvents([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPlannerLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeTrack, plannerTracks]);

  const updateManualSlot = useCallback(
    (track: AppTrack, slot: { start?: string; end?: string } | null) => {
      const value = slot ?? {};
      switch (track) {
        case "A":
          setManualA(value);
          break;
        case "B":
          setManualB(value);
          break;
        case "C":
          setManualC(value);
          break;
        case "D":
          setManualD(value);
          break;
      }
    },
    []
  );

  const formatSlotRange = useCallback((slot?: { start?: string; end?: string }) => {
    if (!slot?.start || !slot?.end) return null;
    const startDate = new Date(slot.start);
    const endDate = new Date(slot.end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;
    const dateFormatter = new Intl.DateTimeFormat("sv-SE", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const timeFormatter = new Intl.DateTimeFormat("sv-SE", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const sameDay = startDate.toDateString() === endDate.toDateString();
    if (sameDay) {
      return `${dateFormatter.format(startDate)} ${timeFormatter.format(startDate)} - ${timeFormatter.format(endDate)}`;
    }
    return `${dateFormatter.format(startDate)} ${timeFormatter.format(startDate)} - ${dateFormatter.format(
      endDate
    )} ${timeFormatter.format(endDate)}`;
  }, []);

  const handleCalendarSelect = useCallback(
    (arg: DateSelectArg) => {
      if (!arg.start || !arg.end) return;
      updateManualSlot(activeTrack, { start: arg.start.toISOString(), end: arg.end.toISOString() });
      setAutoSchedule(false);
      arg.view.calendar.unselect();
    },
    [activeTrack, updateManualSlot]
  );

  const renderPlannerEvent = useCallback(
    (arg: EventContentArg) => {
      const highlight = arg.event.extendedProps?.highlight;
      const status = arg.event.extendedProps?.status as keyof typeof STATUS_COLOR_PARTS | undefined;
      const palette = status ? STATUS_COLOR_PARTS[status] : undefined;
      const backgroundColor = highlight ? "rgba(16, 185, 129, 0.18)" : palette?.bgHex ?? "#E5E7EB";
      const textColor = highlight ? "#0f766e" : palette?.textHex ?? "#1F2937";
      const borderColor = palette?.borderHex ?? "#CBD5F5";
      const borderStyle = highlight ? "1px dashed #059669" : `1px solid ${borderColor}`;
      const location = arg.event.extendedProps?.location as string | undefined;
      const range = formatSlotRange({
        start: arg.event.start?.toISOString(),
        end: arg.event.end?.toISOString(),
      });

      return (
        <div
          className="flex h-full flex-col justify-center rounded-md px-2 py-1 text-xs font-medium shadow-sm"
          style={{ backgroundColor, color: textColor, border: borderStyle }}
        >
          <span className="font-semibold">{highlight ? "Vald tid" : arg.event.title || "Planerat uppdrag"}</span>
          {highlight && range ? <span className="text-[11px] opacity-80">{range}</span> : null}
          {!highlight && location ? <span className="text-[10px] opacity-80">{location}</span> : null}
        </div>
      );
    },
    [formatSlotRange]
  );

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerNumber, setCustomerNumber] = useState<string>("");
  const selectedCustomer = useMemo(
    () => customers.find((c) => c.customerNumber === customerNumber),
    [customers, customerNumber]
  );

  const [articles, setArticles] = useState<Article[]>([]);
  const [articleQuery, setArticleQuery] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountQuery, setAccountQuery] = useState("");

  const [rows, setRows] = useState<Row[]>([createEmptyRow()]);

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const documentType = submitUrl.includes("/offers") ? "offers" : "orders";

  useEffect(() => {
    const transfer = popEntryTransfer("order");
    if (!transfer || transfer.from !== "quote") return;

    const data = transfer.data as OrderTransferData | undefined;
    if (!data) return;

    if (typeof data.title === "string") setTitle(data.title);
    if (typeof data.customerName === "string") setCustomerName(data.customerName);
    if (typeof data.customerNumber === "string") setCustomerNumber(data.customerNumber);

    if (typeof data.customerQuery === "string") {
      setCustomerQuery(data.customerQuery);
    } else if (typeof data.customerName === "string") {
      setCustomerQuery(data.customerName);
    }

    const possibleOrderDate =
      typeof data.orderDate === "string"
        ? data.orderDate
        : typeof data.offerDate === "string"
          ? data.offerDate
          : undefined;
    if (possibleOrderDate) setOrderDate(possibleOrderDate);

    if (typeof data.deliveryDate === "string") setDeliveryDate(data.deliveryDate);
    if (typeof data.validUntil === "string") setDeliveryDate(data.validUntil);

    if (typeof data.ourReference === "string") setOurReference(data.ourReference);
    if (typeof data.yourReference === "string") setYourReference(data.yourReference);

    if (typeof data.priceList === "string") setPriceList(data.priceList);
    if (typeof data.wayOfDelivery === "string") setWayOfDelivery(data.wayOfDelivery);
    if (typeof data.pricesInclVAT === "boolean") setPricesInclVAT(data.pricesInclVAT);
    if (typeof data.paymentTerms === "string") setPaymentTerms(data.paymentTerms);
    if (typeof data.currency === "string") setCurrency(data.currency);
    if (typeof data.exchangeRate === "string") setExchangeRate(data.exchangeRate);
    if (typeof data.unitValue === "string") setUnitValue(data.unitValue);
    if (typeof data.vatScheme === "string") setVatScheme(normalizeVatScheme(data.vatScheme));
    if (typeof data.orderText === "string") setOrderText(data.orderText);
    if (typeof data.freightFee === "string") setFreightFee(data.freightFee);
    if (typeof data.invoiceFee === "string") setInvoiceFee(data.invoiceFee);
    if (typeof data.invoiceDiscount === "string") setInvoiceDiscount(data.invoiceDiscount);
    if (typeof data.distributionMethod === "string") setDistributionMethod(data.distributionMethod);

    if (typeof data.invoiceName === "string") setInvoiceName(data.invoiceName);
    if (typeof data.invoiceAddress1 === "string") setInvoiceAddress1(data.invoiceAddress1);
    if (typeof data.invoiceAddress2 === "string") setInvoiceAddress2(data.invoiceAddress2);
    if (typeof data.invoiceZip === "string") setInvoiceZip(data.invoiceZip);
    if (typeof data.invoiceCity === "string") setInvoiceCity(data.invoiceCity);
    if (typeof data.organisationNumber === "string") setOrganisationNumber(data.organisationNumber);
    if (typeof data.phone1 === "string") setPhone1(data.phone1);
    if (typeof data.email === "string") setEmail(data.email);

    if (typeof data.deliveryName === "string") setDeliveryName(data.deliveryName);
    if (typeof data.deliveryStreet === "string") setDeliveryStreet(data.deliveryStreet);
    if (typeof data.deliveryAddress === "string") setDeliveryAddress(data.deliveryAddress);
    if (typeof data.deliveryZip === "string") setDeliveryZip(data.deliveryZip);
    if (typeof data.deliveryCity === "string") setDeliveryCity(data.deliveryCity);

    if (Array.isArray(data.rows) && data.rows.length) {
      setRows(data.rows.map((row) => normalizeRowFromTransfer(row)));
    }

    const maybeTracks = Array.isArray(data.tracks) ? data.tracks : undefined;
    if (maybeTracks?.length) {
      const sanitized = Array.from(
        new Set(
          maybeTracks
            .map((track) => String(track).toUpperCase())
            .filter((track): track is AppTrack => track === "A" || track === "B" || track === "C" || track === "D")
        )
      ) as AppTrack[];
      if (sanitized.length) setTracks(sanitized);
    }

    if ("autoSchedule" in data) setAutoSchedule(Boolean(data.autoSchedule));
    if (typeof data.estimateA === "number") setEstimateA(data.estimateA);
    if (typeof data.estimateB === "number") setEstimateB(data.estimateB);
    if (typeof data.estimateC === "number") setEstimateC(data.estimateC);
    if (typeof data.estimateD === "number") setEstimateD(data.estimateD);

    const asManual = (slot: unknown): ManualSlot | null => {
      if (!slot || typeof slot !== "object") return null;
      const cast = slot as { start?: unknown; end?: unknown };
      const start = typeof cast.start === "string" ? cast.start : undefined;
      const end = typeof cast.end === "string" ? cast.end : undefined;
      if (!start && !end) return null;
      return { start, end };
    };

    const manualAData = asManual(data.manualA);
    const manualBData = asManual(data.manualB);
    const manualCData = asManual(data.manualC);
    const manualDData = asManual(data.manualD);

    if (manualAData) setManualA(manualAData);
    if (manualBData) setManualB(manualBData);
    if (manualCData) setManualC(manualCData);
    if (manualDData) setManualD(manualDData);

    setMsg(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadDocumentNumbers = async () => {
      try {
        const res = await fetch(`/api/fortnox/orders?docType=${documentType}&limit=100`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok || cancelled) return;

        const raw = Array.isArray((json as any)?.numbers) ? (json as any).numbers : [];
        const parsed = new Set<number>();
        for (const value of raw) {
          const n = typeof value === "number" ? value : Number(String(value ?? "").trim());
          if (Number.isInteger(n) && n > 0) parsed.add(n);
        }
        if (cancelled) return;
        setExistingDocumentNumbers(parsed);
        setTitle((prev) => (prev.trim() ? prev : findNextAvailableDocumentNumber(parsed)));
      } catch {
        // Keep manual input if lookup fails.
      }
    };

    void loadDocumentNumbers();
    return () => {
      cancelled = true;
    };
  }, [documentType]);

  useEffect(() => {
    const raw = title.trim();
    if (!raw || !/^\d+$/.test(raw)) {
      setTitleWarning(null);
      return;
    }
    const parsed = Number(raw);
    const isDuplicate = Number.isInteger(parsed) && existingDocumentNumbers.has(parsed);
    if (!isDuplicate) {
      setTitleWarning(null);
      return;
    }
    setTitleWarning(
      `${documentType === "offers" ? "Offertnummer" : "Ordernummer"} finns redan: ${raw}`
    );
  }, [documentType, existingDocumentNumbers, title]);

  useEffect(() => {
    fetch("/api/fortnox/customers")
      .then((r) => r.json())
      .then((j) => setCustomers(j.customers ?? []))
      .catch(() => {});
    fetch("/api/fortnox/articles")
      .then((r) => r.json())
      .then((j) => setArticles(j.articles ?? []))
      .catch(() => {});

    fetch("/api/fortnox/wayofdeliveries")
      .then((r) => r.json())
      .then((j) => setWayOfDeliveryOptions(j.wayOfDeliveries ?? j.items ?? []))
      .catch(() => {});
    fetch("/api/fortnox/pricelists")
      .then((r) => r.json())
      .then((j) => setPriceListOptions(j.priceLists ?? j.items ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedCustomer) return;

    setCustomerName(selectedCustomer.name ?? "");
    setInvoiceName(selectedCustomer.invoiceName ?? selectedCustomer.name ?? "");
    setInvoiceAddress1(selectedCustomer.invoiceAddress1 ?? "");
    setInvoiceAddress2(selectedCustomer.invoiceAddress2 ?? "");
    setInvoiceZip(selectedCustomer.invoiceZip ?? "");
    setInvoiceCity(selectedCustomer.invoiceCity ?? selectedCustomer.city ?? "");
    setOrganisationNumber(selectedCustomer.organisationNumber ?? "");
    setPhone1(selectedCustomer.phone1 ?? "");
    setEmail(selectedCustomer.email ?? "");
    setDeliveryName(selectedCustomer.deliveryName ?? selectedCustomer.name ?? "");
    setDeliveryStreet(selectedCustomer.deliveryStreet ?? "");
    setDeliveryAddress(selectedCustomer.deliveryAddress ?? "");
    setDeliveryZip(selectedCustomer.deliveryZip ?? "");
    setDeliveryCity(selectedCustomer.deliveryCity ?? selectedCustomer.city ?? "");
    if (selectedCustomer.priceList) {
      setPriceList(selectedCustomer.priceList);
    }
  }, [selectedCustomer]);

  useEffect(() => {
    if (!wayOfDelivery && wayOfDeliveryOptions.length) {
      setWayOfDelivery(wayOfDeliveryOptions[0].code);
    }
  }, [wayOfDeliveryOptions, wayOfDelivery]);

  useEffect(() => {
    if (!priceList && priceListOptions.length) {
      setPriceList(priceListOptions[0].code);
    }
  }, [priceListOptions, priceList]);

  const searchCustomers = useCallback(
    async (overrideQuery?: string) => {
      const source = typeof overrideQuery === "string" ? overrideQuery : customerQuery;
      if (typeof overrideQuery === "string") {
        setCustomerQuery(overrideQuery);
      }
      const query = source.trim();
      const url = query ? `/api/fortnox/customers?q=${encodeURIComponent(query)}` : "/api/fortnox/customers";
      try {
        const res = await fetch(url);
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          setCustomers([]);
          return;
        }
        const items = Array.isArray((json as any)?.customers) ? (json as any).customers : [];
        setCustomers(items);
      } catch {
        setCustomers([]);
      }
    },
    [customerQuery, setCustomerQuery],
  );

  const searchArticles = useCallback(
    async (queryOverride?: string) => {
      const source = typeof queryOverride === "string" ? queryOverride : articleQuery;
      const query = source.trim();
      const url = query
        ? `/api/fortnox/articles?articleNumber=${encodeURIComponent(query)}`
        : "/api/fortnox/articles";
      const res = await fetch(url);
      const j = await res.json();
      setArticles(j.articles ?? []);
    },
    [articleQuery],
  );

  const searchAccounts = useCallback(
    async (queryOverride?: string) => {
      const source = typeof queryOverride === "string" ? queryOverride : accountQuery;
      const query = source.trim();
      const params = new URLSearchParams();
      if (query) params.set("query", query);
      const qs = params.toString();
      const url = qs ? `/api/fortnox/accounts?${qs}` : "/api/fortnox/accounts";
      try {
        const res = await fetch(url);
        if (!res.ok) {
          setAccounts([]);
          return;
        }
        const j = await res.json();
        setAccounts(j.accounts ?? []);
      } catch {
        setAccounts([]);
      }
    },
    [accountQuery],
  );

  useEffect(() => {
    if (!accounts.length) {
      void searchAccounts();
    }
  }, [accounts.length, searchAccounts]);

  const addRow = useCallback(() => setRows((r) => [...r, createEmptyRow()]), []);

  const addRows = useCallback((count: number) => {
    const safeCount = Number.isFinite(count) ? Math.max(1, Math.min(50, Math.floor(count))) : 1;
    setRows((prev) => {
      const extras = Array.from({ length: safeCount }, () => createEmptyRow());
      return [...prev, ...extras];
    });
  }, []);

  const removeRow = useCallback((i: number) => setRows((r) => r.filter((_, idx) => idx !== i)), []);

  const updateRow = useCallback(
    (i: number, patch: Partial<Row>) =>
      setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row))),
    []
  );

  const total = useMemo(() => {
    return rows.reduce((sum, row) => {
      const price = Number(row.price) || 0;
      const quantity = Number(row.OrderedQuantity) || 0;
      const rawDiscount = Number(row.Discount ?? 0) || 0;
      const discount = Math.min(Math.max(rawDiscount, 0), 100);
      const lineNet = price * quantity * (1 - discount / 100);
      return sum + (Number.isFinite(lineNet) ? lineNet : 0);
    }, 0);
  }, [rows]);

  const moveRow = useCallback((from: number, to: number) => {
    setRows((prev) => {
      const length = prev.length;
      if (from < 0 || from >= length) return prev;

      const target = Math.max(0, Math.min(to, length));
      if (target === from || target === from + 1) return prev;

      const next = [...prev];
      const [item] = next.splice(from, 1);
      if (!item) return prev;

      const insertIndex = from < target ? target - 1 : target;
      next.splice(insertIndex, 0, item);
      return next;
    });
  }, []);

  const convertToQuote = useCallback(() => {
    const data: OrderTransferData = {
      title,
      customerName,
      customerNumber,
      customerQuery,
      orderDate,
      offerDate: orderDate,
      deliveryDate,
      validUntil: deliveryDate,
      ourReference,
      yourReference,
      priceList,
      wayOfDelivery,
      pricesInclVAT,
      paymentTerms,
      currency,
      exchangeRate,
      unitValue,
      vatScheme,
      orderText,
      freightFee,
      invoiceFee,
      invoiceDiscount,
      distributionMethod,
      invoiceName,
      invoiceAddress1,
      invoiceAddress2,
      invoiceZip,
      invoiceCity,
      organisationNumber,
      phone1,
      email,
      deliveryName,
      deliveryStreet,
      deliveryAddress,
      deliveryZip,
      deliveryCity,
      rows: rows.map((row) => ({ ...row })),
      tracks: [...tracks],
      autoSchedule,
      estimateA,
      estimateB,
      estimateC,
      estimateD,
      manualA: { ...manualA },
      manualB: { ...manualB },
      manualC: { ...manualC },
      manualD: { ...manualD },
    };

    stashEntryTransfer({ from: "order", to: "quote", data });
    router.push(convertToQuotePath);
  }, [
    autoSchedule,
    customerName,
    customerNumber,
    customerQuery,
    deliveryAddress,
    deliveryCity,
    deliveryDate,
    deliveryName,
    deliveryStreet,
    deliveryZip,
    email,
    estimateA,
    estimateB,
    estimateC,
    estimateD,
    invoiceAddress1,
    invoiceAddress2,
    invoiceCity,
    invoiceName,
    invoiceZip,
    paymentTerms,
    currency,
    exchangeRate,
    unitValue,
    vatScheme,
    orderText,
    freightFee,
    invoiceFee,
    invoiceDiscount,
    distributionMethod,
    manualA,
    manualB,
    manualC,
    manualD,
    organisationNumber,
    orderDate,
    ourReference,
    phone1,
    priceList,
    pricesInclVAT,
    router,
    rows,
    title,
    tracks,
    wayOfDelivery,
    yourReference,
    convertToQuotePath,
  ]);

  const convertToOrder = useCallback(() => {
    const data: OrderTransferData = {
      title,
      customerName,
      customerNumber,
      customerQuery,
      orderDate,
      offerDate: orderDate,
      deliveryDate,
      validUntil: deliveryDate,
      ourReference,
      yourReference,
      priceList,
      wayOfDelivery,
      pricesInclVAT,
      paymentTerms,
      currency,
      exchangeRate,
      unitValue,
      vatScheme,
      orderText,
      freightFee,
      invoiceFee,
      invoiceDiscount,
      distributionMethod,
      invoiceName,
      invoiceAddress1,
      invoiceAddress2,
      invoiceZip,
      invoiceCity,
      organisationNumber,
      phone1,
      email,
      deliveryName,
      deliveryStreet,
      deliveryAddress,
      deliveryZip,
      deliveryCity,
      rows: rows.map((row) => ({ ...row })),
      tracks: [...tracks],
      autoSchedule,
      estimateA,
      estimateB,
      estimateC,
      estimateD,
      manualA: { ...manualA },
      manualB: { ...manualB },
      manualC: { ...manualC },
      manualD: { ...manualD },
    };

    stashEntryTransfer({ from: "quote", to: "order", data });
    router.push(convertToOrderPath);
  }, [
    autoSchedule,
    customerName,
    customerNumber,
    customerQuery,
    deliveryAddress,
    deliveryCity,
    deliveryDate,
    deliveryName,
    deliveryStreet,
    deliveryZip,
    email,
    estimateA,
    estimateB,
    estimateC,
    estimateD,
    invoiceAddress1,
    invoiceAddress2,
    invoiceCity,
    invoiceName,
    invoiceZip,
    paymentTerms,
    currency,
    exchangeRate,
    unitValue,
    vatScheme,
    orderText,
    freightFee,
    invoiceFee,
    invoiceDiscount,
    distributionMethod,
    manualA,
    manualB,
    manualC,
    manualD,
    organisationNumber,
    orderDate,
    ourReference,
    phone1,
    priceList,
    pricesInclVAT,
    router,
    rows,
    title,
    tracks,
    wayOfDelivery,
    yourReference,
    convertToOrderPath,
  ]);

  const submit = useCallback(async () => {
    setMsg(null);

    if (!title.trim()) {
      setMsg("Titel krÃ¤vs.");
      return;
    }
    const maybeDocumentNumber = title.trim();
    if (/^\d+$/.test(maybeDocumentNumber) && existingDocumentNumbers.has(Number(maybeDocumentNumber))) {
      setTitleWarning(
        `${documentType === "offers" ? "Offertnummer" : "Ordernummer"} finns redan: ${maybeDocumentNumber}`
      );
      setMsg("Välj ett ledigt nummer.");
      return;
    }
    if (!customerNumber) {
      setMsg("VÃ¤lj kund (Fortnox).");
      return;
    }

    const isOffer = submitUrl.includes("offers");

    if (!isOffer) {
      if (!tracks.length) {
        setMsg("VÃ¤lj minst ett spÃ¥r (A/B/C/D).");
        return;
      }

      if (!autoSchedule) {
        if (tracks.includes("A") && !(manualA.start && manualA.end)) {
          setMsg("Ange manuell start/slut fÃ¶r SpÃ¥r A eller slÃ¥ pÃ¥ automatisk planering.");
          return;
        }
        if (tracks.includes("B") && !(manualB.start && manualB.end)) {
          setMsg("Ange manuell start/slut fÃ¶r SpÃ¥r B eller slÃ¥ pÃ¥ automatisk planering.");
          return;
        }
        if (tracks.includes("C") && !(manualC.start && manualC.end)) {
          setMsg("Ange manuell start/slut fÃ¶r SpÃ¥r C eller slÃ¥ pÃ¥ automatisk planering.");
          return;
        }
        if (tracks.includes("D") && !(manualD.start && manualD.end)) {
          setMsg("Ange manuell start/slut fÃ¶r SpÃ¥r D eller slÃ¥ pÃ¥ automatisk planering.");
          return;
        }
      }
    }

    const orderRows = rows.map((r) => {
      const orderedQuantity = Number(r.OrderedQuantity ?? 1) || 0;
      const reservedQuantity = Number(r.ReservedQuantity ?? 0) || 0;
      const deliveredQuantity = Number(r.DeliveredQuantity ?? 0) || 0;
      const price = Number(r.price ?? 0) || 0;
      const discount = Number(r.Discount ?? 0) || 0;
      const vat = Number(r.VatPercent ?? DEFAULT_VAT_PERCENT);
      const contribution = Number(r.ContributionPercent ?? 0) || 0;
      return {
        articleNumber: r.articleNumber || undefined,
        description: r.description || title,
        OrderedQuantity: orderedQuantity > 0 ? orderedQuantity : 1,
        price,
        unit: r.unit || "st",
        ReservedQuantity: reservedQuantity,
        DeliveredQuantity: deliveredQuantity,
        Discount: discount,
        VatPercent: Number.isFinite(vat) ? vat : DEFAULT_VAT_PERCENT,
        AccountNumber: r.AccountNumber ? String(r.AccountNumber) : undefined,
        ContributionPercent: contribution,
      };
    });

    const freightFeeValue = parseLocaleNumber(freightFee);
    const invoiceFeeValue = parseLocaleNumber(invoiceFee);
    const invoiceDiscountValue = Math.min(Math.max(parseLocaleNumber(invoiceDiscount), 0), 100);
    const exchangeRateValue = parseLocaleNumber(exchangeRate) || 1;
    const unitValueValue = parseLocaleNumber(unitValue) || 1;
    const distributionCode = DISTRIBUTION_METHOD_MAP[distributionMethod] ?? DISTRIBUTION_METHOD_MAP["Utskrift"];

    const body: any = {
      title,
      customerName,
      customerNumber,
      orderRows,
      deliveryAddress,
      deliveryName,
      deliveryStreet,
      deliveryZip,
      deliveryCity,
      deliveryMethod: wayOfDelivery,
      priceList,
      paymentTerms,
      currency,
      exchangeRate: exchangeRateValue,
      unitValue: unitValueValue,
      vatScheme,
      orderText,
      freightFee: freightFeeValue,
      invoiceFee: invoiceFeeValue,
      invoiceDiscount: invoiceDiscountValue,
      distributionMethod,
    };

    if (!isOffer) {
      body.tracks = tracks;
      body.autoSchedule = autoSchedule;
      if (autoSchedule) {
        body.estimateA = tracks.includes("A") ? estimateA : undefined;
        body.estimateB = tracks.includes("B") ? estimateB : undefined;
        body.estimateC = tracks.includes("C") ? estimateC : undefined;
        body.estimateD = tracks.includes("D") ? estimateD : undefined;
      } else {
        body.manualA = tracks.includes("A") ? manualA : undefined;
        body.manualB = tracks.includes("B") ? manualB : undefined;
        body.manualC = tracks.includes("C") ? manualC : undefined;
        body.manualD = tracks.includes("D") ? manualD : undefined;
      }
    }

    const fortnoxRows = rows.map((r) => {
      const orderedQuantity = Number(r.OrderedQuantity ?? 1) || 0;
      const reservedQuantity = Number(r.ReservedQuantity ?? 0) || 0;
      const deliveredQuantity = Number(r.DeliveredQuantity ?? 0) || 0;
      const price = Number(r.price ?? 0) || 0;
      const discount = Number(r.Discount ?? 0) || 0;
      const vat = Number(r.VatPercent ?? DEFAULT_VAT_PERCENT);
      const contribution = Number(r.ContributionPercent ?? 0) || 0;
      return {
        ArticleNumber: r.articleNumber || undefined,
        Description: r.description || title,
        OrderedQuantity: orderedQuantity > 0 ? orderedQuantity : 1,
        ReservedQuantity: reservedQuantity,
        DeliveredQuantity: deliveredQuantity,
        Unit: r.unit || "st",
        Price: price,
        Discount: discount,
        VAT: Number.isFinite(vat) ? vat : DEFAULT_VAT_PERCENT,
        VATPercent: Number.isFinite(vat) ? vat : DEFAULT_VAT_PERCENT,
        AccountNumber: r.AccountNumber ? String(r.AccountNumber) : undefined,
        ContributionPercent: contribution,
      };
    });

    const manualDocumentNumber = /^\d+$/.test(title.trim()) ? title.trim() : undefined;

    if (isOffer) {
      body.fortnox = {
        ...(manualDocumentNumber ? { DocumentNumber: manualDocumentNumber } : {}),
        OfferDate: orderDate,
        ValidUntil: deliveryDate || undefined,
        OurReference: ourReference || undefined,
        YourReference: yourReference || undefined,
        PriceList: priceList || undefined,
        VATIncluded: pricesInclVAT,
        CustomerNumber: customerNumber,
        InvoiceName: invoiceName || undefined,
        InvoiceAddress1: invoiceAddress1 || undefined,
        InvoiceAddress2: invoiceAddress2 || undefined,
        InvoiceZip: invoiceZip || undefined,
        InvoiceCity: invoiceCity || undefined,
        OrganisationNumber: organisationNumber || undefined,
        Phone1: phone1 || undefined,
        Email: email || undefined,
        DeliveryName: deliveryName || undefined,
        DeliveryStreet: deliveryStreet || undefined,
        DeliveryAddress2: deliveryAddress || undefined,
        DeliveryZip: deliveryZip || undefined,
        DeliveryCity: deliveryCity || undefined,
        OfferRows: fortnoxRows,
        Rows: fortnoxRows,
        ...(paymentTerms ? { TermsOfPayment: paymentTerms } : {}),
        ...(currency ? { Currency: currency } : {}),
        ...(exchangeRateValue ? { CurrencyRate: exchangeRateValue } : {}),
        ...(unitValueValue ? { CurrencyUnit: unitValueValue } : {}),
        ...(orderText ? { Remarks: orderText } : {}),
        ...(freightFeeValue ? { Freight: freightFeeValue } : {}),
        ...(invoiceFeeValue ? { InvoiceFee: invoiceFeeValue } : {}),
        ...(invoiceDiscountValue ? { InvoiceDiscountPercent: invoiceDiscountValue } : {}),
        ...(distributionCode
          ? {
              DocumentDeliveries: [
                {
                  DocumentDeliveryType: distributionCode,
                },
              ],
            }
          : {}),
      };
    } else {
      body.fortnox = {
        ...(manualDocumentNumber ? { DocumentNumber: manualDocumentNumber } : {}),
        OrderDate: orderDate,
        DeliveryDate: deliveryDate || undefined,
        OurReference: ourReference || undefined,
        YourReference: yourReference || undefined,
        PriceList: priceList || undefined,
        DeliveryWayCode: wayOfDelivery || undefined,
        VATIncluded: pricesInclVAT,
        CustomerNumber: customerNumber,
        InvoiceName: invoiceName || undefined,
        InvoiceAddress1: invoiceAddress1 || undefined,
        InvoiceAddress2: invoiceAddress2 || undefined,
        InvoiceZip: invoiceZip || undefined,
        InvoiceCity: invoiceCity || undefined,
        OrganisationNumber: organisationNumber || undefined,
        Phone1: phone1 || undefined,
        Email: email || undefined,
        DeliveryName: deliveryName || undefined,
        DeliveryStreet: deliveryStreet || undefined,
        DeliveryAddress2: deliveryAddress || undefined,
        DeliveryZip: deliveryZip || undefined,
        DeliveryCity: deliveryCity || undefined,
        OrderRows: fortnoxRows,
        Rows: fortnoxRows,
        ...(paymentTerms ? { TermsOfPayment: paymentTerms } : {}),
        ...(currency ? { Currency: currency } : {}),
        ...(exchangeRateValue ? { CurrencyRate: exchangeRateValue } : {}),
        ...(unitValueValue ? { CurrencyUnit: unitValueValue } : {}),
        ...(orderText ? { OrderText: orderText } : {}),
        ...(freightFeeValue ? { Freight: freightFeeValue } : {}),
        ...(invoiceFeeValue ? { InvoiceFee: invoiceFeeValue } : {}),
        ...(invoiceDiscountValue ? { InvoiceDiscountPercent: invoiceDiscountValue } : {}),
        ...(distributionCode
          ? {
              DocumentDeliveries: [
                {
                  DocumentDeliveryType: distributionCode,
                },
              ],
            }
          : {}),
      };
    }

    setSubmitting(true);
    try {
      const res = await fetch(submitUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || (isOffer ? "Kunde inte skapa offert" : "Kunde inte skapa order"));
      }

      const json = await res.json();

      const docNoRaw =
        json?.fortnox?.documentNumber ??
        json?.order?.orderNumber ??
        json?.documentNumber ??
        json?.fortnoxDocumentNumber ??
        json?.orderNumber ??
        json?.docno ??
        json?.id;
      const docNo = String(docNoRaw ?? "").trim();

      if (!docNo) {
        throw new Error(isOffer ? "Offert skapad men saknar dokumentnummer." : "Order skapad men saknar ordernummer.");
      }

      if (!isOffer) {
        fetch(`/api/orders/${encodeURIComponent(docNo)}/fortnox-sync`, { method: "POST" }).catch(() => {});
      }

      router.push(isOffer ? `/quotes/${docNo}` : `/orders/${docNo}`);
    } catch (error: any) {
      setMsg(error?.message || (isOffer ? "Kunde inte skapa offert" : "Kunde inte skapa order"));
    } finally {
      setSubmitting(false);
    }
  }, [
    autoSchedule,
    customerName,
    customerNumber,
    deliveryAddress,
    deliveryCity,
    deliveryDate,
    deliveryName,
    deliveryStreet,
    deliveryZip,
    documentType,
    email,
    estimateA,
    estimateB,
    estimateC,
    estimateD,
    invoiceAddress1,
    invoiceAddress2,
    invoiceCity,
    invoiceName,
    invoiceZip,
    paymentTerms,
    currency,
    exchangeRate,
    existingDocumentNumbers,
    unitValue,
    vatScheme,
    orderText,
    freightFee,
    invoiceFee,
    invoiceDiscount,
    distributionMethod,
    manualA,
    manualB,
    manualC,
    manualD,
    organisationNumber,
    orderDate,
    ourReference,
    phone1,
    priceList,
    pricesInclVAT,
    router,
    rows,
    submitUrl,
    title,
    tracks,
    wayOfDelivery,
    yourReference,
  ]);

  return {
    title,
    setTitle,
    titleWarning,
    customerName,
    setCustomerName,
    orderDate,
    setOrderDate,
    deliveryDate,
    setDeliveryDate,
    ourReference,
    setOurReference,
    yourReference,
    setYourReference,
    priceList,
    setPriceList,
    priceListOptions,
    wayOfDelivery,
    setWayOfDelivery,
    wayOfDeliveryOptions,
    pricesInclVAT,
    setPricesInclVAT,
    paymentTerms,
    setPaymentTerms,
    currency,
    setCurrency,
    exchangeRate,
    setExchangeRate,
    unitValue,
    setUnitValue,
    vatScheme,
    setVatScheme,
    orderText,
    setOrderText,
    freightFee,
    setFreightFee,
    invoiceFee,
    setInvoiceFee,
    invoiceDiscount,
    setInvoiceDiscount,
    distributionMethod,
    setDistributionMethod,
    invoiceName,
    setInvoiceName,
    invoiceAddress1,
    setInvoiceAddress1,
    invoiceAddress2,
    setInvoiceAddress2,
    invoiceZip,
    setInvoiceZip,
    invoiceCity,
    setInvoiceCity,
    organisationNumber,
    setOrganisationNumber,
    phone1,
    setPhone1,
    email,
    setEmail,
    deliveryName,
    setDeliveryName,
    deliveryStreet,
    setDeliveryStreet,
    deliveryAddress,
    setDeliveryAddress,
    deliveryZip,
    setDeliveryZip,
    deliveryCity,
    setDeliveryCity,
    tracks,
    setTracks,
    autoSchedule,
    setAutoSchedule,
    estimateA,
    setEstimateA,
    estimateB,
    setEstimateB,
    estimateC,
    setEstimateC,
    estimateD,
    setEstimateD,
    manualA,
    setManualA,
    manualB,
    setManualB,
    manualC,
    setManualC,
    manualD,
    setManualD,
    activeTrack,
    setActiveTrack,
    plannerEvents,
    plannerLoading,
    plannerError,
    plannerTracks,
    manualSlots,
    updateManualSlot,
    handleCalendarSelect,
    renderPlannerEvent,
    customers,
    customerQuery,
    setCustomerQuery,
    customerNumber,
    setCustomerNumber,
    selectedCustomer,
    searchCustomers,
    articles,
    articleQuery,
    setArticleQuery,
    searchArticles,
    accounts,
    accountQuery,
    setAccountQuery,
    searchAccounts,
    moveRow,
    rows,
    addRow,
    addRows,
    removeRow,
    updateRow,
    total,
    submitting,
    msg,
    setMsg,
    convertToQuote,
    convertToOrder,
    submit,
  };
}





