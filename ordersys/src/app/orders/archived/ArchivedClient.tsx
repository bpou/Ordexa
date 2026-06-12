"use client";

import { useEffect, useState } from "react";
import { OrdinaLogoSpinner } from "@/components/OrdinaLoader";

type OrderRow = {
  orderNumber: string;
  title: string;
  customerName?: string | null;
  billingConfirmedAt: string;
};

export default function ArchivedClient() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/orders/archived", { cache: "no-store" });
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

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Arkiverade ordrar</h1>
        <p className="text-neutral-600 text-sm">
          Visar ordrar som har bekräftats som fakturerade och arkiverats.
        </p>
      </div>

      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-2 text-xs font-medium text-neutral-600 border-b">
          <div className="col-span-3">Ordernummer</div>
          <div className="col-span-4">Titel</div>
          <div className="col-span-3">Kund</div>
          <div className="col-span-2 text-right">Fakturerad</div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 px-4 py-3 text-neutral-500">
            <OrdinaLogoSpinner size={24} />
            <span>Laddar arkiverade ordrar</span>
          </div>
        )}

        {!loading && orders.length === 0 && (
          <div className="px-4 py-3 text-neutral-500">Inga arkiverade ordrar att visa.</div>
        )}

        {!loading &&
          orders.map((o) => (
            <div key={o.orderNumber} className="grid grid-cols-12 px-4 py-3 border-t items-center hover:bg-neutral-50">
              <div className="col-span-3 font-medium">#{o.orderNumber}</div>
              <div className="col-span-4 truncate">{o.title}</div>
              <div className="col-span-3 truncate">{o.customerName ?? "—"}</div>
              <div className="col-span-2 text-right text-xs text-neutral-500">
                {new Date(o.billingConfirmedAt).toLocaleDateString("sv-SE")}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}