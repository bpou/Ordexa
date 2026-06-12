"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MuseoModerno } from "next/font/google";

type Customer = {
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
type Article  = { articleNumber: string; description: string; salesPrice?: number; unit?: string };
type Row      = { articleNumber?: string; description?: string; OrderedQuantity: number; price: number; unit?: string };
type Option   = { code: string; description?: string };

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[12px] font-medium text-foreground/80">{label}</span>
      {children}
    </label>
  );
}
function TInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "h-7 w-full rounded-md border border-border bg-white/95 px-2 text-[13px] text-foreground",
        "placeholder:text-foreground/50 shadow-[inset_0_1px_0_rgba(0,0,0,.03)]",
        "focus:outline-none focus:ring-2 focus:ring-primary/25",
        props.className || "",
      ].join(" ")}
    />
  );
}
function TSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={[
        "h-7 w-full rounded-md border border-border bg-white/95 px-2 text-[13px] text-foreground",
        "focus:outline-none focus:ring-2 focus:ring-primary/25",
        props.className || "",
      ].join(" ")}
    />
  );
}
function Divider() { return <div className="my-4 h-px bg-border" />; }
function CollapsibleSection({ title, defaultOpen = true, children, useGrid = true }:{
  title: string; defaultOpen?: boolean; children: React.ReactNode; useGrid?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="mt-6">
      <button type="button" onClick={() => setOpen(o=>!o)} aria-expanded={open}
        className="flex w-full items-center justify-between px-1 py-2 text-left hover:bg-black/5 rounded-md">
        <span className="text-[12px] tracking-wide font-semibold text-foreground/80 uppercase">{title}</span>
        <span className="text-[11px] text-foreground/60">{open ? "Dölj" : "Visa"}</span>
      </button>
      <div className="h-px bg-border" />
      <div className={["overflow-hidden transition-[max-height,opacity,margin] duration-300", open ? "opacity-100 mt-3" : "opacity-0 max-h-0 mt-0"].join(" ")}>
        {open && (
          <div className="rounded-lg border border-neutral-300 bg-white p-4">
            {useGrid ? <div className="grid grid-cols-12 gap-3">{children}</div> : <>{children}</>}
          </div>
        )}
      </div>
    </section>
  );
}

const museoModerno = MuseoModerno({ subsets: ["latin"], weight: ["400","700"] });

export default function NewQuoteClient({ defaultOurReference = "" }: { defaultOurReference?: string }) {
  // Bas
  const [title, setTitle] = useState("");
  const [customerName, setCustomerName] = useState("");

  // Offert-meta
  const [offerDate, setOfferDate] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [validUntil, setValidUntil] = useState<string>("");

  const [ourReference, setOurReference] = useState(() => defaultOurReference ?? "");
  const [yourReference, setYourReference] = useState("");

  // Prislista/leverans
  const [priceList, setPriceList] = useState<string>("");
  const [priceListOptions, setPriceListOptions] = useState<Option[]>([]);
  const [wayOfDelivery, setWayOfDelivery] = useState<string>("");
  const [wayOfDeliveryOptions, setWayOfDeliveryOptions] = useState<Option[]>([]);
  const [pricesInclVAT, setPricesInclVAT] = useState(false);

  // Kund/faktura
  const [invoiceName, setInvoiceName] = useState("");
  const [invoiceAddress1, setInvoiceAddress1] = useState("");
  const [invoiceAddress2, setInvoiceAddress2] = useState("");
  const [invoiceZip, setInvoiceZip] = useState("");
  const [invoiceCity, setInvoiceCity] = useState("");
  const [organisationNumber, setOrganisationNumber] = useState("");
  const [phone1, setPhone1] = useState("");
  const [email, setEmail] = useState("");

  // Leveransadress
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryName, setDeliveryName] = useState("");
  const [deliveryStreet, setDeliveryStreet] = useState("");
  const [deliveryZip, setDeliveryZip] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");

  // Kund/Artikel
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerNumber, setCustomerNumber] = useState<string>("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [articleQuery, setArticleQuery] = useState("");

  // Rader
  const [rows, setRows] = useState<Row[]>([{ OrderedQuantity: 1, price: 0 }]);
  const total = useMemo(() => rows.reduce((s, r) => s + (Number(r.price)||0)*(Number(r.OrderedQuantity)||0), 0), [rows]);

  // UI
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // fetch
  useEffect(() => {
    fetch("/api/fortnox/customers").then(r=>r.json()).then(j=>setCustomers(j.customers ?? [])).catch(()=>{});
    fetch("/api/fortnox/articles").then(r=>r.json()).then(j=>setArticles(j.articles ?? [])).catch(()=>{});
    fetch("/api/fortnox/wayofdeliveries").then(r=>r.json()).then(j=>setWayOfDeliveryOptions(j.wayOfDeliveries ?? j.items ?? [])).catch(()=>{});
    fetch("/api/fortnox/pricelists").then(r=>r.json()).then(j=>setPriceListOptions(j.priceLists ?? j.items ?? [])).catch(()=>{});
  }, []);
  useEffect(()=>{ if (!wayOfDelivery && wayOfDeliveryOptions.length) setWayOfDelivery(wayOfDeliveryOptions[0].code); },[wayOfDeliveryOptions,wayOfDelivery]);
  useEffect(()=>{ if (!priceList && priceListOptions.length) setPriceList(priceListOptions[0].code); },[priceListOptions,priceList]);

  const selectedCustomer = useMemo(()=>customers.find(c=>c.customerNumber===customerNumber),[customers,customerNumber]);
  useEffect(()=>{
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
    if (selectedCustomer.priceList) setPriceList(selectedCustomer.priceList);
  },[selectedCustomer]);

  const searchCustomers = async () => {
    const q = customerQuery.trim();
    const res = await fetch(q ? `/api/fortnox/customers?q=${encodeURIComponent(q)}` : "/api/fortnox/customers");
    const j = await res.json(); setCustomers(j.customers ?? []);
  };
  const searchArticles = async () => {
    const q = articleQuery.trim();
    const res = await fetch(q ? `/api/fortnox/articles?q=${encodeURIComponent(q)}` : "/api/fortnox/articles");
    const j = await res.json(); setArticles(j.articles ?? []);
  };

  const addRow = () => setRows(r=>[...r,{ OrderedQuantity: 1, price: 0 }]);
  const removeRow = (i:number)=> setRows(r=>r.filter((_,idx)=>idx!==i));
  const updateRow = (i:number, patch: Partial<Row>) => setRows(r=>r.map((row,idx)=> idx===i ? { ...row, ...patch } : row));

  async function submit() {
    setMsg(null);
    if (!title.trim())   { setMsg("Titel krävs."); return; }
    if (!customerNumber) { setMsg("Välj kund (Fortnox)."); return; }

    const frxRows = rows.map(r => ({
      ArticleNumber:   r.articleNumber || undefined,
      Description:     r.description  || title,
      OrderedQuantity: Number(r.OrderedQuantity || 1),
      Price:           Number(r.price || 0),
      Unit:            r.unit || "st",
    }));

    const body = {
      fortnox: {
        CustomerNumber: customerNumber,
        OfferDate:      offerDate || undefined,
        ValidUntil:     validUntil || undefined,
        OurReference:   ourReference || undefined,
        YourReference:  yourReference || undefined,
        PriceList:      priceList || undefined,
        VATIncluded:    !!pricesInclVAT,

        CustomerName:   invoiceName || undefined,
        Address1:       invoiceAddress1 || undefined,
        Address2:       invoiceAddress2 || undefined,
        ZipCode:        invoiceZip || undefined,
        City:           invoiceCity || undefined,
        OrganisationNumber: organisationNumber || undefined,
        Phone1:         phone1 || undefined,
        EmailInformation: email ? { EmailAddressTo: email } : undefined,

        DeliveryName:      deliveryName || undefined,
        DeliveryAddress1:  deliveryStreet || undefined,
        DeliveryAddress2:  deliveryAddress || undefined,
        DeliveryZipCode:   deliveryZip || undefined,
        DeliveryCity:      deliveryCity || undefined,
        WayOfDelivery:     wayOfDelivery || undefined,

        Remarks: title || undefined,
        OfferRows: frxRows,
      }
    };

    setSubmitting(true);
    try {
      const res  = await fetch("/api/fortnox/offers", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
      const json = await res.json();

      if (!res.ok) {
        const message = json?.fortnoxError ?? json?.error ?? res.statusText;
        setMsg("Fel: " + message);
        return;
      }

      const docNo = json?.fortnox?.DocumentNumber || json?.fortnox?.documentNumber;
      if (!docNo) { setMsg("Offert skapad men saknar DocumentNumber i svaret."); return; }

      window.location.href = `/quotes/${encodeURIComponent(docNo)}`;
    } catch {
      setMsg("Tekniskt fel vid skapande av offert.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1100px] p-4 md:p-6">
      <div className="mb-3 flex items-center justify-between">
        <h1 className={`${museoModerno.className} text-xl font-semibold`}>Ny offert</h1>
        <div className="flex gap-3">
          <Link href="/orders/overview" className="inline-flex items-center justify-center rounded-xl bg-brand-500 text-white px-4 py-2 text-sm font-medium hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-400">VISA LISTA</Link>
          <button className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white text-neutral-700 px-4 py-0.5 text-sm font-medium hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-300">
            <span className="text-lg">+</span> SKAPA OFFERT
          </button>
        </div>
        {submitting && <span className="text-[13px] text-foreground/60">Skapar offert...</span>}
      </div>

      <div className="rounded-[12px] border border-border bg-card p-4 md:p-5 shadow-sm">
        {/* Kund + datum */}
        <div className="grid grid-cols-12 gap-3">
          <Field label="Kund" className="col-span-12 sm:col-span-5">
            <div className="flex gap-2">
              <TInput placeholder="Sök kund..." value={customerQuery} onChange={(e)=>setCustomerQuery(e.target.value)} className="flex-1" />
              <button type="button" onClick={async ()=>{
                const q = customerQuery.trim();
                const res = await fetch(q ? `/api/fortnox/customers?q=${encodeURIComponent(q)}` : "/api/fortnox/customers");
                const j = await res.json(); setCustomers(j.customers ?? []);
              }} className="h-7 rounded-md border border-border bg-primary/10 px-3 text-[13px] text-primary hover:bg-primary/20">Sök</button>
            </div>
            <TSelect value={customerNumber} onChange={(e)=>setCustomerNumber(e.target.value)} className="mt-2">
              <option value=""> — välj kund — </option>
              {customers.map(c=>(
                <option key={c.customerNumber} value={c.customerNumber}>
                  {c.customerNumber} — {c.name}{c.city ? ` (${c.city})` : ""}
                </option>
              ))}
            </TSelect>
          </Field>

          <Field label="Offertdatum" className="col-span-6 sm:col-span-3">
            <TInput type="date" value={offerDate} onChange={(e)=>setOfferDate(e.target.value)} />
          </Field>

          <Field label="Giltig t.o.m." className="col-span-6 sm:col-span-4">
            <TInput type="date" value={validUntil} onChange={(e)=>setValidUntil(e.target.value)} />
          </Field>
        </div>

        {msg && <div className="mt-3 rounded-md border border-rose/30 bg-error-50 p-2 text-[13px] text-error-700">{msg}</div>}

        {/* Offertuppgifter */}
        <CollapsibleSection title="Offertuppgifter" defaultOpen>
          <Field label="Offertitel" className="col-span-12 sm:col-span-6">
            <TInput value={title} onChange={(e)=>setTitle(e.target.value)} />
          </Field>
          <Field label="Kundnamn (intern anteckning)" className="col-span-12 sm:col-span-6">
            <TInput value={customerName} onChange={(e)=>setCustomerName(e.target.value)} />
          </Field>
          <Field label="Vår referens" className="col-span-6 sm:col-span-3">
            <TInput value={ourReference} onChange={(e)=>setOurReference(e.target.value)} />
          </Field>
          <Field label="Er referens" className="col-span-6 sm:col-span-3">
            <TInput value={yourReference} onChange={(e)=>setYourReference(e.target.value)} />
          </Field>
          <Field label="Prislista" className="col-span-6 sm:col-span-3">
            <TSelect value={priceList} onChange={(e)=>setPriceList(e.target.value)}>
              <option value=""> — välj prislista — </option>
              {priceListOptions.map(p=>(
                <option key={p.code} value={p.code}>{p.code}{p.description ? ` — ${p.description}` : ""}</option>
              ))}
            </TSelect>
          </Field>
          <Field label="Priser inkl. moms" className="col-span-6 sm:col-span-3">
            <TSelect value={String(pricesInclVAT)} onChange={(e)=>setPricesInclVAT(e.target.value==="true")}>
              <option value="false">Nej</option>
              <option value="true">Ja</option>
            </TSelect>
          </Field>
        </CollapsibleSection>

        {/* Kunduppgifter */}
        <CollapsibleSection title="Kunduppgifter" defaultOpen={false}>
          <Field label="Namn" className="col-span-6 sm:col-span-3"><TInput value={invoiceName} onChange={(e)=>setInvoiceName(e.target.value)} /></Field>
          <Field label="Fakturaadress" className="col-span-6 sm:col-span-4"><TInput value={invoiceAddress1} onChange={(e)=>setInvoiceAddress1(e.target.value)} /></Field>
          <Field label="Postnr" className="col-span-6 sm:col-span-2"><TInput value={invoiceZip} onChange={(e)=>setInvoiceZip(e.target.value)} /></Field>
          <Field label="Ort" className="col-span-6 sm:col-span-3"><TInput value={invoiceCity} onChange={(e)=>setInvoiceCity(e.target.value)} /></Field>
          <Field label="Organisationsnummer" className="col-span-6 sm:col-span-3"><TInput value={organisationNumber} onChange={(e)=>setOrganisationNumber(e.target.value)} /></Field>
          <Field label="Fakturaadress 2" className="col-span-6 sm:col-span-4"><TInput value={invoiceAddress2} onChange={(e)=>setInvoiceAddress2(e.target.value)} /></Field>
          <Field label="Telefon" className="col-span-6 sm:col-span-2"><TInput value={phone1} onChange={(e)=>setPhone1(e.target.value)} /></Field>
          <Field label="E-post" className="col-span-6 sm:col-span-3"><TInput type="email" value={email} onChange={(e)=>setEmail(e.target.value)} /></Field>
        </CollapsibleSection>

        {/* Leveransuppgifter */}
        <CollapsibleSection title="Leveransuppgifter" defaultOpen={false}>
          <Field label="Namn" className="col-span-6 sm:col-span-3"><TInput value={deliveryName} onChange={(e)=>setDeliveryName(e.target.value)} /></Field>
          <Field label="Leveransadress" className="col-span-6 sm:col-span-4"><TInput value={deliveryStreet} onChange={(e)=>setDeliveryStreet(e.target.value)} /></Field>
          <Field label="Postnr" className="col-span-6 sm:col-span-2"><TInput value={deliveryZip} onChange={(e)=>setDeliveryZip(e.target.value)} /></Field>
          <Field label="Ort" className="col-span-6 sm:col-span-3"><TInput value={deliveryCity} onChange={(e)=>setDeliveryCity(e.target.value)} /></Field>
          <Field label="Leveransadress 2" className="col-span-12 sm:col-span-7"><TInput value={deliveryAddress} onChange={(e)=>setDeliveryAddress(e.target.value)} placeholder="Fritt textfält" /></Field>
          <Field label="Leveranssätt" className="col-span-12 sm:col-span-5">
            <TSelect value={wayOfDelivery} onChange={(e)=>setWayOfDelivery(e.target.value)}>
              <option value=""> — välj leveranssätt — </option>
              {wayOfDeliveryOptions.map(w=>(
                <option key={w.code} value={w.code}>{w.code}{w.description ? ` — ${w.description}` : ""}</option>
              ))}
            </TSelect>
          </Field>
          <Divider />
        </CollapsibleSection>

        {/* Rader */}
        <CollapsibleSection title="Offertrader" defaultOpen>
          <div className="col-span-12 space-y-2">
            <div className="rounded-md border">
              <div className="grid grid-cols-12 bg-background/60 text-[12px] font-medium">
                <div className="col-span-2 border-r px-2 py-2">ARTIKELNR</div>
                <div className="col-span-5 border-r px-2 py-2">BENÄMNING</div>
                <div className="col-span-1 border-r px-2 py-2">ENHET</div>
                <div className="col-span-2 border-r px-2 py-2">Å-PRIS</div>
                <div className="col-span-2 px-2 py-2">SUMMA</div>
              </div>

              <div className="border-t px-2 py-2">
                <div className="flex gap-2">
                  <TInput placeholder="Sök artikel..." value={articleQuery} onChange={(e)=>setArticleQuery(e.target.value)} className="max-w-[300px]" />
                  <button type="button" onClick={async ()=>{
                    const q = articleQuery.trim();
                    const res = await fetch(q ? `/api/fortnox/articles?q=${encodeURIComponent(q)}` : "/api/fortnox/articles");
                    const j = await res.json(); setArticles(j.articles ?? []);
                  }} className="h-7 rounded-md border border-border bg-primary/10 px-3 text-[13px] text-primary hover:bg-primary/20">Sök</button>
                </div>
              </div>

              {rows.map((row,i)=>{
                const lineTotal = (Number(row.price)||0) * (Number(row.OrderedQuantity)||0);
                return (
                  <div key={i} className="grid grid-cols-12 border-t">
                    <div className="col-span-2 px-2 py-2">
                      <TSelect value={row.articleNumber ?? ""} onChange={(e)=>{
                        const articleNumber = e.target.value || undefined;
                        const art = articles.find(a=>a.articleNumber===articleNumber);
                        setRows(r => r.map((rw,idx)=> idx===i ? {
                          ...rw,
                          articleNumber,
                          description: art?.description ?? rw.description,
                          price: typeof art?.salesPrice==="number" ? art.salesPrice : rw.price,
                          unit: art?.unit ?? rw.unit
                        } : rw));
                      }}>
                        <option value="">Artikel</option>
                        {articles.map(a=>(
                          <option key={a.articleNumber} value={a.articleNumber}>{a.articleNumber}</option>
                        ))}
                      </TSelect>
                    </div>

                    <div className="col-span-5 px-2 py-2">
                      <TInput placeholder="Beskrivning" value={row.description ?? ""} onChange={(e)=>setRows(r=>r.map((rw,idx)=>idx===i?{...rw,description:e.target.value}:rw))} />
                    </div>

                    <div className="col-span-1 px-2 py-2">
                      <TInput placeholder="st" value={row.unit ?? "st"} onChange={(e)=>setRows(r=>r.map((rw,idx)=>idx===i?{...rw,unit:e.target.value}:rw))} />
                    </div>

                    <div className="col-span-2 px-2 py-2">
                      <div className="flex gap-2">
                        <TInput type="number" step="0.01" placeholder="Pris" value={row.price} onChange={(e)=>setRows(r=>r.map((rw,idx)=>idx===i?{...rw,price:Number(e.target.value||0)}:rw))} />
                        <TInput type="number" placeholder="Antal" value={row.OrderedQuantity} onChange={(e)=>setRows(r=>r.map((rw,idx)=>idx===i?{...rw,OrderedQuantity:Number(e.target.value||0)}:rw))} className="w-[80px]" />
                      </div>
                    </div>

                    <div className="col-span-2 px-2 py-2 flex items-center justify-between">
                      <span className="text-[13px]">{lineTotal.toLocaleString("sv-SE",{ style:"currency", currency:"SEK"})}</span>
                      <button type="button" onClick={()=>removeRow(i)} className="bg-error-500 text-white rounded-xl px-3 py-1 text-xs font-medium hover:bg-error-600 focus:outline-none focus:ring-2 focus:ring-error-400">Ta bort</button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between">
              <button type="button" onClick={addRow} className="inline-flex items-center justify-center rounded-xl bg-brand-500/50 text-white px-4 py-2 text-sm font-medium hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-400">+ Lägg till rad</button>
              <div className="rounded-md border bg-card p-3 text-[13px]">
                <div className="flex justify-between gap-8"><span>Nettobelopp</span><span className="font-semibold">{total.toLocaleString("sv-SE",{ style:"currency", currency:"SEK"})}</span></div>
                <div className="mt-2 border-t pt-2 flex justify-between font-semibold text-[14px]"><span>Summa</span><span>{total.toLocaleString("sv-SE",{ style:"currency", currency:"SEK"})}</span></div>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        <div className="mt-5 flex items-center justify-end">
          <button onClick={submit} disabled={submitting} className="inline-flex items-center justify-center rounded-xl bg-brand-500 text-white px-4 py-2 text-sm font-medium hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-400">Skapa offert</button>
        </div>
      </div>
    </div>
  );
}
