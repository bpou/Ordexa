"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { BusinessHoursConfig } from "./ConflictTypes";
import { DEFAULT_BUSINESS_HOURS } from "./ConflictTypes";

interface BusinessHoursBoundariesProps {
  config: BusinessHoursConfig;
  calendarRef: React.RefObject<any>;
  isVisible: boolean;
}

interface DayBoundary {
  date: Date;
  dayIndex: number;
  isBusinessDay: boolean;
  businessStartHour?: number;
  businessEndHour?: number;
  element?: Element;
}

// Component for rendering business hours boundaries on the calendar grid
export function BusinessHoursBoundaries({ 
  config, 
  calendarRef, 
  isVisible 
}: BusinessHoursBoundariesProps) {
  const [boundaries, setBoundaries] = useState<DayBoundary[]>([]);
  const [overlayElements, setOverlayElements] = useState<Array<{
    left: number;
    top: number;
    width: number;
    height: number;
    dayIndex: number;
  }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<MutationObserver | null>(null);

  // Calculate business hours boundaries for the current view
  const calculateBoundaries = useCallback(() => {
    if (!calendarRef?.current || !config.enabled) {
      setBoundaries([]);
      return;
    }

    const calendarApi = calendarRef.current.getApi();
    if (!calendarApi) return;

    const viewStart = calendarApi.view.currentStart;
    const viewEnd = calendarApi.view.currentEnd;
    const current = new Date(viewStart);
    const newBoundaries: DayBoundary[] = [];

    // Generate boundaries for each day in the current view
    while (current < viewEnd) {
      const dayOfWeek = current.getDay();
      const isBusinessDay = config.days.includes(dayOfWeek);

      newBoundaries.push({
        date: new Date(current),
        dayIndex: dayOfWeek,
        isBusinessDay,
        businessStartHour: isBusinessDay ? config.startHour : undefined,
        businessEndHour: isBusinessDay ? config.endHour : undefined,
      });

      current.setDate(current.getDate() + 1);
    }

    setBoundaries(newBoundaries);
  }, [calendarRef, config]);

  // Render overlay elements for business hours
  const renderOverlayElements = useCallback(() => {
    if (!calendarRef?.current || !config.enabled || !isVisible) {
      setOverlayElements([]);
      return;
    }

    const calendarApi = calendarRef.current.getApi();
    if (!calendarApi) return;

    const calendarEl = calendarApi.el;
    const dayCells = calendarEl.querySelectorAll('.fc-daygrid-day, .fc-timegrid-col');
    const elements: Array<{
      left: number;
      top: number;
      width: number;
      height: number;
      dayIndex: number;
    }> = [];

    dayCells.forEach((cell: Element) => {
      const cellDateStr = cell.getAttribute('data-date');
      if (!cellDateStr) return;

      const cellDate = new Date(cellDateStr);
      const dayOfWeek = cellDate.getDay();

      if (!config.days.includes(dayOfWeek)) return;

      const rect = cell.getBoundingClientRect();
      const calendarRect = calendarEl.getBoundingClientRect();

      // Check if this is a time grid column or day grid cell
      const isTimeGrid = cell.classList.contains('fc-timegrid-col');
      
      if (isTimeGrid) {
        // For time grid, calculate business hours area
        const dayStart = config.startHour * 60; // minutes from midnight
        const dayEnd = config.endHour * 60; // minutes from midnight
        const totalDayMinutes = 24 * 60;

        const startPercent = (dayStart / totalDayMinutes) * 100;
        const endPercent = (dayEnd / totalDayMinutes) * 100;

        const businessHeight = rect.height * ((endPercent - startPercent) / 100);
        const businessTop = rect.top - calendarRect.top + (rect.height * (startPercent / 100));

        elements.push({
          left: rect.left - calendarRect.left,
          top: businessTop,
          width: rect.width,
          height: businessHeight,
          dayIndex: dayOfWeek,
        });
      } else {
        // For day grid, highlight the entire day
        elements.push({
          left: rect.left - calendarRect.left,
          top: rect.top - calendarRect.top,
          width: rect.width,
          height: rect.height,
          dayIndex: dayOfWeek,
        });
      }
    });

    setOverlayElements(elements);
  }, [calendarRef, config, isVisible]);

  // Set up mutation observer to detect calendar changes
  const setupObserver = useCallback(() => {
    if (!calendarRef?.current || observerRef.current) return;

    const calendarApi = calendarRef.current.getApi();
    if (!calendarApi) return;

    const calendarEl = calendarApi.el;
    
    observerRef.current = new MutationObserver(() => {
      calculateBoundaries();
      renderOverlayElements();
    });

    observerRef.current.observe(calendarEl, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-date'],
    });
  }, [calendarRef, calculateBoundaries, renderOverlayElements]);

  // Clean up observer
  const cleanupObserver = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  }, []);

  // Initialize and update when dependencies change
  useEffect(() => {
    if (isVisible && config.enabled) {
      calculateBoundaries();
      renderOverlayElements();
      setupObserver();
    } else {
      setBoundaries([]);
      setOverlayElements([]);
      cleanupObserver();
    }

    return cleanupObserver;
  }, [isVisible, config.enabled, calculateBoundaries, renderOverlayElements, setupObserver, cleanupObserver]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (isVisible && config.enabled) {
        renderOverlayElements();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isVisible, config.enabled, renderOverlayElements]);

  if (!isVisible || !config.enabled) {
    return null;
  }

  return (
    <div 
      ref={containerRef}
      className="business-hours-boundaries pointer-events-none absolute inset-0 z-10"
    >
      {/* Business hours overlay elements */}
      {overlayElements.map((element, index) => (
        <div
          key={`overlay-${index}`}
          className="absolute bg-green-100/20 border border-green-300/30 rounded"
          style={{
            left: `${element.left}px`,
            top: `${element.top}px`,
            width: `${element.width}px`,
            height: `${element.height}px`,
          }}
        >
          {/* Business hours label */}
          <div className="absolute top-1 left-1 text-xs text-green-700 font-medium bg-green-50/80 px-2 py-1 rounded shadow-sm">
            🕐 Arbetstid
          </div>
        </div>
      ))}

      {/* Non-business hours overlay */}
      {overlayElements.length > 0 && (
        <div className="business-hours-non-business-overlay">
          {overlayElements.map((element, index) => {
            // Calculate non-business hours areas (before and after business hours)
            const calendarApi = calendarRef.current?.getApi();
            if (!calendarApi) return null;

            const calendarEl = calendarApi.el;
            const calendarRect = calendarEl.getBoundingClientRect();
            
            const dayStart = config.startHour * 60;
            const dayEnd = config.endHour * 60;
            const totalDayMinutes = 24 * 60;

            const startPercent = (dayStart / totalDayMinutes) * 100;
            const endPercent = (dayEnd / totalDayMinutes) * 100;

            const elements = [];

            // Before business hours
            if (startPercent > 0) {
              elements.push(
                <div
                  key={`non-business-before-${index}`}
                  className="absolute bg-neutral-100/10 border-t border-neutral-200/20"
                  style={{
                    left: `${element.left}px`,
                    top: `${element.top}px`,
                    width: `${element.width}px`,
                    height: `${element.height * (startPercent / 100)}px`,
                  }}
                />
              );
            }

            // After business hours
            if (endPercent < 100) {
              elements.push(
                <div
                  key={`non-business-after-${index}`}
                  className="absolute bg-neutral-100/10 border-b border-neutral-200/20"
                  style={{
                    left: `${element.left}px`,
                    top: `${element.top + element.height * (endPercent / 100)}px`,
                    width: `${element.width}px`,
                    height: `${element.height * ((100 - endPercent) / 100)}px`,
                  }}
                />
              );
            }

            return elements;
          })}
        </div>
      )}
    </div>
  );
}

// Component for rendering business hours legend
export function BusinessHoursLegend({ 
  config 
}: { 
  config: BusinessHoursConfig 
}) {
  if (!config.enabled) {
    return null;
  }

  return (
    <div className="business-hours-legend flex items-center gap-4 text-xs text-neutral-600 p-2 bg-neutral-50 rounded-lg border border-neutral-200">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 bg-green-100/50 border border-green-300/50 rounded"></div>
        <span>Arbetstid ({config.startHour}:00 - {config.endHour}:00)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 bg-neutral-100/30 border border-neutral-200/30 rounded"></div>
        <span>Utanför arbetstid</span>
      </div>
    </div>
  );
}

// Component for rendering business hours status in calendar header
export function BusinessHoursHeader({ 
  config 
}: { 
  config: BusinessHoursConfig 
}) {
  if (!config.enabled) {
    return (
      <div className="business-hours-header text-sm text-neutral-500 px-3 py-2">
        Arbetstid: Inaktiverad
      </div>
    );
  }

  const dayNames = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];
  const activeDays = config.days.map(day => dayNames[day]).join(', ');

  return (
    <div className="business-hours-header text-sm text-neutral-600 px-3 py-2 border-b border-neutral-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          <span className="font-medium">Arbetstid: {config.startHour}:00 - {config.endHour}:00</span>
        </div>
        <div className="text-xs text-neutral-500">
          {activeDays}
        </div>
      </div>
    </div>
  );
}

// Hook for managing business hours boundaries
export function useBusinessHoursBoundaries(config: BusinessHoursConfig) {
  const [isVisible, setIsVisible] = useState(true);
  const [boundaries, setBoundaries] = useState<DayBoundary[]>([]);

  // Toggle visibility
  const toggleVisibility = useCallback(() => {
    setIsVisible(prev => !prev);
  }, []);

  // Update boundaries
  const updateBoundaries = useCallback((newBoundaries: DayBoundary[]) => {
    setBoundaries(newBoundaries);
  }, []);

  return {
    isVisible,
    boundaries,
    toggleVisibility,
    updateBoundaries,
  };
}