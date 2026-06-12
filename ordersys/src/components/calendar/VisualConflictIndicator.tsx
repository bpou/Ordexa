"use client";

import { useMemo } from "react";
import type {
  VisualConflictIndicatorProps,
  EventConflict,
  BusinessHoursWarning,
} from "./ConflictTypes";

export function VisualConflictIndicator({
  conflicts,
  businessHoursWarning,
  isVisible,
  position,
}: VisualConflictIndicatorProps) {
  // Determine overall severity
  const overallSeverity = useMemo(() => {
    const hasErrorConflicts = conflicts.some(c => c.severity === 'error');
    const hasWarningConflicts = conflicts.some(c => c.severity === 'warning');
    const hasBusinessHoursWarning = businessHoursWarning.isOutsideHours;

    if (hasErrorConflicts) return 'error';
    if (hasWarningConflicts || hasBusinessHoursWarning) return 'warning';
    return 'success';
  }, [conflicts, businessHoursWarning]);

  // Get status colors and styles
  const getStatusStyles = () => {
    switch (overallSeverity) {
      case 'error':
        return {
          bg: 'bg-red-500',
          border: 'border-red-600',
          text: 'text-red-900',
          lightBg: 'bg-red-100',
          icon: '⚠️',
        };
      case 'warning':
        return {
          bg: 'bg-amber-500',
          border: 'border-amber-600',
          text: 'text-amber-900',
          lightBg: 'bg-amber-100',
          icon: '⚡',
        };
      case 'success':
      default:
        return {
          bg: 'bg-green-500',
          border: 'border-green-600',
          text: 'text-green-900',
          lightBg: 'bg-green-100',
          icon: '✓',
        };
    }
  };

  // Don't render if not visible or no issues
  if (!isVisible || (conflicts.length === 0 && !businessHoursWarning.isOutsideHours)) {
    return null;
  }

  const styles = getStatusStyles();

  return (
    <div
      className={`fixed top-4 right-4 z-50 p-4 rounded-lg border-2 shadow-lg transition-all duration-300 ${styles.lightBg} ${styles.border} ${styles.text}`}
      style={{
        minWidth: '300px',
        maxWidth: '400px',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{styles.icon}</span>
        <div>
          <div className="font-semibold text-sm">
            {overallSeverity === 'error' && 'Allvarliga konflikter'}
            {overallSeverity === 'warning' && 'Varningar'}
            {overallSeverity === 'success' && 'Klart att skapa'}
          </div>
          <div className="text-xs opacity-75">
            Drag-and-drop status
          </div>
        </div>
      </div>

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <div className="mb-3">
          <div className="font-medium text-sm mb-2">
            Konflikter ({conflicts.length}):
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {conflicts.slice(0, 5).map((conflict, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 text-xs p-2 rounded ${conflict.severity === 'error' ? 'bg-red-50' : 'bg-amber-50'}`}
              >
                <span>
                  {conflict.severity === 'error' ? '🔴' : '🟡'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {conflict.eventTitle}
                  </div>
                  <div className="opacity-75">
                    {conflict.conflictType === 'overlap' && 'Överlappar'}
                    {conflict.conflictType === 'adjacent' && 'Angränsar'}
                    {conflict.conflictType === 'contained' && 'Innesluten'}
                    {conflict.conflictType === 'containing' && 'Innesluter'}
                    {' • '}
                    {conflict.conflictDuration} min
                  </div>
                </div>
              </div>
            ))}
            {conflicts.length > 5 && (
              <div className="text-xs opacity-75 text-center p-1">
                +{conflicts.length - 5} till...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Business hours warning */}
      {businessHoursWarning.isOutsideHours && (
        <div className="mb-3">
          <div className="font-medium text-sm mb-2 flex items-center gap-2">
            <span>🕐</span>
            Utanför arbetstid
          </div>
          <div className="text-xs opacity-75">
            <div>
              {businessHoursWarning.minutesOutside} minuter utanför arbetstid
            </div>
            {businessHoursWarning.suggestedTime && (
              <div className="mt-1">
                Förslag: {formatTime(businessHoursWarning.suggestedTime.start)} - 
                {formatTime(businessHoursWarning.suggestedTime.end)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer with action hint */}
      <div className="border-t border-current/20 pt-2 mt-3">
        <div className="text-xs opacity-75">
          {overallSeverity === 'error' && (
            <div>
              Släpp för att öppna dialogen med konfliktlösning
            </div>
          )}
          {overallSeverity === 'warning' && (
            <div>
              Släpp för att öppna dialogen och bekräfta skapande
            </div>
          )}
          {overallSeverity === 'success' && (
            <div>
              Släpp för att skapa händelsen
            </div>
          )}
        </div>
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

// Export a simplified version for drag status
export function DragStatusIndicator({
  conflicts,
  businessHoursWarning,
  isDragging,
}: {
  conflicts: EventConflict[];
  businessHoursWarning: BusinessHoursWarning;
  isDragging: boolean;
}) {
  if (!isDragging) return null;

  const hasErrorConflicts = conflicts.some(c => c.severity === 'error');
  const hasWarningConflicts = conflicts.some(c => c.severity === 'warning');
  const hasBusinessHoursWarning = businessHoursWarning.isOutsideHours;

  let status = 'success';
  let icon = '✓';
  let color = 'text-green-600';

  if (hasErrorConflicts) {
    status = 'error';
    icon = '⚠️';
    color = 'text-red-600';
  } else if (hasWarningConflicts || hasBusinessHoursWarning) {
    status = 'warning';
    icon = '⚡';
    color = 'text-amber-600';
  }

  return (
    <div className={`fixed bottom-4 left-4 flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-lg border ${color} border-current`}>
      <span className="text-lg">{icon}</span>
      <span className={`text-sm font-medium ${color}`}>
        {status === 'error' && 'Konflikter'}
        {status === 'warning' && 'Varningar'}
        {status === 'success' && 'Klart'}
      </span>
    </div>
  );
}