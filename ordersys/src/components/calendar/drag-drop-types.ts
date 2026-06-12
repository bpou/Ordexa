import type { AppTrack } from "@/lib/tracks";
import type {
  EventConflict as ConflictEvent,
  BusinessHoursWarning as BusinessHoursWarningType,
  ConflictSeverity,
  ConflictType,
  BusinessHoursWarningLevel,
  ConflictDetectionResult,
  BusinessHoursConfig,
} from "./ConflictTypes";

// Point interface for mouse/touch position
export interface Point {
  x: number;
  y: number;
}

// Temporary event structure during drag operations
export interface TemporaryEvent {
  id: string; // Generated temporary ID
  title: string;
  start: Date;
  end: Date;
  track: AppTrack;
  isTemporary: true;
  source: 'drag-drop';
  conflicts: ConflictEvent[];
  businessHoursWarning: boolean;
  conflictDetectionResult?: ConflictDetectionResult;
}

// Event conflict structure (enhanced with new types)
export interface EventConflict {
  eventId: string;
  eventTitle: string;
  conflictType: ConflictType;
  severity: ConflictSeverity;
  conflictDuration: number; // in minutes
  overlappingStart?: Date;
  overlappingEnd?: Date;
  suggestedResolution?: {
    newStart: Date;
    newEnd: Date;
    resolutionType: 'move' | 'resize' | 'split';
    reason: string;
    confidence: number;
  };
}

// Business hours warning structure (enhanced with new types)
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

// Event creation data structure
export interface EventCreationData {
  // Basic event info
  title: string;
  start: Date;
  end: Date;
  track: AppTrack;
  
  // Order integration (for future implementation)
  orderId?: string;
  orderDetails?: {
    customerName: string;
    customerNumber: string;
    orderTitle: string;
    estimatedDuration: number;
    location?: string;
    notes?: string;
  };
  
  // Conflict resolution (for future implementation)
  conflicts: EventConflict[];
  conflictResolution?: 'override' | 'reschedule' | 'split';
  
  // Business hours (for future implementation)
  businessHoursWarning: BusinessHoursWarning;
  ignoreBusinessHours: boolean;
}

// Main drag-and-drop state interface
export interface DragDropState {
  // Drag operation state
  isDragging: boolean;
  dragStartPosition: Point | null;
  dragCurrentPosition: Point | null;
  dragStartTime: Date | null;
  dragEndTime: Date | null;
  
  // Temporary event state
  temporaryEvent: TemporaryEvent | null;
  
  // Conflict detection state (for future implementation)
  conflicts: EventConflict[];
  hasConflicts: boolean;
  
  // Business hours state (for future implementation)
  businessHoursWarning: boolean;
  isOutsideBusinessHours: boolean;
  
  // Modal state
  showCreationModal: boolean;
  prePopulatedData: EventCreationData | null;
  
  // Track context
  activeTrack: AppTrack;
  trackEvents: any[]; // EventInput[] from FullCalendar
}

// Drag drop actions interface
export interface DragDropActions {
  startDrag: (position: Point, time: Date) => void;
  updateDrag: (position: Point, time: Date) => void;
  endDrag: () => void;
  cancelDrag: () => void;
  resetState: () => void;
}

// Calendar drag drop context value
export interface CalendarDragDropContextValue {
  state: DragDropState;
  actions: DragDropActions;
}

// Props for TemporaryEvent component
export interface TemporaryEventProps {
  event: TemporaryEvent;
  position?: Point;
}

// Props for CalendarDragDropProvider
export interface CalendarDragDropProviderProps {
  children: React.ReactNode;
  track: AppTrack;
  events: any[]; // EventInput[] from FullCalendar
}