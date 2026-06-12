"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import CalendarClient from "@/app/calendar/CalendarClient";
import type { AppTrack } from "@/lib/tracks";

type CalendarModalProps = {
  open: boolean;
  onClose: () => void;
  activeTrack: AppTrack;
  onSelectRange?: (track: AppTrack, start: string, end: string) => void;
  initialRange?: { start?: string; end?: string };
  activeTracks?: AppTrack[];
};

export default function CalendarModal({
  open,
  onClose,
  activeTrack,
  onSelectRange,
  initialRange,
  activeTracks = [],
}: CalendarModalProps) {
  const [currentTrack, setCurrentTrack] = useState<AppTrack>(activeTrack);
  const [selections, setSelections] = useState<
    Record<AppTrack, { start: string | null; end: string | null }>
  >(() => ({
    A: { start: null, end: null },
    B: { start: null, end: null },
    C: { start: null, end: null },
    D: { start: null, end: null },
  }));

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setCurrentTrack(activeTrack);
    setSelections({
      A: { start: null, end: null },
      B: { start: null, end: null },
      C: { start: null, end: null },
      D: { start: null, end: null },
    });
  }, [open, activeTrack, activeTracks]);

  if (!open) return null;

  const hasAnySelection = Object.values(selections).some((selection) => selection.start && selection.end);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 200, damping: 22 }}
            className="relative flex h-[80vh] w-[90vw] max-w-[1400px] flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between border-b border-border bg-muted/70 px-5 py-3 backdrop-blur">
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Planera order</h2>
                  <p className="text-xs text-muted-foreground">
                    Markera ett tidsspann i kalendern och tryck "Bekräfta".
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground/80">Spår:</span>
                  <div className="flex gap-1">
                    {(["A", "B", "C", "D"] as const).map((track) => {
                      const hasSelection = selections[track]?.start && selections[track]?.end;

                      return (
                        <button
                          key={track}
                          onClick={() => {
                            if (currentTrack === track && hasSelection) {
                              setSelections((prev) => ({
                                ...prev,
                                [track]: { start: null, end: null },
                              }));
                              return;
                            }

                            setCurrentTrack(track);
                          }}
                          className={`relative rounded-md px-3 py-1 text-sm font-medium transition ${
                            currentTrack === track
                              ? hasSelection
                                ? "bg-green-600 text-white hover:bg-green-700"
                                : "bg-neutral-900 text-white dark:bg-primary"
                              : hasSelection
                                ? "border border-green-300 bg-green-100 text-green-800 hover:bg-green-200 dark:border-green-500/40 dark:bg-green-500/15 dark:text-green-300"
                                : "border border-border bg-card text-foreground/80 hover:bg-muted"
                          }`}
                          title={
                            currentTrack === track && hasSelection
                              ? `Klicka för att rensa ${track}`
                              : `Växla till ${track}`
                          }
                        >
                          {track}
                          {hasSelection && (
                            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="rounded-full p-2 transition hover:bg-muted"
                aria-label="Stäng"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden pt-[52px]">
              <CalendarClient
                track={currentTrack}
                isModal={true}
                initialRange={initialRange}
                onRangeSelect={(start: string, end: string) => {
                  setSelections((prev) => ({
                    ...prev,
                    [currentTrack]: { start, end },
                  }));
                }}
              />
            </div>

            <div className="flex-shrink-0 border-t border-border bg-muted/70 px-5 py-3">
              <div className="mb-3 space-y-2">
                <div className="text-sm font-medium text-foreground/80">Valda tider:</div>
                <div className="grid grid-cols-2 gap-2">
                  {(["A", "B", "C", "D"] as const).map((track) => {
                    const selection = selections[track];
                    return (
                      <div key={track} className="flex items-center gap-2 text-xs">
                        <button
                          onClick={() => {
                            if (selection?.start && selection?.end) {
                              setSelections((prev) => ({
                                ...prev,
                                [track]: { start: null, end: null },
                              }));
                              return;
                            }

                            setCurrentTrack(track);
                          }}
                          className={`inline-block h-6 w-6 cursor-pointer rounded text-center font-medium transition ${
                            selection?.start && selection?.end
                              ? "bg-green-100 text-green-800 hover:bg-red-100 hover:text-red-800 dark:bg-green-500/15 dark:text-green-300 dark:hover:bg-red-500/15 dark:hover:text-red-300"
                              : currentTrack === track
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                          title={
                            selection?.start && selection?.end
                              ? `Klicka för att rensa ${track}`
                              : `Växla till ${track} för att välja tid`
                          }
                        >
                          {track}
                        </button>

                        {selection?.start && selection?.end ? (
                          <span className="text-foreground/80">
                            {new Date(selection.start).toLocaleString("sv-SE", {
                              weekday: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {" → "}
                            {new Date(selection.end).toLocaleString("sv-SE", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Ingen tid vald</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between">
                {selections[currentTrack]?.start && selections[currentTrack]?.end ? (
                  <div className="text-sm text-foreground/80">
                    Vald tid för {currentTrack}:{" "}
                    <span className="font-medium">
                      {new Date(selections[currentTrack].start!).toLocaleString("sv-SE", {
                        weekday: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      →{" "}
                      {new Date(selections[currentTrack].end!).toLocaleString("sv-SE", {
                        weekday: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Ingen tid vald ännu för {currentTrack}. Markera i kalendern.
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={onClose}
                    className="rounded-md border border-border px-4 py-2 text-sm transition hover:bg-muted"
                  >
                    Avbryt
                  </button>
                  <button
                    disabled={!hasAnySelection}
                    onClick={() => {
                      const confirmedSelections: Array<{ track: AppTrack; start: string; end: string }> = [];

                      Object.entries(selections).forEach(([track, selection]) => {
                        if (selection.start && selection.end) {
                          confirmedSelections.push({
                            track: track as AppTrack,
                            start: selection.start,
                            end: selection.end,
                          });
                        }
                      });

                      if (confirmedSelections.length === 0) return;

                      confirmedSelections.forEach(({ track, start, end }) => {
                        onSelectRange?.(track, start, end);
                      });
                      onClose();
                    }}
                    className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                      hasAnySelection
                        ? "bg-[#8ebe3f] text-white hover:bg-[#7cab38]"
                        : "cursor-not-allowed bg-muted text-muted-foreground"
                    }`}
                  >
                    Bekräfta alla ({Object.values(selections).filter((selection) => selection.start && selection.end).length})
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
