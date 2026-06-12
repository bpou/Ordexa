"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Clock, Tag, Eye, Trash2 } from "lucide-react";
import type { EventInput } from "@fullcalendar/core";

type PersonalEventModalProps = {
  open: boolean;
  onClose: () => void;
  onEventSaved: () => void;
  onEventDelete: (eventId: string) => void;
  initialEvent?: EventInput | null;
  initialRange?: { start: string; end: string } | null;
};

const CALENDAR_LABELS = [
  { value: "BOKAD_TID", label: "Bokad tid" },
  { value: "KAN_FLYTTAS", label: "Kan flyttas" },
  { value: "LUNCH", label: "Lunch" },
  { value: "SEMESTER", label: "Semester" },
  { value: "TRAFIKVERKET", label: "Trafikverket" },
  { value: "UNDER_VECKAN", label: "Under veckan" },
  { value: "UTFORT_ARBETE", label: "Utfört arbete" },
];

export default function PersonalEventModal({
  open,
  onClose,
  onEventSaved,
  onEventDelete,
  initialEvent,
  initialRange,
}: PersonalEventModalProps) {
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [label, setLabel] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PERSONAL">("PERSONAL");
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialEvent) {
        // Editing existing event
        setTitle(initialEvent.title || "");
        setStart(initialEvent.start?.toString() || "");
        setEnd(initialEvent.end?.toString() || "");
        setAllDay(initialEvent.allDay || false);
        setLabel(initialEvent.extendedProps?.label || "");
        setVisibility(initialEvent.extendedProps?.visibility || "PERSONAL");
        setIsEditing(true);
      } else if (initialRange) {
        // Creating new event with selected range
        setTitle("");
        setStart(initialRange.start);
        setEnd(initialRange.end);
        setAllDay(false);
        setLabel("BOKAD_TID");
        setVisibility("PERSONAL");
        setIsEditing(false);
      } else {
        // Creating new event without range
        const now = new Date();
        const later = new Date(now.getTime() + 60 * 60 * 1000);
        setTitle("");
        setStart(now.toISOString());
        setEnd(later.toISOString());
        setAllDay(false);
        setLabel("BOKAD_TID");
        setVisibility("PERSONAL");
        setIsEditing(false);
      }
    }
  }, [open, initialEvent, initialRange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !start || !end) return;

    setLoading(true);
    try {
      const eventData = {
        title: title.trim(),
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
        allDay,
        label: label || null,
        visibility,
        track: "A", // Personal events need to use a valid track enum
      };

      if (isEditing && initialEvent?.id) {
        // Update existing event
        const res = await fetch(`/api/free-events/${initialEvent.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventData),
        });

        if (res.ok) {
          onEventSaved();
        }
      } else {
        // Create new event
        const res = await fetch("/api/free-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventData),
        });

        if (res.ok) {
          onEventSaved();
        }
      }
    } catch (error) {
      console.error("Failed to save event:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (isEditing && initialEvent?.id) {
      onEventDelete(initialEvent.id);
    }
  };

  const formatDateTimeLocal = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 16);
  };

  const formatDateLocal = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  };

  if (!open) return null;

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
            className="relative w-[90vw] max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-neutral-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b bg-neutral-50 px-5 py-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-neutral-700" />
                <h2 className="text-lg font-semibold text-neutral-800">
                  {isEditing ? "Redigera händelse" : "Ny händelse"}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {isEditing && (
                  <button
                    onClick={handleDelete}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition"
                    title="Ta bort händelse"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-neutral-100 transition"
                  aria-label="Stäng"
                >
                  <X className="h-5 w-5 text-neutral-600" />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Titel *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8ebe3f] focus:border-transparent"
                  placeholder="Ange titel..."
                  required
                />
              </div>

              {/* All Day Toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="allDay"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                  className="h-4 w-4 accent-[#8ebe3f]"
                />
                <label htmlFor="allDay" className="text-sm font-medium text-neutral-700">
                  Heldagshändelse
                </label>
              </div>

              {/* Date/Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    <Clock className="inline h-3 w-3 mr-1" />
                    Start *
                  </label>
                  <input
                    type={allDay ? "date" : "datetime-local"}
                    value={allDay ? formatDateLocal(start) : formatDateTimeLocal(start)}
                    onChange={(e) => setStart(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8ebe3f] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    <Clock className="inline h-3 w-3 mr-1" />
                    Slut *
                  </label>
                  <input
                    type={allDay ? "date" : "datetime-local"}
                    value={allDay ? formatDateLocal(end) : formatDateTimeLocal(end)}
                    onChange={(e) => setEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8ebe3f] focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Label */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  <Tag className="inline h-3 w-3 mr-1" />
                  Etikett
                </label>
                <select
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8ebe3f] focus:border-transparent"
                >
                  {CALENDAR_LABELS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Visibility */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  <Eye className="inline h-3 w-3 mr-1" />
                  Synlighet
                </label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as "PUBLIC" | "PERSONAL")}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8ebe3f] focus:border-transparent"
                >
                  <option value="PERSONAL">Personlig (endast synlig för mig)</option>
                  <option value="PUBLIC">Publik (synlig för alla)</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 rounded-md border border-neutral-300 text-sm hover:bg-neutral-100 transition"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={loading || !title.trim() || !start || !end}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition ${
                    loading || !title.trim() || !start || !end
                      ? "bg-neutral-200 text-neutral-500 cursor-not-allowed"
                      : "bg-[#8ebe3f] text-white hover:bg-[#7cab38]"
                  }`}
                >
                  {loading ? "Sparar..." : isEditing ? "Uppdatera" : "Skapa"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}