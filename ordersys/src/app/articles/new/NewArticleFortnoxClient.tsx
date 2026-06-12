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
import { useRouter } from "next/navigation";

import { AnimatedSelect } from "@/components/AnimatedSelect";

import { CustomerReferencePicker } from "@/components/CustomerReferencePicker";

import { useNewOrderForm } from "../../orders/new/useNewOrderForm";

import type { Account, AppTrack, Article, Row } from "../../orders/new/useNewOrderForm";

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
type ArticleTab = "grunduppgifter" | "lageruppgifter";

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
            <span className="text-lg">📅</span>
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
                    ✓ Några spår planerade
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-[#d6986f] font-medium">
                    ⚠ Inga spår planerade
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

    "grid grid-cols-33 divide-x divide-[#d9ddd4] border-b border-[#d9ddd4] bg-white text-[12px] text-[#2d3329] last:border-b-0",

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

      <div className="relative col-span-4">

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



      <div className="col-span-4">

        <input

          placeholder="Beskrivning"

          value={row.description ?? ""}

          onChange={(e) => onUpdate(index, { description: e.target.value })}

          className="block h-full w-full bg-transparent px-3 py-0.5 focus:outline-none focus:ring-0"

        />

      </div>



      <div className="col-span-6">

        <input

          type="number"

          step="0.01"

          value={Number(row.OrderedQuantity ?? 0)}

          onChange={(e) => onUpdate(index, { OrderedQuantity: Number(e.target.value || 0) })}

          className="block h-full w-full bg-transparent px-3 py-0.5 text-right focus:outline-none focus:ring-0"

        />

      </div>



      <div className="col-span-6">

        <input

          type="number"

          step="0.01"

          value={Number(row.ReservedQuantity ?? 0)}

          onChange={(e) => onUpdate(index, { ReservedQuantity: Number(e.target.value || 0) })}

          className="block h-full w-full bg-transparent px-3 py-0.5 text-right focus:outline-none focus:ring-0"

        />

      </div>



      <div className="col-span-6">

        <input

          type="number"

          step="0.01"

          value={Number(row.DeliveredQuantity ?? 0)}

          onChange={(e) => onUpdate(index, { DeliveredQuantity: Number(e.target.value || 0) })}

          className="block h-full w-full bg-transparent px-3 py-0.5 text-right focus:outline-none focus:ring-0"

        />

      </div>



      <div className="col-span-5">

        <input

          placeholder="st"

          value={row.unit ?? ""}

          onChange={(e) => onUpdate(index, { unit: e.target.value })}

          className="block h-full w-full bg-transparent px-3 py-0.5 focus:outline-none focus:ring-0"

        />

      </div>




      <div className="col-span-2">



      </div>












      




    </div>

  );

}




export default function NewArticleFortnoxClient({ defaultOurReference = "" }: { defaultOurReference?: string }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ArticleTab>("grunduppgifter");
  const [articleNumber, setArticleNumber] = useState("");
  const [articleNumberWarning, setArticleNumberWarning] = useState<string | null>(null);
  const [existingArticleNumbers, setExistingArticleNumbers] = useState<Set<number>>(
    () => new Set()
  );
  const [articleDescription, setArticleDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [stockGoods, setStockGoods] = useState(true);
  const [articleType, setArticleType] = useState<"STOCK" | "SERVICE">("STOCK");
  const [externalWebshop, setExternalWebshop] = useState(false);
  const [endOfLife, setEndOfLife] = useState(false);
  const [isCreatingArticle, setIsCreatingArticle] = useState(false);
  const [supplierOptions, setSupplierOptions] = useState<
    Array<{ supplierNumber: string; name: string }>
  >([]);
  const [ean, setEan] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [manufacturerArticleNumber, setManufacturerArticleNumber] = useState("");
  const [calculationCost, setCalculationCost] = useState("0,00");
  const [supplierCode, setSupplierCode] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierPrice, setSupplierPrice] = useState("");
  const [articleWidthMm, setArticleWidthMm] = useState("");
  const [articleHeightMm, setArticleHeightMm] = useState("");
  const [articleDepthMm, setArticleDepthMm] = useState("");
  const [articleWeightGrams, setArticleWeightGrams] = useState("");
  const [bulkyGoods, setBulkyGoods] = useState(false);
  const [isActive, setIsActive] = useState(true);
  // 🟢 Calendar state
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarTrack, setCalendarTrack] = useState<AppTrack>("A");

  // 🟢 Manual calendar slots
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

  } = useNewOrderForm({ defaultOurReference });



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
    updateManualSlot(track, { start, end }); // ✅ Update the hook's state for validation
    setMsg(null);

    // ✅ Ensure the track is in the active list (and ordered correctly)
    setTracks((prev) => {
      const combined = prev.includes(track) ? prev : [...prev, track];
      const ordered = TRACK_ORDER.filter((item) => combined.includes(item)) as AppTrack[];
      const same =
        prev.length === ordered.length &&
        prev.every((value, index) => value === ordered[index]);
      return same ? prev : ordered;
    });

    // ✅ Remember which track was planned last
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

  const parseOptionalDecimalInput = useCallback((value: string, fieldLabel: string) => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed.replace(",", "."));
    if (!Number.isFinite(parsed)) {
      throw new Error(`${fieldLabel} måste vara numeriskt.`);
    }
    return parsed;
  }, []);

  const findNextAvailableArticleNumber = useCallback((existingNumbers: Set<number>) => {
    let next = 1000;
    while (existingNumbers.has(next)) {
      next += 1;
    }
    return String(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadSuppliers = async () => {
      try {
        const res = await fetch("/api/fortnox/suppliers?limit=200");
        const json = await res.json().catch(() => ({}));
        if (!res.ok) return;
        const list = Array.isArray(json?.suppliers) ? json.suppliers : [];
        if (cancelled) return;
        setSupplierOptions(
          list
            .map((item: any) => ({
              supplierNumber: String(item?.supplierNumber ?? "").trim(),
              name: String(item?.name ?? "").trim(),
              currency: typeof item?.currency === "string" ? item.currency : undefined,
            }))
            .filter((item: { supplierNumber: string }) => item.supplierNumber),
        );
      } catch {
        // Keep UI usable without supplier scope
      }
    };
    void loadSuppliers();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadNextArticleNumber = async () => {
      if (articleNumber.trim()) return;

      const existingNumbers = new Set<number>();
      let page = 1;
      const limit = 500;

      try {
        while (!cancelled) {
          const res = await fetch(`/api/fortnox/articles?page=${page}&limit=${limit}`);
          if (!res.ok) break;

          const json = (await res.json().catch(() => null)) as
            | { articles?: Array<{ articleNumber?: string }> }
            | null;
          const items = Array.isArray(json?.articles) ? json.articles : [];

          for (const article of items) {
            const raw = String(article?.articleNumber ?? "").trim();
            if (!/^\d+$/.test(raw)) continue;
            const parsed = Number(raw);
            if (Number.isInteger(parsed) && parsed > 0) {
              existingNumbers.add(parsed);
            }
          }

          if (items.length < limit || items.length === 0) break;
          page += 1;
        }

        if (cancelled) return;
        setExistingArticleNumbers(existingNumbers);
        setArticleNumber((prev) =>
          prev.trim() ? prev : findNextAvailableArticleNumber(existingNumbers)
        );
      } catch {
        // Keep manual entry available if lookup fails.
      }
    };

    void loadNextArticleNumber();
    return () => {
      cancelled = true;
    };
  }, [articleNumber, findNextAvailableArticleNumber]);

  useEffect(() => {
    const raw = articleNumber.trim();
    if (!raw || !/^\d+$/.test(raw)) {
      setArticleNumberWarning(null);
      return;
    }

    const parsed = Number(raw);
    const isDuplicate = Number.isInteger(parsed) && existingArticleNumbers.has(parsed);

    if (isDuplicate) {
      setArticleNumberWarning(`Artikelnummer finns redan: ${raw}`);
      return;
    }

    setArticleNumberWarning(null);
  }, [articleNumber, existingArticleNumbers]);

  useEffect(() => {
    if (!supplierCode) return;
    const selected = supplierOptions.find((s) => s.supplierNumber === supplierCode);
    if (!selected) return;
    if (!supplierName && selected.name) setSupplierName(selected.name);
  }, [supplierCode, supplierOptions, supplierName]);

  const handleCreateArticle = useCallback(async () => {
    const number = articleNumber.trim();
    const description = articleDescription.trim();
    if (!number) {
      setMsg("Artikelnummer krävs.");
      setActiveTab("grunduppgifter");
      return;
    }
    if (!description) {
      setMsg("Beskrivning krävs.");
      setActiveTab("grunduppgifter");
      return;
    }
    if (/^\d+$/.test(number) && existingArticleNumbers.has(Number(number))) {
      setArticleNumberWarning(`Artikelnummer finns redan: ${number}`);
      setActiveTab("grunduppgifter");
      return;
    }

    try {
      const salesPrice =
        rows.length > 0 && Number.isFinite(Number(rows[0]?.price))
          ? Number(rows[0]?.price)
          : undefined;

      const payload: Record<string, unknown> = {
        articleNumber: number,
        description,
        ean: ean.trim() || undefined,
        manufacturer: manufacturer.trim() || undefined,
        manufacturerArticleNumber: manufacturerArticleNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        active: isActive,
        unit: unitValue?.trim() || undefined,
        articleType,
        stockGoods,
        externalWebshop,
        endOfLife,
        salesPrice,
        priceListA: salesPrice,
        calculationCost: parseOptionalDecimalInput(calculationCost, "Kalkylkostnad"),
        supplierNumber: supplierCode.trim() || undefined,
        supplierName: supplierName.trim() || undefined,
        supplierPrice: parseOptionalDecimalInput(supplierPrice, "A-pris"),
        width: parseOptionalDecimalInput(articleWidthMm, "Bredd"),
        height: parseOptionalDecimalInput(articleHeightMm, "Höjd"),
        depth: parseOptionalDecimalInput(articleDepthMm, "Djup"),
        weight: parseOptionalDecimalInput(articleWeightGrams, "Vikt"),
        bulkyGoods: bulkyGoods || undefined,
      };

      setIsCreatingArticle(true);
      setMsg(null);
      const res = await fetch("/api/fortnox/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof json?.error === "string" ? json.error : "Kunde inte skapa artikel.");
      }
      const createdNumber = String(json?.article?.articleNumber ?? number).trim() || number;
      router.push(`/articles/${encodeURIComponent(createdNumber)}`);
    } catch (error: any) {
      setMsg(error?.message ?? "Tekniskt fel vid skapande av artikel.");
      setIsCreatingArticle(false);
    }
  }, [
    articleDescription,
    articleHeightMm,
    articleNumber,
    articleType,
    articleWeightGrams,
    articleWidthMm,
    bulkyGoods,
    calculationCost,
    ean,
    endOfLife,
    externalWebshop,
    isActive,
    manufacturer,
    manufacturerArticleNumber,
    notes,
    parseOptionalDecimalInput,
    router,
    rows,
    setMsg,
    stockGoods,
    supplierCode,
    supplierName,
    supplierPrice,
    unitValue,
    articleDepthMm,
    existingArticleNumbers,
    setArticleNumberWarning,
  ]);



  return (

   





      <main className="mx-auto max-w-8xl px-6 py-8">

        <div className="mb-4 rounded-md border border-[#d9ddd4] bg-[#f6f8f3] shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <h1 className="text-[18px] font-semibold text-[#2d3329]">
            Skapa ny artikel
            </h1>
            <div className="flex items-center gap-2 text-xs text-[#677160]">
              <span className="rounded-md border border-[#cbcfc4] bg-white px-3 py-1">
                Fortnox Artikelregister
              </span>
              <span>* obligatoriska falt</span>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-[#d9ddd4] bg-white shadow-sm">

          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d9ddd4] bg-[#f1f3ee] px-6 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("grunduppgifter")}
                className={`rounded-full px-4 py-2 text-[12px] font-semibold transition ${
                  activeTab === "grunduppgifter"
                    ? "bg-[#1f7a44] text-white"
                    : "bg-[#f0f1ef] text-[#4f5a49] hover:bg-[#e4e7e1]"
                }`}
              >
                Grunduppgifter
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("lageruppgifter")}
                className={`rounded-full px-4 py-2 text-[12px] font-semibold transition ${
                  activeTab === "lageruppgifter"
                    ? "bg-[#1f7a44] text-white"
                    : "bg-[#f0f1ef] text-[#4f5a49] hover:bg-[#e4e7e1]"
                }`}
              >
                Lageruppgifter
              </button>            </div>

            <div className="flex items-center gap-2">



              <button

                type="button"

                onClick={handleCreateArticle}

                className="rounded-full bg-[#f0f1ef] px-4 py-2 text-[13px] font-semibold text-[#4f5a49] hover:bg-[#e4e7e1] disabled:opacity-60"

                disabled={submitting || isCreatingArticle}

              >

                + Skapa artikel

              </button>

              <Link

                href="/orders/overview"

                className="rounded-full bg-[#f7bf25] px-4 py-2 text-[13px] font-semibold text-[#1f2d20] shadow hover:bg-[#f5b407]"

              >

                Visa lista

              </Link>

            </div>

          </div>



          <AnimatePresence mode="wait" initial={false}>
            {activeTab === "grunduppgifter" ? (
              <motion.div
                key="grunduppgifter"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="space-y-8 px-6 py-6"
              >

            <div className="grid gap-6 md:grid-cols-12">

              <FortnoxField label="Artikelnummer*" className="md:col-span-2">

                <div className="relative" ref={customerDropdownRef}>

                  <FortnoxInput

                    placeholder=""

                    value={articleNumber}
                    onChange={(e) => setArticleNumber(e.target.value)}

                    className={[
                      "pr-9",
                      articleNumberWarning
                        ? "border-orange-400 ring-2 ring-orange-300/70 focus:ring-orange-300/70 transition-all duration-200 ease-out"
                        : "",
                    ].join(" ")}

                  />

                  <AnimatePresence>
                    {articleNumberWarning ? (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="pointer-events-none absolute left-0 top-full z-10 mt-1 rounded-md border border-orange-200 bg-orange-50 px-2 py-1 text-[11px] font-semibold text-orange-700 shadow-sm"
                      >
                        {articleNumberWarning}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>

                </div>

              </FortnoxField>

              <FortnoxField label="Beskrivning*" className="md:col-span-4">

                <div className="relative" ref={customerDropdownRef}>

                  <FortnoxInput

                    placeholder=""

                    value={articleDescription}
                    onChange={(e) => setArticleDescription(e.target.value)}

                    className="pr-9"

                  />

                </div>

              </FortnoxField>


              <FortnoxField label="Aktiv" className="md:col-span-2">
                <div className="h-8 flex rounded-md border border-[#cbcfc4] bg-[#f0f2ed] p-1">
                  <button
                    type="button"
                    onClick={() => setIsActive(true)}
                    className={`flex-1 rounded-md px-3 py-1 text-[12px] font-semibold ${
                      isActive ? "bg-white text-[#2d3329] shadow" : "text-[#767d71]"
                    }`}
                  >
                    Ja
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsActive(false)}
                    className={`flex-1 rounded-md px-3 py-1 text-[12px] font-semibold ${
                      !isActive ? "bg-white text-[#2d3329] shadow" : "text-[#767d71]"
                    }`}
                  >
                    Nej
                  </button>
                </div>
              </FortnoxField>              <FortnoxField label="Enhet" className="md:col-span-4 md:col-start-7 md:row-start-2">
                <select
                  value={unitValue}
                  onChange={(e) => setUnitValue(e.target.value)}
                  className="h-8 rounded-md border border-[#cbcfc4] bg-white px-3 text-[13px]"
                >
                  <option value="forp">förp - förpackning</option>
                  <option value="h">h - timmar</option>
                  <option value="km">km - kilometer</option>
                  <option value="st">st - styck</option>
                  <option value="utl">utl - utlägg</option>
                </select>
              </FortnoxField>

 <FortnoxField label="Lagervara" className="md:col-span-2 md:col-start-9 md:row-start-3">
                <div className="h-8 flex rounded-md border border-[#cbcfc4] bg-[#f0f2ed] p-1">
                  <button
                    type="button"
                    onClick={() => setStockGoods(true)}
                    className={`flex-1 rounded-md px-3 py-1 text-[12px] font-semibold ${
                      stockGoods ? "bg-white text-[#2d3329] shadow" : "text-[#767d71]"
                    }`}
                  >
                    Ja
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockGoods(false)}
                    className={`flex-1 rounded-md px-3 py-1 text-[12px] font-semibold ${
                      !stockGoods ? "bg-white text-[#2d3329] shadow" : "text-[#767d71]"
                    }`}
                  >
                    Nej
                  </button>
                </div>
              </FortnoxField>



<FortnoxField label="Typ av artikel" className="md:col-span-2 md:col-start-7 md:row-start-3">
                <div className="h-8 flex rounded-md border border-[#cbcfc4] bg-[#f0f2ed] p-1">
                  <button
                    type="button"
                    onClick={() => setArticleType("STOCK")}
                    className={`flex-1 rounded-md px-3 py-1 text-[12px] font-semibold ${
                      articleType === "STOCK" ? "bg-white text-[#2d3329] shadow" : "text-[#767d71]"
                    }`}
                  >
                    Vara
                  </button>
                  <button
                    type="button"
                    onClick={() => setArticleType("SERVICE")}
                    className={`flex-1 rounded-md px-3 py-1 text-[12px] font-semibold ${
                      articleType === "SERVICE" ? "bg-white text-[#2d3329] shadow" : "text-[#767d71]"
                    }`}
                  >
                    Tjänst
                  </button>
                </div>
              </FortnoxField>



              <FortnoxField label="EAN" className="md:col-span-2 md:col-start-1">

                <FortnoxInput

                  value={ean}

                  onChange={(e) => setEan(e.target.value)}

                />

              </FortnoxField>

                                          <FortnoxField label="Tillverkare" className="md:col-span-1">
                <select
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  className="h-8 rounded-md border border-[#cbcfc4] bg-white px-3 text-[13px]"
                >
                  <option value="">Välj tillverkare</option>
                  <option value="Volvo">Volvo</option>
                  <option value="Scania">Scania</option>
                  <option value="Volkswagen">Volkswagen</option>
                  <option value="Mercedes-Benz">Mercedes-Benz</option>
                  <option value="BMW">BMW</option>
                </select>
              </FortnoxField>

              <FortnoxField label="Tillv. Artnr." className="md:col-span-1 md:col-start-4 md:row-start-2">
                <FortnoxInput
                  value={manufacturerArticleNumber}
                  onChange={(e) => setManufacturerArticleNumber(e.target.value)}
                />
              </FortnoxField>
              <FortnoxField label="Anteckningar" className="md:col-span-2 md:col-start-5 md:row-start-2">

                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-8 w-full rounded-md border border-[#cbcfc4] bg-white px-3 py-2 text-[13px] text-[#2d3329] focus:outline-none focus:ring-2 focus:ring-[#8ebe3f]/40"
                />

              </FortnoxField>

 <FortnoxField label="Extern webbshop" className="md:col-span-2 md:col-start-7 md:row-start-4">
                <div className="h-8 flex rounded-md border border-[#cbcfc4] bg-[#f0f2ed] p-1">
                  <button
                    type="button"
                    onClick={() => setExternalWebshop(true)}
                    className={`flex-1 rounded-md px-3 py-1 text-[12px] font-semibold ${
                      externalWebshop ? "bg-white text-[#2d3329] shadow" : "text-[#767d71]"
                    }`}
                  >
                    Ja
                  </button>
                  <button
                    type="button"
                    onClick={() => setExternalWebshop(false)}
                    className={`flex-1 rounded-md px-3 py-1 text-[12px] font-semibold ${
                      !externalWebshop ? "bg-white text-[#2d3329] shadow" : "text-[#767d71]"
                    }`}
                  >
                    Nej
                  </button>
                </div>
              </FortnoxField>

 <FortnoxField label="Utgående artikel" className="md:col-span-2 md:col-start-9 md:row-start-4">
                <div className="h-8 flex rounded-md border border-[#cbcfc4] bg-[#f0f2ed] p-1">
                  <button
                    type="button"
                    onClick={() => setEndOfLife(true)}
                    className={`flex-1 rounded-md px-3 py-1 text-[12px] font-semibold ${
                      endOfLife ? "bg-white text-[#2d3329] shadow" : "text-[#767d71]"
                    }`}
                  >
                    Ja
                  </button>
                  <button
                    type="button"
                    onClick={() => setEndOfLife(false)}
                    className={`flex-1 rounded-md px-3 py-1 text-[12px] font-semibold ${
                      !endOfLife ? "bg-white text-[#2d3329] shadow" : "text-[#767d71]"
                    }`}
                  >
                    Nej
                  </button>
                </div>
              </FortnoxField>


        
</div>



            {msg ? (

              <div className="rounded-md border border-[#d6986f] bg-[#fde9e0] px-4 py-3 text-[13px] text-[#8a3e2a]">

                {msg}

              </div>

            ) : null}






            <FortnoxSection title="Priser">

              <div className="space-y-3">

                <div className="relative rounded-md border border-[#d9ddd4]">

                  <div className="grid grid-cols-33 divide-x divide-[#d9ddd4] border-b border-[#d9ddd4] bg-[#f1f3ee] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4f5a49]">

                    <div className="col-span-4 flex items-center justify-center px-3 py-2">Artikelnr</div>

                    <div className="col-span-4 flex items-center justify-center px-3 py-2">Beskrivning</div>

                    <div className="col-span-6 flex items-center justify-center px-3 py-2">Saldo</div>

                    <div className="col-span-6 flex items-center justify-center px-3 py-2">Reserverat</div>

                    <div className="col-span-6 flex items-center justify-center px-3 py-2">Tillgangligt</div>

                    <div className="col-span-5 flex items-center justify-center px-3 py-2">Enhet</div>

                    <div className="col-span-2 flex items-center justify-center px-3 py-2"></div>

                    
                   
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

          

            </FortnoxSection><div className="flex justify-end">
            <div className="flex flex-wrap items-center gap-3 text-[12px] text-[#6b7165]">

    <button
    type="button"
    onClick={() => router.push("/articles")}
    className="h-8 rounded-full bg-[#6b7165] px-4 text-[12px] font-semibold text-white hover:bg-[#596054] transition"
    
  >
    Avbryt
  </button>

  <button
    type="button"
    onClick={handleCreateArticle}
    disabled={isCreatingArticle}
    className="h-8 rounded-full bg-[#1f7a44] px-4 text-[12px] font-semibold text-white hover:bg-[#176438] transition"
    
  >
    Spara
  </button>

  
</div>
            </div>
</motion.div>
             ) : (
              <motion.div
                key="lageruppgifter"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="space-y-6 px-6 py-6"
              >
                <div className="grid gap-6 md:grid-cols-12">
                  <FortnoxField label="Kalkylkostnad" className="md:col-span-2">
                    <FortnoxInput value={calculationCost} onChange={(e) => setCalculationCost(e.target.value)} />
                  </FortnoxField>
                </div>                <FortnoxSection title="Leverantorsinformation">
                  <div className="space-y-3">
                    <div className="overflow-x-auto rounded-md border border-[#d9ddd4]">
                      <div className="min-w-[720px]">
                        <div className="grid grid-cols-4 divide-x divide-[#d9ddd4] border-b border-[#d9ddd4] bg-[#f1f3ee] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4f5a49]">
                          <div className="px-2 py-2">Leverantor</div>
                          <div className="px-2 py-2">Leverantorsnamn</div>
                          <div className="px-2 py-2 text-right">Inkopspris</div>
                          <div className="px-2 py-2 text-center"></div>
                        </div>
                        <div className="grid grid-cols-4 divide-x divide-[#d9ddd4] border-t border-[#d9ddd4] bg-white text-[12px] text-[#2d3329]">
                          <div>
                            <select
                              value={supplierCode}
                              onChange={(e) => setSupplierCode(e.target.value)}
                              className="block h-full w-full bg-transparent px-3 py-1.5 focus:outline-none focus:ring-0"
                            >
                              <option value="">Valj leverantor</option>
                              {supplierOptions.map((supplier) => (
                                <option key={supplier.supplierNumber} value={supplier.supplierNumber}>
                                  {supplier.supplierNumber} - {supplier.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <input
                              value={supplierName}
                              onChange={(e) => setSupplierName(e.target.value)}
                              className="block h-full w-full bg-transparent px-3 py-1.5 focus:outline-none focus:ring-0"
                            />
                          </div>
                          <div>
                            <input
                              value={supplierPrice}
                              onChange={(e) => setSupplierPrice(e.target.value)}
                              className="block h-full w-full bg-transparent px-3 py-1.5 text-right focus:outline-none focus:ring-0"
                            />
                          </div>
                          <div className="flex items-center justify-center">
                            <button type="button" className="text-[#7c8276] hover:text-[#4f5a49]">
                              Ta bort
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </FortnoxSection>

                <FortnoxSection title="Artikeldetaljer">
                  <div className="grid gap-4 md:grid-cols-12">
                    <FortnoxField label="Bredd (mm)" className="md:col-span-2">
                      <FortnoxInput value={articleWidthMm} onChange={(e) => setArticleWidthMm(e.target.value)} />
                    </FortnoxField>
                    <FortnoxField label="Hojd (mm)" className="md:col-span-2">
                      <FortnoxInput value={articleHeightMm} onChange={(e) => setArticleHeightMm(e.target.value)} />
                    </FortnoxField>
                    <FortnoxField label="Djup (mm)" className="md:col-span-2">
                      <FortnoxInput value={articleDepthMm} onChange={(e) => setArticleDepthMm(e.target.value)} />
                    </FortnoxField>
                    <FortnoxField label="Vikt (gram)" className="md:col-span-4">
                      <FortnoxInput value={articleWeightGrams} onChange={(e) => setArticleWeightGrams(e.target.value)} />
                    </FortnoxField>
                    <FortnoxField label="Skrymmande" className="md:col-span-2">
                      <div className="h-8 flex rounded-md border border-[#cbcfc4] bg-[#f0f2ed] p-1">
                        <button
                          type="button"
                          onClick={() => setBulkyGoods(true)}
                          className={`flex-1 rounded-md px-3 py-1 text-[12px] font-semibold ${
                            bulkyGoods ? "bg-white text-[#2d3329] shadow" : "text-[#767d71]"
                          }`}
                        >
                          Ja
                        </button>
                        <button
                          type="button"
                          onClick={() => setBulkyGoods(false)}
                          className={`flex-1 rounded-md px-3 py-1 text-[12px] font-semibold ${
                            !bulkyGoods ? "bg-white text-[#2d3329] shadow" : "text-[#767d71]"
                          }`}
                        >
                          Nej
                        </button>
                      </div>
                    </FortnoxField>
                  </div>
                </FortnoxSection>
              </motion.div>
            )}
          </AnimatePresence>
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















