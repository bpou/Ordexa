"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { FortnoxArticle } from "@/lib/fortnox";
import Accordion from "@/components/ui/Accordion";

type ArticleDetailClientProps = {
  articleNumber: string;
  initialArticle: FortnoxArticle;
};

type FormState = {
  description: string;
  ean: string;
  manufacturer: string;
  manufacturerArticleNumber: string;
  notes: string;
  salesPrice: string;
  priceListA: string;
  calculationCost: string;
  unit: string;
  articleType: string;
  active: boolean;
  stockGoods: boolean;
  packageArticle: boolean;
  externalWebshop: boolean;
  endOfLife: boolean;
};

const ARTICLE_TYPE_OPTIONS = [
  { value: "STOCK", label: "Vara" },
  { value: "SERVICE", label: "Tjanst" },
] as const;

function formatCurrency(value?: number | null) {
  if (value === null || value === undefined) {
    return "0,00";
  }
  return new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercentage(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "0,00 %";
  }
  return `${new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} %`;
}

function toFormState(article: FortnoxArticle): FormState {
  return {
    description: article.description ?? "",
    ean: article.ean ?? "",
    manufacturer: article.manufacturer ?? "",
    manufacturerArticleNumber: article.manufacturerArticleNumber ?? "",
    notes: article.notes ?? "",
    salesPrice:
      article.salesPrice !== undefined && article.salesPrice !== null
        ? String(article.salesPrice)
        : "",
    priceListA:
      article.priceListA !== undefined && article.priceListA !== null
        ? String(article.priceListA)
        : "",
    calculationCost:
      article.calculationCost !== undefined && article.calculationCost !== null
        ? String(article.calculationCost)
        : "",
    unit: article.unit ?? "",
    articleType: (article.articleType ?? "STOCK").toUpperCase(),
    active: article.active ?? true,
    stockGoods: article.stockGoods ?? false,
    packageArticle: article.packageArticle ?? false,
    externalWebshop: article.externalWebshop ?? false,
    endOfLife: article.endOfLife ?? false,
  };
}

type BusinessTransaction = {
  typ: string;
  lopnummer: string;
  kund: string;
  beskrivning: string;
  dokumentdatum: string;
  forfallodatum?: string;
  leveransdatum?: string;
  antal: number;
  belopp: number;
};

export default function ArticleDetailClient({
  articleNumber,
  initialArticle,
}: ArticleDetailClientProps) {
  const router = useRouter();
  const [article, setArticle] = useState<FortnoxArticle>(initialArticle);
  const [formValues, setFormValues] = useState<FormState>(() =>
    toFormState(initialArticle)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [businessTransactions, setBusinessTransactions] = useState<BusinessTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);


  const hasChanges = useMemo(() => {
    const current = toFormState(article);
    return (
      formValues.description !== current.description ||
      formValues.ean !== current.ean ||
      formValues.manufacturer !== current.manufacturer ||
      formValues.manufacturerArticleNumber !== current.manufacturerArticleNumber ||
      formValues.notes !== current.notes ||
      formValues.salesPrice !== current.salesPrice ||
      formValues.priceListA !== current.priceListA ||
      formValues.calculationCost !== current.calculationCost ||
      formValues.unit !== current.unit ||
      formValues.articleType !== current.articleType ||
      formValues.active !== current.active ||
      formValues.stockGoods !== current.stockGoods ||
      formValues.packageArticle !== current.packageArticle ||
      formValues.externalWebshop !== current.externalWebshop ||
      formValues.endOfLife !== current.endOfLife
    );
  }, [article, formValues]);

  const salesPriceNumber = useMemo(() => {
    const value = Number(formValues.salesPrice.replace(",", "."));
    return Number.isNaN(value) ? null : value;
  }, [formValues.salesPrice]);

  const calculationCostNumber = useMemo(() => {
    const value = Number(formValues.calculationCost.replace(",", "."));
    return Number.isNaN(value) ? null : value;
  }, [formValues.calculationCost]);

  const margin =
    salesPriceNumber && calculationCostNumber
      ? salesPriceNumber - calculationCostNumber
      : null;
  const marginPercent =
    salesPriceNumber && calculationCostNumber && salesPriceNumber !== 0
      ? ((salesPriceNumber - calculationCostNumber) / salesPriceNumber) * 100
      : null;

  const loadBusinessTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    try {
      // Fetch orders, invoices, and deliveries related to this article
      const [ordersRes, invoicesRes] = await Promise.all([
        fetch(`/api/orders?articleNumber=${encodeURIComponent(articleNumber)}`),
        fetch(`/api/fortnox/invoices?articleNumber=${encodeURIComponent(articleNumber)}`),
      ]);

      const orders = ordersRes.ok ? await ordersRes.json() : [];
      const invoices = invoicesRes.ok ? await invoicesRes.json() : [];

      // Transform and combine transactions
      const transactions: BusinessTransaction[] = [];

      // Process orders
      orders.forEach((order: any) => {
        const articleRow = order.rows?.find((row: any) => row.articleNumber === articleNumber);
        if (articleRow) {
          transactions.push({
            typ: "Order",
            lopnummer: order.documentNumber || order.id,
            kund: order.customerName || "",
            beskrivning: `Order ${order.documentNumber || order.id}`,
            dokumentdatum: order.orderDate || order.createdAt,
            leveransdatum: order.deliveryDate,
            antal: Number(articleRow.orderedQuantity || 0),
            belopp: Number(articleRow.total || 0),
          });
        }
      });

      // Process invoices
      invoices.forEach((invoice: any) => {
        const articleRow = invoice.rows?.find((row: any) => row.articleNumber === articleNumber);
        if (articleRow) {
          transactions.push({
            typ: invoice.credit ? "Kreditfaktura" : "Faktura",
            lopnummer: invoice.documentNumber,
            kund: invoice.customerName || "",
            beskrivning: `${invoice.credit ? "Kredit" : ""}faktura ${invoice.documentNumber}`,
            dokumentdatum: invoice.invoiceDate,
            forfallodatum: invoice.dueDate,
            antal: Number(articleRow.deliveredQuantity || 0),
            belopp: Number(articleRow.total || 0),
          });
        }
      });

      // Sort by document date descending
      transactions.sort((a, b) => new Date(b.dokumentdatum).getTime() - new Date(a.dokumentdatum).getTime());

      setBusinessTransactions(transactions);
    } catch (err) {
      console.error("Failed to load business transactions:", err);
      setBusinessTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  }, [articleNumber]);



  const handleReset = () => {
    setFormValues(toFormState(article));
    setMessage(null);
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasChanges) {
      setMessage("Inga andringar att spara.");
      setError(null);
      return;
    }

    const payload: Record<string, unknown> = {};
    const current = toFormState(article);

    const maybeTrim = (value: string | boolean) => typeof value === 'string' ? value.trim() : value;
    const maybeString = (
      key: keyof FormState,
      field: string,
      allowEmpty = false
    ) => {
      const trimmed = maybeTrim(formValues[key]);
      if (allowEmpty) {
        if (trimmed !== current[key]) {
          payload[field] = trimmed;
        }
      } else if (trimmed !== current[key]) {
        payload[field] = trimmed === "" ? null : trimmed;
      }
    };

    maybeString("description", "description", true);
    maybeString("ean", "ean");
    maybeString("manufacturer", "manufacturer");
    maybeString("manufacturerArticleNumber", "manufacturerArticleNumber");
    maybeString("notes", "notes");
    maybeString("unit", "unit", true);

    if (formValues.articleType !== current.articleType) {
      payload.articleType = formValues.articleType;
    }

    const toNumberPayload = (
      value: string,
      currentValue: string,
      key: "salesPrice" | "priceListA" | "calculationCost",
      errorMessage: string
    ) => {
      if (value === currentValue) return false;
      const trimmed = value.trim();
      if (!trimmed) {
        payload[key] = null;
        return false;
      }
      const numeric = Number(trimmed.replace(",", "."));
      if (Number.isNaN(numeric)) {
        setError(errorMessage);
        setMessage(null);
        return true;
      }
      payload[key] = numeric;
      return false;
    };

    if (
      toNumberPayload(
        formValues.salesPrice,
        current.salesPrice,
        "salesPrice",
        "Forsaljningspris maste vara ett numeriskt varde."
      )
    ) {
      return;
    }
    if (
      toNumberPayload(
        formValues.priceListA,
        current.priceListA,
        "priceListA",
        "Prislista A maste vara ett numeriskt varde."
      )
    ) {
      return;
    }
    if (
      toNumberPayload(
        formValues.calculationCost,
        current.calculationCost,
        "calculationCost",
        "Kalkylkostnad maste vara ett numeriskt varde."
      )
    ) {
      return;
    }

    const booleanFields: Array<keyof FormState> = [
      "active",
      "stockGoods",
      "packageArticle",
      "externalWebshop",
      "endOfLife",
    ];

    for (const key of booleanFields) {
      if (formValues[key] !== current[key]) {
        payload[key] = formValues[key];
      }
    }

    if (Object.keys(payload).length === 0) {
      setMessage("Inga andringar att spara.");
      setError(null);
      return;
    }

    setIsSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(
        `/api/fortnox/articles/${encodeURIComponent(articleNumber)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error ?? "Kunde inte spara artikeln.");
      }
      const data = (await res.json()) as { article?: FortnoxArticle };
      if (data.article) {
        setArticle(data.article);
        setFormValues(toFormState(data.article));
      }
      setMessage("Artikeln har sparats.");
    } catch (err: any) {
      setError(err?.message ?? "Ett ovantat fel uppstod vid sparande.");
    } finally {
      setIsSaving(false);
    }
  };

  const [activeNavTab, setActiveNavTab] = useState<string>("Grunduppgifter");
  const tabLabels = ["Grunduppgifter", "Lageruppgifter", "Strukturartikel", "Affärshändelser"];

  const titleSuffix = (formValues.description || article.description || "").trim();



  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-xl border border-[#d9ddd4] bg-white px-6 py-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#2d3329]">
            Artikel {articleNumber}
            {titleSuffix ? ` - ${titleSuffix}` : ""}
          </h1>
          <p className="text-sm text-[#6b7165]">
            Hantera grunduppgifter, priser och status för artikeln.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/articles")}
            className="inline-flex items-center gap-2 rounded-full border border-[#d9ddd4] bg-white px-4 py-2 text-sm font-semibold text-[#4f5a49] transition hover:bg-[#f1f3ee]"
          >
            Visa lista
          </button>
          <button
            type="submit"
            form="article-edit-form"
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-full bg-[#f7bf25] px-4 py-2 text-sm font-semibold text-[#1f2d20] shadow transition hover:bg-[#f5b407] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f7bf25]/40 disabled:cursor-not-allowed disabled:bg-[#f7bf25]/60"
          >
            {isSaving ? "Sparar..." : "Spara artikel"}
          </button>
        </div>
      </header>

      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <form
        id="article-edit-form"
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border bg px-6 py-4">
            <nav className="flex flex-wrap items-center gap-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {tabLabels.map((label) => {
                const isActive = activeNavTab === label;
                return (
                  <button
                    key={label}
                    onClick={() => setActiveNavTab(label)}
                    className={`px-3 py-1 transition ${
                      isActive
                        ? "rounded-full bg-white px-3 py-1 text-brand-600 shadow-sm"
                        : "px-3 py-1 opacity-60"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </nav>
          </div>

          {activeNavTab === "Grunduppgifter" && (
            <div className="px-6 py-6">
              <Accordion
                items={[
                  {
                    title: "Grundläggande information",
                    content: (
                      <div className="grid gap-6 lg:grid-cols-[2fr,1.3fr]">
                        <div className="space-y-5">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">
                              Artikelnummer *
                            </label>
                            <input
                              value={articleNumber}
                              readOnly
                              className="h-11 w-full cursor-not-allowed rounded-lg border border-border bg-muted/20 px-3 text-sm font-medium text-foreground"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">
                              EAN
                            </label>
                            <input
                              type="text"
                              value={formValues.ean}
                              onChange={(event) =>
                                setFormValues((prev) => ({
                                  ...prev,
                                  ean: event.target.value,
                                }))
                              }
                              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                              placeholder="EAN-kod"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">
                              Tillverkare
                            </label>
                            <input
                              type="text"
                              value={formValues.manufacturer}
                              onChange={(event) =>
                                setFormValues((prev) => ({
                                  ...prev,
                                  manufacturer: event.target.value,
                                }))
                              }
                              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                              placeholder="Tillverkare"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">
                              Tillverkarens artikelnummer
                            </label>
                            <input
                              type="text"
                              value={formValues.manufacturerArticleNumber}
                              onChange={(event) =>
                                setFormValues((prev) => ({
                                  ...prev,
                                  manufacturerArticleNumber: event.target.value,
                                }))
                              }
                              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                              placeholder="Artikelnummer hos leverantör"
                            />
                          </div>
                        </div>

                        <div className="space-y-5">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">
                              Benämning *
                            </label>
                            <input
                              type="text"
                              value={formValues.description}
                              onChange={(event) =>
                                setFormValues((prev) => ({
                                  ...prev,
                                  description: event.target.value,
                                }))
                              }
                              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                              placeholder="Artikelbenämning"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">
                              Enhet
                            </label>
                            <input
                              type="text"
                              value={formValues.unit}
                              onChange={(event) =>
                                setFormValues((prev) => ({
                                  ...prev,
                                  unit: event.target.value,
                                }))
                              }
                              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                              placeholder="st, h, m ..."
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">
                              Typ av artikel
                            </label>
                            <select
                              value={formValues.articleType}
                              onChange={(event) =>
                                setFormValues((prev) => ({
                                  ...prev,
                                  articleType: event.target.value,
                                }))
                              }
                              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                            >
                              {ARTICLE_TYPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ),
                  },
                  {
                    title: "Beskrivning och anteckningar",
                    content: (
                      <div className="space-y-5">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase text-muted-foreground">
                            Anteckningar
                          </label>
                          <textarea
                            value={formValues.notes}
                            onChange={(event) =>
                              setFormValues((prev) => ({
                                ...prev,
                                notes: event.target.value,
                              }))
                            }
                            rows={4}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                            placeholder="Interna anteckningar"
                          />
                        </div>
                      </div>
                    ),
                  },
                  {
                    title: "Status och inställningar",
                    content: (
                      <div className="grid gap-4 lg:grid-cols-2">
                        <BooleanSelector
                          label="Aktiv"
                          value={formValues.active}
                          onChange={(next) =>
                            setFormValues((prev) => ({ ...prev, active: next }))
                          }
                        />
                        <BooleanSelector
                          label="Lagervara"
                          value={formValues.stockGoods}
                          onChange={(next) =>
                            setFormValues((prev) => ({ ...prev, stockGoods: next }))
                          }
                        />
                        <BooleanSelector
                          label="Paketartikel"
                          value={formValues.packageArticle}
                          onChange={(next) =>
                            setFormValues((prev) => ({ ...prev, packageArticle: next }))
                          }
                        />
                        <BooleanSelector
                          label="Extern webbshop"
                          value={formValues.externalWebshop}
                          onChange={(next) =>
                            setFormValues((prev) => ({ ...prev, externalWebshop: next }))
                          }
                        />
                        <BooleanSelector
                          label="Utgaende artikel"
                          value={formValues.endOfLife}
                          onChange={(next) =>
                            setFormValues((prev) => ({ ...prev, endOfLife: next }))
                          }
                        />
                      </div>
                    ),
                  },
                ]}
                allowMultiple={true}
              />
            </div>
          )}

          {activeNavTab === "Lageruppgifter" && (
            <div className="px-6 py-6">
              <Accordion
                items={[
                  {
                    title: "Leverantörsinformation",
                    content: (
                      <div className="space-y-3">
                        <TextInput
                          label="Leverantör"
                          value=""
                          onChange={() => {}}
                          placeholder="Välj leverantör"
                        />
                        <TextInput
                          label="Leverantörens artikelnummer"
                          value=""
                          onChange={() => {}}
                          placeholder="Artikelnummer hos leverantör"
                        />
                        <TextInput
                          label="Inköpspris"
                          value=""
                          onChange={() => {}}
                          placeholder="0,00"
                          type="number"
                        />
                      </div>
                    ),
                  },
                  {
                    title: "Artikeldetaljer",
                    content: (
                      <div className="space-y-3">
                        <TextInput
                          label="Vikt (kg)"
                          value=""
                          onChange={() => {}}
                          placeholder="0,00"
                          type="number"
                        />
                        <TextInput
                          label="Volym (m³)"
                          value=""
                          onChange={() => {}}
                          placeholder="0,00"
                          type="number"
                        />
                        <TextInput
                          label="Lagerplats"
                          value=""
                          onChange={() => {}}
                          placeholder="A-01-01"
                        />
                      </div>
                    ),
                  },
                  {
                    title: "Intrastat",
                    content: (
                      <div className="grid gap-4 lg:grid-cols-3">
                        <TextInput
                          label="Tullkod"
                          value=""
                          onChange={() => {}}
                          placeholder="8-siffrig kod"
                        />
                        <TextInput
                          label="Ursprungsland"
                          value=""
                          onChange={() => {}}
                          placeholder="SE"
                        />
                        <TextInput
                          label="Statistiskt värde"
                          value=""
                          onChange={() => {}}
                          placeholder="0,00"
                          type="number"
                        />
                      </div>
                    ),
                  },
                ]}
                allowMultiple={true}
              />
            </div>
          )}

          {activeNavTab === "Strukturartikel" && (
            <div className="px-6 py-6">
              <Accordion
                items={[
                  {
                    title: "Strukturtyp",
                    content: (
                      <select className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                        <option>Välj strukturtyp</option>
                        <option>Paketartikel</option>
                        <option>Sammansatt artikel</option>
                        <option>Alternativ artikel</option>
                      </select>
                    ),
                  },
                  {
                    title: "Strukturkomponenter",
                    content: (
                      <div className="space-y-3">
                        <button className="inline-flex items-center gap-2 rounded-lg bg-[#8ebe3f] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#7cab38]">
                          + Lägg till komponent
                        </button>
                        <div className="rounded-lg border border-border bg-muted/20 p-4 text-center text-sm text-muted-foreground">
                          Inga komponenter tillagda ännu
                        </div>
                      </div>
                    ),
                  },
                ]}
                allowMultiple={true}
              />
            </div>
          )}

          {activeNavTab === "Affärshändelser" && (
            <div className="px-6 py-6">
              <Accordion
                items={[
                  {
                    title: "Filter och sökning",
                    content: (
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-foreground">Från datum:</label>
                          <input
                            type="date"
                            className="h-9 rounded-lg border border-border bg-background px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-foreground">Till datum:</label>
                          <input
                            type="date"
                            className="h-9 rounded-lg border border-border bg-background px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                          />
                        </div>
                        <select className="h-9 rounded-lg border border-border bg-background px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                          <option>Alla händelser</option>
                          <option>Försäljning</option>
                          <option>Inköp</option>
                          <option>Lagerjustering</option>
                        </select>
                        <button className="inline-flex items-center gap-2 rounded-lg bg-[#8ebe3f] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#7cab38]">
                          Filtrera
                        </button>
                      </div>
                    ),
                  },
                  {
                    title: "Sammanfattning",
                    content: (
                      <div className="grid gap-6 lg:grid-cols-3">
                        <div className="rounded-lg border border-border bg-muted/20 p-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-[#2f4d1f]">0</div>
                            <div className="text-sm text-muted-foreground">Total försäljning</div>
                          </div>
                        </div>
                        <div className="rounded-lg border border-border bg-muted/20 p-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-[#2f4d1f]">0</div>
                            <div className="text-sm text-muted-foreground">Total inköp</div>
                          </div>
                        </div>
                        <div className="rounded-lg border border-border bg-muted/20 p-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-[#2f4d1f]">0</div>
                            <div className="text-sm text-muted-foreground">Lagersaldo</div>
                          </div>
                        </div>
                      </div>
                    ),
                  },
                  {
                    title: "Affärshändelser",
                    content: (
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="min-w-full divide-y divide-border text-sm">
                          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                            <tr>
                              <th className="px-4 py-3 text-left">Typ</th>
                              <th className="px-4 py-3 text-left">Löpnummer</th>
                              <th className="px-4 py-3 text-left">Kund</th>
                              <th className="px-4 py-3 text-left">Beskrivning</th>
                              <th className="px-4 py-3 text-left">Dokumentdatum</th>
                              <th className="px-4 py-3 text-left">Förfallodatum</th>
                              <th className="px-4 py-3 text-left">Leveransdatum</th>
                              <th className="px-4 py-3 text-right">Antal</th>
                              <th className="px-4 py-3 text-right">Belopp</th>
                            </tr>
                          </thead>
                          <tbody>
                            {transactionsLoading ? (
                              <tr>
                                <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                                  Laddar affärshändelser...
                                </td>
                              </tr>
                            ) : businessTransactions.length > 0 ? (
                              <>
                                {businessTransactions.map((transaction, index) => (
                                  <tr key={index} className="divide-x divide-border hover:bg-muted/20">
                                    <td className="px-4 py-3">{transaction.typ}</td>
                                    <td className="px-4 py-3">{transaction.lopnummer}</td>
                                    <td className="px-4 py-3">{transaction.kund}</td>
                                    <td className="px-4 py-3">{transaction.beskrivning}</td>
                                    <td className="px-4 py-3">
                                      {new Date(transaction.dokumentdatum).toLocaleDateString("sv-SE")}
                                    </td>
                                    <td className="px-4 py-3">
                                      {transaction.forfallodatum
                                        ? new Date(transaction.forfallodatum).toLocaleDateString("sv-SE")
                                        : "-"
                                      }
                                    </td>
                                    <td className="px-4 py-3">
                                      {transaction.leveransdatum
                                        ? new Date(transaction.leveransdatum).toLocaleDateString("sv-SE")
                                        : "-"
                                      }
                                    </td>
                                    <td className="px-4 py-3 text-right">{transaction.antal}</td>
                                    <td className="px-4 py-3 text-right">
                                      {formatCurrency(transaction.belopp)}
                                    </td>
                                  </tr>
                                ))}
                                <tr className="divide-x divide-border bg-muted/40 font-semibold">
                                  <td colSpan={7} className="px-4 py-3 text-right">Summa:</td>
                                  <td className="px-4 py-3 text-right">
                                    {businessTransactions.reduce((sum, t) => sum + t.antal, 0)}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    {formatCurrency(businessTransactions.reduce((sum, t) => sum + t.belopp, 0))}
                                  </td>
                                </tr>
                              </>
                            ) : (
                              <tr>
                                <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                                  Inga affärshändelser hittades för de valda filtren
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    ),
                  },
                ]}
                allowMultiple={true}
              />
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <header className="flex items-center justify-between border-b border-border bg-muted/40 px-6 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Priser
            </h2>
            <span className="text-xs text-muted-foreground">
              Uppdatera prislistor och kalkyler
            </span>
          </header>

          <div className="grid gap-6 p-6 lg:grid-cols-[1.3fr,1fr]">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextInput
                  label="Försaljningspris"
                  value={formValues.salesPrice}
                  onChange={(value) =>
                    setFormValues((prev) => ({ ...prev, salesPrice: value }))
                  }
                  placeholder="0,00"
                  type="number"
                  min="0"
                  step="0.01"
                />
                <TextInput
                  label="Utpris prislista A"
                  value={formValues.priceListA}
                  onChange={(value) =>
                    setFormValues((prev) => ({ ...prev, priceListA: value }))
                  }
                  placeholder="0,00"
                  type="number"
                  min="0"
                  step="0.01"
                />
                <TextInput
                  label="Kalkylkostnad"
                  value={formValues.calculationCost}
                  onChange={(value) =>
                    setFormValues((prev) => ({
                      ...prev,
                      calculationCost: value,
                    }))
                  }
                  placeholder="0,00"
                  type="number"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">Prislista</th>
                      <th className="px-4 py-3 text-left">Benämning</th>
                      <th className="px-4 py-3 text-right">Pris</th>
                      <th className="px-4 py-3 text-right">TG %</th>
                      <th className="px-4 py-3 text-right">TB SEK</th>
                      <th className="px-4 py-3 text-right">Ändringsdatum</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="divide-x divide-border">
                      <td className="px-4 py-3 font-medium text-foreground">
                        A
                      </td>
                      <td className="px-4 py-3 text-foreground/80">
                        Prislista A
                      </td>
                      <td className="px-4 py-3 text-right text-foreground/90">
                        {formatCurrency(
                          Number(formValues.priceListA.replace(",", ".")) ||
                            salesPriceNumber ||
                            article.priceListA ||
                            article.salesPrice
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-foreground/80">
                        {formatPercentage(marginPercent)}
                      </td>
                      <td className="px-4 py-3 text-right text-foreground/80">
                        {formatCurrency(margin)}
                      </td>
                      <td className="px-4 py-3 text-right text-foreground/60">
                        -
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground/80">
                Sammanfattning
              </h3>
              <ul className="space-y-2">
                <li className="flex items-center justify-between">
                  <span>Prislista A</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(
                      Number(formValues.priceListA.replace(",", ".")) ||
                        article.priceListA ||
                        article.salesPrice
                    )}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Kalkylkostnad</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(
                      Number(formValues.calculationCost.replace(",", ".")) ||
                        article.calculationCost
                    )}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Beräknat TB</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(margin)}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Beräknad TG</span>
                  <span className="font-medium text-foreground">
                    {formatPercentage(marginPercent)}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card px-6 py-5 shadow-sm">
          <header className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Bokföringsuppgifter
            </h2>
            <span className="text-xs text-muted-foreground">
              Hanteras separat i Fortnox
            </span>
          </header>
          <p className="text-sm text-muted-foreground">
            Bokföringsdetaljer för artikeln administreras i Fortnox och visas
            inte i Ordina ännu.
          </p>
        </section>

        <footer className="flex flex-col gap-3 rounded-xl border border-border bg-card px-6 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            disabled
            className="inline-flex items-center rounded-full bg-red-500 px-5 py-2 text-sm font-semibold text-white shadow transition enabled:hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-300"
          >
            Radera
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              disabled={!hasChanges}
              className="inline-flex items-center rounded-full border border-border px-5 py-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={isSaving || !hasChanges}
              className="inline-flex items-center rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow transition enabled:hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:bg-brand-400"
            >
              {isSaving ? "Sparar..." : "Spara"}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

type BooleanSelectorProps = {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

function BooleanSelector({ label, value, onChange }: BooleanSelectorProps) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{label}</h3>
          <p className="text-xs text-muted-foreground">
            {value ? "Ja" : "Nej"}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background p-1">
          <button
            type="button"
            onClick={() => onChange(true)}
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
              value
                ? "bg-brand-600 text-white shadow-sm"
                : "text-muted-foreground hover:bg-muted/60"
            }`}
          >
            Ja
          </button>
          <button
            type="button"
            onClick={() => onChange(false)}
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
              !value
                ? "bg-brand-600 text-white shadow-sm"
                : "text-muted-foreground hover:bg-muted/60"
            }`}
          >
            Nej
          </button>
        </div>
      </div>
    </div>
  );
}

type TextInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  min?: string | number;
  step?: string | number;
};

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  step,
}: TextInputProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        min={min}
        step={step}
        placeholder={placeholder}
        className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
      />
    </div>
  );
}
