"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  Banknote,
  CheckCircle2,
  Clipboard,
  Clock3,
  ExternalLink,
  FileText,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";

import { OrdinaLogoSpinner } from "@/components/OrdinaLoader";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SupplierInvoiceStatus = "overdue" | "open" | "paid" | "cancelled" | "draft";

type SupplierInvoice = {
  supplierInvoiceNumber: string;
  givenNumber?: string;
  supplierNumber?: string;
  supplierName: string;
  invoiceDate?: string;
  dueDate?: string;
  finalPayDate?: string;
  total?: number;
  balance?: number;
  currency?: string;
  ocr?: string;
  paymentReference?: string;
  booked?: boolean;
  cancelled?: boolean;
  status: SupplierInvoiceStatus;
  rawStatus?: string;
};

type StatusFilter = "all" | SupplierInvoiceStatus;
type SortKey = "dueDate" | "supplierName" | "balance" | "total";

const statusMeta: Record<
  SupplierInvoiceStatus,
  { label: string; tone: string; icon: typeof Clock3 }
> = {
  overdue: {
    label: "Försenad",
    tone: "border-red-200 bg-red-50 text-red-700",
    icon: AlertTriangle,
  },
  open: {
    label: "Att betala",
    tone: "border-amber-200 bg-amber-50 text-amber-800",
    icon: Clock3,
  },
  draft: {
    label: "Ej bokförd",
    tone: "border-sky-200 bg-sky-50 text-sky-800",
    icon: FileText,
  },
  paid: {
    label: "Betald",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Makulerad",
    tone: "border-neutral-200 bg-neutral-100 text-neutral-600",
    icon: ShieldCheck,
  },
};

const statusTabs: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "Alla" },
  { key: "overdue", label: "Försenade" },
  { key: "open", label: "Att betala" },
  { key: "draft", label: "Ej bokförda" },
  { key: "paid", label: "Betalda" },
];

const money = new Intl.NumberFormat("sv-SE", {
  style: "currency",
  currency: "SEK",
  maximumFractionDigits: 0,
});

const dateFmt = new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium" });

function toDate(value: string | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value: string | undefined) {
  const date = toDate(value);
  return date ? dateFmt.format(date) : "-";
}

function formatMoney(value: number | undefined, currency = "SEK") {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  if (currency === "SEK") return money.format(value);
  return `${new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(value)} ${currency}`;
}

function daysUntil(value: string | undefined) {
  const date = toDate(value);
  if (!date) return "Saknar förfallodatum";
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diff = Math.round((target - start) / 86400000);
  if (diff < 0) return `${Math.abs(diff)} dagar sen`;
  if (diff === 0) return "Förfaller idag";
  if (diff === 1) return "Förfaller imorgon";
  return `${diff} dagar kvar`;
}

function searchable(invoice: SupplierInvoice) {
  return [
    invoice.supplierInvoiceNumber,
    invoice.givenNumber,
    invoice.supplierNumber,
    invoice.supplierName,
    invoice.ocr,
    invoice.paymentReference,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function SupplierInvoicesClient() {
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("dueDate");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function load({ silent = false }: { silent?: boolean } = {}) {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    setWarning(null);

    try {
      const response = await fetch("/api/fortnox/supplier-invoices?limit=200", {
        cache: "no-store",
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.error ?? "Kunde inte ladda leverantörsfakturor.");
      }

      const rows = Array.isArray(json?.supplierInvoices)
        ? (json.supplierInvoices as SupplierInvoice[])
        : [];
      setInvoices(rows);
      setSelectedId((current) => current ?? rows[0]?.supplierInvoiceNumber ?? null);

      if (json?.warning === "missing_scope") {
        setWarning("Fortnox-kopplingen saknar behörighet för leverantörsfakturor.");
      }
    } catch (err: any) {
      setError(err?.message ?? "Kunde inte ladda leverantörsfakturor.");
      setInvoices([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const stats = useMemo(() => {
    const open = invoices.filter((item) => item.status === "open" || item.status === "overdue");
    const overdue = invoices.filter((item) => item.status === "overdue");
    const drafts = invoices.filter((item) => item.status === "draft");
    const dueSoon = open.filter((item) => {
      const date = toDate(item.dueDate);
      if (!date) return false;
      const today = new Date();
      const diff = Math.round(
        (date.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
          86400000
      );
      return diff >= 0 && diff <= 7;
    });

    return {
      openCount: open.length,
      overdueCount: overdue.length,
      draftCount: drafts.length,
      dueSoonCount: dueSoon.length,
      openBalance: open.reduce((sum, item) => sum + (item.balance ?? item.total ?? 0), 0),
      overdueBalance: overdue.reduce((sum, item) => sum + (item.balance ?? item.total ?? 0), 0),
    };
  }, [invoices]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = invoices.filter((invoice) => {
      if (status !== "all" && invoice.status !== status) return false;
      if (needle && !searchable(invoice).includes(needle)) return false;
      return true;
    });

    return rows.sort((a, b) => {
      if (sort === "supplierName") {
        return a.supplierName.localeCompare(b.supplierName, "sv");
      }
      if (sort === "balance") {
        return (b.balance ?? 0) - (a.balance ?? 0);
      }
      if (sort === "total") {
        return (b.total ?? 0) - (a.total ?? 0);
      }
      return (toDate(a.dueDate)?.getTime() ?? 9e15) - (toDate(b.dueDate)?.getTime() ?? 9e15);
    });
  }, [invoices, query, sort, status]);

  const selected =
    filtered.find((invoice) => invoice.supplierInvoiceNumber === selectedId) ??
    filtered[0] ??
    null;

  async function copyPayment(invoice: SupplierInvoice) {
    const lines = [
      `Leverantör: ${invoice.supplierName}`,
      `Faktura: ${invoice.givenNumber ?? invoice.supplierInvoiceNumber}`,
      `OCR: ${invoice.ocr ?? invoice.paymentReference ?? "-"}`,
      `Belopp: ${formatMoney(invoice.balance ?? invoice.total, invoice.currency)}`,
      `Förfallodatum: ${formatDate(invoice.dueDate)}`,
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(invoice.supplierInvoiceNumber);
    window.setTimeout(() => setCopied(null), 1600);
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6">
        <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-950 text-white shadow-[0_28px_90px_-62px_rgba(15,23,42,0.85)]">
          <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_430px]">
            <div className="p-6 sm:p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                <Banknote className="h-4 w-4" />
                Fortnox ekonomi
              </div>
              <h1 className="mt-5 text-3xl font-semibold leading-tight sm:text-4xl">
                Leverantörsfakturor
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/65">
                Se vad som behöver betalas, vad som är försenat och vilka fakturor
                som behöver följas upp innan de fastnar i flödet.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => void load({ silent: true })}
                  disabled={refreshing}
                  className="border-white/15 bg-white text-neutral-950 hover:bg-white/90"
                >
                  {refreshing ? (
                    <OrdinaLogoSpinner size={16} />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Uppdatera
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/15 bg-white/10 text-white hover:bg-white/15 hover:text-white"
                  onClick={() => setStatus("overdue")}
                >
                  <AlertTriangle className="h-4 w-4" />
                  Visa försenade
                </Button>
              </div>
            </div>

            <div className="grid gap-3 border-t border-white/10 bg-white/[0.04] p-4 sm:grid-cols-2 xl:border-l xl:border-t-0">
              <div className="rounded-xl border border-white/10 bg-white/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/55">
                  Att betala
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {loading ? "..." : formatMoney(stats.openBalance)}
                </p>
                <p className="mt-1 text-xs text-white/55">{stats.openCount} fakturor</p>
              </div>
              <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-100/75">
                  Försenat
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-red-50">
                  {loading ? "..." : formatMoney(stats.overdueBalance)}
                </p>
                <p className="mt-1 text-xs text-red-100/65">
                  {stats.overdueCount} behöver åtgärd
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/8 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/55">
                  Nära förfall
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {loading ? "..." : stats.dueSoonCount}
                </p>
                <p className="mt-1 text-xs text-white/55">inom 7 dagar</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/8 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/55">
                  Ej bokförda
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {loading ? "..." : stats.draftCount}
                </p>
                <p className="mt-1 text-xs text-white/55">kräver kontroll</p>
              </div>
            </div>
          </div>
        </section>

        {warning ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {warning}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
          <Card className="overflow-hidden rounded-2xl border-neutral-200 bg-white shadow-sm">
            <CardHeader className="border-neutral-200 px-5 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Fakturakö
                  </h2>
                  <p className="text-sm text-neutral-600">
                    {loading
                      ? "Laddar Fortnox..."
                      : `${filtered.length} av ${invoices.length} fakturor visas`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {statusTabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setStatus(tab.key)}
                      className={cn(
                        "h-9 rounded-lg border px-3 text-sm font-semibold transition",
                        status === tab.key
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_190px]">
                <label className="flex h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-600">
                  <Search className="h-4 w-4 text-neutral-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Sök leverantör, fakturanummer, OCR..."
                    className="min-w-0 flex-1 bg-transparent text-neutral-900 outline-none placeholder:text-neutral-400"
                  />
                </label>
                <label className="flex h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-600">
                  <ArrowDownUp className="h-4 w-4 text-neutral-400" />
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value as SortKey)}
                    className="min-w-0 flex-1 bg-transparent text-neutral-900 outline-none"
                  >
                    <option value="dueDate">Förfallodatum</option>
                    <option value="balance">Restbelopp</option>
                    <option value="total">Totalbelopp</option>
                    <option value="supplierName">Leverantör</option>
                  </select>
                </label>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center gap-3 px-5 py-10 text-sm text-neutral-600">
                  <OrdinaLogoSpinner size={24} />
                  Laddar leverantörsfakturor...
                </div>
              ) : null}

              {!loading && filtered.length === 0 ? (
                <div className="px-5 py-10 text-sm text-neutral-500">
                  Inga leverantörsfakturor matchar urvalet.
                </div>
              ) : null}

              {!loading && filtered.length > 0 ? (
                <div className="divide-y divide-neutral-100">
                  {filtered.map((invoice) => {
                    const meta = statusMeta[invoice.status];
                    const Icon = meta.icon;
                    const active = invoice.supplierInvoiceNumber === selected?.supplierInvoiceNumber;

                    return (
                      <button
                        key={invoice.supplierInvoiceNumber}
                        type="button"
                        onClick={() => setSelectedId(invoice.supplierInvoiceNumber)}
                        className={cn(
                          "grid w-full gap-3 px-5 py-4 text-left transition hover:bg-neutral-50 lg:grid-cols-[minmax(0,1.4fr)_120px_120px_130px]",
                          active && "bg-neutral-50"
                        )}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold", meta.tone)}>
                              <Icon className="h-3.5 w-3.5" />
                              {meta.label}
                            </span>
                            <span className="text-xs font-medium text-neutral-500">
                              #{invoice.givenNumber ?? invoice.supplierInvoiceNumber}
                            </span>
                          </div>
                          <p className="mt-2 truncate text-sm font-semibold text-neutral-900">
                            {invoice.supplierName}
                          </p>
                          <p className="mt-1 truncate text-xs text-neutral-500">
                            OCR {invoice.ocr ?? invoice.paymentReference ?? "-"} · Fortnox {invoice.supplierInvoiceNumber}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-neutral-400">Förfall</p>
                          <p className="mt-1 text-sm font-semibold text-neutral-800">
                            {formatDate(invoice.dueDate)}
                          </p>
                          <p className="text-xs text-neutral-500">{daysUntil(invoice.dueDate)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-neutral-400">Rest</p>
                          <p className="mt-1 text-sm font-semibold text-neutral-900">
                            {formatMoney(invoice.balance ?? invoice.total, invoice.currency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-neutral-400">Bokförd</p>
                          <p className="mt-1 text-sm font-semibold text-neutral-800">
                            {invoice.booked === false ? "Nej" : "Ja"}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <aside className="space-y-4">
            <Card className="rounded-2xl border-neutral-200 bg-white shadow-sm">
              <CardHeader className="border-neutral-200 px-5 py-4">
                <h2 className="text-lg font-semibold text-neutral-900">
                  Hantera faktura
                </h2>
                <p className="text-sm text-neutral-600">
                  Betalningsunderlag och snabbkontroller.
                </p>
              </CardHeader>
              <CardContent className="space-y-4 px-5 pb-5 pt-4">
                {selected ? (
                  <>
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-neutral-900">
                          {selected.supplierName}
                        </p>
                        <span className={cn("rounded-full border px-2 py-0.5 text-xs font-semibold", statusMeta[selected.status].tone)}>
                          {statusMeta[selected.status].label}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-neutral-500">
                        Faktura {selected.givenNumber ?? selected.supplierInvoiceNumber}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                        <p className="text-xs uppercase tracking-wide text-neutral-500">Rest</p>
                        <p className="mt-1 text-lg font-semibold text-neutral-950">
                          {formatMoney(selected.balance ?? selected.total, selected.currency)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                        <p className="text-xs uppercase tracking-wide text-neutral-500">Förfall</p>
                        <p className="mt-1 text-sm font-semibold text-neutral-950">
                          {formatDate(selected.dueDate)}
                        </p>
                        <p className="text-xs text-neutral-500">{daysUntil(selected.dueDate)}</p>
                      </div>
                    </div>

                    <dl className="space-y-2 rounded-xl border border-neutral-200 p-3 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="text-neutral-500">Leverantörsnr</dt>
                        <dd className="font-medium text-neutral-900">
                          {selected.supplierNumber ?? "-"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-neutral-500">Fakturadatum</dt>
                        <dd className="font-medium text-neutral-900">
                          {formatDate(selected.invoiceDate)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-neutral-500">OCR</dt>
                        <dd className="font-medium text-neutral-900">
                          {selected.ocr ?? selected.paymentReference ?? "-"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-neutral-500">Betald</dt>
                        <dd className="font-medium text-neutral-900">
                          {formatDate(selected.finalPayDate)}
                        </dd>
                      </div>
                    </dl>

                    <div className="grid gap-2">
                      <Button
                        type="button"
                        className="justify-start"
                        onClick={() => void copyPayment(selected)}
                      >
                        <Clipboard className="h-4 w-4" />
                        {copied === selected.supplierInvoiceNumber
                          ? "Kopierat"
                          : "Kopiera betalningsunderlag"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="justify-start"
                        onClick={() => window.open("https://www.fortnox.se/", "_blank", "noopener,noreferrer")}
                      >
                        <ExternalLink className="h-4 w-4" />
                        Öppna Fortnox
                      </Button>
                    </div>

                    <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-3 text-xs leading-5 text-neutral-600">
                      Bokföring, makulering och betalregistrering görs fortfarande i
                      Fortnox. Här visas kön och betalningsunderlaget så att
                      ekonomi kan arbeta snabbare utan att riskera felklick.
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-500">
                    Välj en leverantörsfaktura i listan.
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>
        </section>
      </div>
    </main>
  );
}
