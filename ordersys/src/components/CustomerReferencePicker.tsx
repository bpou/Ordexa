import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { PencilSquareIcon, PlusIcon, TrashIcon } from "@heroicons/react/20/solid";
import { useCustomerReferences } from "@/lib/useCustomerReferences";

const OPTION_CUSTOM = "__custom";

const INPUT_CLASSES = [
  "h-8 w-full rounded-md border border-border bg-card px-2 text-[13px] text-foreground",
  "placeholder:text-foreground/50 shadow-[inset_0_1px_0_rgba(0,0,0,.03)]",
  "focus:outline-none focus:ring-2 focus:ring-primary/25",
].join(" ");

type Props = {
  customerNumber: string;
  customerName?: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
};

export function CustomerReferencePicker({ customerNumber, customerName, value, onChange, disabled }: Props) {
  const { references, loading, error, mutating, addReference, updateReference, deleteReference } =
    useCustomerReferences(customerNumber);

  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");
  const [customValue, setCustomValue] = useState<string>("");
  const [newName, setNewName] = useState("");
  const [managerError, setManagerError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  const canManage = !!customerNumber && !disabled;
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [placement, setPlacement] = useState<"down" | "up">("down");
  const [position, setPosition] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onClick = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideTrigger = wrapperRef.current?.contains(target);
      const isInsideDropdown = dropdownRef.current?.contains(target);
      if (!isInsideTrigger && !isInsideDropdown) {
        setOpen(false);
        setEditingId(null);
        setManagerError(null);
      }
    };

    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const updateDropdownPosition = useCallback(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const dropdown = dropdownRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const width = Math.max(rect.width, 320);
    const dropdownHeight = dropdown?.offsetHeight ?? 0;
    const viewportHeight = window.innerHeight;

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const shouldOpenUp = spaceBelow < dropdownHeight + 24 && spaceAbove > dropdownHeight;

    const nextPlacement = shouldOpenUp ? "up" : "down";
    setPlacement(nextPlacement);

    const top =
      nextPlacement === "down"
        ? rect.bottom + 8
        : rect.top - dropdownHeight - 8;

    setPosition({ top, left: rect.left, width });
  }, [open, references.length, editingId, customValue]);

  useLayoutEffect(() => {
    if (!open) return;

    const raf = requestAnimationFrame(updateDropdownPosition);
    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [open, updateDropdownPosition]);

  useEffect(() => {
    if (!value) {
      setSelectedId("");
      setCustomValue("");
      return;
    }
    const match = references.find((ref) => ref.name === value);
    if (match) {
      setSelectedId(match.id);
      setCustomValue("");
    } else {
      setSelectedId(OPTION_CUSTOM);
      setCustomValue(value);
    }
  }, [references, value]);

  useEffect(() => {
    setNewName("");
    setManagerError(null);
    setEditingId(null);
    setEditingValue("");
  }, [customerNumber]);

  const radioName = useMemo(() => `reference-picker-${Math.random().toString(36).slice(2)}`, []);

  const displayValue = useMemo(() => {
    if (selectedId === OPTION_CUSTOM) return customValue;
    if (!selectedId) return "";
    const ref = references.find((item) => item.id === selectedId);
    return ref?.name ?? "";
  }, [customValue, references, selectedId]);

  const toggleDropdown = () => {
    if (!customerNumber || disabled) return;
    setManagerError(null);
    setOpen((prev) => {
      const next = !prev;
      if (!prev) {
        setPlacement("down");
        requestAnimationFrame(() => updateDropdownPosition());
      }
      return next;
    });
  };

  const selectReference = (id: string) => {
    setManagerError(null);
    if (id === OPTION_CUSTOM) {
      setSelectedId(OPTION_CUSTOM);
      if (!customValue) onChange("");
      setOpen(true);
      return;
    }
    if (!id) {
      setSelectedId("");
      setCustomValue("");
      onChange("");
      setOpen(false);
      return;
    }
    const ref = references.find((item) => item.id === id);
    setSelectedId(id);
    setCustomValue("");
    if (ref) {
      onChange(ref.name);
    }
    setOpen(false);
  };

  const handleCustomChange = (next: string) => {
    setCustomValue(next);
    onChange(next);
  };

  const handleAdd = async () => {
    setManagerError(null);
    const trimmed = newName.trim();
    if (!trimmed) {
      setManagerError("Ange ett namn.");
      return;
    }
    try {
      const created = await addReference({ name: trimmed });
      if (created) {
        setNewName("");
        selectReference(created.id);
      }
    } catch (err: any) {
      const message = err?.message ?? "Kunde inte spara referensen.";
      setManagerError(message);
    }
  };

  const beginEdit = (id: string, currentName: string) => {
    setManagerError(null);
    setEditingId(id);
    setEditingValue(currentName);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const trimmed = editingValue.trim();
    if (!trimmed) {
      setManagerError("Ange ett namn.");
      return;
    }
    try {
      const updated = await updateReference(editingId, { name: trimmed });
      if (updated) {
        if (selectedId === updated.id) {
          onChange(updated.name);
        }
        setEditingId(null);
        setEditingValue("");
      }
    } catch (err: any) {
      const message = err?.message ?? "Kunde inte uppdatera referensen.";
      setManagerError(message);
    }
  };

  const deleteReferenceById = async (id: string) => {
    setManagerError(null);
    const target = references.find((ref) => ref.id === id);
    if (!target) return;
    const confirmed = window.confirm(`Ta bort referensen "${target.name}"?`);
    if (!confirmed) return;
    try {
      await deleteReference(id);
      if (selectedId === id) {
        setSelectedId("");
        setCustomValue("");
        onChange("");
      }
    } catch (err: any) {
      const message = err?.message ?? "Kunde inte ta bort referensen.";
      setManagerError(message);
    }
  };

  const placeholder = !customerNumber
    ? "Välj kund först"
    : loading
      ? "Hämtar..."
      : displayValue || "Välj referens";

  return (
    <div className="flex flex-col gap-2" ref={wrapperRef}>
      <button
        type="button"
        onClick={toggleDropdown}
        disabled={!customerNumber || disabled}
        ref={triggerRef}
        className={[
          "flex h-8 w-full items-center justify-between rounded-md border border-border bg-card px-3 text-sm text-foreground shadow-sm transition",
          disabled || !customerNumber ? "cursor-not-allowed opacity-60" : "hover:bg-muted",
        ].join(" ")}
      >
        <span className={displayValue ? "text-foreground" : "text-foreground/55"}>{placeholder}</span>
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

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                key="reference-dropdown"
                className="fixed z-[1200]"
                style={{ top: position.top, left: position.left, width: position.width }}
                initial={{ opacity: 0, scale: 0.98, y: placement === "up" ? 6 : -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: placement === "up" ? 6 : -6 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <div
                  ref={(node) => {
                    dropdownRef.current = node;
                    if (node) requestAnimationFrame(() => updateDropdownPosition());
                  }}
                  className="overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl"
                >
                  {managerError && (
                    <div className="border-b border-error-100 bg-error-50/80 px-4 py-2 text-[12px] text-error-600">
                      {managerError}
                    </div>
                  )}

                  <div className="grid grid-cols-[110px_1fr_64px] items-center border-b border-border bg-muted px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <span>Förvald</span>
                    <span>Benämning</span>
                    <span className="text-right">Åtgärd</span>
                  </div>

                  <div className="max-h-72 overflow-y-auto">
                    <ReferenceRow
                      radioName={radioName}
                      value=""
                      checked={!selectedId}
                      onSelect={() => selectReference("")}
                      label={<span className="text-[13px] text-slate-700">Ingen förvald</span>}
                    />

                    {loading ? (
                      <div className="px-4 py-6 text-center text-[12px] text-muted-foreground">
                        Hämtar referenser...
                      </div>
                    ) : (
                      references.map((ref) => {
                        const isEditing = editingId === ref.id;
                        return (
                          <ReferenceRow
                            key={ref.id}
                            radioName={radioName}
                            value={ref.id}
                            checked={selectedId === ref.id}
                            onSelect={() => selectReference(ref.id)}
                            label={
                              isEditing ? (
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                  <input
                                    type="text"
                                    className={INPUT_CLASSES}
                                    value={editingValue}
                                    onChange={(e) => setEditingValue(e.target.value)}
                                    disabled={mutating}
                                    autoFocus
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={saveEdit}
                                      className="h-8 rounded-md bg-brand-500 px-3 text-[12px] font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-60"
                                      disabled={mutating}
                                    >
                                      Spara
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingId(null);
                                        setEditingValue("");
                                      }}
                                      className="h-8 rounded-md border border-border bg-card px-3 text-[12px] text-muted-foreground transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
                                      disabled={mutating}
                                    >
                                      Avbryt
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => selectReference(ref.id)}
                                  className="flex w-full flex-col text-left text-[13px] text-foreground transition hover:text-foreground"
                                >
                                  <span>{ref.name}</span>
                                  <span className="mt-0.5 inline-flex flex-wrap gap-x-4 text-[11px] text-muted-foreground">
                                    {ref.email && <span>{ref.email}</span>}
                                    {ref.phone && <span>{ref.phone}</span>}
                                  </span>
                                </button>
                              )
                            }
                            actions={
                              !isEditing ? (
                                <div className="flex justify-end gap-2">
                                  <IconButton
                                    label="Redigera"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      beginEdit(ref.id, ref.name);
                                    }}
                                    disabled={mutating || !canManage}
                                  >
                                    <PencilSquareIcon className="h-4 w-4" />
                                  </IconButton>
                                  <IconButton
                                    label="Ta bort"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteReferenceById(ref.id);
                                    }}
                                    disabled={mutating || !canManage}
                                    tone="danger"
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </IconButton>
                                </div>
                              ) : null
                            }
                          />
                        );
                      })
                    )}

                    <ReferenceRow
                      radioName={radioName}
                      value={OPTION_CUSTOM}
                      checked={selectedId === OPTION_CUSTOM}
                      onSelect={() => selectReference(OPTION_CUSTOM)}
                      label={
                        selectedId === OPTION_CUSTOM ? (
                          <input
                            type="text"
                            value={customValue}
                            onChange={(e) => handleCustomChange(e.target.value)}
                            className={INPUT_CLASSES}
                            placeholder="Ange referens"
                            autoFocus
                          />
                        ) : (
                          <span className="text-[13px] text-foreground/85">Annan referens...</span>
                        )
                      }
                    />
                  </div>

                  <div className="border-t border-border bg-muted/70 px-4 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Ny referens</p>
                    {customerNumber && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Sparas för {customerName || `kund ${customerNumber}`}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        className={INPUT_CLASSES}
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Namn"
                        disabled={!canManage || mutating}
                      />
                      <button
                        type="button"
                        onClick={handleAdd}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500 text-white shadow-sm transition hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={!canManage || mutating}
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {error && !open && (
        <div className="rounded-md border border-error-200 bg-error-50 px-3 py-2 text-[12px] text-error-600">
          {error}
        </div>
      )}
    </div>
  );
}

type ReferenceRowProps = {
  radioName: string;
  value: string;
  checked: boolean;
  onSelect: () => void;
  label: ReactNode;
  actions?: ReactNode;
};

function ReferenceRow({ radioName, value, checked, onSelect, label, actions }: ReferenceRowProps) {
  return (
    <div className="grid grid-cols-[110px_1fr_64px] items-center px-4 py-2 text-sm hover:bg-muted">
      <div className="flex items-center gap-2">
        <input type="radio" name={radioName} value={value} checked={checked} onChange={onSelect} />
      </div>
      <div className="min-w-0">{label}</div>
      <div className="flex justify-end">{actions}</div>
    </div>
  );
}

type IconButtonProps = {
  label: string;
  onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
  disabled?: boolean;
  tone?: "default" | "danger";
};

function IconButton({ label, onClick, children, disabled, tone = "default" }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex items-center justify-center rounded-md p-1 transition focus:outline-none focus:ring-2",
        tone === "danger"
          ? "text-error-600 hover:bg-error-50 focus:ring-error-200"
          : "text-muted-foreground hover:bg-muted focus:ring-primary/25",
        disabled ? "cursor-not-allowed opacity-50" : "",
      ].join(" ")}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}



