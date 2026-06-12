"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { EventCreationData, EventConflict } from "./drag-drop-types";
import type { BusinessHoursWarning } from "./ConflictTypes";

// Temporary imports until components are created
// import { EventConfirmationForm } from "./EventConfirmationForm";
// import { OrderDetailsIntegration } from "./OrderDetailsIntegration";

// Temporary placeholder components
const EventConfirmationForm = ({ eventData, onDataChange, disabled }: any) => (
  <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
    <p className="text-sm text-neutral-600">EventConfirmationForm - Coming soon</p>
    <p className="text-xs text-neutral-500 mt-1">Title: {eventData?.title}</p>
    <p className="text-xs text-neutral-500">Track: {eventData?.track}</p>
  </div>
);

const OrderDetailsIntegration = ({ orderDetails, onOrderDataChange, readOnly }: any) => (
  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
    <p className="text-sm text-blue-600">OrderDetailsIntegration - Coming soon</p>
    <p className="text-xs text-blue-500 mt-1">Customer: {orderDetails?.customerName}</p>
    <p className="text-xs text-blue-500">Order: {orderDetails?.orderTitle}</p>
  </div>
);

interface EventConfirmationModalProps {
  isOpen: boolean;
  eventData: EventCreationData | null;
  onClose: () => void;
  onConfirm: (eventData: EventCreationData) => Promise<void>;
}

export function EventConfirmationModal({
  isOpen,
  eventData,
  onClose,
  onConfirm,
}: EventConfirmationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editedEventData, setEditedEventData] = useState<EventCreationData | null>(null);
  
  // Refs for accessibility
  const modalRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Update edited event data when props change
  useState(() => {
    if (eventData && !editedEventData) {
      setEditedEventData({ ...eventData });
    }
  });

  // Reset form when modal opens/closes
  const resetForm = useCallback(() => {
    setEditedEventData(eventData ? { ...eventData } : null);
    setSubmitError(null);
    setIsSubmitting(false);
  }, [eventData]);

  // Handle form data changes
  const handleFormChange = useCallback((updates: Partial<EventCreationData>) => {
    if (!editedEventData) return;
    
    setEditedEventData(prev => ({
      ...prev!,
      ...updates,
    }));
  }, [editedEventData]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!editedEventData) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onConfirm(editedEventData);
      onClose();
    } catch (error) {
      console.error('Failed to create event:', error);
      setSubmitError(error instanceof Error ? error.message : 'Kunde inte skapa händelsen');
    } finally {
      setIsSubmitting(false);
    }
  }, [editedEventData, onConfirm, onClose]);

  // Handle modal close
  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  }, [isSubmitting, resetForm, onClose]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen) return;

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        if (!isSubmitting) {
          handleClose();
        }
        break;
        
      case 'Enter':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          if (!isSubmitting && editedEventData) {
            handleSubmit();
          }
        }
        break;
        
      case 'Tab':
        // Let default tab behavior work, but ensure we stay within the modal
        if (modalRef.current && !modalRef.current.contains(document.activeElement)) {
          event.preventDefault();
          confirmButtonRef.current?.focus();
        }
        break;
    }
  }, [isOpen, isSubmitting, editedEventData, handleClose, handleSubmit]);

  // Set up keyboard event listeners
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      
      // Focus management
      if (titleRef.current) {
        titleRef.current.focus();
      }
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, handleKeyDown]);

  // Handle click outside to close
  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget && !isSubmitting) {
      handleClose();
    }
  }, [isSubmitting, handleClose]);


  // Don't render if not open
  if (!isOpen || !editedEventData) {
    return null;
  }

  const { conflicts, businessHoursWarning } = editedEventData;
  const hasErrorConflicts = conflicts.some(c => c.severity === 'error');
  const hasWarningConflicts = conflicts.some(c => c.severity === 'warning');
  const hasBusinessHoursWarning = businessHoursWarning.isOutsideHours;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] bg-white rounded-xl shadow-xl border border-neutral-200 overflow-hidden focus:outline-none focus:ring-2 focus:ring-neutral-500 flex flex-col"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-neutral-200 bg-neutral-50 flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2
                ref={titleRef}
                id="modal-title"
                className="text-lg sm:text-xl font-semibold text-neutral-900 truncate"
                tabIndex={-1}
              >
                Bekräfta ny händelse
              </h2>
              <p id="modal-description" className="text-sm text-neutral-600 mt-1 hidden sm:block">
                Granska och bekräfta detaljerna för den nya händelsen
              </p>
            </div>
            <button
              ref={cancelButtonRef}
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="p-2 rounded-lg hover:bg-neutral-200 transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-neutral-500 flex-shrink-0"
              aria-label="Stäng dialogruta"
              title="Stäng (Esc)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Status alerts */}
            {(hasErrorConflicts || hasWarningConflicts || hasBusinessHoursWarning) && (
              <div className="space-y-3">
                {hasErrorConflicts && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <span className="text-red-600 text-lg">⚠️</span>
                      <div>
                        <h3 className="font-semibold text-red-900">Allvarliga konflikter</h3>
                        <p className="text-sm text-red-700 mt-1">
                          Händelsen har konflikter som kan hindra skapande. Granska konflikterna nedan.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {(hasWarningConflicts || hasBusinessHoursWarning) && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <span className="text-amber-600 text-lg">⚡</span>
                      <div>
                        <h3 className="font-semibold text-amber-900">Varningar</h3>
                        <p className="text-sm text-amber-700 mt-1">
                          Det finns varningar som du bör vara medveten om innan du skapar händelsen.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Order details integration */}
            {editedEventData.orderDetails && (
              <OrderDetailsIntegration
                orderDetails={editedEventData.orderDetails}
                onOrderDataChange={(orderDetails: any) => handleFormChange({ orderDetails })}
              />
            )}

            {/* Event confirmation form */}
            <EventConfirmationForm
              eventData={editedEventData}
              onDataChange={handleFormChange}
              disabled={isSubmitting}
            />

            {/* Conflict details */}
            {conflicts.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-neutral-900">Konflikter ({conflicts.length})</h3>
                <div className="space-y-2">
                  {conflicts.map((conflict, index) => (
                    <ConflictDetail key={index} conflict={conflict} />
                  ))}
                </div>
              </div>
            )}

            {/* Business hours warning */}
            {hasBusinessHoursWarning && (
              <div className={`p-4 border rounded-lg ${
                businessHoursWarning.warningLevel === 'error'
                  ? 'bg-orange-50 border-orange-200'
                  : businessHoursWarning.warningLevel === 'warning'
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-start gap-3">
                  <span className={`text-lg ${
                    businessHoursWarning.warningLevel === 'error'
                      ? 'text-orange-600'
                      : businessHoursWarning.warningLevel === 'warning'
                      ? 'text-amber-600'
                      : 'text-blue-600'
                  }`}>🕐</span>
                  <div className="flex-1">
                    <h3 className={`font-semibold ${
                      businessHoursWarning.warningLevel === 'error'
                        ? 'text-orange-900'
                        : businessHoursWarning.warningLevel === 'warning'
                        ? 'text-amber-900'
                        : 'text-blue-900'
                    }`}>
                      {businessHoursWarning.warningLevel === 'error'
                        ? 'Arbetstid - Allvarlig varning'
                        : businessHoursWarning.warningLevel === 'warning'
                        ? 'Arbetstid - Varning'
                        : 'Arbetstid - Info'}
                    </h3>
                    <p className={`text-sm mt-1 ${
                      businessHoursWarning.warningLevel === 'error'
                        ? 'text-orange-700'
                        : businessHoursWarning.warningLevel === 'warning'
                        ? 'text-amber-700'
                        : 'text-blue-700'
                    }`}>
                      Händelsen är {businessHoursWarning.minutesOutside} minuter utanför arbetstid.
                      {businessHoursWarning.warningLevel === 'error' &&
                        ' Det rekommenderas starkt att flytta händelsen till arbetstid.'}
                    </p>
                    
                    {/* Business hours configuration info */}
                    {businessHoursWarning.businessHoursConfig && (
                      <div className="mt-2 text-xs opacity-70">
                        Arbetstid: {businessHoursWarning.businessHoursConfig.startHour}:00 -
                        {businessHoursWarning.businessHoursConfig.endHour}:00
                      </div>
                    )}
                    
                    {/* Suggested time */}
                    {businessHoursWarning.suggestedTime && (
                      <div className="mt-3">
                        <div className={`text-sm font-medium ${
                          businessHoursWarning.warningLevel === 'error'
                            ? 'text-orange-800'
                            : businessHoursWarning.warningLevel === 'warning'
                            ? 'text-amber-800'
                            : 'text-blue-800'
                        }`}>
                          Föreslagen tid inom arbetstid:
                        </div>
                        <div className={`text-sm mt-1 p-2 rounded border ${
                          businessHoursWarning.warningLevel === 'error'
                            ? 'bg-orange-100 border-orange-300 text-orange-900'
                            : businessHoursWarning.warningLevel === 'warning'
                            ? 'bg-amber-100 border-amber-300 text-amber-900'
                            : 'bg-blue-100 border-blue-300 text-blue-900'
                        }`}>
                          {formatTime(businessHoursWarning.suggestedTime.start)} -
                          {formatTime(businessHoursWarning.suggestedTime.end)}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            // This would update the form data with the suggested time
                            // Implementation depends on how the form is structured
                            console.log('Apply suggested time:', businessHoursWarning.suggestedTime);
                          }}
                          className={`mt-2 text-xs px-3 py-1 rounded border transition-colors ${
                            businessHoursWarning.warningLevel === 'error'
                              ? 'bg-orange-600 text-white border-orange-600 hover:bg-orange-700'
                              : businessHoursWarning.warningLevel === 'warning'
                              ? 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700'
                              : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          Använd föreslagen tid
                        </button>
                      </div>
                    )}
                    
                    {/* Ignore business hours option */}
                    <div className="mt-3">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={editedEventData?.ignoreBusinessHours || false}
                          onChange={(e) => handleFormChange({ ignoreBusinessHours: e.target.checked })}
                          className="w-4 h-4 rounded border-neutral-300"
                        />
                        <span className={businessHoursWarning.warningLevel === 'error'
                          ? 'text-orange-700'
                          : businessHoursWarning.warningLevel === 'warning'
                          ? 'text-amber-700'
                          : 'text-blue-700'
                        }>
                          Skapa händelsen ändå (ignorera arbetstid)
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error message */}
            {submitError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="text-red-600">❌</span>
                  <div>
                    <h3 className="font-semibold text-red-900">Fel</h3>
                    <p className="text-sm text-red-700 mt-1">{submitError}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-neutral-600">
              {hasErrorConflicts && hasBusinessHoursWarning && "Lös konflikter och arbetstid eller fortsätt ändå"}
              {hasErrorConflicts && !hasBusinessHoursWarning && "Lös konflikterna eller fortsätt ändå"}
              {!hasErrorConflicts && hasWarningConflicts && hasBusinessHoursWarning && "Granska varningarna och bekräfta"}
              {!hasErrorConflicts && hasWarningConflicts && !hasBusinessHoursWarning && "Granska varningarna och bekräfta"}
              {!hasErrorConflicts && !hasWarningConflicts && hasBusinessHoursWarning && "Granska arbetstid och bekräfta"}
              {!hasErrorConflicts && !hasWarningConflicts && !hasBusinessHoursWarning && "Klart att skapa händelsen"}
            </div>
            <div className="flex items-center gap-3">
              <button
                ref={cancelButtonRef}
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-neutral-500"
                aria-describedby="modal-description"
              >
                Avbryt
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                aria-describedby="modal-description"
                title="Skapa händelse (Ctrl+Enter)"
              >
                {isSubmitting && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                <span>{isSubmitting ? 'Skapar...' : 'Skapa händelse'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Component for displaying individual conflict details
function ConflictDetail({ conflict }: { conflict: EventConflict }) {
  const getConflictIcon = (severity: string) => {
    return severity === 'error' ? '🔴' : '🟡';
  };

  const getConflictTypeText = (type: string) => {
    switch (type) {
      case 'overlap': return 'Överlappar';
      case 'adjacent': return 'Angränsar';
      case 'contained': return 'Innesluten';
      case 'containing': return 'Innesluter';
      default: return type;
    }
  };

  return (
    <div className={`p-3 rounded-lg border ${
      conflict.severity === 'error' 
        ? 'bg-red-50 border-red-200' 
        : 'bg-amber-50 border-amber-200'
    }`}>
      <div className="flex items-start gap-3">
        <span className="text-lg">{getConflictIcon(conflict.severity)}</span>
        <div className="flex-1">
          <div className="font-medium text-neutral-900">
            {conflict.eventTitle}
          </div>
          <div className="text-sm text-neutral-600 mt-1">
            {getConflictTypeText(conflict.conflictType)} • {conflict.conflictDuration} minuter
          </div>
          {conflict.suggestedResolution && (
            <div className="mt-2 text-sm">
              <span className="font-medium">Förslag:</span> {conflict.suggestedResolution.reason}
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