"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Edit3,
  Plus,
  Printer,
  RefreshCcw,
  Search,
  ChevronDown,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
type Article = {
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
};

type ApiArticleResponse = {
  articles?: Article[];
};

type UpdateResponse = {
  article?: Article;
  error?: string;
};

const PAGE_LIMIT = 100;

const STATUS_FILTERS = [
  { key: "ALL", label: "Alla" },
  { key: "ACTIVE", label: "Aktiva" },
  { key: "INACTIVE", label: "Inaktiva" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["key"];

const LOW_STOCK_THRESHOLD = 5;

type StockFilter = "ALL" | "IN_STOCK" | "LOW" | "OUT";

type AdvancedFilters = {
  articleNumber: string;
  priceMin: string;
  priceMax: string;
  stockStatus: StockFilter;
};

function formatCurrency(value?: number | null) {
  if (value === null || value === undefined) {
    return "0,00";
  }
  return new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value?: number | null) {
  if (value === null || value === undefined) {
    return "0";
  }
  return new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function parseFilterNumber(value?: string) {
  if (!value) return null;
  const normalized = Number(value.replace(",", "."));
  return Number.isFinite(normalized) ? normalized : null;
}

function getAvailableUnits(article: Article) {
  const available = article.available ?? article.inStock ?? 0;
  return Number.isFinite(Number(available)) ? Number(available) : 0;
}

function toNumeric(value?: number | null) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

type ArticlesClientProps = {
  canCreate?: boolean;
};

export default function ArticlesClient({ canCreate = false }: ArticlesClientProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const router = useRouter();

  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    articleNumber: "",
    priceMin: "",
    priceMax: "",
    stockStatus: "ALL",
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorArticleNumber, setEditorArticleNumber] = useState<string | null>(
    null
  );
  const editingArticle = useMemo(
    () =>
      editorArticleNumber
        ? articles.find((a) => a.articleNumber === editorArticleNumber) ?? null
        : null,
    [articles, editorArticleNumber]
  );

  const [formValues, setFormValues] = useState({
    description: "",
    salesPrice: "",
    priceListA: "",
    calculationCost: "",
    unit: "",
    active: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const filteredArticles = useMemo(() => {
    const minPrice = parseFilterNumber(advancedFilters.priceMin);
    const maxPrice = parseFilterNumber(advancedFilters.priceMax);
    const needle = advancedFilters.articleNumber.trim().toLowerCase();

    return articles.filter((article) => {
      const isActive = article.active ?? true;
      if (statusFilter === "ACTIVE" && !isActive) {
        return false;
      }
      if (statusFilter === "INACTIVE" && isActive) {
        return false;
      }

      if (needle) {
        const haystack = `${article.articleNumber ?? ""} ${
          article.description ?? ""
        }`.toLowerCase();
        if (!haystack.includes(needle)) {
          return false;
        }
      }

      const priceValue = article.priceListA ?? article.salesPrice ?? 0;
      if (minPrice !== null && priceValue < minPrice) {
        return false;
      }
      if (maxPrice !== null && priceValue > maxPrice) {
        return false;
      }

      const available = getAvailableUnits(article);
      if (advancedFilters.stockStatus === "IN_STOCK" && available <= 0) {
        return false;
      }
      if (
        advancedFilters.stockStatus === "LOW" &&
        !(available > 0 && available <= LOW_STOCK_THRESHOLD)
      ) {
        return false;
      }
      if (advancedFilters.stockStatus === "OUT" && available > 0) {
        return false;
      }

      return true;
    });
  }, [advancedFilters, articles, statusFilter]);

  const hasAdvancedFilters = useMemo(
    () =>
      Boolean(
        advancedFilters.articleNumber.trim() ||
          advancedFilters.priceMin.trim() ||
          advancedFilters.priceMax.trim() ||
          advancedFilters.stockStatus !== "ALL"
      ),
    [advancedFilters]
  );

  const selectedCount = selectedIds.size;

  const articleStats = useMemo(() => {
    let active = 0;
    let lowStock = 0;

    for (const article of articles) {
      const isActive = article.active ?? true;
      if (isActive) {
        active += 1;
      }
      const available = getAvailableUnits(article);
      if (available > 0 && available <= LOW_STOCK_THRESHOLD) {
        lowStock += 1;
      }
    }

    return {
      total: articles.length,
      active,
      inactive: Math.max(articles.length - active, 0),
      lowStock,
    };
  }, [articles]);

  const filteredSnapshot = useMemo(
    () =>
      filteredArticles.reduce(
        (acc, article) => {
          acc.stockValue += toNumeric(article.stockValue);
          acc.available += getAvailableUnits(article);
          acc.reserved += toNumeric(article.reserved);
          return acc;
        },
        { stockValue: 0, available: 0, reserved: 0 }
      ),
    [filteredArticles]
  );

  const selectedSnapshot = useMemo(
    () =>
      articles.reduce(
        (acc, article) => {
          if (!selectedIds.has(article.articleNumber)) {
            return acc;
          }
          acc.stockValue += toNumeric(article.stockValue);
          acc.available += getAvailableUnits(article);
          return acc;
        },
        { stockValue: 0, available: 0 }
      ),
    [articles, selectedIds]
  );

  const hasFormChanges = useMemo(() => {
    if (!editingArticle) return false;
    const originalPrice =
      editingArticle.salesPrice !== undefined &&
      editingArticle.salesPrice !== null
        ? String(editingArticle.salesPrice)
        : "";
    const originalPriceListA =
      editingArticle.priceListA !== undefined &&
      editingArticle.priceListA !== null
        ? String(editingArticle.priceListA)
        : "";
    const originalCalculationCost =
      editingArticle.calculationCost !== undefined &&
      editingArticle.calculationCost !== null
        ? String(editingArticle.calculationCost)
        : "";
    const originalUnit = editingArticle.unit ?? "";
    const originalDescription = editingArticle.description ?? "";
    const originalActive = editingArticle.active ?? true;

    return (
      formValues.description !== originalDescription ||
      formValues.salesPrice !== originalPrice ||
      formValues.priceListA !== originalPriceListA ||
      formValues.calculationCost !== originalCalculationCost ||
      formValues.unit !== originalUnit ||
      formValues.active !== originalActive
    );
  }, [editingArticle, formValues]);

  const fetchArticles = useCallback(
    async (overrideQuery?: string) => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const params = new URLSearchParams();
        params.set("limit", String(PAGE_LIMIT));
        const q = overrideQuery ?? query;
        if (q) {
          params.set("q", q);
        }

        const res = await fetch(`/api/fortnox/articles?${params.toString()}`);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Kunde inte hämta artiklar.");
        }
        const json = (await res.json()) as ApiArticleResponse;
        const items = json.articles ?? [];

        const validNumbers = new Set(
          items.map((item) => item.articleNumber ?? "")
        );

        setArticles(items);
        setSelectedIds((prev) => {
          const next = new Set<string>();
          prev.forEach((id) => {
            if (validNumbers.has(id)) {
              next.add(id);
            }
          });
          return next;
        });
        setEditorArticleNumber((prev) =>
          prev && validNumbers.has(prev) ? prev : null
        );
        if (!validNumbers.size) {
          setEditorOpen(false);
        }
      } catch (error: any) {
        setLoadError(
          error?.message ?? "Ett fel inträffade vid hämtning av artiklar."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [query]
  );

  useEffect(() => {
    void fetchArticles();
  }, [fetchArticles]);

  useEffect(() => {
    if (!editingArticle) {
      setFormValues({
        description: "",
        salesPrice: "",
        priceListA: "",
        calculationCost: "",
        unit: "",
        active: true,
      });
      return;
    }

    setFormValues({
      description: editingArticle.description ?? "",
      salesPrice:
        editingArticle.salesPrice !== undefined &&
        editingArticle.salesPrice !== null
          ? String(editingArticle.salesPrice)
          : "",
      priceListA:
        editingArticle.priceListA !== undefined &&
        editingArticle.priceListA !== null
          ? String(editingArticle.priceListA)
          : "",
      calculationCost:
        editingArticle.calculationCost !== undefined &&
        editingArticle.calculationCost !== null
          ? String(editingArticle.calculationCost)
          : "",
      unit: editingArticle.unit ?? "",
      active: editingArticle.active ?? true,
    });
  }, [editingArticle]);

  useEffect(() => {
    if (!editorOpen) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setEditorOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editorOpen]);

  const handleSubmitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuery = searchInput.trim();
    setQuery(nextQuery);
    void fetchArticles(nextQuery);
  };

  const handleRefresh = () => {
    void fetchArticles();
  };

  const handleResetAdvancedFilters = () => {
    setAdvancedFilters({
      articleNumber: "",
      priceMin: "",
      priceMax: "",
      stockStatus: "ALL",
    });
  };

  const handleToggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = filteredArticles.every((article) =>
        next.has(article.articleNumber)
      );
      if (allSelected) {
        filteredArticles.forEach((article) =>
          next.delete(article.articleNumber)
        );
      } else {
        filteredArticles.forEach((article) =>
          next.add(article.articleNumber)
        );
      }
      return next;
    });
  };

  const handleToggleSelect = (articleNumber: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(articleNumber)) {
        next.delete(articleNumber);
      } else {
        next.add(articleNumber);
      }
      return next;
    });
  };

  const handleOpenEditor = (articleNumber: string) => {
    setEditorArticleNumber(articleNumber);
    setSaveMessage(null);
    setSaveError(null);
    setEditorOpen(true);
  };

  const handleRowClick =
    (articleNumber: string) =>
    (event: React.MouseEvent<HTMLTableRowElement>) => {
      const target = event.target as HTMLElement;
      if (target.closest("input,button,a,label")) {
        return;
      }
      router.push(`/articles/${encodeURIComponent(articleNumber)}`);
    };

  const handleCloseEditor = () => {
    setEditorOpen(false);
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingArticle || !editorArticleNumber) return;
    if (!hasFormChanges) {
      setSaveMessage("Inga ändringar att spara.");
      return;
    }

    const payload: Record<string, unknown> = {};

    if (formValues.description !== (editingArticle.description ?? "")) {
      payload.description = formValues.description.trim();
    }

    if (formValues.unit !== (editingArticle.unit ?? "")) {
      payload.unit = formValues.unit.trim();
    }

    const originalPrice =
      editingArticle.salesPrice !== undefined &&
      editingArticle.salesPrice !== null
        ? String(editingArticle.salesPrice)
        : "";
    if (formValues.salesPrice !== originalPrice) {
      const priceValue = formValues.salesPrice.trim();
      if (!priceValue) {
        payload.salesPrice = null;
      } else {
        const normalized = Number(priceValue.replace(",", "."));
        if (Number.isNaN(normalized)) {
          setSaveError("Pris måste vara ett numeriskt värde.");
          setSaveMessage(null);
          return;
        }
        payload.salesPrice = normalized;
      }
    }

    const originalPriceListA =
      editingArticle.priceListA !== undefined &&
      editingArticle.priceListA !== null
        ? String(editingArticle.priceListA)
        : "";
    if (formValues.priceListA !== originalPriceListA) {
      const value = formValues.priceListA.trim();
      if (!value) {
        payload.priceListA = null;
      } else {
        const normalized = Number(value.replace(",", "."));
        if (Number.isNaN(normalized)) {
          setSaveError("Prislista A måste vara ett numeriskt värde.");
          setSaveMessage(null);
          return;
        }
        payload.priceListA = normalized;
      }
    }

    const originalCalculationCost =
      editingArticle.calculationCost !== undefined &&
      editingArticle.calculationCost !== null
        ? String(editingArticle.calculationCost)
        : "";
    if (formValues.calculationCost !== originalCalculationCost) {
      const value = formValues.calculationCost.trim();
      if (!value) {
        payload.calculationCost = null;
      } else {
        const normalized = Number(value.replace(",", "."));
        if (Number.isNaN(normalized)) {
          setSaveError("Kalkylkostnad måste vara ett numeriskt värde.");
          setSaveMessage(null);
          return;
        }
        payload.calculationCost = normalized;
      }
    }

    const originalActive = editingArticle.active ?? true;
    if (formValues.active !== originalActive) {
      payload.active = formValues.active;
    }

    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const res = await fetch(
        `/api/fortnox/articles/${encodeURIComponent(editorArticleNumber)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const maybeJson = (await res.json().catch(() => null)) as
          | UpdateResponse
          | null;
        const errMessage =
          maybeJson?.error ?? "Misslyckades att uppdatera artikeln.";
        throw new Error(errMessage);
      }

      const json = (await res.json()) as UpdateResponse;
      const updated = json.article;

      if (updated) {
        setArticles((prev) =>
          prev.map((article) => {
            if (article.articleNumber !== updated.articleNumber) {
              return article;
            }
            const merged: Article = { ...article };
            if (updated.description !== undefined) {
              merged.description = updated.description;
            }
            if (updated.salesPrice !== undefined) {
              merged.salesPrice = updated.salesPrice;
            }
            if (updated.unit !== undefined) {
              merged.unit = updated.unit;
            }
            if (updated.active !== undefined) {
              merged.active = updated.active;
            }
            if (updated.priceListA !== undefined) {
              merged.priceListA = updated.priceListA;
            }
            if (updated.calculationCost !== undefined) {
              merged.calculationCost = updated.calculationCost;
            }
            if (updated.inStock !== undefined) {
              merged.inStock = updated.inStock;
            }
            if (updated.reserved !== undefined) {
              merged.reserved = updated.reserved;
            }
            if (updated.available !== undefined) {
              merged.available = updated.available;
            }
            if (updated.stockValue !== undefined) {
              merged.stockValue = updated.stockValue;
            }
            return merged;
          })
        );
      }

      setSaveMessage("Artikeln har uppdaterats.");
    } catch (error: any) {
      setSaveError(error?.message ?? "Något gick fel vid uppdatering.");
    } finally {
      setIsSaving(false);
    }
  };

  const isAllSelected =
    filteredArticles.length > 0 &&
    filteredArticles.every((article) =>
      selectedIds.has(article.articleNumber)
    );

  return (
    <>
      <div className="space-y-8">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-[#dfe3d8] bg-gradient-to-br from-[#f9fbf6] via-[#f2f6ea] to-[#e5eedc] p-8 text-[#2d3329] shadow-soft">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6e7866]">
                <Sparkles className="h-3.5 w-3.5 text-[#8ebe3f]" />
                Register 2.0
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold leading-tight lg:text-4xl">
                  Artiklar & lagerhälsa
                </h1>
                <p className="text-sm text-[#5b6453] lg:max-w-2xl">
                  Folj upp prislistor, lagerstatus och marginaler med samma uttryck som Order 2.0. Filtrera och agera snabbare utan att lämna sidan.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/60 bg-white/70 px-4 py-2 text-sm font-semibold text-[#2f352a] shadow hover:border-white hover:bg-white"
              >
                <RefreshCcw className="h-4 w-4 text-[#5d6756]" />
                Uppdatera
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/60 bg-white/70 px-4 py-2 text-sm font-semibold text-[#2f352a] shadow hover:border-white hover:bg-white"
              >
                <Download className="h-4 w-4 text-[#5d6756]" />
                Exportera CSV
              </button>
              {canCreate ? (
                <button
                  type="button"
                  onClick={() => router.push("/articles/new")}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#2f6b49] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-[#2f6b49]/30 transition hover:bg-[#26553a]"
                >
                  <Plus className="h-4 w-4" />
                  Skapa artikel
                </button>
              ) : null}
            </div>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-inner">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7a8572]">
                Aktiva artiklar
              </p>
              <p className="text-2xl font-semibold">{articleStats.active}</p>
              <p className="text-xs text-[#5d6756]">av {articleStats.total} registrerade</p>
            </article>
            <article className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-inner">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7a8572]">
                Inaktiva artiklar
              </p>
              <p className="text-2xl font-semibold">{articleStats.inactive}</p>
              <p className="text-xs text-[#5d6756]">behöver omtanke</p>
            </article>
            <article className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-inner">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7a8572]">
                Lågt lager
              </p>
              <p className="text-2xl font-semibold">{articleStats.lowStock}</p>
              <p className="text-xs text-[#5d6756]">≤ {LOW_STOCK_THRESHOLD} st disponibelt</p>
            </article>
            <article className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-inner">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7a8572]">
                Värde i aktuell lista
              </p>
              <p className="text-2xl font-semibold">{formatCurrency(filteredSnapshot.stockValue)}</p>
              <p className="text-xs text-[#5d6756]">Disponibelt {formatNumber(filteredSnapshot.available)} st</p>
            </article>
          </div>
        </section>

        <section className="rounded-[2rem] border border-[#dfe3d8] bg-white shadow-soft">
          <div className="space-y-6 border-b border-[#e5e9dc] p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7a8572]">
                  Kontrollpanel
                </p>
                <h2 className="text-2xl font-semibold text-[#2f352a]">Sök & filtrera artiklar</h2>
                <p className="text-sm text-[#68705f]">
                  Visar {filteredArticles.length} av {articleStats.total} artiklar. Resultatet uppdateras direkt när du justerar filtren.
                </p>
              </div>
              <form
                onSubmit={handleSubmitSearch}
                className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:max-w-xl"
              >
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a8572]" />
                  <input
                    type="search"
                    placeholder="Artikelnummer eller benämning"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-[#dfe3d8] bg-white pl-11 pr-4 text-sm text-[#2f352a] shadow-sm focus:border-[#8ebe3f] focus:outline-none focus:ring-2 focus:ring-[#8ebe3f]/30"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#2f6b49] px-6 text-sm font-semibold text-white shadow-lg shadow-[#2f6b49]/30 transition hover:bg-[#26553a]"
                >
                  Sök i Fortnox
                </button>
              </form>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {STATUS_FILTERS.map((filter) => {
                const isActive = statusFilter === filter.key;
                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setStatusFilter(filter.key)}
                    className={`inline-flex items-center rounded-full border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.3em] transition ${
                      isActive
                        ? "border-[#2f6b49] bg-[#2f6b49] text-white shadow"
                        : "border-[#dfe3d8] bg-white text-[#5f6858] hover:bg-[#f5f8ed]"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setAdvancedFiltersOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-full border border-dashed border-[#dfe3d8] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#5f6858] transition hover:border-[#8ebe3f] hover:text-[#2f6b49]"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Fler filter
                <ChevronDown className={`h-3 w-3 transition ${advancedFiltersOpen ? "rotate-180" : ""}`} />
                {hasAdvancedFilters && <span className="ml-1 h-2 w-2 rounded-full bg-[#8ebe3f]" />}
              </button>
            </div>

            {advancedFiltersOpen ? (
              <div className="rounded-2xl border border-dashed border-[#dfe3d8] bg-[#f9fbf4] p-5">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7a8572]">
                    <span className="mb-1 block">Artikelnr eller text</span>
                    <input
                      type="text"
                      value={advancedFilters.articleNumber}
                      onChange={(event) =>
                        setAdvancedFilters((prev) => ({
                          ...prev,
                          articleNumber: event.target.value,
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-[#dfe3d8] bg-white px-3 text-sm text-[#2f352a] focus:border-[#8ebe3f] focus:outline-none focus:ring-2 focus:ring-[#8ebe3f]/30"
                      placeholder="Ex. K-1001"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7a8572]">
                    <span className="mb-1 block">Pris från</span>
                    <input
                      type="number"
                      value={advancedFilters.priceMin}
                      onChange={(event) =>
                        setAdvancedFilters((prev) => ({
                          ...prev,
                          priceMin: event.target.value,
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-[#dfe3d8] bg-white px-3 text-sm text-[#2f352a] focus:border-[#8ebe3f] focus:outline-none focus:ring-2 focus:ring-[#8ebe3f]/30"
                      placeholder="0"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7a8572]">
                    <span className="mb-1 block">Pris till</span>
                    <input
                      type="number"
                      value={advancedFilters.priceMax}
                      onChange={(event) =>
                        setAdvancedFilters((prev) => ({
                          ...prev,
                          priceMax: event.target.value,
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-[#dfe3d8] bg-white px-3 text-sm text-[#2f352a] focus:border-[#8ebe3f] focus:outline-none focus:ring-2 focus:ring-[#8ebe3f]/30"
                      placeholder="1000"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7a8572]">
                    <span className="mb-1 block">Lagerstatus</span>
                    <select
                      value={advancedFilters.stockStatus}
                      onChange={(event) =>
                        setAdvancedFilters((prev) => ({
                          ...prev,
                          stockStatus: event.target.value as StockFilter,
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-[#dfe3d8] bg-white px-3 text-sm text-[#2f352a] focus:border-[#8ebe3f] focus:outline-none focus:ring-2 focus:ring-[#8ebe3f]/30"
                    >
                      <option value="ALL">Alla</option>
                      <option value="IN_STOCK">I lager</option>
                      <option value="LOW">Lågt lager</option>
                      <option value="OUT">Slut i lager</option>
                    </select>
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleResetAdvancedFilters}
                    disabled={!hasAdvancedFilters}
                    className="inline-flex items-center justify-center rounded-xl border border-[#dfe3d8] px-4 py-2 text-sm font-semibold text-[#5f6858] transition hover:border-[#8ebe3f] hover:text-[#2f6b49] disabled:cursor-not-allowed disabled:text-[#b1b8aa]"
                  >
                    Rensa filter
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdvancedFiltersOpen(false)}
                    className="inline-flex items-center justify-center rounded-xl bg-[#2f6b49] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#26553a]"
                  >
                    Dölj filter
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative">
            {isLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#dfe3d8] border-t-[#2f6b49]" />
              </div>
            )}

            {loadError ? (
              <div className="px-6 py-16 text-center text-sm text-red-600">{loadError}</div>
            ) : filteredArticles.length === 0 ? (
              <div className="px-6 py-16 text-center text-sm text-[#68705f]">
                <p className="font-semibold text-[#2f352a]">Inga artiklar matchar filtren</p>
                <p className="mt-1 text-sm">Prova att anpassa sökningen eller visa alla artiklar igen.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full table-fixed text-sm">
                  <thead className="bg-[#f5f8ed] text-[11px] uppercase tracking-[0.3em] text-[#7a8572]">
                    <tr>
                      <th className="w-12 px-4 py-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border border-[#cfd5c6]"
                          checked={isAllSelected}
                          onChange={handleToggleSelectAll}
                        />
                      </th>
                      <th className="min-w-[16rem] px-4 py-3 text-left">Artikel</th>
                      <th className="w-32 px-4 py-3 text-left">Status</th>
                      <th className="w-40 px-4 py-3 text-right">Prislista A</th>
                      <th className="w-36 px-4 py-3 text-right">Kalkyl</th>
                      <th className="w-32 px-4 py-3 text-right">Disponibelt</th>
                      <th className="w-32 px-4 py-3 text-right">Reserverat</th>
                      <th className="w-40 px-4 py-3 text-right">Lagervärde</th>
                      <th className="w-16 px-4 py-3 text-right" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eef1e4] text-[#2f352a]">
                    {filteredArticles.map((article) => {
                      const isSelected = selectedIds.has(article.articleNumber);
                      return (
                        <tr
                          key={article.articleNumber}
                          onClick={handleRowClick(article.articleNumber)}
                          className={`cursor-pointer transition-colors hover:bg-[#f7faf1] ${
                            isSelected ? "bg-[#edf6de]" : "bg-white"
                          }`}
                        >
                          <td className="px-4 py-4 align-top">
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4 rounded border border-[#cfd5c6]"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(article.articleNumber)}
                            />
                          </td>
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              <p className="font-semibold">{article.description || "Saknar benämning"}</p>
                              <p className="text-xs text-[#68705f]">
                                {article.articleNumber}
                                {article.unit ? ` - ${article.unit}` : ""}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                article.active ?? true ? "bg-[#e3f3d3] text-[#2f6b49]" : "bg-[#f2dede] text-[#8a1f1f]"
                              }`}
                            >
                              {article.active ?? true ? "Aktiv" : "Inaktiv"}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            {formatCurrency(article.priceListA ?? article.salesPrice)}
                          </td>
                          <td className="px-4 py-4 text-right">
                            {formatCurrency(article.calculationCost)}
                          </td>
                          <td className="px-4 py-4 text-right">
                            {formatNumber(article.available ?? article.inStock)}
                          </td>
                          <td className="px-4 py-4 text-right">
                            {formatNumber(article.reserved)}
                          </td>
                          <td className="px-4 py-4 text-right">
                            {formatCurrency(article.stockValue)}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenEditor(article.articleNumber)}
                              className="inline-flex items-center justify-center rounded-full border border-[#dfe3d8] p-2 text-[#68705f] transition hover:border-[#8ebe3f] hover:text-[#2f6b49]"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="border-t border-[#e5e9dc] bg-[#f9fbf4] px-6 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7a8572]">Summering</p>
                <p className="text-sm text-[#4f5a49]">
                  Lagervärde {formatCurrency(filteredSnapshot.stockValue)} - Disponibelt {formatNumber(filteredSnapshot.available)} st - Reserverat {formatNumber(filteredSnapshot.reserved)} st
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="inline-flex items-center gap-2 rounded-full border border-[#dfe3d8] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#5f6858] transition hover:border-[#8ebe3f] hover:text-[#2f6b49]"
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Uppdatera
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-[#dfe3d8] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#5f6858] transition hover:border-[#8ebe3f] hover:text-[#2f6b49]"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Skriv ut lista
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 z-30 w-[min(100%,40rem)] -translate-x-1/2 rounded-2xl border border-[#ccd3c4] bg-white/95 p-4 shadow-[0_25px_50px_rgba(42,56,31,0.15)] backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#2f352a]">{selectedCount} artiklar markerade</p>
              <p className="text-xs text-[#65705f]">
                Lagervärde {formatCurrency(selectedSnapshot.stockValue)} - Disponibelt {formatNumber(selectedSnapshot.available)} st
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex items-center rounded-full bg-[#2f6b49] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow hover:bg-[#26553a]"
              >
                Aktivera
              </button>
              <button
                type="button"
                className="inline-flex items-center rounded-full bg-[#e0e4d6] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#2f352a]"
              >
                Inaktivera
              </button>
              <button
                type="button"
                className="inline-flex items-center rounded-full bg-[#f97316] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow hover:bg-[#ea580c]"
              >
                Prisuppdatera
              </button>
              <button
                type="button"
                className="inline-flex items-center rounded-full bg-[#ef4444] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow hover:bg-[#dc2626]"
              >
                Radera
              </button>
            </div>
          </div>
        </div>
      )}


      {editorOpen && editingArticle ? (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-black/30 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseEditor();
            }
          }}
        >
          <div className="h-full w-full max-w-md bg-card shadow-xl transition-transform duration-200 ease-out">
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Redigera artikel
                </h2>
                <p className="text-xs text-muted-foreground">
                  Uppdatera beskrivning, pris och status.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseEditor}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:text-foreground"
                aria-label="Stäng redigering"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form className="flex h-full flex-col gap-5 overflow-y-auto px-6 py-6" onSubmit={handleSave}>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Artikelnr
                </label>
                <div className="flex h-11 items-center rounded-lg border border-border bg-muted/60 px-3 text-sm font-medium text-foreground">
                  {editingArticle.articleNumber}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Benamning
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
                  placeholder="Beskrivning"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Försäljningspris
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formValues.salesPrice}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      salesPrice: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Uttag prislista A
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formValues.priceListA}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      priceListA: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Kalkylkostnad
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formValues.calculationCost}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      calculationCost: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  placeholder="0,00"
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

              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Aktiv
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Markera om artikeln ska vara aktiv i Fortnox.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-border"
                    checked={formValues.active}
                    onChange={(event) =>
                      setFormValues((prev) => ({
                        ...prev,
                        active: event.target.checked,
                      }))
                    }
                  />
                  Aktiv
                </label>
              </div>

              {saveMessage && (
                <p className="text-sm text-emerald-600">{saveMessage}</p>
              )}
              {saveError && <p className="text-sm text-red-600">{saveError}</p>}

              <div className="mt-auto flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleCloseEditor}
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !hasFormChanges}
                  className="inline-flex h-11 min-w-[9rem] items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition enabled:hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 disabled:cursor-not-allowed disabled:bg-brand-400"
                >
                  {isSaving ? "Sparar…" : "Spara ändringar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
