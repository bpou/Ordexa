import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type AnimatedOption = {
  value: string;
  label: string;
  hint?: string;
  disabled?: boolean;
};

export function AnimatedSelect({
  value,
  onChange,
  options,
  placeholder = "Välj…",
  searchable = false,
  searchPlaceholder = "Sök...",
  selectedDisplayMode = "label",
  className = "",
  buttonClassName = "",
  menuClassName = "",
  menuMaxHeight = 280,
  itemClassName = "",
}: {
  value: string;
  onChange: (v: string) => void;
  options: AnimatedOption[];
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  selectedDisplayMode?: "label" | "value";
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  menuMaxHeight?: number;
  itemClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const selected = useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  );
  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((opt) => {
      const haystack = `${opt.label} ${opt.hint ?? ""} ${opt.value}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [options, query]);

  // stäng vid klick utanför
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    if (!searchable) return;
    searchRef.current?.focus();
  }, [open, searchable]);

  // enkel tangent-navigering
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTextInput =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (isTextInput && e.key !== "Escape") return;

      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (filteredOptions.length === 0) return;
        const idx = filteredOptions.findIndex((o) => o.value === value);
        const dir = e.key === "ArrowDown" ? 1 : -1;
        let next = idx >= 0 ? idx : 0;
        for (let i = 0; i < filteredOptions.length; i++) {
          next = (next + dir + filteredOptions.length) % filteredOptions.length;
          if (!filteredOptions[next].disabled) break;
        }
        onChange(filteredOptions[next].value);
      }
      if (e.key === "Enter" || e.key === " ") setOpen((o) => !o);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [filteredOptions, onChange, open, value]);

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={[
          "h-8 w-full rounded-md border border-border bg-card px-2 text-[13px] text-foreground",
          "flex items-center justify-between gap-2",
          "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/25",
          buttonClassName,
        ].join(" ")}
      >
        <span className={selected ? "text-foreground" : "text-foreground/50"}>
          {selected ? (
            <span className="inline-flex items-center gap-2">
              <span>{selectedDisplayMode === "value" ? selected.value : selected.label}</span>
              {selectedDisplayMode === "label" && selected.hint ? (
                <span className="text-xs text-foreground/50">{selected.hint}</span>
              ) : null}
            </span>
          ) : (
            placeholder
          )}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          className={`transition-transform ${open ? "rotate-180" : "rotate-0"}`}
        >
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

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, pointerEvents: "none" }}
            animate={{ opacity: 1, y: 0, pointerEvents: "auto" }}
            exit={{ opacity: 0, y: -6, pointerEvents: "none" }}
            transition={{ duration: 0.14 }}
            className={[
              "absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-xl",
              menuClassName,
            ].join(" ")}
            role="listbox"
          >
            <div
              className="max-h-[var(--menu-h)] overflow-auto"
              style={{ ["--menu-h" as any]: `${menuMaxHeight}px` }}
            >
              {searchable ? (
                <div className="sticky top-0 z-10 border-b border-border bg-popover p-2">
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="h-8 w-full rounded-md border border-border bg-card px-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                  />
                </div>
              ) : null}
              <motion.ul
                initial="hidden"
                animate="show"
                exit="hidden"
                variants={{
                  hidden: { transition: { staggerChildren: 0.02, staggerDirection: -1 } },
                  show: { transition: { staggerChildren: 0.04 } },
                }}
                className="py-1"
              >
                {filteredOptions.map((opt, i) => (
                  <motion.li
                    key={opt.value}
                    variants={{
                      hidden: { opacity: 0, y: -12, filter: "blur(3px)" },
                      show: {
                        opacity: 1,
                        y: 0,
                        filter: "blur(0px)",
                        transition: {
                          type: "spring",
                          stiffness: 400,
                          damping: 22,
                          mass: 0.4 + i * 0.02, // liten massaökning → “repstege”
                        },
                      },
                    }}
                    className={[
                      "px-2.5 py-2 text-sm cursor-pointer select-none",
                      opt.disabled
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-muted",
                      value === opt.value ? "bg-muted/70" : "",
                      itemClassName,
                    ].join(" ")}
                    aria-selected={value === opt.value}
                    onClick={() => {
                      if (opt.disabled) return;
                      onChange(opt.value);
                      setOpen(false);
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="whitespace-normal break-words">{opt.label}</span>
                      {opt.hint ? (
                        <span className="text-xs text-foreground/45">{opt.hint}</span>
                      ) : null}
                    </div>
                  </motion.li>
                ))}
                {filteredOptions.length === 0 ? (
                  <li className="px-2.5 py-2 text-sm text-foreground/50">Inga träffar</li>
                ) : null}
              </motion.ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

