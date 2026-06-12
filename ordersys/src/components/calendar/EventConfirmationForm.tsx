"use client";

import { useState, useEffect } from "react";
import type { EventCreationData } from "./drag-drop-types";
import type { AppTrack } from "@/lib/tracks";

interface EventConfirmationFormProps {
  eventData: EventCreationData;
  onDataChange: (updates: Partial<EventCreationData>) => void;
  disabled?: boolean;
}

export function EventConfirmationForm({
  eventData,
  onDataChange,
  disabled = false,
}: EventConfirmationFormProps) {
  const [localTitle, setLocalTitle] = useState(eventData.title);
  const [localStart, setLocalStart] = useState(eventData.start);
  const [localEnd, setLocalEnd] = useState(eventData.end);
  const [localTrack, setLocalTrack] = useState(eventData.track);
  const [localDescription, setLocalDescription] = useState("");
  const [ignoreBusinessHours, setIgnoreBusinessHours] = useState(eventData.ignoreBusinessHours);

  // Update local state when props change
  useEffect(() => {
    setLocalTitle(eventData.title);
    setLocalStart(eventData.start);
    setLocalEnd(eventData.end);
    setLocalTrack(eventData.track);
    setIgnoreBusinessHours(eventData.ignoreBusinessHours);
  }, [eventData]);

  // Handle title change
  const handleTitleChange = (value: string) => {
    setLocalTitle(value);
    onDataChange({ title: value });
  };

  // Handle time changes
  const handleStartChange = (value: string) => {
    const newStart = new Date(value);
    setLocalStart(newStart);
    onDataChange({ start: newStart });
  };

  const handleEndChange = (value: string) => {
    const newEnd = new Date(value);
    setLocalEnd(newEnd);
    onDataChange({ end: newEnd });
  };

  // Handle track change
  const handleTrackChange = (value: AppTrack) => {
    setLocalTrack(value);
    onDataChange({ track: value });
  };

  // Handle business hours toggle
  const handleBusinessHoursToggle = (value: boolean) => {
    setIgnoreBusinessHours(value);
    onDataChange({ ignoreBusinessHours: value });
  };

  // Format date for datetime-local input
  const formatDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Available tracks
  const availableTracks: AppTrack[] = ['A', 'B', 'C', 'D'];

  // Calculate duration
  const durationMinutes = Math.round((localEnd.getTime() - localStart.getTime()) / (1000 * 60));

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-neutral-900">Händelsedetaljer</h3>
      
      {/* Title */}
      <div>
        <label htmlFor="event-title" className="block text-sm font-medium text-neutral-700 mb-1">
          Titel *
        </label>
        <input
          id="event-title"
          type="text"
          value={localTitle}
          onChange={(e) => handleTitleChange(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="Ange titel för händelsen"
          required
        />
      </div>

      {/* Date and Time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="event-start" className="block text-sm font-medium text-neutral-700 mb-1">
            Starttid *
          </label>
          <input
            id="event-start"
            type="datetime-local"
            value={formatDateTimeLocal(localStart)}
            onChange={(e) => handleStartChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            required
          />
        </div>
        
        <div>
          <label htmlFor="event-end" className="block text-sm font-medium text-neutral-700 mb-1">
            Sluttid *
          </label>
          <input
            id="event-end"
            type="datetime-local"
            value={formatDateTimeLocal(localEnd)}
            onChange={(e) => handleEndChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            required
          />
        </div>
      </div>

      {/* Duration display */}
      <div className="flex items-center gap-2 text-sm text-neutral-600">
        <span>Varaktighet:</span>
        <span className="font-medium">{durationMinutes} minuter</span>
        {durationMinutes < 30 && (
          <span className="text-amber-600">⚠️ Kort händelse</span>
        )}
        {durationMinutes > 480 && (
          <span className="text-blue-600">ℹ️ Lång händelse (&gt;8h)</span>
        )}
      </div>

      {/* Track selection */}
      <div>
        <label htmlFor="event-track" className="block text-sm font-medium text-neutral-700 mb-1">
          Spår *
        </label>
        <select
          id="event-track"
          value={localTrack}
          onChange={(e) => handleTrackChange(e.target.value as AppTrack)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          required
        >
          {availableTracks.map((track) => (
            <option key={track} value={track}>
              Spår {track}
            </option>
          ))}
        </select>
      </div>

      {/* Description (optional) */}
      <div>
        <label htmlFor="event-description" className="block text-sm font-medium text-neutral-700 mb-1">
          Beskrivning (valfri)
        </label>
        <textarea
          id="event-description"
          value={localDescription}
          onChange={(e) => setLocalDescription(e.target.value)}
          disabled={disabled}
          rows={3}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
          placeholder="Lägg till en beskrivning för händelsen..."
        />
      </div>

      {/* Business hours override */}
      {eventData.businessHoursWarning.isOutsideHours && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <input
              id="ignore-business-hours"
              type="checkbox"
              checked={ignoreBusinessHours}
              onChange={(e) => handleBusinessHoursToggle(e.target.checked)}
              disabled={disabled}
              className="mt-1 w-4 h-4 text-blue-600 border-blue-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="flex-1">
              <label htmlFor="ignore-business-hours" className="font-medium text-blue-900 cursor-pointer">
                Ignorera arbetstid
              </label>
              <p className="text-sm text-blue-700 mt-1">
                Händelsen är utanför arbetstid. Markera för att skapa den ändå.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Conflict resolution options */}
      {eventData.conflicts.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="font-medium text-amber-900 mb-3">Konfliktlösning</h4>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="conflict-resolution"
                value="override"
                checked={true}
                disabled={disabled}
                className="w-4 h-4 text-amber-600 border-amber-300 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span className="text-sm text-amber-800">Skapa ändå (åsidosätt konflikter)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="conflict-resolution"
                value="reschedule"
                disabled={disabled}
                className="w-4 h-4 text-amber-600 border-amber-300 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span className="text-sm text-amber-800">Föreslå ny tid (manuell justering)</span>
            </label>
          </div>
        </div>
      )}

      {/* Form validation hints */}
      <div className="text-xs text-neutral-500 space-y-1">
        <div>* Obligatoriska fält</div>
        <div>Händelsen kommer att synas i kalendern för Spår {localTrack}</div>
        {eventData.conflicts.length > 0 && (
          <div className="text-amber-600">
            ⚠️ {eventData.conflicts.length} konflikt{eventData.conflicts.length > 1 ? 'er' : ''} hittades
          </div>
        )}
      </div>
    </div>
  );
}