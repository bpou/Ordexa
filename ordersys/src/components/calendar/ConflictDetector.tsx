"use client";

import { useCallback, useMemo } from "react";
import type {
  ConflictDetectionRequest,
  ConflictDetectionResult,
  EventConflict,
  BusinessHoursWarning,
  ConflictType,
  ConflictSeverity,
  BusinessHoursConfig,
  BusinessHoursWarningLevel,
} from "./ConflictTypes";
import {
  getConflictType,
  calculateOverlapDuration,
  calculateOverlapPercentage,
  getConflictSeverityFromOverlap,
  isWithinBusinessHours,
  DEFAULT_BUSINESS_HOURS,
  generateConflictResolution,
} from "./ConflictTypes";
import type { AppTrack } from "@/lib/tracks";

interface ConflictDetectorProps {
  track: AppTrack;
  events: any[]; // EventInput[] from FullCalendar
  businessHoursConfig?: BusinessHoursConfig;
}

export function ConflictDetector({ track, events, businessHoursConfig }: ConflictDetectorProps) {
  const config = useMemo(() => ({
    ...DEFAULT_BUSINESS_HOURS,
    ...businessHoursConfig,
  }), [businessHoursConfig]);

  // Filter events for the current track
  const trackEvents = useMemo(() => {
    return events.filter(event => {
      const eventTrack = event.extendedProps?.track || event.track;
      return eventTrack === track;
    });
  }, [events, track]);

  // Check for conflicts between a new event and existing events
  const detectConflicts = useCallback((
    start: Date,
    end: Date,
    excludeEventId?: string
  ): ConflictDetectionResult => {
    const conflicts: EventConflict[] = [];
    
    // Check each existing event for conflicts
    for (const event of trackEvents) {
      // Skip the event being excluded (for updates)
      if (excludeEventId && String(event.id) === String(excludeEventId)) {
        continue;
      }
      
      const eventStart = new Date(event.start as string);
      const eventEnd = new Date(event.end as string);
      
      // Check if there's any overlap
      if (start < eventEnd && end > eventStart) {
        const conflictType = getConflictType(start, end, eventStart, eventEnd);
        const conflictDuration = calculateOverlapDuration(start, end, eventStart, eventEnd);
        const overlapPercentage = calculateOverlapPercentage(start, end, eventStart, eventEnd);
        const severity = getConflictSeverityFromOverlap(overlapPercentage);
        
        // Calculate overlapping time range
        const overlappingStart = new Date(Math.max(start.getTime(), eventStart.getTime()));
        const overlappingEnd = new Date(Math.min(end.getTime(), eventEnd.getTime()));
        
        // Generate resolution suggestion
        const suggestedResolution = generateConflictResolution(
          start,
          end,
          { start: eventStart, end: eventEnd, title: event.title as string },
          conflictType
        );
        
        const conflict: EventConflict = {
          eventId: String(event.id),
          eventTitle: event.title as string || "Okänd händelse",
          conflictType,
          severity,
          conflictDuration,
          overlappingStart,
          overlappingEnd,
          suggestedResolution: suggestedResolution || undefined,
        };
        
        conflicts.push(conflict);
      }
    }
    
    // Check business hours
    const businessHoursWarning = checkBusinessHours(start, end, config);
    
    // Determine if event can be created
    const hasErrorConflicts = conflicts.some(c => c.severity === 'error');
    const hasBusinessHoursError = businessHoursWarning.warningLevel === 'error';
    const canCreateEvent = !hasErrorConflicts && !hasBusinessHoursError;
    
    let blockedReason: string | undefined;
    if (hasErrorConflicts) {
      blockedReason = "Händelsen har allvarliga konflikter med befintliga händelser";
    } else if (hasBusinessHoursError) {
      blockedReason = "Händelsen är utanför tillåtna arbetstider";
    }
    
    return {
      conflicts,
      hasConflicts: conflicts.length > 0,
      hasErrorConflicts,
      businessHoursWarning,
      canCreateEvent,
      blockedReason,
    };
  }, [trackEvents, config]);

  // Check business hours compliance
  const checkBusinessHours = useCallback((
    start: Date,
    end: Date,
    config: BusinessHoursConfig
  ): BusinessHoursWarning => {
    const startWithinHours = isWithinBusinessHours(start, config);
    const endWithinHours = isWithinBusinessHours(end, config);
    
    if (startWithinHours && endWithinHours) {
      return {
        isOutsideHours: false,
        warningLevel: 'info',
        minutesOutside: 0,
        businessHoursConfig: config,
      };
    }
    
    // Calculate minutes outside business hours
    let minutesOutside = 0;
    
    if (!startWithinHours) {
      const startHour = start.getHours();
      const startMinute = start.getMinutes();
      const startTotalMinutes = startHour * 60 + startMinute;
      
      if (startTotalMinutes < config.startHour * 60) {
        minutesOutside += (config.startHour * 60) - startTotalMinutes;
      } else if (startTotalMinutes > config.endHour * 60) {
        minutesOutside += startTotalMinutes - (config.endHour * 60);
      }
    }
    
    if (!endWithinHours) {
      const endHour = end.getHours();
      const endMinute = end.getMinutes();
      const endTotalMinutes = endHour * 60 + endMinute;
      
      if (endTotalMinutes < config.startHour * 60) {
        minutesOutside += (config.startHour * 60) - endTotalMinutes;
      } else if (endTotalMinutes > config.endHour * 60) {
        minutesOutside += endTotalMinutes - (config.endHour * 60);
      }
    }
    
    // Determine warning level
    let warningLevel: BusinessHoursWarningLevel = 'warning';
    if (minutesOutside > config.warningThreshold * 2) {
      warningLevel = 'error';
    } else if (minutesOutside > config.warningThreshold) {
      warningLevel = 'warning';
    } else {
      warningLevel = 'info';
    }
    
    // Generate suggested time within business hours
    let suggestedTime;
    if (!startWithinHours || !endWithinHours) {
      const duration = (end.getTime() - start.getTime()) / (1000 * 60);
      const suggestedStart = new Date(start);
      const suggestedEnd = new Date(start);
      
      // Adjust to business hours
      const startHour = start.getHours();
      const startMinute = start.getMinutes();
      const startTotalMinutes = startHour * 60 + startMinute;
      
      if (startTotalMinutes < config.startHour * 60) {
        suggestedStart.setHours(config.startHour, 0, 0, 0);
      } else if (startTotalMinutes > config.endHour * 60) {
        // Move to next day
        suggestedStart.setDate(suggestedStart.getDate() + 1);
        suggestedStart.setHours(config.startHour, 0, 0, 0);
      }
      
      suggestedEnd.setTime(suggestedStart.getTime() + duration * 60 * 1000);
      
      // Make sure end is also within business hours
      const endHour = suggestedEnd.getHours();
      const endMinute = suggestedEnd.getMinutes();
      const endTotalMinutes = endHour * 60 + endMinute;
      
      if (endTotalMinutes > config.endHour * 60) {
        // Adjust end to business hours
        suggestedEnd.setHours(config.endHour, 0, 0, 0);
      }
      
      suggestedTime = {
        start: suggestedStart,
        end: suggestedEnd,
      };
    }
    
    return {
      isOutsideHours: true,
      warningLevel,
      minutesOutside,
      suggestedTime,
      businessHoursConfig: config,
    };
  }, []);

  // Server-side conflict detection (API call)
  const detectConflictsServer = useCallback(async (
    request: ConflictDetectionRequest
  ): Promise<ConflictDetectionResult> => {
    try {
      const response = await fetch('/api/calendar/conflicts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        throw new Error(`Conflict detection failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result as ConflictDetectionResult;
    } catch (error) {
      console.error('Server-side conflict detection failed:', error);
      // Fallback to client-side detection
      return detectConflicts(request.start, request.end, request.eventId);
    }
  }, [detectConflicts]);

  // Get conflict summary for display
  const getConflictSummary = useCallback((result: ConflictDetectionResult) => {
    const { conflicts, businessHoursWarning } = result;
    
    const summary: string[] = [];
    
    if (conflicts.length > 0) {
      const errorCount = conflicts.filter(c => c.severity === 'error').length;
      const warningCount = conflicts.filter(c => c.severity === 'warning').length;
      
      if (errorCount > 0) {
        summary.push(`${errorCount} allvarlig${errorCount > 1 ? 'a' : ''} konflikt${errorCount > 1 ? 'er' : ''}`);
      }
      
      if (warningCount > 0) {
        summary.push(`${warningCount} varning${warningCount > 1 ? 'ar' : ''}`);
      }
    }
    
    if (businessHoursWarning.isOutsideHours) {
      summary.push('Utanför arbetstid');
    }
    
    return summary;
  }, []);

  // Get the most severe conflict level
  const getMostSevereConflictLevel = useCallback((result: ConflictDetectionResult): ConflictSeverity | null => {
    if (result.hasErrorConflicts) return 'error';
    if (result.hasConflicts) return 'warning';
    return null;
  }, []);

  return {
    detectConflicts,
    detectConflictsServer,
    getConflictSummary,
    getMostSevereConflictLevel,
    trackEvents,
    businessHoursConfig: config,
  };
}

// Export a hook for easy usage
export function useConflictDetector(props: ConflictDetectorProps) {
  return ConflictDetector(props);
}