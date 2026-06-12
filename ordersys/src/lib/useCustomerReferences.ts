import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type CustomerReference = {
  id: string;
  customerNumber: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  note?: string | null;
};

type MutationPayload = Partial<Pick<CustomerReference, "name" | "email" | "phone" | "note">>;

export function useCustomerReferences(customerNumber: string) {
  const [references, setReferences] = useState<CustomerReference[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);

  const controllerRef = useRef<AbortController | null>(null);

  const sortedReferences = useMemo(() => {
    return [...references].sort((a, b) => a.name.localeCompare(b.name, "sv"));
  }, [references]);

  const fetchReferences = useCallback(async () => {
    if (!customerNumber) {
      setReferences([]);
      setError(null);
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/customer-references?customerNumber=${encodeURIComponent(customerNumber)}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller.signal,
          cache: "no-store",
        }
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || res.statusText || "Failed to load references");
      }

      const json = await res.json();
      setReferences(Array.isArray(json?.references) ? json.references : []);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("Failed to fetch customer references:", err);
      setError(err?.message ?? "Kunde inte hämta referenser");
      setReferences([]);
    } finally {
      setLoading(false);
    }
  }, [customerNumber]);

  useEffect(() => {
    fetchReferences();
    return () => controllerRef.current?.abort();
  }, [fetchReferences]);

  const addReference = useCallback(
    async (payload: { name: string; email?: string; phone?: string; note?: string }) => {
      if (!customerNumber) throw new Error("customerNumber saknas");
      const name = payload.name?.trim();
      if (!name) throw new Error("Namn krävs");

      setMutating(true);
      try {
        const res = await fetch("/api/customer-references", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerNumber,
            name,
            email: payload.email?.trim() || undefined,
            phone: payload.phone?.trim() || undefined,
            note: payload.note?.trim() || undefined,
          }),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || res.statusText || "Kunde inte spara referens");
        }

        const json = await res.json();
        const reference: CustomerReference | undefined = json?.reference;
        if (reference) {
          setReferences((prev) => [...prev, reference]);
        }
        return reference;
      } finally {
        setMutating(false);
      }
    },
    [customerNumber]
  );

  const updateReference = useCallback(
    async (id: string, payload: MutationPayload) => {
      if (!id) throw new Error("Saknar referens-ID");
      setMutating(true);
      try {
        const res = await fetch(`/api/customer-references/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || res.statusText || "Kunde inte uppdatera referens");
        }

        const json = await res.json();
        const reference: CustomerReference | undefined = json?.reference;
        if (reference) {
          setReferences((prev) => prev.map((item) => (item.id === reference.id ? reference : item)));
        }
        return reference;
      } finally {
        setMutating(false);
      }
    },
    []
  );

  const deleteReference = useCallback(async (id: string) => {
    if (!id) throw new Error("Saknar referens-ID");
    setMutating(true);
    try {
      const res = await fetch(`/api/customer-references/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || res.statusText || "Kunde inte ta bort referens");
      }

      setReferences((prev) => prev.filter((item) => item.id !== id));
      return true;
    } finally {
      setMutating(false);
    }
  }, []);

  return {
    references: sortedReferences,
    loading,
    error,
    mutating,
    refresh: fetchReferences,
    addReference,
    updateReference,
    deleteReference,
  };
}
