import type { AppTrack } from "@/lib/tracks";

// Conflict severity levels
export type ConflictSeverity = 'warning' | 'error';

// Conflict types
export type ConflictType = 'overlap' | 'adjacent' | 'contained' | 'containing';

// Business hours warning levels
export type BusinessHoursWarningLevel = 'info' | 'warning' | 'error';

// Interface for event conflict information
export interface EventConflict {
  eventId: string;
  eventTitle: string;
  conflictType: ConflictType;
  severity: ConflictSeverity;
  conflictDuration: number; // in minutes
  overlappingStart?: Date;
  overlappingEnd?: Date;
  suggestedResolution?: ConflictResolution;
}

// Interface for conflict resolution suggestions
export interface ConflictResolution {
  newStart: Date;
  newEnd: Date;
  resolutionType: 'move' | 'resize' | 'split';
  reason: string;
  confidence: number; // 0-1, how confident we are this resolution will work
}

// Interface for business hours warning
export interface BusinessHoursWarning {
  isOutsideHours: boolean;
  warningLevel: BusinessHoursWarningLevel;
  minutesOutside: number;
  suggestedTime?: {
    start: Date;
    end: Date;
  };
  businessHoursConfig?: BusinessHoursConfig;
}

// Interface for business hours configuration
export interface BusinessHoursConfig {
  enabled: boolean;
  startHour: number; // 0-23
  endHour: number; // 0-23
  days: number[]; // 0-6 (Sunday-Saturday)
  warningThreshold: number; // minutes outside business hours before warning
}

// Interface for conflict detection result
export interface ConflictDetectionResult {
  conflicts: EventConflict[];
  hasConflicts: boolean;
  hasErrorConflicts: boolean;
  businessHoursWarning: BusinessHoursWarning;
  canCreateEvent: boolean;
  blockedReason?: string;
}

// Interface for conflict detection request
export interface ConflictDetectionRequest {
  start: Date;
  end: Date;
  track: AppTrack;
  eventId?: string; // Optional: exclude this event from conflict checking
  ignoreBusinessHours?: boolean;
}

// Interface for conflict detection response (API)
export interface ConflictDetectionResponse {
  conflicts: EventConflict[];
  businessHoursWarning: BusinessHoursWarning;
  canCreateEvent: boolean;
  blockedReason?: string;
}

// Interface for visual conflict indicator props
export interface VisualConflictIndicatorProps {
  conflicts: EventConflict[];
  businessHoursWarning: BusinessHoursWarning;
  isVisible: boolean;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Interface for conflict detector props
export interface ConflictDetectorProps {
  track: AppTrack;
  events: any[]; // EventInput[] from FullCalendar
  onConflictDetected?: (result: ConflictDetectionResult) => void;
  businessHoursConfig?: BusinessHoursConfig;
}

// Helper function to determine conflict severity based on overlap percentage
export function getConflictSeverityFromOverlap(overlapPercentage: number): ConflictSeverity {
  if (overlapPercentage >= 75) return 'error';
  if (overlapPercentage >= 25) return 'warning';
  return 'warning'; // Default to warning for any overlap
}

// Helper function to determine conflict type based on time relationships
export function getConflictType(
  eventStart: Date,
  eventEnd: Date,
  existingStart: Date,
  existingEnd: Date
): ConflictType {
  // Check if new event is completely contained within existing event
  if (eventStart >= existingStart && eventEnd <= existingEnd) {
    return 'contained';
  }
  
  // Check if existing event is completely contained within new event
  if (existingStart >= eventStart && existingEnd <= eventEnd) {
    return 'containing';
  }
  
  // Check for adjacent events (touching but not overlapping)
  if (eventStart === existingEnd || eventEnd === existingStart) {
    return 'adjacent';
  }
  
  // Otherwise it's an overlap
  return 'overlap';
}

// Helper function to calculate overlap duration in minutes
export function calculateOverlapDuration(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): number {
  const overlapStart = new Date(Math.max(start1.getTime(), start2.getTime()));
  const overlapEnd = new Date(Math.min(end1.getTime(), end2.getTime()));
  
  if (overlapStart >= overlapEnd) return 0;
  
  return Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60));
}

// Helper function to calculate overlap percentage
export function calculateOverlapPercentage(
  newEventStart: Date,
  newEventEnd: Date,
  existingStart: Date,
  existingEnd: Date
): number {
  const newEventDuration = (newEventEnd.getTime() - newEventStart.getTime()) / (1000 * 60);
  const overlapDuration = calculateOverlapDuration(newEventStart, newEventEnd, existingStart, existingEnd);
  
  if (newEventDuration === 0) return 0;
  
  return Math.round((overlapDuration / newEventDuration) * 100);
}

// Default business hours configuration
export const DEFAULT_BUSINESS_HOURS: BusinessHoursConfig = {
  enabled: true,
  startHour: 8,
  endHour: 17,
  days: [1, 2, 3, 4, 5], // Monday-Friday
  warningThreshold: 30,
};

// Helper function to check if a time is within business hours
export function isWithinBusinessHours(
  date: Date,
  config: BusinessHoursConfig = DEFAULT_BUSINESS_HOURS
): boolean {
  if (!config.enabled) return true;
  
  const dayOfWeek = date.getDay();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const totalMinutes = hour * 60 + minute;
  
  // Check if day is within business days
  if (!config.days.includes(dayOfWeek)) return false;
  
  // Check if time is within business hours
  const businessStartMinutes = config.startHour * 60;
  const businessEndMinutes = config.endHour * 60;
  
  return totalMinutes >= businessStartMinutes && totalMinutes <= businessEndMinutes;
}

// Helper function to generate conflict resolution suggestions
export function generateConflictResolution(
  newEventStart: Date,
  newEventEnd: Date,
  existingEvent: { start: Date; end: Date; title: string },
  conflictType: ConflictType
): ConflictResolution | null {
  const duration = (newEventEnd.getTime() - newEventStart.getTime()) / (1000 * 60);
  
  switch (conflictType) {
    case 'overlap':
      // Suggest moving to after the existing event
      return {
        newStart: new Date(existingEvent.end),
        newEnd: new Date(existingEvent.end.getTime() + duration * 60 * 1000),
        resolutionType: 'move',
        reason: `Flytta till efter "${existingEvent.title}"`,
        confidence: 0.8,
      };
      
    case 'contained':
      // Suggest resizing to fit before the existing event
      if (newEventStart < existingEvent.start) {
        return {
          newStart: newEventStart,
          newEnd: new Date(existingEvent.start.getTime()),
          resolutionType: 'resize',
          reason: `Krympa för att passa innan "${existingEvent.title}"`,
          confidence: 0.6,
        };
      }
      // Suggest resizing to fit after the existing event
      if (newEventEnd > existingEvent.end) {
        return {
          newStart: new Date(existingEvent.end),
          newEnd: newEventEnd,
          resolutionType: 'resize',
          reason: `Flytta start till efter "${existingEvent.title}"`,
          confidence: 0.6,
        };
      }
      break;
      
    case 'containing':
      // Suggest splitting the event
      return {
        newStart: newEventStart,
        newEnd: new Date(existingEvent.start.getTime()),
        resolutionType: 'split',
        reason: `Dela händelsen för att undvika "${existingEvent.title}"`,
        confidence: 0.4,
      };
      
    case 'adjacent':
      // No resolution needed for adjacent events
      return null;
  }
  
  return null;
}