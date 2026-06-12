"use client";

import { useCallback, useState, useEffect } from "react";
import type {
  DragDropState,
  DragDropActions,
  Point,
  TemporaryEvent,
  EventCreationData,
  BusinessHoursWarning,
  EventConflict,
} from "./drag-drop-types";
import type { AppTrack } from "@/lib/tracks";
import type { ConflictDetectionResult, BusinessHoursConfig } from "./ConflictTypes";
import { useConflictDetector } from "./ConflictDetector";
import { useBusinessHoursValidator } from "./BusinessHoursValidator";
import { DEFAULT_BUSINESS_HOURS } from "./ConflictTypes";

// Helper function to create a temporary event
function createTemporaryEvent(
  startPosition: Point,
  startTime: Date,
  endTime: Date,
  track: AppTrack,
  conflictDetectionResult?: ConflictDetectionResult,
  businessHoursWarning?: BusinessHoursWarning
): TemporaryEvent {
  const duration = endTime.getTime() - startTime.getTime();
  const durationMinutes = Math.round(duration / (1000 * 60));
  
  const conflicts = conflictDetectionResult?.conflicts || [];
  const isOutsideBusinessHours = businessHoursWarning?.isOutsideHours || false;
  
  // Create enhanced conflict detection result with business hours
  const enhancedConflictResult: ConflictDetectionResult | undefined = conflictDetectionResult ? {
    ...conflictDetectionResult,
    businessHoursWarning: businessHoursWarning || conflictDetectionResult.businessHoursWarning,
  } : businessHoursWarning ? {
    conflicts: [],
    hasConflicts: false,
    hasErrorConflicts: false,
    businessHoursWarning,
    canCreateEvent: businessHoursWarning.warningLevel !== 'error',
  } : undefined;
  
  return {
    id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: `Ny händelse (${durationMinutes} min)`,
    start: startTime,
    end: endTime,
    track,
    isTemporary: true,
    source: 'drag-drop',
    conflicts,
    businessHoursWarning: isOutsideBusinessHours,
    conflictDetectionResult: enhancedConflictResult,
  };
}

// Helper function to create event creation data from temporary event
function createEventCreationData(temporaryEvent: TemporaryEvent): EventCreationData {
  return {
    title: temporaryEvent.title,
    start: temporaryEvent.start,
    end: temporaryEvent.end,
    track: temporaryEvent.track,
    conflicts: temporaryEvent.conflicts,
    businessHoursWarning: temporaryEvent.conflictDetectionResult?.businessHoursWarning || {
      isOutsideHours: temporaryEvent.businessHoursWarning,
      warningLevel: temporaryEvent.businessHoursWarning ? 'warning' : 'info',
      minutesOutside: 0,
    },
    ignoreBusinessHours: false,
  };
}

// Initial state factory
function createInitialState(track: AppTrack): DragDropState {
  return {
    isDragging: false,
    dragStartPosition: null,
    dragCurrentPosition: null,
    dragStartTime: null,
    dragEndTime: null,
    temporaryEvent: null,
    conflicts: [],
    hasConflicts: false,
    businessHoursWarning: false,
    isOutsideBusinessHours: false,
    showCreationModal: false,
    prePopulatedData: null,
    activeTrack: track,
    trackEvents: [],
  };
}

// Main custom hook for drag-and-drop state management
export function useDragDropState(track: AppTrack, events: any[] = [], businessHoursConfig?: BusinessHoursConfig) {
  const [state, setState] = useState<DragDropState>(() =>
    createInitialState(track)
  );

  // Initialize conflict detector
  const conflictDetector = useConflictDetector({ track, events, businessHoursConfig });

  // Initialize business hours validator
  const businessHoursValidator = useBusinessHoursValidator(businessHoursConfig || DEFAULT_BUSINESS_HOURS);

  // Update track events when they change
  const updateTrackEvents = useCallback((newEvents: any[]) => {
    setState(prev => ({
      ...prev,
      trackEvents: newEvents,
    }));
  }, []);

  // Detect conflicts for a given time range
  const detectConflictsForTimeRange = useCallback(async (
    start: Date,
    end: Date
  ): Promise<ConflictDetectionResult | null> => {
    try {
      // Use client-side conflict detection for immediate feedback
      const result = conflictDetector.detectConflicts(start, end);
      return result;
    } catch (error) {
      console.error('Conflict detection failed:', error);
      return null;
    }
  }, [conflictDetector]);

  // Validate business hours for a given time range
  const validateBusinessHoursForTimeRange = useCallback((
    start: Date,
    end: Date
  ) => {
    try {
      const result = businessHoursValidator.validateTimeRange(start, end);
      return result;
    } catch (error) {
      console.error('Business hours validation failed:', error);
      return null;
    }
  }, [businessHoursValidator]);

  // Start drag operation
  const startDrag = useCallback(async (position: Point, time: Date) => {
    // Detect conflicts for the initial time range
    const conflictResult = await detectConflictsForTimeRange(time, time);
    
    // Validate business hours
    const businessHoursResult = validateBusinessHoursForTimeRange(time, time);
    
    const temporaryEvent = createTemporaryEvent(
      position,
      time,
      time,
      track,
      conflictResult || undefined,
      businessHoursResult?.warning
    );
    
    setState(prev => ({
      ...prev,
      isDragging: true,
      dragStartPosition: position,
      dragCurrentPosition: position,
      dragStartTime: time,
      dragEndTime: time,
      temporaryEvent,
      conflicts: conflictResult?.conflicts || [],
      hasConflicts: conflictResult?.hasConflicts || false,
      businessHoursWarning: businessHoursResult?.warning?.isOutsideHours || false,
      isOutsideBusinessHours: businessHoursResult?.warning?.isOutsideHours || false,
      showCreationModal: false,
    }));
  }, [track, detectConflictsForTimeRange, validateBusinessHoursForTimeRange]);

  // Update drag operation
  const updateDrag = useCallback(async (position: Point, time: Date) => {
    setState(prev => {
      if (!prev.isDragging || !prev.dragStartTime) return prev;
      
      const startTime = prev.dragStartTime;
      const endTime = time > startTime ? time : startTime;
      
      // Detect conflicts for the updated time range
      detectConflictsForTimeRange(startTime, endTime).then(conflictResult => {
        // Validate business hours
        const businessHoursResult = validateBusinessHoursForTimeRange(startTime, endTime);
        
        const temporaryEvent = createTemporaryEvent(
          prev.dragStartPosition!,
          startTime,
          endTime,
          track,
          conflictResult || undefined,
          businessHoursResult?.warning
        );
        
        setState(prevState => ({
          ...prevState,
          dragCurrentPosition: position,
          dragEndTime: endTime,
          temporaryEvent,
          conflicts: conflictResult?.conflicts || [],
          hasConflicts: conflictResult?.hasConflicts || false,
          businessHoursWarning: businessHoursResult?.warning?.isOutsideHours || false,
          isOutsideBusinessHours: businessHoursResult?.warning?.isOutsideHours || false,
        }));
      }).catch(error => {
        console.error('Conflict detection during drag failed:', error);
        
        // Fallback: update without conflict detection
        const businessHoursResult = validateBusinessHoursForTimeRange(startTime, endTime);
        const temporaryEvent = createTemporaryEvent(
          prev.dragStartPosition!,
          startTime,
          endTime,
          track,
          undefined,
          businessHoursResult?.warning
        );
        
        setState(prevState => ({
          ...prevState,
          dragCurrentPosition: position,
          dragEndTime: endTime,
          temporaryEvent,
          businessHoursWarning: businessHoursResult?.warning?.isOutsideHours || false,
          isOutsideBusinessHours: businessHoursResult?.warning?.isOutsideHours || false,
        }));
      });
      
      return {
        ...prev,
        dragCurrentPosition: position,
        dragEndTime: endTime,
      };
    });
  }, [track, detectConflictsForTimeRange, validateBusinessHoursForTimeRange]);

  // End drag operation and show creation modal
  const endDrag = useCallback(async () => {
    setState(prev => {
      if (!prev.temporaryEvent) return prev;
      
      const prePopulatedData = createEventCreationData(prev.temporaryEvent);
      
      // Check if event creation should be blocked
      const hasErrorConflicts = prev.conflicts.some(c => c.severity === 'error');
      const hasBusinessHoursError = prev.isOutsideBusinessHours;
      
      if (hasErrorConflicts || hasBusinessHoursError) {
        // Show modal with warnings but allow creation
        return {
          ...prev,
          isDragging: false,
          showCreationModal: true,
          prePopulatedData,
        };
      }
      
      return {
        ...prev,
        isDragging: false,
        showCreationModal: true,
        prePopulatedData,
      };
    });
  }, []);

  // Cancel drag operation
  const cancelDrag = useCallback(() => {
    setState(prev => ({
      ...prev,
      isDragging: false,
      dragStartPosition: null,
      dragCurrentPosition: null,
      dragStartTime: null,
      dragEndTime: null,
      temporaryEvent: null,
      conflicts: [],
      hasConflicts: false,
      businessHoursWarning: false,
      isOutsideBusinessHours: false,
      showCreationModal: false,
      prePopulatedData: null,
    }));
  }, []);

  // Reset state completely
  const resetState = useCallback(() => {
    setState(createInitialState(track));
  }, [track]);

  // Close creation modal
  const closeCreationModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      showCreationModal: false,
      prePopulatedData: null,
    }));
  }, []);

  // Actions object
  const actions: DragDropActions = {
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag,
    resetState,
  };

  // Expose conflict detection utilities
  const conflictUtils = {
    detectConflictsForTimeRange,
    getConflictSummary: conflictDetector.getConflictSummary,
    getMostSevereConflictLevel: conflictDetector.getMostSevereConflictLevel,
  };

  // Expose business hours validation utilities
  const businessHoursUtils = {
    validateBusinessHoursForTimeRange,
    isTimeWithinBusinessHours: businessHoursValidator.isTimeWithinBusinessHours,
    getBusinessHoursBoundaries: businessHoursValidator.getBusinessHoursBoundaries,
    isBusinessDay: businessHoursValidator.isBusinessDay,
    getNextBusinessDay: businessHoursValidator.getNextBusinessDay,
    getPreviousBusinessDay: businessHoursValidator.getPreviousBusinessDay,
  };

  return {
    state,
    actions,
    updateTrackEvents,
    closeCreationModal,
    conflictUtils,
    businessHoursUtils,
  };
}

// Export types for external use
export type { DragDropState, DragDropActions, Point, TemporaryEvent };