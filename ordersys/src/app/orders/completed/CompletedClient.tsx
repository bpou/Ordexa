"use client";

import { useEffect, useState } from "react";
import { OrdinaLogoSpinner } from "@/components/OrdinaLoader";

type OrderRow = {
  orderNumber: string;
  title: string;
  customerName?: string | null;
  updatedAt: string;
};

export default function CompletedClient() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const allSelected = orders.length > 0 && orders.every(o => selected[o.orderNumber]);
  const someSelected = orders.some(o => selected[o.orderNumber]);
  const selectedIds = orders.filter(o => selected[o.orderNumber]).map(o => o.orderNumber);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/orders/completed", { cache: "no-store" });
        if (r.ok) {
          const json = await r.json();
          setOrders(json.orders ?? []);
        } else {
          setOrders([]);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function toggleOne(id: string) {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleAll() {
    if (allSelected) {
      const cleared: Record<string, boolean> = {};
      setSelected(cleared);
    } else {
      const filled: Record<string, boolean> = {};
      for (const o of orders) filled[o.orderNumber] = true;
      setSelected(filled);
    }
  }

  async function confirmBilling() {
    if (!someSelected) return;
    setBusy(true);
    try {
      const r = await fetch("/api/orders/confirm-billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumbers: selectedIds }),
      });
      if (r.ok) {
        // Ta bort de som bekräftats från listan (de blir "osynliga")
        setOrders(prev => prev.filter(o => !selectedIds.includes(o.orderNumber)));
        setSelected({});
      } else {
        alert("Kunde inte bekräfta fakturering.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Avslutade ordrar</h1>
        <p className="text-neutral-600 text-sm">
          Visar ordrar där alla avdelningar markerat <em>Avslutad</em>. Välj och klicka "Bekräfta fakturering" för att arkivera dem.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleAll}
          className="rounded-lg border px-3 py-2 text-sm bg-white hover:shadow"
          disabled={loading || orders.length === 0}
        >
          {allSelected ? "Avmarkera alla" : "Markera alla"}
        </button>

        <button
          onClick={confirmBilling}
          className={`rounded-lg px-3 py-2 text-sm text-white ${someSelected && !busy ? "bg-brand-600 hover:bg-brand-700" : "bg-neutral-300 cursor-not-allowed"}`}
          disabled={!someSelected || busy}
        >
          {busy ? (
            <div className="flex items-center gap-2">
              <OrdinaLogoSpinner size={18} />
              <span>Bekräftar…</span>
            </div>
          ) : (
            "Bekräfta fakturering"
          )}
        </button>
      </div>

      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-2 text-xs font-medium text-neutral-600 border-b">
          <div className="col-span-1">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              aria-label="Markera alla"
            />
          </div>
          <div className="col-span-3">Ordernummer</div>
          <div className="col-span-4">Titel</div>
          <div className="col-span-3">Kund</div>
          <div className="col-span-1 text-right">Uppdaterad</div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 px-4 py-3 text-neutral-500">
            <OrdinaLogoSpinner size={24} />
            <span>Laddar ordrar</span>
          </div>
        )}

        {!loading && orders.length === 0 && (
          <div className="px-4 py-3 text-neutral-500">Inga avslutade ordrar att visa.</div>
        )}

        {!loading &&
          orders.map((o) => (
            <div key={o.orderNumber} className="grid grid-cols-12 px-4 py-3 border-t items-center hover:bg-neutral-50">
              <div className="col-span-1">
                <input
                  type="checkbox"
                  checked={!!selected[o.orderNumber]}
                  onChange={() => toggleOne(o.orderNumber)}
                  aria-label={`Välj order ${o.orderNumber}`}
                />
              </div>
              <div className="col-span-3 font-medium">#{o.orderNumber}</div>
              <div className="col-span-4 truncate">{o.title}</div>
              <div className="col-span-3 truncate">{o.customerName ?? "—"}</div>
              <div className="col-span-1 text-right text-xs text-neutral-500">
                {new Date(o.updatedAt).toLocaleDateString("sv-SE")}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
