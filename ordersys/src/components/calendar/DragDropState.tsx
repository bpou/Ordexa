"use client";

import { useCallback, useEffect, useRef } from "react";
import { useCalendarDragDrop } from "./CalendarDragDropProvider";
import { 
  getCalendarElementInfo,
  getTimeFromPosition,
  isPointInTimeGrid,
  getMousePosition,
  getTouchPosition,
  snapTimeToSlot,
} from "./calendar-utils";
import type { Point } from "./drag-drop-types";

interface DragDropStateProps {
  children: React.ReactNode;
  calendarRef: React.RefObject<any>;
}

export function DragDropState({ children, calendarRef }: DragDropStateProps) {
  const { state, actions } = useCalendarDragDrop();
  const isDraggingRef = useRef(false);
  const dragStartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle mouse down on calendar
  const handleMouseDown = useCallback(async (event: MouseEvent) => {
    // Only handle left mouse button
    if (event.button !== 0) return;

    // Don't start drag if clicking on an event or other interactive element
    const target = event.target as HTMLElement;
    if (target.closest('.fc-event') ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('input') ||
        target.closest('select')) {
      return;
    }

    // Drag-to-create functionality has been disabled
    // This handler is kept for potential future use but currently does nothing
  }, []);

  // Handle mouse move during drag
  const handleMouseMove = useCallback(async (event: MouseEvent) => {
    if (!isDraggingRef.current || !state.isDragging) return;

    const calendarInfo = getCalendarElementInfo(calendarRef);
    if (!calendarInfo) return;

    const position = getMousePosition(event);
    if (!isPointInTimeGrid(position, calendarInfo)) return;

    const time = getTimeFromPosition(position, calendarInfo);
    if (time) {
      const snappedTime = snapTimeToSlot(time, calendarInfo.slotDuration);
      await actions.updateDrag(position, snappedTime);
    }
  }, [calendarRef, actions, state.isDragging]);

  // Handle mouse up to end drag
  const handleMouseUp = useCallback(async (event: MouseEvent) => {
    if (dragStartTimeoutRef.current) {
      clearTimeout(dragStartTimeoutRef.current);
      dragStartTimeoutRef.current = null;
    }

    if (!isDraggingRef.current || !state.isDragging) return;

    const calendarInfo = getCalendarElementInfo(calendarRef);
    if (!calendarInfo) return;

    const position = getMousePosition(event);
    if (!isPointInTimeGrid(position, calendarInfo)) {
      actions.cancelDrag();
    } else {
      const time = getTimeFromPosition(position, calendarInfo);
      if (time) {
        const snappedTime = snapTimeToSlot(time, calendarInfo.slotDuration);
        await actions.updateDrag(position, snappedTime);
        await actions.endDrag();
      }
    }

    isDraggingRef.current = false;
  }, [calendarRef, actions, state.isDragging]);

  // Handle touch start for mobile support
  const handleTouchStart = useCallback(async (event: TouchEvent) => {
    // Don't start drag if touching on an event or other interactive element
    const target = event.target as HTMLElement;
    if (target.closest('.fc-event') ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('input') ||
        target.closest('select')) {
      return;
    }

    // Drag-to-create functionality has been disabled
    // This handler is kept for potential future use but currently does nothing
  }, []);

  // Handle touch move during drag
  const handleTouchMove = useCallback(async (event: TouchEvent) => {
    if (!isDraggingRef.current || !state.isDragging) return;

    const calendarInfo = getCalendarElementInfo(calendarRef);
    if (!calendarInfo) return;

    const position = getTouchPosition(event);
    if (!position || !isPointInTimeGrid(position, calendarInfo)) return;

    const time = getTimeFromPosition(position, calendarInfo);
    if (time) {
      const snappedTime = snapTimeToSlot(time, calendarInfo.slotDuration);
      await actions.updateDrag(position, snappedTime);
    }
  }, [calendarRef, actions, state.isDragging]);

  // Handle touch end to end drag
  const handleTouchEnd = useCallback(async (event: TouchEvent) => {
    if (dragStartTimeoutRef.current) {
      clearTimeout(dragStartTimeoutRef.current);
      dragStartTimeoutRef.current = null;
    }

    if (!isDraggingRef.current || !state.isDragging) return;

    const calendarInfo = getCalendarElementInfo(calendarRef);
    if (!calendarInfo) return;

    const position = getTouchPosition(event);
    if (!position || !isPointInTimeGrid(position, calendarInfo)) {
      actions.cancelDrag();
    } else {
      const time = getTimeFromPosition(position, calendarInfo);
      if (time) {
        const snappedTime = snapTimeToSlot(time, calendarInfo.slotDuration);
        await actions.updateDrag(position, snappedTime);
        await actions.endDrag();
      }
    }

    isDraggingRef.current = false;
  }, [calendarRef, actions, state.isDragging]);

  // Handle escape key to cancel drag
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && state.isDragging) {
      actions.cancelDrag();
      isDraggingRef.current = false;
      if (dragStartTimeoutRef.current) {
        clearTimeout(dragStartTimeoutRef.current);
        dragStartTimeoutRef.current = null;
      }
    }
  }, [actions, state.isDragging]);

  // Set up event listeners
  useEffect(() => {
    const calendarEl = calendarRef.current?.el;
    if (!calendarEl) return;

    // Mouse events
    calendarEl.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Touch events
    calendarEl.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    // Keyboard events
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      calendarEl.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      calendarEl.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('keydown', handleKeyDown);
      
      if (dragStartTimeoutRef.current) {
        clearTimeout(dragStartTimeoutRef.current);
      }
    };
  }, [
    calendarRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleKeyDown,
  ]);

  // Cancel drag on window blur
  useEffect(() => {
    const handleWindowBlur = () => {
      if (isDraggingRef.current) {
        actions.cancelDrag();
        isDraggingRef.current = false;
        if (dragStartTimeoutRef.current) {
          clearTimeout(dragStartTimeoutRef.current);
          dragStartTimeoutRef.current = null;
        }
      }
    };

    window.addEventListener('blur', handleWindowBlur);
    return () => window.removeEventListener('blur', handleWindowBlur);
  }, [actions]);

  return <>{children}</>;
}