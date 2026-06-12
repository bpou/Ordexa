"use client";

import { createContext, useContext, ReactNode, useCallback, useEffect, useState } from "react";
import type { AppTrack } from "@/lib/tracks";
import type {
  CalendarDragDropContextValue,
  CalendarDragDropProviderProps,
  EventCreationData,
} from "./drag-drop-types";
import type { BusinessHoursConfig } from "./ConflictTypes";
import { useDragDropState } from "./useDragDropState";
import { VisualConflictIndicator, DragStatusIndicator } from "./VisualConflictIndicator";
import { EventConfirmationModal } from "./EventConfirmationModal";
import { BusinessHoursIndicator } from "./BusinessHoursIndicator";
import { useBusinessHoursConfig } from "./BusinessHoursConfig";

// Create the context
const CalendarDragDropContext = createContext<CalendarDragDropContextValue | null>(null);

// Provider component
export function CalendarDragDropProvider({
  children,
  track,
  events
}: CalendarDragDropProviderProps) {
  // Load business hours configuration
  const { config: businessHoursConfig, isLoading: isLoadingConfig } = useBusinessHoursConfig();
  
  const { state, actions, updateTrackEvents, closeCreationModal, conflictUtils, businessHoursUtils } = useDragDropState(track, events, businessHoursConfig);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [createEventError, setCreateEventError] = useState<string | null>(null);

  // Update track events when they change
  useEffect(() => {
    updateTrackEvents(events);
  }, [events, updateTrackEvents]);

  // Handle event creation confirmation
  const handleEventCreation = useCallback(async (eventData: EventCreationData) => {
    setIsCreatingEvent(true);
    setCreateEventError(null);

    try {
      // Call the event creation API
      const response = await fetch('/api/calendar/create-with-resolution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: eventData.title,
          start: eventData.start.toISOString(),
          end: eventData.end.toISOString(),
          track: eventData.track,
          description: eventData.orderDetails ? `Order: ${eventData.orderDetails.orderTitle}` : undefined,
          location: eventData.orderDetails?.location,
          orderId: eventData.orderId,
          orderDetails: eventData.orderDetails,
          conflicts: eventData.conflicts,
          conflictResolution: eventData.conflictResolution,
          businessHoursWarning: eventData.businessHoursWarning,
          ignoreBusinessHours: eventData.ignoreBusinessHours,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to create event: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Close the modal and reset state
      closeCreationModal();
      
      // Show success message (could be enhanced with a toast notification)
      console.log('Event created successfully:', result);
      
      // Trigger a calendar refresh (this would be handled by the parent component)
      // For now, we'll just log the success
      return result;
      
    } catch (error) {
      console.error('Failed to create event:', error);
      setCreateEventError(error instanceof Error ? error.message : 'Failed to create event');
      throw error;
    } finally {
      setIsCreatingEvent(false);
    }
  }, [closeCreationModal]);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    if (!isCreatingEvent) {
      closeCreationModal();
      setCreateEventError(null);
    }
  }, [isCreatingEvent, closeCreationModal]);

  // Context value
  const contextValue: CalendarDragDropContextValue = {
    state,
    actions,
  };

  return (
    <CalendarDragDropContext.Provider value={contextValue}>
      {children}
      
      {/* Business hours indicator */}
      {state.isDragging && state.temporaryEvent && (
        <BusinessHoursIndicator
          businessHoursWarning={state.temporaryEvent.conflictDetectionResult?.businessHoursWarning}
          isVisible={state.isDragging}
          position={state.dragCurrentPosition || undefined}
          config={businessHoursConfig}
        />
      )}
      
      {/* Visual conflict indicator */}
      {state.isDragging && state.temporaryEvent && (
        <VisualConflictIndicator
          conflicts={state.conflicts}
          businessHoursWarning={state.temporaryEvent.conflictDetectionResult?.businessHoursWarning || {
            isOutsideHours: state.businessHoursWarning,
            warningLevel: state.businessHoursWarning ? 'warning' : 'info',
            minutesOutside: 0,
          }}
          isVisible={state.isDragging}
        />
      )}
      
      {/* Drag status indicator */}
      <DragStatusIndicator
        conflicts={state.conflicts}
        businessHoursWarning={state.temporaryEvent?.conflictDetectionResult?.businessHoursWarning || {
          isOutsideHours: state.businessHoursWarning,
          warningLevel: state.businessHoursWarning ? 'warning' : 'info',
          minutesOutside: 0,
        }}
        isDragging={state.isDragging}
      />
      
      {/* Event confirmation modal */}
      <EventConfirmationModal
        isOpen={state.showCreationModal}
        eventData={state.prePopulatedData}
        onClose={handleModalClose}
        onConfirm={handleEventCreation}
      />
    </CalendarDragDropContext.Provider>
  );
}

// Hook to use the drag-drop context
export function useCalendarDragDrop() {
  const context = useContext(CalendarDragDropContext);
  
  if (!context) {
    throw new Error('useCalendarDragDrop must be used within a CalendarDragDropProvider');
  }
  
  return context;
}

// Export the context for advanced usage
export { CalendarDragDropContext };