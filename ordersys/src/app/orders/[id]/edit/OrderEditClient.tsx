"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, PackageCheck, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { OrdinaLogoSpinner } from "@/components/OrdinaLoader";

type FortnoxOrderLine = {
  rowId?: string | number | null;
  articleNumber?: string | null;
  description: string;
  orderedQuantity: number;
  unit?: string | null;
  price: number;
  discount?: number | null;
  discountType?: string | null;
  accountNumber?: string | number | null;
  costCenter?: string | null;
};

type OrderData = {
  orderNumber: string | number;
  title: string;
  customerName?: string | null;
  dueDate?: string | null;
  deliveryAddress?: string | null;
  deliveryMethod?: string | null;
  fortnoxOrderRows?: FortnoxOrderLine[];
  fortnoxRowsError?: string | null;
  fortnoxOrderRowsSyncedAt?: string | null;
};

type OrderForm = {
  title: string;
  customerName: string;
  dueDate: string;
  deliveryAddress: string;
  deliveryMethod: string;
};

function createEmptyLine(): FortnoxOrderLine {
  return {
    rowId: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    articleNumber: "",
    description: "",
    orderedQuantity: 1,
    unit: "st",
    price: 0,
    discount: null,
    discountType: null,
    accountNumber: null,
    costCenter: null,
  };
}

function normalizeLines(rows: FortnoxOrderLine[] | undefined): FortnoxOrderLine[] {
  if (!Array.isArray(rows) || rows.length === 0) return [createEmptyLine()];
  return rows.map((row, index) => ({
    rowId: row.rowId ?? `row-${index}`,
    articleNumber: row.articleNumber ?? "",
    description: row.description ?? "",
    orderedQuantity: Number.isFinite(Number(row.orderedQuantity)) ? Number(row.orderedQuantity) : 1,
    unit: row.unit ?? "st",
    price: Number.isFinite(Number(row.price)) ? Number(row.price) : 0,
    discount: row.discount === null || row.discount === undefined ? null : Number(row.discount),
    discountType: row.discountType ?? null,
    accountNumber: row.accountNumber ?? null,
    costCenter: row.costCenter ?? null,
  }));
}

function toDateInputValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formFromOrder(order: OrderData): OrderForm {
  return {
    title: String(order.title ?? ""),
    customerName: order.customerName ?? "",
    dueDate: toDateInputValue(order.dueDate),
    deliveryAddress: order.deliveryAddress ?? "",
    deliveryMethod: order.deliveryMethod ?? "",
  };
}

function lineAmount(row: FortnoxOrderLine) {
  const quantity = Number(row.orderedQuantity) || 0;
  const price = Number(row.price) || 0;
  const discount = Number(row.discount) || 0;
  const gross = quantity * price;
  if (String(row.discountType ?? "").toUpperCase() === "PERCENT") {
    return gross * (1 - discount / 100);
  }
  return gross - discount;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 2,
  }).format(value);
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100";

export default function OrderEditClient({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [form, setForm] = useState<OrderForm>({
    title: "",
    customerName: "",
    dueDate: "",
    deliveryAddress: "",
    deliveryMethod: "",
  });
  const [lines, setLines] = useState<FortnoxOrderLine[]>([createEmptyLine()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const total = useMemo(() => lines.reduce((sum, row) => sum + lineAmount(row), 0), [lines]);
  const invalidRows = lines.some((row) => !row.description.trim() || Number(row.orderedQuantity) <= 0);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
      const text = await res.text();
      const payload = text ? JSON.parse(text) : null;
      if (!res.ok) {
        setError(payload?.error || `Kunde inte hämta order (${res.status}).`);
        return;
      }

      const nextOrder = payload.order as OrderData;
      setOrder(nextOrder);
      setForm(formFromOrder(nextOrder));
      setLines(normalizeLines(nextOrder.fortnoxOrderRows));
      setSavedAt(nextOrder.fortnoxOrderRowsSyncedAt ?? null);
    } catch {
      setError("Tekniskt fel när ordern skulle hämtas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [orderId]);

  function patchForm(patch: Partial<OrderForm>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function patchLine(index: number, patch: Partial<FortnoxOrderLine>) {
    setLines((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function removeLine(index: number) {
    setLines((prev) => (prev.length <= 1 ? [createEmptyLine()] : prev.filter((_, rowIndex) => rowIndex !== index)));
  }

  function resetForm() {
    if (!order) return;
    setForm(formFromOrder(order));
    setLines(normalizeLines(order.fortnoxOrderRows));
    setError(null);
  }

  async function save() {
    if (!form.title.trim()) {
      setError("Titel krävs.");
      return;
    }
    if (invalidRows) {
      setError("Alla orderrader behöver beskrivning och antal större än 0.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: {
            title: form.title,
            customerName: form.customerName,
            dueDate: form.dueDate || null,
            deliveryAddress: form.deliveryAddress,
            deliveryMethod: form.deliveryMethod,
            orderRows: lines.map((row) => ({
              rowId: row.rowId ?? null,
              articleNumber: row.articleNumber ?? "",
              description: row.description.trim(),
              orderedQuantity: Number(row.orderedQuantity),
              unit: row.unit || "st",
              price: Number(row.price),
              discount: row.discount === null || row.discount === undefined ? null : Number(row.discount),
              discountType: row.discountType ?? null,
              accountNumber: row.accountNumber ?? null,
              costCenter: row.costCenter ?? null,
            })),
          },
        }),
      });

      const text = await res.text();
      const payload = text ? JSON.parse(text) : null;
      if (!res.ok) {
        setError(payload?.error || "Kunde inte spara ordern.");
        return;
      }

      const updated = payload.order as OrderData;
      setOrder(updated);
      setForm(formFromOrder(updated));
      setLines(normalizeLines(updated.fortnoxOrderRows));
      setSavedAt(updated.fortnoxOrderRowsSyncedAt ?? new Date().toISOString());
      router.push(`/orders/${encodeURIComponent(String(updated.orderNumber ?? orderId))}`);
      router.refresh();
    } catch {
      setError("Tekniskt fel vid sparande av ordern.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center p-6">
        <div className="flex items-center gap-3 text-neutral-600">
          <OrdinaLogoSpinner size={40} />
          <span>Laddar order</span>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={`/orders/${encodeURIComponent(orderId)}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 transition hover:text-neutral-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Tillbaka till ordern
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-neutral-950">Redigera order #{orderId}</h1>
          <p className="mt-1 text-sm text-neutral-500">Ändringar sparas först i Fortnox och därefter i Ordexa.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={resetForm}
            disabled={saving || !order}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Återställ
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || invalidRows || !form.title.trim()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <OrdinaLogoSpinner size={16} /> : <Save className="h-4 w-4" aria-hidden />}
            {saving ? "Sparar..." : "Spara ändringar"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-[0_22px_54px_-40px_rgba(15,23,42,0.55)]">
        <div className="border-b border-neutral-100 bg-gradient-to-r from-neutral-50 via-white to-brand-50/50 p-4 sm:p-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-700">
            Fortnox + lokalt
          </div>
          <h2 className="mt-3 text-lg font-semibold text-neutral-950">Orderuppgifter</h2>
        </div>
        <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-2">
          <Field label="Titel">
            <input value={form.title} onChange={(event) => patchForm({ title: event.target.value })} className={inputClass} />
          </Field>
          <Field label="Kund / referens">
            <input
              value={form.customerName}
              onChange={(event) => patchForm({ customerName: event.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Leveransdatum">
            <input
              type="date"
              value={form.dueDate}
              onChange={(event) => patchForm({ dueDate: event.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Leveranssätt">
            <input
              value={form.deliveryMethod}
              onChange={(event) => patchForm({ deliveryMethod: event.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Leveransadress" className="md:col-span-2">
            <textarea
              value={form.deliveryAddress}
              onChange={(event) => patchForm({ deliveryAddress: event.target.value })}
              rows={3}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            />
          </Field>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-[0_24px_70px_-44px_rgba(15,23,42,0.65)]">
        <div className="border-b border-neutral-100 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_48%,#eef6ff_100%)] p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">
                <PackageCheck className="h-3.5 w-3.5" aria-hidden />
                Fortnox orderrader
              </div>
              <h2 className="mt-3 text-lg font-semibold text-neutral-950">Orderrader</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Redigera artikel, beskrivning, antal, pris och rabatt.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-right shadow-sm">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Rader</div>
                <div className="text-base font-semibold text-neutral-950">{lines.length}</div>
              </div>
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-right shadow-sm">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">Summa</div>
                <div className="text-base font-semibold text-sky-950">{formatMoney(total)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 p-4 sm:p-5">
          <div className="hidden grid-cols-[0.85fr_1.8fr_0.6fr_0.5fr_0.7fr_0.65fr_0.7fr_44px] gap-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 lg:grid">
            <span>Artikel</span>
            <span>Beskrivning</span>
            <span>Antal</span>
            <span>Enhet</span>
            <span>Pris</span>
            <span>Rabatt</span>
            <span className="text-right">Rad</span>
            <span />
          </div>

          {lines.map((row, index) => (
            <div
              key={String(row.rowId ?? index)}
              className="grid gap-2 rounded-xl border border-neutral-200 bg-neutral-50/70 p-3 lg:grid-cols-[0.85fr_1.8fr_0.6fr_0.5fr_0.7fr_0.65fr_0.7fr_44px] lg:items-center"
            >
              <input
                value={row.articleNumber ?? ""}
                onChange={(event) => patchLine(index, { articleNumber: event.target.value })}
                className={inputClass}
                aria-label="Artikel"
              />
              <input
                value={row.description}
                onChange={(event) => patchLine(index, { description: event.target.value })}
                className={inputClass}
                aria-label="Beskrivning"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={row.orderedQuantity}
                onChange={(event) => patchLine(index, { orderedQuantity: Number(event.target.value) })}
                className={inputClass}
                aria-label="Antal"
              />
              <input
                value={row.unit ?? ""}
                onChange={(event) => patchLine(index, { unit: event.target.value })}
                className={inputClass}
                aria-label="Enhet"
              />
              <input
                type="number"
                step="0.01"
                value={row.price}
                onChange={(event) => patchLine(index, { price: Number(event.target.value) })}
                className={inputClass}
                aria-label="Pris"
              />
              <input
                type="number"
                step="0.01"
                value={row.discount ?? ""}
                onChange={(event) =>
                  patchLine(index, { discount: event.target.value === "" ? null : Number(event.target.value) })
                }
                className={inputClass}
                aria-label="Rabatt"
              />
              <div className="flex h-10 items-center justify-end rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900">
                {formatMoney(lineAmount(row))}
              </div>
              <button
                type="button"
                onClick={() => removeLine(index)}
                className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-red-100 bg-white text-red-600 transition hover:border-red-200 hover:bg-red-50 lg:w-10"
                aria-label="Ta bort orderrad"
                title="Ta bort orderrad"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ))}

          <div className="flex flex-col gap-3 border-t border-neutral-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-neutral-500">
              {savedAt ? `Synkad ${new Date(savedAt).toLocaleString("sv-SE")}` : "Ingen lokal radsynk sparad ännu."}
            </div>
            <button
              type="button"
              onClick={() => setLines((prev) => [...prev, createEmptyLine()])}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-800 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Lägg till rad
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
