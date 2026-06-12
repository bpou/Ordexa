"use client";

import type { Point } from "./drag-drop-types";

// Interface for calendar element information
interface CalendarElementInfo {
  calendarEl: HTMLElement;
  viewEl: HTMLElement;
  slotDuration: number; // in minutes
  slotMinTime: number; // in minutes from midnight
  slotMaxTime: number; // in minutes from midnight
  scrollContainerEl: HTMLElement;
}

// Get calendar element information
export function getCalendarElementInfo(calendarRef: any): CalendarElementInfo | null {
  if (!calendarRef || !calendarRef.current) return null;

  // Check if the current object has a getApi method
  if (typeof calendarRef.current.getApi !== 'function') {
    return null;
  }

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

// Convert mouse position to calendar time
export function getTimeFromPosition(
  point: Point,
  calendarInfo: CalendarElementInfo
): Date | null {
  const { viewEl, scrollContainerEl, slotMinTime, slotMaxTime } = calendarInfo;
  
  // Get the position relative to the view
  const viewRect = viewEl.getBoundingClientRect();
  const scrollRect = scrollContainerEl.getBoundingClientRect();
  
  // Calculate relative Y position accounting for scroll
  const relativeY = point.y - viewRect.top + scrollContainerEl.scrollTop;
  
  // Find the day column (for week/day views)
  const dayColumns = viewEl.querySelectorAll('.fc-daygrid-day, .fc-timegrid-col');
  if (dayColumns.length === 0) return null;
  
  // Find which column the click is in
  let targetColumn: HTMLElement | null = null;
  for (const column of dayColumns) {
    const rect = column.getBoundingClientRect();
    if (point.x >= rect.left && point.x <= rect.right) {
      targetColumn = column as HTMLElement;
      break;
    }
  }
  
  if (!targetColumn) return null;
  
  // Get the date for this column
  const columnDate = getColumnDate(targetColumn);
  if (!columnDate) return null;
  
  // Calculate the time within the day
  const columnHeader = targetColumn.querySelector('.fc-col-header-cell');
  const columnHeaderHeight = columnHeader ? (columnHeader as HTMLElement).offsetHeight : 0;
  
  // Available height for time slots (excluding header)
  const availableHeight = targetColumn.offsetHeight - columnHeaderHeight;
  const slotRange = slotMaxTime - slotMinTime;
  const minutesPerPixel = slotRange / availableHeight;
  
  // Calculate minutes from slot start
  const minutesFromSlotStart = Math.max(0, relativeY - columnHeaderHeight);
  const minutesIntoDay = slotMinTime + (minutesFromSlotStart * minutesPerPixel);
  
  // Clamp to valid time range
  const clampedMinutes = Math.max(slotMinTime, Math.min(slotMaxTime, minutesIntoDay));
  
  // Create the date
  const result = new Date(columnDate);
  result.setHours(Math.floor(clampedMinutes / 60));
  result.setMinutes(clampedMinutes % 60);
  result.setSeconds(0);
  result.setMilliseconds(0);
  
  return result;
}

// Get the date for a specific column
function getColumnDate(columnEl: HTMLElement): Date | null {
  // Try to get date from data-date attribute
  const dataDate = columnEl.getAttribute('data-date');
  if (dataDate) {
    return new Date(dataDate);
  }
  
  // Try to get date from column header
  const headerCell = columnEl.querySelector('.fc-col-header-cell') as HTMLElement;
  if (headerCell) {
    const headerDataDate = headerCell.getAttribute('data-date');
    if (headerDataDate) {
      return new Date(headerDataDate);
    }
  }
  
  // Fallback: try to extract from text content (less reliable)
  const dayText = columnEl.textContent;
  if (dayText) {
    // This is a fallback - ideally we'd have better date detection
    const today = new Date();
    return today;
  }
  
  return null;
}

// Check if a point is within the calendar time grid area
export function isPointInTimeGrid(point: Point, calendarInfo: CalendarElementInfo): boolean {
  const { viewEl } = calendarInfo;
  const viewRect = viewEl.getBoundingClientRect();
  
  // Check if point is within view bounds
  if (point.x < viewRect.left || point.x > viewRect.right ||
      point.y < viewRect.top || point.y > viewRect.bottom) {
    return false;
  }
  
  // Check if point is in a time slot (not in header)
  const timeGridEl = viewEl.querySelector('.fc-timegrid-body, .fc-daygrid-body');
  if (!timeGridEl) return false;
  
  const timeGridRect = timeGridEl.getBoundingClientRect();
  return point.y >= timeGridRect.top && point.y <= timeGridRect.bottom;
}

// Get the position for a given time (for positioning temporary events)
export function getPositionFromTime(
  date: Date,
  calendarInfo: CalendarElementInfo
): Point | null {
  const { viewEl, scrollContainerEl, slotMinTime, slotMaxTime } = calendarInfo;
  
  // Find the column for this date
  const dayColumns = viewEl.querySelectorAll('.fc-daygrid-day, .fc-timegrid-col');
  let targetColumn: HTMLElement | null = null;
  
  for (const column of dayColumns) {
    const columnDate = getColumnDate(column as HTMLElement);
    if (columnDate && isSameDay(columnDate, date)) {
      targetColumn = column as HTMLElement;
      break;
    }
  }
  
  if (!targetColumn) return null;
  
  // Calculate Y position based on time
  const columnHeader = targetColumn.querySelector('.fc-col-header-cell');
  const columnHeaderHeight = columnHeader ? (columnHeader as HTMLElement).offsetHeight : 0;
  
  const minutesIntoDay = (date.getHours() * 60) + date.getMinutes();
  const slotRange = slotMaxTime - slotMinTime;
  const minutesFromSlotStart = minutesIntoDay - slotMinTime;
  
  const availableHeight = targetColumn.offsetHeight - columnHeaderHeight;
  const minutesPerPixel = slotRange / availableHeight;
  const yOffset = minutesFromSlotStart / minutesPerPixel;
  
  const columnRect = targetColumn.getBoundingClientRect();
  const viewRect = viewEl.getBoundingClientRect();
  
  return {
    x: columnRect.left - viewRect.left + (columnRect.width / 2),
    y: columnHeaderHeight + yOffset,
  };
}

// Helper function to check if two dates are the same day
function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

// Snap time to nearest slot duration
export function snapTimeToSlot(date: Date, slotDuration: number): Date {
  const totalMinutes = (date.getHours() * 60) + date.getMinutes();
  const snappedMinutes = Math.round(totalMinutes / slotDuration) * slotDuration;
  
  const result = new Date(date);
  result.setHours(Math.floor(snappedMinutes / 60));
  result.setMinutes(snappedMinutes % 60);
  result.setSeconds(0);
  result.setMilliseconds(0);
  
  return result;
}

// Get the current mouse position relative to the viewport
export function getMousePosition(event: MouseEvent): Point {
  return {
    x: event.clientX,
    y: event.clientY,
  };
}

// Get the current touch position relative to the viewport
export function getTouchPosition(event: TouchEvent): Point | null {
  if (event.touches.length === 0) return null;
  
  const touch = event.touches[0];
  return {
    x: touch.clientX,
    y: touch.clientY,
  };
}