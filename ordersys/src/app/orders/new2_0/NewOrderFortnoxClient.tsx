"use client";


import CalendarModal from "@/components/calendar/CalendarModal";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ChangeEvent, CSSProperties } from "react";

import { motion, AnimatePresence } from "framer-motion";

import {

  DndContext,

  PointerSensor,

  type DragEndEvent,

  type DragStartEvent,

  useDraggable,

  useDroppable,

  useSensor,

  useSensors,

} from "@dnd-kit/core";

import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

import { CSS } from "@dnd-kit/utilities";

import Link from "next/link";

import { AnimatedSelect } from "@/components/AnimatedSelect";

import { CustomerReferencePicker } from "@/components/CustomerReferencePicker";

import { useNewOrderForm } from "../new/useNewOrderForm";

import type { Account, AppTrack, Article, Row } from "../new/useNewOrderForm";

import { popEntryTransfer } from "@/lib/draftTransfer";



type FieldProps = {

  label: string;

  children: React.ReactNode;

  className?: string;

};




function FortnoxField({ label, children, className = "" }: FieldProps) {

  return (

    <label className={`flex flex-col gap-1 text-[12px] text-[#3a4036] ${className}`}>

      <span className="font-semibold uppercase tracking-[0.08em] text-[#65705f]">{label}</span>

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



type SectionProps = {

  title: string;

  children: React.ReactNode;

  defaultOpen?: boolean;

};



function FortnoxSection({ title, children, defaultOpen = true }: SectionProps) {
   const [open, setOpen] = useState(defaultOpen);

   return (
     <section className="rounded-md border border-[#d9ddd4] bg-white shadow-sm">
       <button
         type="button"
         onClick={() => setOpen((prev) => !prev)}
         className="flex w-full items-center gap-4 bg-[#f1f3ee] px-4 py-3 text-left"
       >
         <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#4f5a49]">{title}</span>
         <motion.span
           animate={{ rotate: open ? 180 : 0 }}
           transition={{ duration: 0.2 }}
           className="text-[12px] text-[#7c8276]"
         >
           ▼
         </motion.span>
       </button>
       <AnimatePresence>
         {open && (
           <motion.div
             initial={{ height: 0, opacity: 0 }}
             animate={{ height: "auto", opacity: 1 }}
             exit={{ height: 0, opacity: 0 }}
             transition={{ duration: 0.3, ease: "easeInOut" }}
             className="border-t border-[#d9ddd4] px-4 py-4 overflow-hidden"
           >
             {children}
           </motion.div>
         )}
       </AnimatePresence>
     </section>
   );
 }


const DEFAULT_VAT_PERCENT = 25;

type ManualSlot = {
  start?: string;
  end?: string;
};

const TRACK_ORDER: AppTrack[] = ["A", "B", "C", "D"];

const TRACK_LABELS: Record<AppTrack, string> = {
  A: "Spar A",
  B: "Spar B",
  C: "Spar C",
  D: "Spar D",
};

const TRACK_STYLES: Record<AppTrack, { badge: string; border: string; dot: string }> = {
  A: { badge: "bg-pink-100 text-pink-700", border: "border-pink-200", dot: "bg-pink-500" },
  B: { badge: "bg-blue-100 text-blue-700", border: "border-blue-200", dot: "bg-blue-500" },
  C: { badge: "bg-amber-100 text-amber-700", border: "border-amber-200", dot: "bg-amber-500" },
  D: { badge: "bg-emerald-100 text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
};

type PlanningSectionProps = {
  calendarOpen: boolean;
  setCalendarOpen: (open: boolean) => void;
  tracks: AppTrack[];
  setTracks: (tracks: AppTrack[] | ((prev: AppTrack[]) => AppTrack[])) => void;
  manualA: ManualSlot;
  manualB: ManualSlot;
  manualC: ManualSlot;
  manualD: ManualSlot;
  formatManualSlotRange: (slot?: ManualSlot) => string | null;
};

function PlanningSection({
  calendarOpen,
  setCalendarOpen,
  tracks,
  setTracks,
  manualA,
  manualB,
  manualC,
  manualD,
  formatManualSlotRange,
}: PlanningSectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <section className="rounded-xl border border-[#d9ddd4] bg-white shadow-sm">
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between bg-[#f1f3ee] px-6 py-4 text-left cursor-pointer"
      >
        <div>
          <h3 className="text-lg font-semibold text-[#2d3329] uppercase tracking-wide">
            Planering
          </h3>
          <p className="text-sm text-[#6b7165] mt-1">
            Välj vilka spår som ska användas och planera tider i kalendern
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setCalendarOpen(true)}
            className="inline-flex items-center gap-3 rounded-lg bg-[#8ebe3f] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#7cab38] hover:shadow-md"
          >
            <span className="text-lg">🗓</span>
            Öppna kalender
          </button>
          <motion.span
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-[12px] text-[#7c8276]"
          >
            ▼
          </motion.span>
        </div>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="px-6 pb-6 overflow-hidden"
          >
            {/* Track Selection */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-[#4f5a49] uppercase tracking-wide mb-3">
                Aktiva spår
              </h4>
              <div className="flex flex-wrap gap-4">
                {(["A", "B", "C", "D"] as const).map((track) => (
                  <label
                    key={track}
                    className="flex items-center gap-3 p-3 rounded-lg border border-[#cbcfc4] bg-[#f8faf7] hover:bg-[#f1f3ee] transition cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#8ebe3f] rounded"
                      checked={tracks.includes(track)}
                      onChange={(e) =>
                        setTracks((prev) =>
                          e.target.checked
                            ? Array.from(new Set([...prev, track]))
                            : prev.filter((t) => t !== track)
                        )
                      }
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#2d3329]">Spar {track}</span>
                      {(() => {
                        const slot = track === "A" ? manualA : track === "B" ? manualB : track === "C" ? manualC : manualD;
                        return slot.start && slot.end ? (
                          <span className="text-xs text-[#8ebe3f] font-medium bg-[#eef4e4] px-2 py-1 rounded">
                            {formatManualSlotRange(slot)}
                          </span>
                        ) : (
                          <span className="text-xs text-[#7c8276]">Ej planerad</span>
                        );
                      })()}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Planning Status */}
            <div className="bg-[#f8faf7] rounded-lg p-4 border border-[#d9ddd4]">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-[#4f5a49]">Planeringsstatus</span>
                {tracks.some(track => {
                  const slot = track === "A" ? manualA : track === "B" ? manualB : track === "C" ? manualC : manualD;
                  return slot.start && slot.end;
                }) ? (
                  <span className="inline-flex items-center gap-1 text-xs text-[#8ebe3f] font-medium">
                    âœ“ Några spår planerade
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-[#d6986f] font-medium">
                    Inga spår planerade
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6b7165]">
                Klicka på "Öppna kalender" för att planera tider för de valda spåren. Alla aktiva spår måste ha planerade tider innan ordern kan skapas.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}



function parseSwedishNumber(raw: string): number {

  if (!raw) return 0;

  const normalized = raw

    .trim()

    .replace(/\u00A0/g, "")

    .replace(/\s+/g, "")

    .replace(/\./g, "")

    .replace(",", ".");

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;

}



type DropZoneProps = {

  id: string;

  isActive?: boolean;

};



function DropZone({ id, isActive = false }: DropZoneProps) {

  const { isOver, setNodeRef } = useDroppable({ id });

  return (

    <div

      ref={setNodeRef}

      className={[

        "w-full transition-all duration-150",

        isActive ? "h-3" : "h-2",

        isOver ? "bg-[#eef4e4]" : "bg-transparent",

      ].join(" ")}

      data-drop-zone="true"

    />

  );

}



type OrderRowProps = {

  index: number;

  row: Row;

  lineNet: number;

  articles: Article[];

  accounts: Account[];

  onUpdate: (index: number, patch: Partial<Row>) => void;

  onRemove: (index: number) => void;

  searchArticles: (query?: string) => Promise<void>;

  setArticleQuery: (value: string) => void;

  searchAccounts: (query?: string) => Promise<void>;

  setAccountQuery: (value: string) => void;

};



function OrderRow({

  index,

  row,

  lineNet,

  articles,

  accounts,

  onUpdate,

  onRemove,

  searchArticles,

  setArticleQuery,

  searchAccounts,

  setAccountQuery,

}: OrderRowProps) {

  const containerRef = useRef<HTMLDivElement | null>(null);

  const articleInputRef = useRef<HTMLInputElement | null>(null);

  const [inputValue, setInputValue] = useState(row.articleNumber ?? "");

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const selectionRef = useRef(false);

  const syncFromRowRef = useRef(true);

  const accountContainerRef = useRef<HTMLDivElement | null>(null);

  const accountInputRef = useRef<HTMLInputElement | null>(null);

  const [accountInputValue, setAccountInputValue] = useState(row.AccountNumber ?? "");

  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);

  const accountSelectionRef = useRef(false);

  const syncAccountFromRowRef = useRef(true);

  const dragId = `row-${index}`;

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useDraggable({

    id: dragId,

  });


  const rowStyle: CSSProperties = {

    transition: "transform 0.18s ease",

    transform: CSS.Translate.toString(transform) ?? undefined,

  };

  if (isDragging) {

    rowStyle.zIndex = 5;

    rowStyle.position = "relative";

  }



  useEffect(() => {

    syncFromRowRef.current = true;

    setInputValue(row.articleNumber ?? "");

  }, [row.articleNumber]);



  useEffect(() => {

    syncAccountFromRowRef.current = true;

    setAccountInputValue(row.AccountNumber ?? "");

  }, [row.AccountNumber]);



  useEffect(() => {

    if (syncFromRowRef.current) {

      syncFromRowRef.current = false;

      return;

    }

    if (selectionRef.current) {

      selectionRef.current = false;

      return;

    }



    const isFocused = document.activeElement === articleInputRef.current;

    if (!isFocused) return;



    const query = inputValue.trim();

    setArticleQuery(query);



    const timer = setTimeout(() => {

      void searchArticles(query).catch(() => undefined);

      setDropdownOpen(true);

    }, 250);



    return () => clearTimeout(timer);

  }, [inputValue, searchArticles, setArticleQuery]);



  useEffect(() => {

    if (syncAccountFromRowRef.current) {

      syncAccountFromRowRef.current = false;

      return;

    }

    if (accountSelectionRef.current) {

      accountSelectionRef.current = false;

      return;

    }



    const isFocused = document.activeElement === accountInputRef.current;

    if (!isFocused) return;



    const query = accountInputValue.trim();

    setAccountQuery(query);



    const timer = setTimeout(() => {

      void searchAccounts(query).catch(() => undefined);

      setAccountDropdownOpen(true);

    }, 250);



    return () => clearTimeout(timer);

  }, [accountInputValue, searchAccounts, setAccountQuery]);



  useEffect(() => {

    if (!dropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {

      if (!containerRef.current || containerRef.current.contains(event.target as Node)) return;

      setDropdownOpen(false);

    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);

  }, [dropdownOpen]);



  useEffect(() => {

    if (!accountDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {

      if (!accountContainerRef.current || accountContainerRef.current.contains(event.target as Node)) return;

      setAccountDropdownOpen(false);

    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);

  }, [accountDropdownOpen]);



  const availableArticles = useMemo(() => {

    const base = [...articles];

    if (row.articleNumber && !base.some((article) => article.articleNumber === row.articleNumber)) {

      base.unshift({

        articleNumber: row.articleNumber,

        description: row.description ?? "",

        salesPrice: row.price,

        unit: row.unit,

      });

    }

    const seen = new Set<string>();

    const unique = base.filter((article) => {

      const key = article.articleNumber?.toLowerCase() ?? "";

      if (!key) return true;

      if (seen.has(key)) return false;

      seen.add(key);

      return true;

    });

    const query = inputValue.trim().toLowerCase();

    if (!query) return unique.slice(0, 50);



    return unique

      .filter((article) => {

        const code = article.articleNumber.toLowerCase();

        const description = (article.description ?? "").toLowerCase();

        return code.includes(query) || description.includes(query);

      })

      .slice(0, 50);

  }, [articles, inputValue, row.articleNumber, row.description, row.price, row.unit]);



  const availableAccounts = useMemo(() => {

    const base = [...accounts];

    if (row.AccountNumber && !base.some((acc) => acc.accountNumber === row.AccountNumber)) {

      base.unshift({

        accountNumber: row.AccountNumber,

        description: undefined,

      });

    }

    const seen = new Set<string>();

    const unique = base.filter((acc) => {

      const key = acc.accountNumber?.toLowerCase() ?? "";

      if (!key) return true;

      if (seen.has(key)) return false;

      seen.add(key);

      return true;

    });

    const query = accountInputValue.trim().toLowerCase();

    if (!query) return unique.slice(0, 50);


    return unique

      .filter((acc) => {

        const code = acc.accountNumber.toLowerCase();

        const description = (acc.description ?? "").toLowerCase();

        return code.includes(query) || description.includes(query);

      })

      .slice(0, 50);

  }, [accounts, accountInputValue, row.AccountNumber]);



  const formattedNet = useMemo(

    () => lineNet.toLocaleString("sv-SE", { style: "currency", currency: "SEK" }),

    [lineNet],

  );



  const handleManualInput = (value: string) => {

    setInputValue(value);

    setDropdownOpen(true);

    onUpdate(index, { articleNumber: value });

  };



  const handleSelectArticle = (articleNumber: string) => {

    const article =

      articles.find((item) => item.articleNumber === articleNumber) ??

      (row.articleNumber === articleNumber

        ? {

            description: row.description ?? "",

            salesPrice: row.price,

            unit: row.unit,

          }

        : undefined);



    selectionRef.current = true;

    setInputValue(articleNumber);

    setArticleQuery(articleNumber);

    onUpdate(index, {

      articleNumber,

      description: article?.description ?? row.description,

      price: typeof article?.salesPrice === "number" ? article.salesPrice : row.price,

      unit: article?.unit ?? row.unit,

    });

    setDropdownOpen(false);

  };



  const handleToggleDropdown = () => {

    setDropdownOpen((prev) => {

      const next = !prev;

      if (next) {

        const raw = inputValue.trim();

        const fetchQuery = raw && raw !== row.articleNumber ? raw : undefined;

        setArticleQuery(fetchQuery ?? "");

        void searchArticles(fetchQuery).catch(() => undefined);

      }

      return next;

    });

  };



  const handleManualAccountInput = (value: string) => {

    setAccountInputValue(value);

    setAccountDropdownOpen(true);

    onUpdate(index, { AccountNumber: value });

  };



  const handleSelectAccount = (accountNumber: string) => {

    accountSelectionRef.current = true;

    setAccountInputValue(accountNumber);

    setAccountQuery(accountNumber);

    onUpdate(index, { AccountNumber: accountNumber });

    setAccountDropdownOpen(false);

  };



  const handleToggleAccountDropdown = () => {

    setAccountDropdownOpen((prev) => {

      const next = !prev;

      if (next) {

        const raw = accountInputValue.trim();

        const fetchQuery = raw && raw !== row.AccountNumber ? raw : undefined;

        setAccountQuery(fetchQuery ?? "");

        void searchAccounts(fetchQuery).catch(() => undefined);

      }

      return next;

    });

  };



  const rowClasses = [

    "grid grid-cols-35 divide-x divide-[#d9ddd4] border-b border-[#d9ddd4] bg-white text-[12px] text-[#2d3329] last:border-b-0",

    isDragging ? "opacity-90" : "",

  ]

    .filter(Boolean)

    .join(" ");



  return (

    <div

      ref={(node) => {

        containerRef.current = node;

        setNodeRef(node);

      }}

      style={rowStyle}

      className={rowClasses}

      suppressHydrationWarning={true}

      {...attributes}

    >

      <div className="relative col-span-2">

        <input

          ref={articleInputRef}

          placeholder="Artikelnr"

          value={inputValue}

          onFocus={() => {

            setDropdownOpen(true);

            const raw = inputValue.trim();

            const fetchQuery = raw && raw !== row.articleNumber ? raw : undefined;

            setArticleQuery(fetchQuery ?? "");

            void searchArticles(fetchQuery).catch(() => undefined);

          }}

          onChange={(e) => handleManualInput(e.target.value)}

          className="block h-full w-full bg-transparent px-3 py-0.5 pr-8 focus:outline-none focus:ring-0"

        />

        <button

          type="button"

          onClick={handleToggleDropdown}

          aria-label="Visa artiklar"

          className="absolute inset-y-0 right-1 flex items-center justify-center rounded px-1 text-[#6b7165] hover:text-[#2f4d1f]"

        >

          <svg width="16" height="16" viewBox="0 0 24 24">

            <path

              d="M6 9l6 6 6-6"

              fill="none"

              stroke="currentColor"

              strokeWidth="2"

              strokeLinecap="round"

              strokeLinejoin="round"

            />

          </svg>

        </button>



        {dropdownOpen ? (

          <div className="absolute z-40 mt-1 max-h-60 min-w-[320px] overflow-auto rounded-md border border-[#d9ddd4] bg-white shadow-xl">

            {availableArticles.length ? (

              availableArticles.map((article) => {

                const isSelected = article.articleNumber === row.articleNumber;

                return (

                  <button

                    key={article.articleNumber}

                    type="button"

                    onClick={() => handleSelectArticle(article.articleNumber)}

                    className={[

                      "w-full px-3 py-2 text-left text-[12px] hover:bg-[#f5f8ef]",

                      isSelected ? "bg-[#e7f5d7]" : "",

                    ].join(" ")}

                  >

                    <div className="flex items-center justify-between gap-3">

                      <span className="font-semibold text-[#2f4d1f]">{article.articleNumber}</span>

                      {typeof article.salesPrice === "number" ? (

                        <span className="text-[11px] text-[#6b7165]">

                          {article.salesPrice.toLocaleString("sv-SE", {

                            style: "currency",

                            currency: "SEK",

                          })}

                        </span>

                      ) : null}

                    </div>

                    {article.description ? (

                      <div className="mt-0.5 text-[11px] text-[#61685d]">{article.description}</div>

                    ) : null}

                  </button>

                );

              })

            ) : (

              <div className="px-3 py-2 text-[11px] text-[#6b7165]">Inga artiklar hittades.</div>

            )}

          </div>

        ) : null}

      </div>



      <div className="col-span-12">

        <input

          placeholder="Beskrivning"

          value={row.description ?? ""}

          onChange={(e) => onUpdate(index, { description: e.target.value })}

          className="block h-full w-full bg-transparent px-3 py-0.5 focus:outline-none focus:ring-0"

        />

      </div>



      <div className="col-span-2">

        <input

          type="number"

          step="0.01"

          value={Number(row.OrderedQuantity ?? 0)}

          onChange={(e) => onUpdate(index, { OrderedQuantity: Number(e.target.value || 0) })}

          className="block h-full w-full bg-transparent px-3 py-0.5 text-right focus:outline-none focus:ring-0"

        />

      </div>



      <div className="col-span-2">

        <input

          type="number"

          step="0.01"

          value={Number(row.ReservedQuantity ?? 0)}

          onChange={(e) => onUpdate(index, { ReservedQuantity: Number(e.target.value || 0) })}

          className="block h-full w-full bg-transparent px-3 py-0.5 text-right focus:outline-none focus:ring-0"

        />

      </div>



      <div className="col-span-2">

        <input

          type="number"

          step="0.01"

          value={Number(row.DeliveredQuantity ?? 0)}

          onChange={(e) => onUpdate(index, { DeliveredQuantity: Number(e.target.value || 0) })}

          className="block h-full w-full bg-transparent px-3 py-0.5 text-right focus:outline-none focus:ring-0"

        />

      </div>



      <div className="col-span-1">

        <input

          placeholder="st"

          value={row.unit ?? ""}

          onChange={(e) => onUpdate(index, { unit: e.target.value })}

          className="block h-full w-full bg-transparent px-3 py-0.5 focus:outline-none focus:ring-0"

        />

      </div>



      <div className="col-span-2">

        <input

          type="number"

          step="0.01"

          value={Number(row.price ?? 0)}

          onChange={(e) => onUpdate(index, { price: Number(e.target.value || 0) })}

          className="block h-full w-full bg-transparent px-3 py-0.5 text-right focus:outline-none focus:ring-0"

        />

      </div>



      <div className="col-span-2">

        <input

          type="number"

          step="0.01"

          value={Number(row.Discount ?? 0)}

          onChange={(e) => onUpdate(index, { Discount: Number(e.target.value || 0) })}

          className="block h-full w-full bg-transparent px-3 py-0.5 text-right focus:outline-none focus:ring-0"

        />

      </div>



      <div className="col-span-2 px-3 py-0.5 text-right">

        <span className="font-semibold text-[#2f4d1f]">{formattedNet}</span>

      </div>



      <div className="col-span-2 px-3 py-2">

        <select

          value={Number(row.VatPercent ?? DEFAULT_VAT_PERCENT)}

          onChange={(e) => onUpdate(index, { VatPercent: Number(e.target.value || 0) })}

          className="h-full w-full bg-transparent text-right text-[12px] focus:outline-none focus:ring-0"

        >

          {[0, 6, 12, 25].map((rate) => (

            <option key={rate} value={rate}>

              {rate} %

            </option>

          ))}

        </select>

      </div>



      <div ref={accountContainerRef} className="relative col-span-2">

        <input

          ref={accountInputRef}

          placeholder="Konto"

          value={accountInputValue}

          onFocus={() => {

            setAccountDropdownOpen(true);

            const raw = accountInputValue.trim();

            const fetchQuery = raw && raw !== row.AccountNumber ? raw : undefined;

            setAccountQuery(fetchQuery ?? "");

            void searchAccounts(fetchQuery).catch(() => undefined);

          }}

          onChange={(e) => handleManualAccountInput(e.target.value)}

          className="block h-full w-full bg-transparent px-3 py-0.5 pr-8 focus:outline-none focus:ring-0"

        />

        <button

          type="button"

          onClick={handleToggleAccountDropdown}

          aria-label="Visa konton"

          className="absolute inset-y-0 right-1 flex items-center justify-center rounded px-1 text-[#6b7165] hover:text-[#2f4d1f]"

        >

          <svg width="16" height="16" viewBox="0 0 24 24">

            <path

              d="M6 9l6 6 6-6"

              fill="none"

              stroke="currentColor"

              strokeWidth="2"

              strokeLinecap="round"

              strokeLinejoin="round"

            />

          </svg>

        </button>



        {accountDropdownOpen ? (

          <div className="absolute z-40 mt-1 max-h-60 min-w-[320px] overflow-auto rounded-md border border-[#d9ddd4] bg-white shadow-xl">

            {availableAccounts.length ? (

              availableAccounts.map((account) => {

                const isSelected = account.accountNumber === row.AccountNumber;

                return (

                  <button

                    key={account.accountNumber}

                    type="button"

                    onClick={() => handleSelectAccount(account.accountNumber)}

                    className={[

                      "w-full px-3 py-2 text-left text-[12px] hover:bg-[#f5f8ef]",

                      isSelected ? "bg-[#e7f5d7]" : "",

                    ].join(" ")}

                  >

                    <div className="flex items-center justify-between gap-3">

                      <span className="font-semibold text-[#2f4d1f]">{account.accountNumber}</span>

                    </div>

                    {account.description ? (

                      <div className="mt-0.5 text-[11px] text-[#61685d]">{account.description}</div>

                    ) : null}

                  </button>

                );

              })

            ) : (

              <div className="px-3 py-2 text-[11px] text-[#6b7165]">Inga konton hittades.</div>

            )}

          </div>

        ) : null}

      </div>



      <div className="col-span-1">

        <input

          type="number"

          step="0.1"

          value={Number(row.ContributionPercent ?? 0)}

          onChange={(e) => onUpdate(index, { ContributionPercent: Number(e.target.value || 0) })}

          className="block h-full w-full bg-transparent px-3 py-0.5 text-right focus:outline-none focus:ring-0"

        />

      </div>



      <div className="col-span-1 px-3 py-0.5 flex items-center justify-end">

        <button

          type="button"

          onClick={() => onRemove(index)}

          className="inline-flex h-5 w-5 items-center justify-center rounded-full transition hover:bg-[#f6e8e8]"

          aria-label="Ta bort rad"

        >

          <img src="/icons/trash-icon.png" alt="" className="h-4 w-4" />

        </button>

      </div>



      <button

        type="button"

        className="col-span-1 flex items-center justify-center px-3 py-0.5 cursor-grab active:cursor-grabbing"

        data-drag-handle="true"

        ref={setActivatorNodeRef}

        aria-label="Flytta rad"

        {...listeners}

      >

        <img

          src="/icons/move-icon.png"

          alt="Flytta rad"

          className="pointer-events-none h-4 w-4 opacity-60"

          draggable={false}

        />

      </button>



      <div className="col-span-1 px-3 py-0.5"></div>

    </div>

  );

}




export default function NewOrderFortnoxClient({ defaultOurReference = "" }: { defaultOurReference?: string }) {
  // ðŸŸ¢ Calendar state
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarTrack, setCalendarTrack] = useState<AppTrack>("A");

  // ðŸŸ¢ Manual calendar slots
  const [manualA, setManualA] = useState<{ start: string; end: string }>({ start: "", end: "" });
  const [manualB, setManualB] = useState<{ start: string; end: string }>({ start: "", end: "" });
  const [manualC, setManualC] = useState<{ start: string; end: string }>({ start: "", end: "" });
  const [manualD, setManualD] = useState<{ start: string; end: string }>({ start: "", end: "" });

function updateLocalManualSlot(track: AppTrack, value: { start: string; end: string }) {
  if (track === "A") setManualA(value);
  if (track === "B") setManualB(value);
  if (track === "C") setManualC(value);
  if (track === "D") setManualD(value);
}





  // Removed autoPlan and time states as they're no longer needed
  const {

    title,

    setTitle,

    titleWarning,

    customerName,

    setCustomerName,

    orderDate,

    setOrderDate,

    deliveryDate,

    setDeliveryDate,

    ourReference,

    setOurReference,

    yourReference,

    setYourReference,

    priceList,

    setPriceList,

    priceListOptions,

    wayOfDelivery,

    setWayOfDelivery,

    wayOfDeliveryOptions,

    pricesInclVAT,

    setPricesInclVAT,

    paymentTerms,

    setPaymentTerms,

    currency,

    setCurrency,

    exchangeRate,

    setExchangeRate,

    unitValue,

    setUnitValue,

    vatScheme,

    setVatScheme,

    orderText,

    setOrderText,

    freightFee,

    setFreightFee,

    invoiceFee,

    setInvoiceFee,

    invoiceDiscount,

    setInvoiceDiscount,

    distributionMethod,

    setDistributionMethod,

    invoiceName,

    setInvoiceName,

    invoiceAddress1,

    setInvoiceAddress1,

    invoiceAddress2,

    setInvoiceAddress2,

    invoiceZip,

    setInvoiceZip,

    invoiceCity,

    setInvoiceCity,

    organisationNumber,

    setOrganisationNumber,

    phone1,

    setPhone1,

    email,

    setEmail,

    deliveryName,

    setDeliveryName,

    deliveryStreet,

    setDeliveryStreet,

    deliveryAddress,

    setDeliveryAddress,

    deliveryZip,

    setDeliveryZip,

    deliveryCity,

    setDeliveryCity,

    tracks,

    setTracks,

    autoSchedule,

    setAutoSchedule,

    estimateA,

    setEstimateA,

    estimateB,

    setEstimateB,

    estimateC,

    setEstimateC,

    estimateD,

    setEstimateD,

    manualSlots,

    updateManualSlot,

    customers,

    customerQuery,

    setCustomerQuery,

    customerNumber,

    setCustomerNumber,

    selectedCustomer,

    searchCustomers,

    articles,

    accounts,

    setArticleQuery,

    searchArticles,

    setAccountQuery,

    searchAccounts,

    rows,

    addRow,

    addRows,

    removeRow,

    updateRow,

    moveRow,

    msg,

    setMsg,

    convertToQuote,

    submitting,

    submit,

  } = useNewOrderForm({
    defaultOurReference,
    convertToQuotePath: "/quotes/new2.0?convertedFrom=order",
  });



  const calendarTracks = useMemo<AppTrack[]>(() => {
    if (!tracks.length) {
      return [calendarTrack];
    }
    const combined = [calendarTrack, ...tracks];
    const ordered = TRACK_ORDER.filter((track) => combined.includes(track)) as AppTrack[];
    return ordered.length ? ordered : [calendarTrack];
  }, [calendarTrack, tracks]);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("sv-SE", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    []
  );

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("sv-SE", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    []
  );

  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("sv-SE", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    []
  );

  const formatManualSlotRange = useCallback(
    (slot?: ManualSlot) => {
      if (!slot?.start || !slot?.end) return null;
      const startDate = new Date(slot.start);
      const endDate = new Date(slot.end);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;
      const sameDay = startDate.toDateString() === endDate.toDateString();
      if (sameDay) {
        return `${dateFormatter.format(startDate)} ${timeFormatter.format(startDate)} - ${timeFormatter.format(
          endDate
        )}`;
      }
      return `${dateFormatter.format(startDate)} ${timeFormatter.format(startDate)} - ${dateFormatter.format(
        endDate
      )} ${timeFormatter.format(endDate)}`;
    },
    [dateFormatter, timeFormatter]
  );

  const formatDateTime = useCallback(
    (iso?: string) => {
      if (!iso) return null;
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return null;
      return dateTimeFormatter.format(date);
    },
    [dateTimeFormatter]
  );

  const openCalendarForTrack = useCallback(
    (track?: AppTrack) => {
      if (!track && !tracks.length) {
        return;
      }
      const target = track ?? tracks[0] ?? "A";
      setCalendarTrack(target);
      setCalendarOpen(true);
    },
    [tracks, setCalendarOpen, setCalendarTrack]
  );

const handleCalendarRangeSelect = useCallback(
  (track: AppTrack, start: string, end: string) => {
    updateLocalManualSlot(track, { start, end });
    updateManualSlot(track, { start, end }); // âœ… Update the hook's state for validation
    setMsg(null);

    // âœ… Ensure the track is in the active list (and ordered correctly)
    setTracks((prev) => {
      const combined = prev.includes(track) ? prev : [...prev, track];
      const ordered = TRACK_ORDER.filter((item) => combined.includes(item)) as AppTrack[];
      const same =
        prev.length === ordered.length &&
        prev.every((value, index) => value === ordered[index]);
      return same ? prev : ordered;
    });

    // âœ… Remember which track was planned last
    setCalendarTrack(track);
  },
  [updateManualSlot, setMsg, setTracks, setCalendarTrack]
);

  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);

  const customerDropdownRef = useRef<HTMLDivElement | null>(null);

  const [bulkRowCount, setBulkRowCount] = useState("5");

  const [activeRowId, setActiveRowId] = useState<string | null>(null);

  const sensors = useSensors(

    useSensor(PointerSensor, {

      activationConstraint: { distance: 6 },

    }),

  );



  const handleRowDragStart = useCallback((event: DragStartEvent) => {

    setActiveRowId(String(event.active.id));

  }, []);



  const handleRowDragEnd = useCallback(

    (event: DragEndEvent) => {

      setActiveRowId(null);

      const fromMatch = /^row-(\d+)$/.exec(String(event.active.id));

      const overId = event.over?.id;

      if (!fromMatch || !overId) return;

      const toMatch = /^gap-(\d+)$/.exec(String(overId));

      if (!toMatch) return;

      const from = Number(fromMatch[1]);

      const target = Number(toMatch[1]);

      if (Number.isNaN(from) || Number.isNaN(target)) return;

      moveRow(from, target);

    },

    [moveRow],

  );



  const handleRowDragCancel = useCallback(() => {

    setActiveRowId(null);

  }, []);



  const handleBulkRowCountChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {

    const digitsOnly = event.target.value.replace(/[^\d]/g, "");

    setBulkRowCount(digitsOnly);

  }, []);



  const handleAddMultipleRows = useCallback(() => {

    const normalized = bulkRowCount.replace(",", ".");

    const parsed = Number(normalized);

    const count = Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.floor(parsed), 50) : 1;

    addRows(count);

    setBulkRowCount(String(count));

  }, [addRows, bulkRowCount]);



  const filteredCustomers = useMemo(() => {

    const q = customerQuery.trim().toLowerCase();

    if (!q) return customers;

    return customers.filter((customer) => {

      const haystack = [

        customer.customerNumber,

        customer.name,

        customer.city,

        customer.organisationNumber,

      ]

        .filter(Boolean)

        .join(" ")

        .toLowerCase();

      return haystack.includes(q);

    });

  }, [customers, customerQuery]);



  useEffect(() => {

    if (!customerDropdownOpen) return;



    const handleClickOutside = (event: MouseEvent) => {

      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {

        setCustomerDropdownOpen(false);

      }

    };



    const handleEscape = (event: KeyboardEvent) => {

      if (event.key === "Escape") {

        setCustomerDropdownOpen(false);

      }

    };



    document.addEventListener("mousedown", handleClickOutside);

    document.addEventListener("keydown", handleEscape);

    return () => {

      document.removeEventListener("mousedown", handleClickOutside);

      document.removeEventListener("keydown", handleEscape);

    };

  }, [customerDropdownOpen]);



  const handleCustomerInputChange = (event: ChangeEvent<HTMLInputElement>) => {

    const value = event.target.value;

    setCustomerDropdownOpen(true);

    void searchCustomers(value);

  };



  const toggleCustomerDropdown = () => {

    setCustomerDropdownOpen((prev) => {

      const next = !prev;

      if (next) {

        void searchCustomers(customerQuery);

      }

      return next;

    });

  };



  const handleCustomerFocus = () => {

    setCustomerDropdownOpen(true);

    if (!customers.length) {

      void searchCustomers(customerQuery);

    }

  };



  const handleSelectCustomer = (customer: (typeof customers)[number]) => {

    setCustomerNumber(customer.customerNumber);

    const descriptor = [customer.customerNumber, customer.name, customer.organisationNumber].filter(Boolean).join(" ");

    setCustomerQuery(descriptor);

    setCustomerDropdownOpen(false);

  };



  const { rowTotals, vatTotal } = useMemo(() => {

    const totals: number[] = [];

    let vatSum = 0;



    rows.forEach((row) => {

      const price = Number(row.price) || 0;

      const quantity = Number(row.OrderedQuantity) || 0;

      const rawDiscount = Number(row.Discount ?? 0) || 0;

      const discount = Math.min(Math.max(rawDiscount, 0), 100);

      const net = price * quantity * (1 - discount / 100);

      const netValue = Number.isFinite(net) ? net : 0;



      const vatPercent = Number(row.VatPercent ?? DEFAULT_VAT_PERCENT);

      const percentValue = Number.isFinite(vatPercent) ? vatPercent : DEFAULT_VAT_PERCENT;

      const vatAmount = netValue * (percentValue / 100);

      const vatValue = Number.isFinite(vatAmount) ? vatAmount : 0;



      totals.push(netValue);

      vatSum += vatValue;

    });



    return { rowTotals: totals, vatTotal: vatSum };

  }, [rows]);



  const netTotal = useMemo(() => rowTotals.reduce((sum, value) => sum + value, 0), [rowTotals]);

  const grossTotal = useMemo(() => netTotal + vatTotal, [netTotal, vatTotal]);

  const freightFeeAmount = useMemo(() => parseSwedishNumber(freightFee), [freightFee]);

  const invoiceFeeAmount = useMemo(() => parseSwedishNumber(invoiceFee), [invoiceFee]);

  const invoiceDiscountRate = useMemo(() => {

    const parsed = parseSwedishNumber(invoiceDiscount);

    const clamped = Math.min(Math.max(parsed, 0), 100);

    return clamped / 100;

  }, [invoiceDiscount]);

  const invoiceDiscountNetAmount = useMemo(

    () => netTotal * invoiceDiscountRate,

    [invoiceDiscountRate, netTotal],

  );

  const netAfterDiscount = useMemo(

    () => Math.max(netTotal - invoiceDiscountNetAmount, 0),

    [invoiceDiscountNetAmount, netTotal],

  );

  const vatAfterDiscount = useMemo(

    () => Math.max(vatTotal * (1 - invoiceDiscountRate), 0),

    [invoiceDiscountRate, vatTotal],

  );

  const netExcludingVat = useMemo(

    () => Math.max(netAfterDiscount + freightFeeAmount + invoiceFeeAmount, 0),

    [freightFeeAmount, invoiceFeeAmount, netAfterDiscount],

  );

  const oreAdjustment = 0;

  const totalIncludingVat = useMemo(

    () => netExcludingVat + vatAfterDiscount + oreAdjustment,

    [netExcludingVat, oreAdjustment, vatAfterDiscount],

  );

  const formatCurrency = useCallback(

    (value: number) => value.toLocaleString("sv-SE", { style: "currency", currency: "SEK" }),

    [],

  );



  return (

   





      <main className="mx-auto max-w-8xl px-6 py-8">

        <div className="rounded-md border border-[#d9ddd4] bg-white shadow-sm">

          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d9ddd4] bg-[#f1f3ee] px-6 py-4">

            <div>

          <div>

            <h1 className="text-xl font-semibold text-[#2d3329]">Ny Order</h1>

            <p className="text-sm text-[#6b7165] mt-1">Skapa en ny order i Fortnox</p>

          </div>

            </div>

            <div className="flex items-center gap-2">

              <button

                type="button"

                onClick={convertToQuote}

                className="rounded-full border border-[#b4b9ae] px-4 py-2 text-[13px] font-semibold text-[#4f5a49] hover:bg-[#eef1ea]"

              >

                Konvertera till offert

              </button>

              <button

                type="button"

                onClick={submit}

                className="rounded-full bg-[#f0f1ef] px-4 py-2 text-[13px] font-semibold text-[#4f5a49] hover:bg-[#e4e7e1] disabled:opacity-60"

                disabled={submitting}

              >

                + Skapa order

              </button>

              <Link

                href="/orders/overview"

                className="rounded-full bg-[#f7bf25] px-4 py-2 text-[13px] font-semibold text-[#1f2d20] shadow hover:bg-[#f5b407]"

              >

                Visa lista

              </Link>

            </div>

          </div>



          <div className="space-y-8 px-6 py-6">

            <div className="grid gap-6 md:grid-cols-12">

              <FortnoxField label="Kund" className="md:col-span-4">

                <div className="relative" ref={customerDropdownRef}>

                  <FortnoxInput

                    placeholder="Kundnr, Namn, Org-/Personnr"

                    value={customerQuery}

                    onChange={handleCustomerInputChange}

                    onFocus={handleCustomerFocus}

                    className="pr-9"

                  />

                  <button

                    type="button"

                    onClick={toggleCustomerDropdown}

                    className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-[#2d3329] hover:text-[#175235]"

                    aria-label="Visa kundlista"

                  >

                    <span className={`transition-transform ${customerDropdownOpen ? "rotate-180" : ""}`}>▼</span>

                  </button>



                  {customerDropdownOpen ? (

                    <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-[#d9ddd4] bg-white shadow-lg">

                      <div className="max-h-64 overflow-auto">

                        <table className="w-full border-collapse text-left text-[12px] text-[#2d3329]">

                          <thead className="sticky top-0 bg-[#f1f3ee] text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4f5a49]">

                            <tr>

                              <th className="px-3 py-2 font-semibold">Kundnr</th>

                              <th className="px-3 py-2 font-semibold">Namn</th>

                              <th className="px-3 py-2 font-semibold">Ort</th>

                              <th className="px-3 py-2 font-semibold">Org-/Personnr</th>

                              <th className="px-2 py-2 text-center font-semibold">+</th>

                            </tr>

                          </thead>

                          <tbody>

                            {filteredCustomers.length ? (

                              filteredCustomers.map((customer) => {

                                const isActive = customer.customerNumber === customerNumber;

                                return (

                                  <tr

                                    key={customer.customerNumber}

                                    onClick={() => handleSelectCustomer(customer)}

                                    className={`cursor-pointer border-t border-[#eef1eb] hover:bg-[#f4f7f0] ${

                                      isActive ? "bg-[#eef4e7]" : ""

                                    }`}

                                  >

                                    <td className="px-3 py-2">{customer.customerNumber}</td>

                                    <td className="px-3 py-2">{customer.name ?? "a"}</td>

                                    <td className="px-3 py-2">{customer.city ?? "a"}</td>

                                    <td className="px-3 py-2">{customer.organisationNumber ?? "a"}</td>

                                    <td className="px-2 py-2 text-center">

                                      <button

                                        type="button"

                                        className="h-6 w-6 rounded-full bg-[#f7bf25] text-[#1f2d20] shadow hover:bg-[#f5b407]"

                                        aria-label="LAgg till ny kund"

                                      >

                                        +

                                      </button>

                                    </td>

                                  </tr>

                                );

                              })

                            ) : (

                              <tr>

                                <td colSpan={5} className="px-3 py-4 text-center text-[12px] text-[#7c8276]">

                                  Inga kunder hittades. Justera sAkningen.

                                </td>

                              </tr>

                            )}

                          </tbody>

                        </table>

                      </div>

                    </div>

                  ) : null}

                </div>

              </FortnoxField>



              <FortnoxField label="Orderdatum" className="md:col-span-2">

                <FortnoxInput type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />

              </FortnoxField>



              <FortnoxField label="Leveransdatum" className="md:col-span-2">

                <FortnoxInput type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />

              </FortnoxField>
<div className="col-span-full w-full mt-6">
  <PlanningSection
    calendarOpen={calendarOpen}
    setCalendarOpen={setCalendarOpen}
    tracks={tracks}
    setTracks={setTracks}
    manualA={manualA}
    manualB={manualB}
    manualC={manualC}
    manualD={manualD}
    formatManualSlotRange={formatManualSlotRange}
  />
</div>

            </div>



            {msg ? (

              <div className="rounded-md border border-[#d6986f] bg-[#fde9e0] px-4 py-3 text-[13px] text-[#8a3e2a]">

                {msg}

              </div>

            ) : null}



            <FortnoxSection title="Orderuppgifter">

              <div className="grid gap-4 md:grid-cols-16">

                <FortnoxField label="Betalningsvillkor" className="md:col-span-4">

                  <select

                    value={paymentTerms}

                    onChange={(e) => setPaymentTerms(e.target.value)}

                    className="h-8 rounded-md border border-[#cbcfc4] bg-white px-3 text-[13px]"

                  >

                    <option value="30">30 dagar</option>

                    <option value="10">10 dagar</option>

                    <option value="0">Forsskott</option>

                  </select>

                </FortnoxField>



                <FortnoxField label="Vr referens" className="md:col-span-4">

                  <FortnoxInput value={ourReference} onChange={(e) => setOurReference(e.target.value)} />

                </FortnoxField>







                <FortnoxField label="Priser inklusive moms" className="md:col-span-3">

                  <div className="h-8 flex rounded-md border border-[#cbcfc4] bg-[#f0f2ed] p-1">

                    <button

                      type="button"

                      onClick={() => setPricesInclVAT(true)}

                      className={`flex-1 rounded-md px-3 py-1 text-[12px] font-semibold ${

                        pricesInclVAT ? "bg-white text-[#2d3329] shadow" : "text-[#767d71]"

                      }`}

                    >

                      Ja

                    </button>

                    <button

                      type="button"

                      onClick={() => setPricesInclVAT(false)}

                      className={`flex-1 rounded-md px-3 py-1 text-[12px] font-semibold ${

                        !pricesInclVAT ? "bg-white text-[#2d3329] shadow" : "text-[#767d71]"

                      }`}

                    >

                      Nej

                    </button>

                  </div>

                </FortnoxField>



                <FortnoxField label="Ert ordernummer" className="md:col-span-4 md:col-start-1">
                  <div className="relative">
                    <FortnoxInput
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className={[
                        titleWarning
                          ? "border-orange-400 ring-2 ring-orange-300/70 focus:ring-orange-300/70 transition-all duration-200 ease-out"
                          : "",
                      ].join(" ")}
                    />
                    <AnimatePresence>
                      {titleWarning ? (
                        <motion.div
                          initial={{ opacity: 0, y: -4, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.98 }}
                          transition={{ duration: 0.18, ease: "easeOut" }}
                          className="pointer-events-none absolute left-0 top-full z-10 mt-1 rounded-md border border-orange-200 bg-orange-50 px-2 py-1 text-[11px] font-semibold text-orange-700 shadow-sm"
                        >
                          {titleWarning}
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>

                </FortnoxField>



                <FortnoxField label="Er referens" className="md:col-span-4">

                  <CustomerReferencePicker

                    customerNumber={customerNumber}

                    customerName={selectedCustomer?.name}

                    value={yourReference}

                    onChange={setYourReference}

                    disabled={!customerNumber}

                  />

                </FortnoxField>



                <FortnoxField label="Valuta" className="md:col-span-1">

                  <select

                    value={currency}

                    onChange={(e) => setCurrency(e.target.value)}

                    className="h-8 rounded-md border border-[#cbcfc4] bg-white px-3 text-[13px]"

                  >

                    <option>SEK</option>

                    <option>EUR</option>

                    <option>USD</option>

                  </select>

                </FortnoxField>



                <FortnoxField label="Kurs" className="md:col-span-1">

                  <FortnoxInput value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} />

                </FortnoxField>



                <FortnoxField label="Enhet" className="md:col-span-1">

                  <FortnoxInput value={unitValue} onChange={(e) => setUnitValue(e.target.value)} />

                </FortnoxField>



                <FortnoxField label="Momstyp" className="md:col-span-3 md:col-start-9">

                  <select

                    value={vatScheme}

                    onChange={(e) => setVatScheme(e.target.value)}

                    className="h-8 rounded-md border border-[#cbcfc4] bg-white px-3 text-[13px]"

                  >

                    <option value="SEVAT">SE</option>
                    <option value="SEREVERSEDVAT">SE omvand skattskyldighet</option>
                    <option value="EUREVERSEDVAT">EU omvand skattskyldighet</option>
                    <option value="EUVAT">EU momspliktig</option>
                    <option value="EXPORT">Export</option>

                  </select>

                </FortnoxField>

              </div>

            </FortnoxSection>



            <FortnoxSection title="Kunduppgifter">

              <div className="grid gap-4 md:grid-cols-16  ">



                <FortnoxField label="Namn" className="md:col-span-4">

                  <FortnoxInput value={invoiceName} onChange={(e) => setInvoiceName(e.target.value)} />

                </FortnoxField>

                <FortnoxField label="Fakturaadress" className="md:col-span-4">

                  <FortnoxInput value={invoiceAddress1} onChange={(e) => setInvoiceAddress1(e.target.value)} />

                </FortnoxField>

                <FortnoxField label="Postnr" className="md:col-span-2">

                  <FortnoxInput value={invoiceZip} onChange={(e) => setInvoiceZip(e.target.value)} />

                </FortnoxField>

                <FortnoxField label="Ort" className="md:col-span-2">

                  <FortnoxInput value={invoiceCity} onChange={(e) => setInvoiceCity(e.target.value)} />

                </FortnoxField>

<FortnoxField label="Telefon" className="md:col-span-3 ml-12">

                  <FortnoxInput value={phone1} onChange={(e) => setPhone1(e.target.value)} />

                </FortnoxField>

                <FortnoxField label="Organisationsnummer" className="md:col-span-4">

                  <FortnoxInput value={organisationNumber} onChange={(e) => setOrganisationNumber(e.target.value)} />

                </FortnoxField>

                <FortnoxField label="Fakturaadress 2" className="md:col-span-4">

                  <FortnoxInput value={invoiceAddress2} onChange={(e) => setInvoiceAddress2(e.target.value)} />

                </FortnoxField>

      <FortnoxField label="Land" className="md:col-span-4">

                  <FortnoxInput />

                </FortnoxField>

                <FortnoxField label="E-post" className="md:col-span-4 ml-12">

                  <FortnoxInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

                </FortnoxField>

              </div>

            </FortnoxSection>



            <FortnoxSection title="Leveransuppgifter">

              <div className="grid gap-4 md:grid-cols-16">

                <FortnoxField label="Namn" className="md:col-span-4">

                  <FortnoxInput value={deliveryName} onChange={(e) => setDeliveryName(e.target.value)} />

                </FortnoxField>

                <FortnoxField label="Leveransadress" className="md:col-span-4">

                  <FortnoxInput value={deliveryStreet} onChange={(e) => setDeliveryStreet(e.target.value)} />

                </FortnoxField>

                <FortnoxField label="Postnr" className="md:col-span-2">

                  <FortnoxInput value={deliveryZip} onChange={(e) => setDeliveryZip(e.target.value)} />

                </FortnoxField>

                <FortnoxField label="Ort" className="md:col-span-2">

                  <FortnoxInput value={deliveryCity} onChange={(e) => setDeliveryCity(e.target.value)} />

                </FortnoxField>

<FortnoxField label="Leveranssätt" className="md:col-span-4 ml-12">

                  <AnimatedSelect

                    value={wayOfDelivery}

                    onChange={setWayOfDelivery}

                    placeholder="Välj leveranssätt"

                    options={wayOfDeliveryOptions.map((option) => ({

                      value: option.code,

                      label: option.code,

                      hint: option.description,

                    }))}

                  />

                </FortnoxField>







        <FortnoxField label="Leveransdatum" className="md:col-span-4">

                  <FortnoxInput  />

                </FortnoxField>



                <FortnoxField label="Leveransadress 2" className="md:col-span-4">

                  <FortnoxInput value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />

                </FortnoxField>

     <FortnoxField label="Land" className="md:col-span-4">

                  <FortnoxInput />

                </FortnoxField>

<FortnoxField label="Leveransvillkor" className="md:col-span-4 ml-12">

                  <AnimatedSelect

                    value={wayOfDelivery}

                    onChange={setWayOfDelivery}

                    placeholder="Välj leveransvillkor"

                    options={wayOfDeliveryOptions.map((option) => ({

                      value: option.code,

                      label: option.code,

                      hint: option.description,

                    }))}

                  />

                </FortnoxField>

                

              </div>

            </FortnoxSection>



            <FortnoxSection title="Orderrader">

              <div className="space-y-3">

                <div className="relative rounded-md border border-[#d9ddd4]">

                  <div className="grid grid-cols-35 divide-x divide-[#d9ddd4] border-b border-[#d9ddd4] bg-[#f1f3ee] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4f5a49]">

                    <div className="col-span-2 flex items-center justify-center px-3 py-2">Artikelnr</div>

                    <div className="col-span-12 flex items-center justify-center px-3 py-2">Benamning</div>

                    <div className="col-span-2 flex items-center justify-center px-3 py-2">Bes. antal</div>

                    <div className="col-span-2 flex items-center justify-center px-3 py-2">Res. antal</div>

                    <div className="col-span-2 flex items-center justify-center px-3 py-2">Lev. antal</div>

                    <div className="col-span-1 flex items-center justify-center px-3 py-2">Enhet</div>

                    <div className="col-span-2 flex items-center justify-center px-3 py-2">A-pris</div>

                    <div className="col-span-2 flex items-center justify-center px-3 py-2">Rabatt</div>

                    <div className="col-span-2 flex items-center justify-center px-3 py-2">Summa</div>

                    <div className="col-span-2 flex items-center justify-center px-3 py-2">Moms</div>

                    <div className="col-span-2 flex items-center justify-center px-3 py-2">Konto</div>

                    <div className="col-span-1 flex items-center justify-center px-3 py-2">TG%</div>

                    <div className="col-span-1 flex items-center justify-center px-3 py-2"></div>

                    <div className="col-span-1 flex items-center justify-center px-3 py-2"></div>

                    <div className="col-span-1 flex items-center justify-center px-3 py-2"></div>

                  </div>

                  <DndContext

                    sensors={sensors}

                    onDragStart={handleRowDragStart}

                    onDragEnd={handleRowDragEnd}

                    onDragCancel={handleRowDragCancel}

                    modifiers={[restrictToVerticalAxis]}

                  >

                    {rows.length ? (

                      <>

                        <DropZone id="gap-0" isActive={Boolean(activeRowId)} />

                        {rows.map((row, index) => (

                          <Fragment key={`order-row-${index}`}>

                            <OrderRow

                              index={index}

                              row={row}

                              lineNet={rowTotals[index] ?? 0}

                              articles={articles}

                              accounts={accounts}

                              onUpdate={updateRow}

                              onRemove={removeRow}

                              searchArticles={searchArticles}

                              setArticleQuery={setArticleQuery}

                              searchAccounts={searchAccounts}

                              setAccountQuery={setAccountQuery}

                            />

                            <DropZone id={`gap-${index + 1}`} isActive={Boolean(activeRowId)} />

                          </Fragment>

                        ))}

                      </>

                    ) : (

                      <>

                        <DropZone id="gap-0" isActive={Boolean(activeRowId)} />

                        <div className="px-4 py-6 text-center text-[12px] text-[#6b7165]">

                          Inga orderrader tillagda annu.

                        </div>

                      </>

                    )}

                  </DndContext>

                </div>

              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-[#f5f8ef] px-4 py-3">

                <div className="flex flex-wrap items-center gap-3">

                  <button

                    type="button"

                    onClick={addRow}

                    className="inline-flex items-center gap-2 rounded-full bg-[#8ebe3f] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white shadow-sm transition hover:bg-[#7cab38]"

                  >

                    + LAgg till rad

                  </button>

                  

                </div>

       

              </div>

            </FortnoxSection>





<div className="rounded-md border border-[#d9ddd4] bg-white px-5 py-4 shadow-sm">

  <div className="grid gap-6 lg:grid-cols-12">

    {/* Left side a Ordertext */}

    <div className="lg:col-span-4 space-y-4">

      <FortnoxField label="Ordertext">

        <textarea

          value={orderText}

          onChange={(e) => setOrderText(e.target.value)}

          className="min-h-[100px] w-full rounded-md border border-[#cbcfc4] bg-white px-3 py-2 text-[13px] text-[#2d3329] focus:outline-none focus:ring-2 focus:ring-[#8ebe3f]/40"

        />

      </FortnoxField>

      <label className="flex items-center gap-2 text-[13px] text-[#61685d]">

        <input type="checkbox" className="h-4 w-4 rounded border-[#b7bcae]" />

        AnvAnd som fakturatext.

      </label>

    </div>

    {/* Right side - Freight, Invoice, etc. */}
    <div className="lg:col-span-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="grid flex-1 grid-cols-2 gap-3 text-[13px]">
          <FortnoxField label="Fraktavgift">
            <FortnoxInput value={freightFee} onChange={(e) => setFreightFee(e.target.value)} />
          </FortnoxField>
          <FortnoxField label="Fakturaavgift">
            <FortnoxInput value={invoiceFee} onChange={(e) => setInvoiceFee(e.target.value)} />
          </FortnoxField>
          <FortnoxField label="Fakturarabatt (%)">
            <FortnoxInput value={invoiceDiscount} onChange={(e) => setInvoiceDiscount(e.target.value)} />
          </FortnoxField>
          <FortnoxField label="Sprak">
            <select
              className="h-9 rounded-md border border-[#cbcfc4] bg-white px-3 text-[13px]"
              defaultValue="Svenska"
            >
              <option>Svenska</option>
              <option>Engelska</option>
            </select>
          </FortnoxField>
        </div>

<div className="rounded-md border border-[#d9ddd4] bg-[#f7f9f2] px-4 py-4 lg:ml-6 lg:min-w-[300px]">
  <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-center text-[11px] uppercase tracking-[0.1em] text-[#6a7467] sm:grid-cols-4 justify-items-center">
    <div>
      <div>Netto</div>
      <div className="mt-1 text-[14px] font-semibold text-[#2f4d1f]">
        {formatCurrency(netTotal)}
      </div>
    </div>

    <div>
      <div>Brutto</div>
      <div className="mt-1 text-[14px] font-semibold text-[#2f4d1f]">
        {formatCurrency(grossTotal)}
      </div>
    </div>

    <div>
      <div>Totalt exkl. moms</div>
      <div className="mt-1 text-[14px] font-semibold text-[#2f4d1f]">
        {formatCurrency(netExcludingVat)}
      </div>
    </div>

    <div>
      <div>Totalt</div>
      <div className="mt-1 text-[14px] font-semibold text-[#2f4d1f]">
        {formatCurrency(totalIncludingVat)}
      </div>
    </div>

    {/* âœ… Under "Brutto" */}
    <div className="col-start-2">
      <div>Ã–resutjämning</div>
      <div className="mt-1 text-[14px] font-semibold text-[#2f4d1f]">
        {formatCurrency(oreAdjustment)}
      </div>
    </div>

    <div>
      <div>Moms</div>
      <div className="mt-1 text-[14px] font-semibold text-[#2f4d1f]">
        {formatCurrency(vatAfterDiscount)}
      </div>
    </div>

    <div>
      <div>Ordervärde</div>
      <div className="mt-1 text-[14px] font-semibold text-[#2f4d1f]">
        {formatCurrency(netExcludingVat)}
      </div>
    </div>

    {/* âœ… Now under "Ordervärde" */}
    <div className="col-start-4 mt-4 text-center">
      <div className="text-[14px] font-semibold text-[#2f4d1f]">Att betala</div>
      <div className="mt-1 text-[20px] font-bold text-[#c25411]">
        {formatCurrency(totalIncludingVat)}
      </div>
    </div>
  </div>
</div>

      </div>

   
    </div>

  </div>
</div>
<div className="flex justify-end">
            <div className="flex flex-wrap items-center gap-3 text-[12px] text-[#6b7165]">
  <span>Distributionssätt</span>

  <div className="flex overflow-hidden rounded-full border border-[#1f7a44]">
    <select
      value={distributionMethod}
      onChange={(e) => setDistributionMethod(e.target.value)}
      className="h-8 rounded-l-full border-none bg-white px-3 text-[12px] font-semibold text-[#2d3329] focus:outline-none appearance-none"
    >
      <option>Utskrift</option>
      <option>E-post</option>
      <option>EDI</option>
    </select>

    <button
      className="h-8 bg-[#1f7a44] px-4 text-[12px] font-semibold text-white hover:bg-[#176438] transition"
      onClick={() => console.log('Skicka clicked')}
    >
      Skicka
    </button>
  </div>
  <button
    className="h-8 rounded-full bg-[#1f7a44] px-4 text-[12px] font-semibold text-white hover:bg-[#176438] transition"
    
  >
    Spara
  </button>
  <button
    className="h-8 rounded-full bg-[#1f7a44] px-4 text-[12px] font-semibold text-white hover:bg-[#176438] transition"
    onClick={submit}
    disabled={submitting}
  >
    Skapa faktura
  </button>
  
</div>
            </div>
</div>
          </div>
<CalendarModal
  open={calendarOpen}
  onClose={() => setCalendarOpen(false)}
  activeTrack={calendarTrack ?? "A"}
  onSelectRange={handleCalendarRangeSelect}
  activeTracks={tracks}
  initialRange={{
    start:
      calendarTrack === "A"
        ? manualA.start
        : calendarTrack === "B"
        ? manualB.start
        : calendarTrack === "C"
        ? manualC.start
        : manualD.start,
    end:
      calendarTrack === "A"
        ? manualA.end
        : calendarTrack === "B"
        ? manualB.end
        : calendarTrack === "C"
        ? manualC.end
        : manualD.end,
  }}
/>



       
      </main>
  );
}




