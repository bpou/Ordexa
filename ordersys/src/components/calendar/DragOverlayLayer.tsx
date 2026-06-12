"use client";

import { useEffect, useRef, useState } from "react";
import { useCalendarDragDrop } from "./CalendarDragDropProvider";
import { TemporaryEvent } from "./TemporaryEvent";
import { getPositionFromTime } from "./calendar-utils";
import type { Point } from "./drag-drop-types";

interface DragOverlayLayerProps {
  calendarRef: React.RefObject<any>;
}

export function DragOverlayLayer({ calendarRef }: DragOverlayLayerProps) {
  const { state } = useCalendarDragDrop();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [eventPosition, setEventPosition] = useState<Point | null>(null);

  // Update event position when drag state changes
  useEffect(() => {
    if (!state.isDragging || !state.temporaryEvent || !calendarRef.current) {
      setEventPosition(null);
      return;
    }

    const calendarInfo = getCalendarElementInfo(calendarRef);
    if (!calendarInfo) return;

    // Calculate position for the temporary event
    const position = getPositionFromTime(state.temporaryEvent.start, calendarInfo);
    if (position) {
      setEventPosition(position);
    }
  }, [state.isDragging, state.temporaryEvent, state.dragCurrentPosition, calendarRef]);

  // Helper function to get calendar element info
  function getCalendarElementInfo(calendarRef: React.RefObject<any>) {
    if (!calendarRef || !calendarRef.current) return null;
    
    const calendarApi = calendarRef.current.getApi();
    if (!calendarApi) return null;
    
    const calendarEl = calendarApi.el;
    const viewEl = calendarEl.querySelector('.fc-view') as HTMLElement;
    const scrollContainerEl = calendarEl.querySelector('.fc-scroller') as HTMLElement;
    
    if (!calendarEl || !viewEl || !scrollContainerEl) return null;
    
    // Get slot duration from calendar options (default 60 minutes)
    const slotDuration = calendarApi.options.slotDuration || 60;
    
    // Get slot min/max time from calendar options (default 0-1440 minutes)
    const slotMinTime = calendarApi.options.slotMinTime || 0;
    const slotMaxTime = calendarApi.options.slotMaxTime || 1440;
    
    return {
      calendarEl,
      viewEl,
      slotDuration,
      slotMinTime,
      slotMaxTime,
      scrollContainerEl,
    };
  }

  // Don't render anything if not dragging
  if (!state.isDragging || !state.temporaryEvent) {
    return null;
  }

  return (
    <div 
      ref={overlayRef}
      className="absolute inset-0 pointer-events-none z-50"
      style={{
        // Position relative to the calendar container
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      {eventPosition && (
        <div
          style={{
            position: 'absolute',
            left: `${eventPosition.x}px`,
            top: `${eventPosition.y}px`,
            transform: 'translateX(-50%)',
            zIndex: 1000,
          }}
        >
          <TemporaryEvent 
            event={state.temporaryEvent} 
            position={eventPosition}
          />
        </div>
      )}
    </div>
  );
}