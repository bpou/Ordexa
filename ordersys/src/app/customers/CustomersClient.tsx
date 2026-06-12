"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Plus,
} from "lucide-react";

type Customer = {
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

type ApiCustomerResponse = {
  customers?: Customer[];
  meta?: {
    currentPage?: number;
    totalPages?: number;
    totalResources?: number;
    pageSize?: number;
  };
};

const PAGE_LIMIT = 100;

const STATUS_FILTERS = [
  { key: "ALL", label: "Alla" },
  { key: "ACTIVE", label: "Aktiva" },
  { key: "INACTIVE", label: "Inaktiva" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["key"];

type AdvancedFilters = {
  customerNumber: string;
  name: string;
  zipCode: string;
  city: string;
  email: string;
  phone: string;
  organisationNumber: string;
  sortBy: "customernumber" | "name";
};

const defaultAdvancedFilters: AdvancedFilters = {
  customerNumber: "",
  name: "",
  zipCode: "",
  city: "",
  email: "",
  phone: "",
  organisationNumber: "",
  sortBy: "customernumber",
};

function cleanText(value?: string | null) {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : "-";
}

type CustomersClientProps = {
  canCreate?: boolean;
};

export default function CustomersClient({ canCreate = false }: CustomersClientProps) {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(
    defaultAdvancedFilters
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<ApiCustomerResponse["meta"]>({
    currentPage: 1,
    totalPages: undefined,
    totalResources: undefined,
    pageSize: PAGE_LIMIT,
  });

  const fetchCustomers = useCallback(
    async ({
      targetPage,
      overrideQuery,
      overrideStatus,
      overrideAdvanced,
    }: {
      targetPage?: number;
      overrideQuery?: string;
      overrideStatus?: StatusFilter;
      overrideAdvanced?: AdvancedFilters;
    } = {}) => {
      const nextPage = targetPage ?? page;
      const nextQuery = overrideQuery ?? query;
      const nextStatus = overrideStatus ?? statusFilter;
      const nextAdvanced = overrideAdvanced ?? advancedFilters;

      setIsLoading(true);
      setLoadError(null);

      try {
        const params = new URLSearchParams();
        params.set("page", String(nextPage));
        params.set("limit", String(PAGE_LIMIT));

        if (nextQuery.trim()) {
          params.set("q", nextQuery.trim());
        }

        if (nextStatus === "ACTIVE") {
          params.set("filter", "active");
        } else if (nextStatus === "INACTIVE") {
          params.set("filter", "inactive");
        }

        if (nextAdvanced.customerNumber.trim()) {
          params.set("customernumber", nextAdvanced.customerNumber.trim());
        }
        if (nextAdvanced.name.trim()) {
          params.set("name", nextAdvanced.name.trim());
        }
        if (nextAdvanced.zipCode.trim()) {
          params.set("zipcode", nextAdvanced.zipCode.trim());
        }
        if (nextAdvanced.city.trim()) {
          params.set("city", nextAdvanced.city.trim());
        }
        if (nextAdvanced.email.trim()) {
          params.set("email", nextAdvanced.email.trim());
        }
        if (nextAdvanced.phone.trim()) {
          params.set("phone", nextAdvanced.phone.trim());
        }
        if (nextAdvanced.organisationNumber.trim()) {
          params.set(
            "organisationnumber",
            nextAdvanced.organisationNumber.trim()
          );
        }
        params.set("sortby", nextAdvanced.sortBy);

        const res = await fetch(`/api/fortnox/customers?${params.toString()}`);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Kunde inte hamta kunder.");
        }

        const json = (await res.json()) as ApiCustomerResponse;
        const items = Array.isArray(json.customers) ? json.customers : [];

        const validIds = new Set(
          items.map((item) => String(item.customerNumber || item.name || ""))
        );
        setCustomers(items);
        setSelectedIds((prev) => {
          const next = new Set<string>();
          prev.forEach((id) => {
            if (validIds.has(id)) next.add(id);
          });
          return next;
        });

        setMeta({
          currentPage: Number(json.meta?.currentPage ?? nextPage),
          totalPages:
            json.meta?.totalPages !== undefined
              ? Number(json.meta.totalPages)
              : undefined,
          totalResources:
            json.meta?.totalResources !== undefined
              ? Number(json.meta.totalResources)
              : undefined,
          pageSize:
            json.meta?.pageSize !== undefined
              ? Number(json.meta.pageSize)
              : PAGE_LIMIT,
        });
      } catch (error: any) {
        setLoadError(
          error?.message ?? "Ett fel intraffade vid hamtning av kunder."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [advancedFilters, page, query, statusFilter]
  );

  useEffect(() => {
    void fetchCustomers({ targetPage: 1 });
  }, [fetchCustomers]);

  const hasAdvancedFilters = useMemo(
    () =>
      Boolean(
        advancedFilters.customerNumber.trim() ||
          advancedFilters.name.trim() ||
          advancedFilters.zipCode.trim() ||
          advancedFilters.city.trim() ||
          advancedFilters.email.trim() ||
          advancedFilters.phone.trim() ||
          advancedFilters.organisationNumber.trim() ||
          advancedFilters.sortBy !== "customernumber"
      ),
    [advancedFilters]
  );

  const isAllSelected =
    customers.length > 0 &&
    customers.every((customer) =>
      selectedIds.has(String(customer.customerNumber || customer.name || ""))
    );

  const selectedCount = selectedIds.size;
  const activeCount = useMemo(
    () => customers.filter((customer) => customer.active ?? true).length,
    [customers]
  );

  const currentPage = Number(meta?.currentPage ?? page ?? 1);
  const totalPages = meta?.totalPages;
  const hasPrevPage = currentPage > 1;
  const hasNextPage =
    typeof totalPages === "number"
      ? currentPage < totalPages
      : customers.length >= PAGE_LIMIT;

  const handleStatusChange = (nextStatus: StatusFilter) => {
    setStatusFilter(nextStatus);
    setPage(1);
    void fetchCustomers({ targetPage: 1, overrideStatus: nextStatus });
  };

  const handleSubmitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuery = searchInput.trim();
    setQuery(nextQuery);
    setPage(1);
    void fetchCustomers({ targetPage: 1, overrideQuery: nextQuery });
  };

  const handleRefresh = () => {
    void fetchCustomers({ targetPage: currentPage });
  };

  const handleToggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = customers.every((customer) =>
        next.has(String(customer.customerNumber || customer.name || ""))
      );
      if (allSelected) {
        customers.forEach((customer) =>
          next.delete(String(customer.customerNumber || customer.name || ""))
        );
      } else {
        customers.forEach((customer) =>
          next.add(String(customer.customerNumber || customer.name || ""))
        );
      }
      return next;
    });
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApplyAdvancedFilters = () => {
    setPage(1);
    void fetchCustomers({ targetPage: 1, overrideAdvanced: advancedFilters });
  };

  const handleResetAdvancedFilters = () => {
    setAdvancedFilters(defaultAdvancedFilters);
    setPage(1);
    void fetchCustomers({
      targetPage: 1,
      overrideAdvanced: defaultAdvancedFilters,
    });
  };

  const goToPage = (nextPage: number) => {
    if (nextPage < 1) return;
    setPage(nextPage);
    void fetchCustomers({ targetPage: nextPage });
  };

  const Pagination = (
    <div className="flex items-center gap-2 text-xs">
      <button
        type="button"
        onClick={() => goToPage(1)}
        disabled={!hasPrevPage}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#dfe3d8] text-[#596352] hover:border-[#8ebe3f] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronsLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => goToPage(currentPage - 1)}
        disabled={!hasPrevPage}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#dfe3d8] text-[#596352] hover:border-[#8ebe3f] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="rounded-lg border border-[#dfe3d8] bg-white px-3 py-1 font-semibold text-[#2f352a]">
        {currentPage}
      </span>
      <button
        type="button"
        onClick={() => goToPage(currentPage + 1)}
        disabled={!hasNextPage}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#dfe3d8] text-[#596352] hover:border-[#8ebe3f] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => goToPage(totalPages ?? currentPage + 1)}
        disabled={!hasNextPage}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#dfe3d8] text-[#596352] hover:border-[#8ebe3f] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronsRight className="h-4 w-4" />
      </button>
    </div>
  );

  return (
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
                Kunder
              </h1>
              <p className="text-sm text-[#5b6453] lg:max-w-2xl">
                Kundregister i samma uttryck som artiklar, med Fortnox-filter,
                statusval och snabb oversikt.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            {canCreate ? (
              <button
                type="button"
                onClick={() => router.push("/customers/new")}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#2f6b49] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#26553a]"
              >
                <Plus className="h-4 w-4" />
                Ny kund
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/60 bg-white/70 px-4 py-2 text-sm font-semibold text-[#2f352a] shadow hover:border-white hover:bg-white"
            >
              <RefreshCcw className="h-4 w-4 text-[#5d6756]" />
              Uppdatera
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[#6f7967]">
              Totalt
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {meta?.totalResources ?? customers.length}
            </p>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[#6f7967]">
              Aktiva
            </p>
            <p className="mt-1 text-2xl font-semibold">{activeCount}</p>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[#6f7967]">
              Markerade
            </p>
            <p className="mt-1 text-2xl font-semibold">{selectedCount}</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-[#dfe3d8] bg-white shadow-soft">
        <div className="border-b border-[#e5e9dc] px-6 py-5">
          <div className="mb-4 flex flex-wrap gap-2">
            {STATUS_FILTERS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => handleStatusChange(option.key)}
                className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                  statusFilter === option.key
                    ? "border-[#2f6b49] bg-[#2f6b49] text-white"
                    : "border-[#dfe3d8] bg-[#f7faf1] text-[#55604f] hover:border-[#8ebe3f] hover:text-[#2f6b49]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <form
              onSubmit={handleSubmitSearch}
              className="flex w-full max-w-2xl items-center gap-2 rounded-2xl border border-[#dfe3d8] bg-[#f9fbf6] p-2"
            >
              <Search className="ml-2 h-4 w-4 text-[#7a8572]" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Sok pa kundnummer eller namn"
                className="h-10 flex-1 bg-transparent px-2 text-sm text-[#2f352a] outline-none"
              />
              <button
                type="submit"
                className="inline-flex h-10 items-center rounded-xl bg-[#2f6b49] px-4 text-sm font-semibold text-white hover:bg-[#26553a]"
              >
                Sok
              </button>
            </form>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAdvancedFiltersOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-xl border border-[#dfe3d8] bg-white px-4 py-2 text-sm font-semibold text-[#55604f] hover:border-[#8ebe3f] hover:text-[#2f6b49]"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filter
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    advancedFiltersOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {Pagination}
            </div>
          </div>

          {advancedFiltersOpen ? (
            <div className="mt-4 rounded-2xl border border-[#e2e7d9] bg-[#fbfdf8] p-4">
              <div className="grid gap-3 md:grid-cols-4">
                <label className="text-xs font-semibold uppercase tracking-wide text-[#68705f]">
                  Kundnr
                  <input
                    value={advancedFilters.customerNumber}
                    onChange={(event) =>
                      setAdvancedFilters((prev) => ({
                        ...prev,
                        customerNumber: event.target.value,
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-[#dfe3d8] bg-white px-3 text-sm text-[#2f352a] outline-none focus:border-[#8ebe3f]"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-[#68705f]">
                  Namn
                  <input
                    value={advancedFilters.name}
                    onChange={(event) =>
                      setAdvancedFilters((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-[#dfe3d8] bg-white px-3 text-sm text-[#2f352a] outline-none focus:border-[#8ebe3f]"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-[#68705f]">
                  Org/Persnr
                  <input
                    value={advancedFilters.organisationNumber}
                    onChange={(event) =>
                      setAdvancedFilters((prev) => ({
                        ...prev,
                        organisationNumber: event.target.value,
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-[#dfe3d8] bg-white px-3 text-sm text-[#2f352a] outline-none focus:border-[#8ebe3f]"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-[#68705f]">
                  Sortera
                  <select
                    value={advancedFilters.sortBy}
                    onChange={(event) =>
                      setAdvancedFilters((prev) => ({
                        ...prev,
                        sortBy: event.target.value as "customernumber" | "name",
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-[#dfe3d8] bg-white px-3 text-sm text-[#2f352a] outline-none focus:border-[#8ebe3f]"
                  >
                    <option value="customernumber">Kundnummer</option>
                    <option value="name">Namn</option>
                  </select>
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-[#68705f]">
                  Postnr
                  <input
                    value={advancedFilters.zipCode}
                    onChange={(event) =>
                      setAdvancedFilters((prev) => ({
                        ...prev,
                        zipCode: event.target.value,
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-[#dfe3d8] bg-white px-3 text-sm text-[#2f352a] outline-none focus:border-[#8ebe3f]"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-[#68705f]">
                  Ort
                  <input
                    value={advancedFilters.city}
                    onChange={(event) =>
                      setAdvancedFilters((prev) => ({
                        ...prev,
                        city: event.target.value,
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-[#dfe3d8] bg-white px-3 text-sm text-[#2f352a] outline-none focus:border-[#8ebe3f]"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-[#68705f]">
                  Telefon
                  <input
                    value={advancedFilters.phone}
                    onChange={(event) =>
                      setAdvancedFilters((prev) => ({
                        ...prev,
                        phone: event.target.value,
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-[#dfe3d8] bg-white px-3 text-sm text-[#2f352a] outline-none focus:border-[#8ebe3f]"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-[#68705f]">
                  E-post
                  <input
                    value={advancedFilters.email}
                    onChange={(event) =>
                      setAdvancedFilters((prev) => ({
                        ...prev,
                        email: event.target.value,
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-[#dfe3d8] bg-white px-3 text-sm text-[#2f352a] outline-none focus:border-[#8ebe3f]"
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleApplyAdvancedFilters}
                  className="inline-flex items-center justify-center rounded-xl bg-[#2f6b49] px-4 py-2 text-sm font-semibold text-white hover:bg-[#26553a]"
                >
                  Anvand filter
                </button>
                <button
                  type="button"
                  onClick={handleResetAdvancedFilters}
                  disabled={!hasAdvancedFilters}
                  className="inline-flex items-center justify-center rounded-xl border border-[#dfe3d8] px-4 py-2 text-sm font-semibold text-[#5f6858] transition hover:border-[#8ebe3f] hover:text-[#2f6b49] disabled:cursor-not-allowed disabled:text-[#b1b8aa]"
                >
                  Rensa filter
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="relative">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/75 backdrop-blur-sm">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#dfe3d8] border-t-[#2f6b49]" />
            </div>
          )}

          {loadError ? (
            <div className="px-6 py-16 text-center text-sm text-red-600">
              {loadError}
            </div>
          ) : customers.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-[#68705f]">
              <p className="font-semibold text-[#2f352a]">
                Inga kunder hittades
              </p>
              <p className="mt-1 text-sm">
                Prova att anpassa sokningen eller filtren.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-fixed text-sm">
                <thead className="bg-[#f5f8ed] text-[11px] uppercase tracking-[0.28em] text-[#7a8572]">
                  <tr>
                    <th className="w-10 px-3 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border border-[#cfd5c6]"
                        checked={isAllSelected}
                        onChange={handleToggleSelectAll}
                      />
                    </th>
                    <th className="w-36 px-3 py-3 text-left">Kundnr</th>
                    <th className="min-w-[16rem] px-3 py-3 text-left">Namn</th>
                    <th className="w-44 px-3 py-3 text-left">Org-/Persnr</th>
                    <th className="w-28 px-3 py-3 text-left">Postnr</th>
                    <th className="w-44 px-3 py-3 text-left">Ort</th>
                    <th className="w-44 px-3 py-3 text-left">Land</th>
                    <th className="w-44 px-3 py-3 text-left">Telefon</th>
                    <th className="w-56 px-3 py-3 text-left">E-post</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef1e4] text-[#2f352a]">
                  {customers.map((customer) => {
                    const rowId = String(
                      customer.customerNumber || customer.name || ""
                    );
                    const isSelected = selectedIds.has(rowId);
                    return (
                      <tr
                        key={rowId}
                        className={`transition-colors hover:bg-[#f7faf1] ${
                          isSelected ? "bg-[#edf6de]" : "bg-white"
                        }`}
                      >
                        <td className="px-3 py-3 align-top">
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border border-[#cfd5c6]"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(rowId)}
                          />
                        </td>
                        <td className="px-3 py-3">{cleanText(customer.customerNumber)}</td>
                        <td className="px-3 py-3">{cleanText(customer.name)}</td>
                        <td className="px-3 py-3">
                          {cleanText(customer.organisationNumber)}
                        </td>
                        <td className="px-3 py-3">{cleanText(customer.zipCode)}</td>
                        <td className="px-3 py-3">{cleanText(customer.city)}</td>
                        <td className="px-3 py-3">{cleanText(customer.country)}</td>
                        <td className="px-3 py-3">{cleanText(customer.phone)}</td>
                        <td className="px-3 py-3">{cleanText(customer.email)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="border-t border-[#e5e9dc] bg-[#f9fbf4] px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#607059]">
              Sida {currentPage}
              {typeof totalPages === "number" ? ` av ${totalPages}` : ""}
            </p>
            {Pagination}
          </div>
        </div>
      </section>
    </div>
  );
}
