"use client";

import { useMemo } from "react";
import type { TemporaryEvent, TemporaryEventProps } from "./drag-drop-types";
import type { BusinessHoursWarning } from "./ConflictTypes";
import { formatMinutesLabel } from "@/lib/time";

export function TemporaryEvent({ event, position }: TemporaryEventProps) {
  const { conflicts, businessHoursWarning, conflictDetectionResult } = event;

  // Determine visual state based on conflicts and warnings
  const visualState = useMemo(() => {
    const hasErrorConflicts = conflicts.some(c => c.severity === 'error');
    const hasWarningConflicts = conflicts.some(c => c.severity === 'warning');
    const businessHoursWarningObj = conflictDetectionResult?.businessHoursWarning;
    const hasBusinessHoursWarning = businessHoursWarning || businessHoursWarningObj?.isOutsideHours;

    // Business hours violations take precedence over conflicts
    if (businessHoursWarningObj?.warningLevel === 'error') return 'business-hours-error';
    if (businessHoursWarningObj?.warningLevel === 'warning') return 'business-hours-warning';
    if (hasErrorConflicts) return 'error';
    if (hasWarningConflicts) return 'warning';
    if (hasBusinessHoursWarning) return 'business-hours-info';
    return 'success';
  }, [conflicts, businessHoursWarning, conflictDetectionResult]);

  // Get CSS classes based on visual state
  const getContainerClasses = () => {
    const baseClasses = "temporary-event rounded-lg border-2 shadow-lg transition-all duration-200 pointer-events-none";
    
    switch (visualState) {
      case 'business-hours-error':
        return `${baseClasses} border-orange-600 bg-orange-50 text-orange-900 border-dashed`;
      case 'business-hours-warning':
        return `${baseClasses} border-orange-500 bg-orange-50 text-orange-900 border-dashed`;
      case 'business-hours-info':
        return `${baseClasses} border-orange-400 bg-orange-50 text-orange-900 border-dashed`;
      case 'error':
        return `${baseClasses} border-red-500 bg-red-50 text-red-900`;
      case 'warning':
        return `${baseClasses} border-amber-500 bg-amber-50 text-amber-900`;
      case 'success':
      default:
        return `${baseClasses} border-green-500 bg-green-50 text-green-900`;
    }
  };

  // Format duration
  const formatDuration = (start: Date, end: Date) => {
    const durationMs = end.getTime() - start.getTime();
    const durationMinutes = Math.round(durationMs / (1000 * 60));
    
    if (durationMinutes < 60) {
      return `${durationMinutes} min`;
    }
    
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    if (minutes === 0) {
      return `${hours} h`;
    }
    
    return `${hours} h ${minutes} min`;
  };

  // Get status indicator
  const getStatusIndicator = () => {
    switch (visualState) {
      case 'business-hours-error':
        return { icon: '🕐', text: 'Arbetstid', color: 'text-orange-600' };
      case 'business-hours-warning':
        return { icon: '🕐', text: 'Arbetstid', color: 'text-orange-600' };
      case 'business-hours-info':
        return { icon: '🕐', text: 'Arbetstid', color: 'text-orange-600' };
      case 'error':
        return { icon: '⚠️', text: 'Konflikter', color: 'text-red-600' };
      case 'warning':
        return { icon: '⚡', text: 'Varningar', color: 'text-amber-600' };
      case 'success':
      default:
        return { icon: '✓', text: 'OK', color: 'text-green-600' };
    }
  };

  const statusIndicator = getStatusIndicator();

  return (
    <div 
      className={getContainerClasses()}
      style={{
        position: 'absolute',
        minWidth: '200px',
        maxWidth: '300px',
        zIndex: 1000,
        opacity: 0.9,
        transform: 'translateX(-50%)',
      }}
    >
      <div className="p-3 space-y-2">
        {/* Header with title and status */}
        <div className="flex items-center justify-between">
          <div className="font-semibold text-sm truncate flex-1">
            {event.title}
          </div>
          <div className={`flex items-center gap-1 text-xs ${statusIndicator.color}`}>
            <span>{statusIndicator.icon}</span>
            <span>{statusIndicator.text}</span>
          </div>
        </div>

        {/* Time information */}
        <div className="text-xs space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">Start:</span>
            <span>{formatTime(event.start)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Slut:</span>
            <span>{formatTime(event.end)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Varaktighet:</span>
            <span>{formatDuration(event.start, event.end)}</span>
          </div>
        </div>

        {/* Track information */}
        <div className="flex items-center gap-2">
          <span className="font-medium text-xs">Spår:</span>
          <span className="px-2 py-0.5 bg-white/50 rounded text-xs font-semibold">
            {event.track}
          </span>
        </div>

        {/* Conflict summary */}
        {conflicts.length > 0 && (
          <div className="border-t border-current/20 pt-2">
            <div className="text-xs">
              <div className="font-medium mb-1">Konflikter ({conflicts.length}):</div>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {conflicts.slice(0, 3).map((conflict, index) => (
                  <div key={index} className="flex items-center gap-1 truncate">
                    <span className={
                      conflict.severity === 'error' ? 'text-red-600' : 'text-amber-600'
                    }>
                      {conflict.severity === 'error' ? '🔴' : '🟡'}
                    </span>
                    <span className="truncate">{conflict.eventTitle}</span>
                  </div>
                ))}
                {conflicts.length > 3 && (
                  <div className="text-xs opacity-70">
                    +{conflicts.length - 3} till...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Business hours warning */}
        {conflictDetectionResult?.businessHoursWarning?.isOutsideHours && (
          <div className="border-t border-current/20 pt-2">
            <div className="text-xs flex items-center gap-1">
              <span>🕐</span>
              <span>Utanför arbetstid</span>
              <span className="text-xs opacity-70">
                ({conflictDetectionResult.businessHoursWarning.minutesOutside} min)
              </span>
            </div>
            {conflictDetectionResult.businessHoursWarning.suggestedTime && (
              <div className="text-xs opacity-70 mt-1">
                <span className="font-medium">Förslag:</span>{' '}
                {formatTime(conflictDetectionResult.businessHoursWarning.suggestedTime.start)} -{' '}
                {formatTime(conflictDetectionResult.businessHoursWarning.suggestedTime.end)}
              </div>
            )}
            {conflictDetectionResult.businessHoursWarning.businessHoursConfig && (
              <div className="text-xs opacity-70 mt-1">
                Arbetstid: {conflictDetectionResult.businessHoursWarning.businessHoursConfig.startHour}:00 -
                {conflictDetectionResult.businessHoursWarning.businessHoursConfig.endHour}:00
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to format time
function formatTime(date: Date): string {
  return date.toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}