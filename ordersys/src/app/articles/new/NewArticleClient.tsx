"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Article = {
  articleNumber: string;
};

type CreateResponse = {
  article?: Article;
  error?: string;
};

type FormState = {
  articleNumber: string;
  ean: string;
  description: string;
  manufacturer: string;
  manufacturerArticleNumber: string;
  notes: string;
  active: boolean;
  packageArticle: boolean;
  unit: string;
  articleType: "STOCK" | "SERVICE";
  stockGoods: boolean;
  externalWebshop: boolean;
  endOfLife: boolean;
  salesPrice: string;
  priceListA: string;
  calculationCost: string;
};

const INITIAL_FORM: FormState = {
  articleNumber: "",
  ean: "",
  description: "",
  manufacturer: "",
  manufacturerArticleNumber: "",
  notes: "",
  active: true,
  packageArticle: false,
  unit: "",
  articleType: "STOCK",
  stockGoods: true,
  externalWebshop: false,
  endOfLife: false,
  salesPrice: "",
  priceListA: "",
  calculationCost: "",
};

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed.replace(",", "."));
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

function FortnoxField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-[12px] text-[#3a4036]">
      <span className="font-semibold uppercase tracking-[0.08em] text-[#65705f]">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}

function FortnoxInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "h-8 w-full rounded-md border border-[#cbcfc4] bg-white px-3 text-[13px] text-[#2d3329]",
        "focus:outline-none focus:ring-2 focus:ring-[#8ebe3f]/40",
        "placeholder:text-[#7c8276]",
        props.className || "",
      ].join(" ")}
    />
  );
}

function FortnoxTextarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  return (
    <textarea
      {...props}
      className={[
        "w-full rounded-md border border-[#cbcfc4] bg-white px-3 py-2 text-[13px] text-[#2d3329]",
        "focus:outline-none focus:ring-2 focus:ring-[#8ebe3f]/40",
        "placeholder:text-[#7c8276]",
        props.className || "",
      ].join(" ")}
    />
  );
}

function BooleanChoice({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex h-8 items-center gap-4 rounded-md border border-[#cbcfc4] bg-white px-3 text-[13px] text-[#2d3329]">
      <label className="inline-flex items-center gap-1.5">
        <input
          type="radio"
          checked={value}
          onChange={() => onChange(true)}
          className="h-3.5 w-3.5 accent-[#8ebe3f]"
        />
        Ja
      </label>
      <label className="inline-flex items-center gap-1.5">
        <input
          type="radio"
          checked={!value}
          onChange={() => onChange(false)}
          className="h-3.5 w-3.5 accent-[#8ebe3f]"
        />
        Nej
      </label>
    </div>
  );
}

export default function NewArticleClient() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () =>
      form.articleNumber.trim().length > 0 &&
      form.description.trim().length > 0 &&
      !isSubmitting,
    [form.articleNumber, form.description, isSubmitting]
  );

  const articleLabel = form.articleNumber.trim() || "Ny artikel";

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    const salesPrice = parseOptionalNumber(form.salesPrice);
    const priceListA = parseOptionalNumber(form.priceListA);
    const calculationCost = parseOptionalNumber(form.calculationCost);

    if (salesPrice === null || priceListA === null || calculationCost === null) {
      setError("Prisfalten maste vara numeriska.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        articleNumber: form.articleNumber.trim(),
        ean: form.ean.trim() || undefined,
        description: form.description.trim() || undefined,
        manufacturer: form.manufacturer.trim() || undefined,
        manufacturerArticleNumber:
          form.manufacturerArticleNumber.trim() || undefined,
        notes: form.notes.trim() || undefined,
        active: form.active,
        packageArticle: form.packageArticle,
        unit: form.unit.trim() || undefined,
        articleType: form.articleType,
        stockGoods: form.stockGoods,
        externalWebshop: form.externalWebshop,
        endOfLife: form.endOfLife,
        salesPrice,
        priceListA,
        calculationCost,
      };

      const res = await fetch("/api/fortnox/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json().catch(() => null)) as CreateResponse | null;
      if (!res.ok) {
        throw new Error(json?.error ?? "Kunde inte skapa artikel.");
      }

      const createdArticleNumber =
        json?.article?.articleNumber ?? payload.articleNumber;
      router.push(`/articles/${encodeURIComponent(createdArticleNumber)}`);
    } catch (submitError: any) {
      setError(submitError?.message ?? "Nagot gick fel vid skapandet.");
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-6xl space-y-4">
      <div className="rounded-md border border-[#d9ddd4] bg-[#f6f8f3] shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <h1 className="text-[18px] font-semibold text-[#2d3329]">
            Artikel {articleLabel} - skapa ny
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled
              className="h-8 rounded-md border border-[#cbcfc4] bg-white px-3 text-[12px] text-[#6b7165]"
            >
              Ingen fil har valts
            </button>
            <button
              type="button"
              disabled
              className="h-8 rounded-md border border-[#cbcfc4] bg-white px-3 text-[12px] text-[#6b7165]"
            >
              Kopiera artikel
            </button>
            <button
              type="button"
              disabled
              className="h-8 rounded-md border border-[#cbcfc4] bg-white px-3 text-[12px] text-[#6b7165]"
            >
              Skriv ut statistik
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-[#d9ddd4] bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-1 border-b border-[#d9ddd4] bg-[#f1f3ee] px-4 py-2">
          <span className="rounded-md bg-white px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#4f5a49]">
            Grunduppgifter
          </span>
          <span className="rounded-md px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#7c8276]">
            Lageruppgifter
          </span>
          <span className="rounded-md px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#7c8276]">
            Strukturartikel
          </span>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 p-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <FortnoxField label="Artikelnummer" required>
              <FortnoxInput
                required
                value={form.articleNumber}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, articleNumber: event.target.value }))
                }
                placeholder="1004"
              />
            </FortnoxField>

            <FortnoxField label="EAN">
              <FortnoxInput
                value={form.ean}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, ean: event.target.value }))
                }
              />
            </FortnoxField>

            <FortnoxField label="Enhet">
              <FortnoxInput
                value={form.unit}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, unit: event.target.value }))
                }
                placeholder="st"
              />
            </FortnoxField>

            <FortnoxField label="Benamning" required>
              <FortnoxInput
                required
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </FortnoxField>

            <FortnoxField label="Tillverkare">
              <FortnoxInput
                value={form.manufacturer}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, manufacturer: event.target.value }))
                }
              />
            </FortnoxField>

            <FortnoxField label="Tillverkarens artikelnummer">
              <FortnoxInput
                value={form.manufacturerArticleNumber}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    manufacturerArticleNumber: event.target.value,
                  }))
                }
              />
            </FortnoxField>

            <FortnoxField label="Anteckningar">
              <FortnoxTextarea
                rows={3}
                value={form.notes}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, notes: event.target.value }))
                }
              />
            </FortnoxField>

            <FortnoxField label="Aktiv">
              <BooleanChoice
                value={form.active}
                onChange={(next) => setForm((prev) => ({ ...prev, active: next }))}
              />
            </FortnoxField>

            <FortnoxField label="Paketartikel">
              <BooleanChoice
                value={form.packageArticle}
                onChange={(next) =>
                  setForm((prev) => ({ ...prev, packageArticle: next }))
                }
              />
            </FortnoxField>

            <FortnoxField label="Typ av artikel">
              <div className="flex h-8 items-center gap-4 rounded-md border border-[#cbcfc4] bg-white px-3 text-[13px] text-[#2d3329]">
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="radio"
                    checked={form.articleType === "STOCK"}
                    onChange={() =>
                      setForm((prev) => ({ ...prev, articleType: "STOCK" }))
                    }
                    className="h-3.5 w-3.5 accent-[#8ebe3f]"
                  />
                  Vara
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="radio"
                    checked={form.articleType === "SERVICE"}
                    onChange={() =>
                      setForm((prev) => ({ ...prev, articleType: "SERVICE" }))
                    }
                    className="h-3.5 w-3.5 accent-[#8ebe3f]"
                  />
                  Tjanst
                </label>
              </div>
            </FortnoxField>

            <FortnoxField label="Lagervara">
              <BooleanChoice
                value={form.stockGoods}
                onChange={(next) =>
                  setForm((prev) => ({ ...prev, stockGoods: next }))
                }
              />
            </FortnoxField>

            <FortnoxField label="Extern webbshop">
              <BooleanChoice
                value={form.externalWebshop}
                onChange={(next) =>
                  setForm((prev) => ({ ...prev, externalWebshop: next }))
                }
              />
            </FortnoxField>

            <FortnoxField label="Utgaende artikel">
              <BooleanChoice
                value={form.endOfLife}
                onChange={(next) =>
                  setForm((prev) => ({ ...prev, endOfLife: next }))
                }
              />
            </FortnoxField>
          </div>

          <section className="rounded-md border border-[#d9ddd4] bg-white">
            <div className="border-b border-[#d9ddd4] bg-[#f1f3ee] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#4f5a49]">
              Prislista
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-[13px]">
                <thead className="bg-[#f8faf7] text-left text-[11px] uppercase tracking-[0.08em] text-[#65705f]">
                  <tr>
                    <th className="px-3 py-2">Prislista</th>
                    <th className="px-3 py-2">Benamning</th>
                    <th className="px-3 py-2">Pris</th>
                    <th className="px-3 py-2">TG %</th>
                    <th className="px-3 py-2">TB SEK</th>
                    <th className="px-3 py-2">Andringsdatum</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-[#e6eadf] text-[#2d3329]">
                    <td className="px-3 py-2 font-semibold">A</td>
                    <td className="px-3 py-2">Prislista A</td>
                    <td className="px-3 py-2">
                      <FortnoxInput
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.priceListA}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, priceListA: event.target.value }))
                        }
                        className="w-32"
                        placeholder="0,00"
                      />
                    </td>
                    <td className="px-3 py-2 text-[#7c8276]">-</td>
                    <td className="px-3 py-2 text-[#7c8276]">-</td>
                    <td className="px-3 py-2 text-[#7c8276]">Aldrig forandrad</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid gap-3 md:grid-cols-2">
            <FortnoxField label="Forsaljningspris">
              <FortnoxInput
                type="number"
                step="0.01"
                min="0"
                value={form.salesPrice}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, salesPrice: event.target.value }))
                }
                placeholder="0,00"
              />
            </FortnoxField>

            <FortnoxField label="Kalkylkostnad">
              <FortnoxInput
                type="number"
                step="0.01"
                min="0"
                value={form.calculationCost}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, calculationCost: event.target.value }))
                }
                placeholder="0,00"
              />
            </FortnoxField>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex flex-wrap items-center gap-2 border-t border-[#d9ddd4] pt-4">
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex h-8 items-center rounded-md bg-[#8ebe3f] px-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-white shadow-sm transition enabled:hover:bg-[#7cab38] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Skapar..." : "Skapa artikel"}
            </button>
            <Link
              href="/articles"
              className="inline-flex h-8 items-center rounded-md border border-[#cbcfc4] bg-white px-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#5a6452] hover:bg-[#f6f8f3]"
            >
              Avbryt
            </Link>
          </div>
        </form>
      </div>
    </section>
  );
}

