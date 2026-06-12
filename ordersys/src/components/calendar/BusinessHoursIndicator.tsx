"use client";

import { useMemo, useCallback, useEffect, useRef } from "react";
import type { BusinessHoursWarning, BusinessHoursConfig } from "./ConflictTypes";
import { DEFAULT_BUSINESS_HOURS } from "./ConflictTypes";
import type { Point } from "./drag-drop-types";

interface BusinessHoursIndicatorProps {
  businessHoursWarning?: BusinessHoursWarning;
  isVisible: boolean;
  position?: Point;
  calendarRef?: React.RefObject<any>;
  config?: BusinessHoursConfig;
}

interface BusinessHoursBoundaryProps {
  config: BusinessHoursConfig;
  calendarRef: React.RefObject<any>;
  currentDate: Date;
}

interface BusinessHoursOverlayProps {
  config: BusinessHoursConfig;
  calendarRef: React.RefObject<any>;
  isVisible: boolean;
}

// Component for rendering business hours boundaries on the calendar
export function BusinessHoursBoundary({ 
  config, 
  calendarRef, 
  currentDate 
}: BusinessHoursBoundaryProps) {
  const [boundaries, setBoundaries] = useState<Array<{
    start: number; // Top position in percentage
    end: number; // Bottom position in percentage
    dayIndex: number;
  }>>([]);

  useEffect(() => {
    if (!config.enabled || !calendarRef.current) return;

    const calendarApi = calendarRef.current.getApi();
    if (!calendarApi) return;

    // Calculate boundaries for each day of the week
    const newBoundaries: Array<{
      start: number;
      end: number;
      dayIndex: number;
    }> = [];

    // Get the current view's date range
    const viewStart = calendarApi.view.currentStart;
    const viewEnd = calendarApi.view.currentEnd;

    // Iterate through each day in the current view
    const current = new Date(viewStart);
    while (current < viewEnd) {
      const dayOfWeek = current.getDay();
      
      if (config.days.includes(dayOfWeek)) {
        // Calculate start and end positions as percentages
        const dayStart = config.startHour * 60; // minutes from midnight
        const dayEnd = config.endHour * 60; // minutes from midnight
        const totalDayMinutes = 24 * 60; // total minutes in a day
        
        const startPercent = (dayStart / totalDayMinutes) * 100;
        const endPercent = (dayEnd / totalDayMinutes) * 100;
        
        newBoundaries.push({
          start: startPercent,
          end: endPercent,
          dayIndex: dayOfWeek,
        });
      }
      
      current.setDate(current.getDate() + 1);
    }

    setBoundaries(newBoundaries);
  }, [config, calendarRef, currentDate]);

  if (!config.enabled || boundaries.length === 0) {
    return null;
  }

  return (
    <div className="business-hours-boundaries pointer-events-none">
      {boundaries.map((boundary, index) => (
        <div
          key={index}
          className="absolute left-0 right-0 bg-green-100/20 border-t-2 border-b-2 border-green-300/50"
          style={{
            top: `${boundary.start}%`,
            height: `${boundary.end - boundary.start}%`,
            zIndex: 1,
          }}
        >
          <div className="relative h-full">
            {/* Business hours label */}
            <div className="absolute top-1 left-1 text-xs text-green-700 font-medium bg-green-50/80 px-2 py-1 rounded">
              Arbetstid
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Component for rendering business hours overlay during drag operations
export function BusinessHoursOverlay({ 
  config, 
  calendarRef, 
  isVisible 
}: BusinessHoursOverlayProps) {
  const [overlayElements, setOverlayElements] = useState<Array<{
    left: number;
    top: number;
    width: number;
    height: number;
    dayIndex: number;
  }>>([]);

  useEffect(() => {
    if (!isVisible || !config.enabled || !calendarRef.current) {
      setOverlayElements([]);
      return;
    }

    const calendarApi = calendarRef.current.getApi();
    if (!calendarApi) return;

    // Get all day cells in the current view
    const dayCells = calendarApi.el.querySelectorAll('.fc-daygrid-day');
    const elements: Array<{
      left: number;
      top: number;
      width: number;
      height: number;
      dayIndex: number;
    }> = [];

    dayCells.forEach((cell: Element, index: number) => {
      const cellDate = new Date(cell.getAttribute('data-date') || '');
      const dayOfWeek = cellDate.getDay();
      
      if (config.days.includes(dayOfWeek)) {
        const rect = cell.getBoundingClientRect();
        const calendarRect = calendarApi.el.getBoundingClientRect();
        
        // Calculate business hours area within this day cell
        const dayStart = config.startHour * 60;
        const dayEnd = config.endHour * 60;
        const totalDayMinutes = 24 * 60;
        
        const startPercent = dayStart / totalDayMinutes;
        const endPercent = dayEnd / totalDayMinutes;
        
        const businessHeight = rect.height * (endPercent - startPercent);
        const businessTop = rect.top - calendarRect.top + (rect.height * startPercent);
        
        elements.push({
          left: rect.left - calendarRect.left,
          top: businessTop,
          width: rect.width,
          height: businessHeight,
          dayIndex: dayOfWeek,
        });
      }
    });

    setOverlayElements(elements);
  }, [config, calendarRef, isVisible]);

  if (!isVisible || !config.enabled) {
    return null;
  }

  return (
    <div className="business-hours-overlay pointer-events-none">
      {overlayElements.map((element, index) => (
        <div
          key={index}
          className="absolute bg-green-400/10 border border-green-400/30 rounded"
          style={{
            left: `${element.left}px`,
            top: `${element.top}px`,
            width: `${element.width}px`,
            height: `${element.height}px`,
            zIndex: 2,
          }}
        />
      ))}
    </div>
  );
}

// Main component for business hours visual feedback during drag operations
export function BusinessHoursIndicator({
  businessHoursWarning,
  isVisible,
  position,
  calendarRef,
  config = DEFAULT_BUSINESS_HOURS,
}: BusinessHoursIndicatorProps) {
  const indicatorRef = useRef<HTMLDivElement>(null);
  const [indicatorPosition, setIndicatorPosition] = useState<Point | null>(null);

  // Update indicator position when drag position changes
  useEffect(() => {
    if (isVisible && position && calendarRef?.current) {
      const calendarApi = calendarRef.current.getApi();
      if (calendarApi && calendarApi.el) {
        const calendarRect = calendarApi.el.getBoundingClientRect();
        setIndicatorPosition({
          x: position.x - calendarRect.left,
          y: position.y - calendarRect.top,
        });
      }
    } else {
      setIndicatorPosition(null);
    }
  }, [isVisible, position, calendarRef]);

  // Determine indicator state based on warning
  const indicatorState = useMemo(() => {
    if (!businessHoursWarning || !businessHoursWarning.isOutsideHours) {
      return {
        show: false,
        type: 'success' as const,
        message: 'Inom arbetstid',
        color: 'green',
      };
    }

    const { warningLevel, minutesOutside } = businessHoursWarning;

    switch (warningLevel) {
      case 'error':
        return {
          show: true,
          type: 'error' as const,
          message: `${minutesOutside} min utanför arbetstid`,
          color: 'red',
        };
      case 'warning':
        return {
          show: true,
          type: 'warning' as const,
          message: `${minutesOutside} min utanför arbetstid`,
          color: 'amber',
        };
      case 'info':
        return {
          show: true,
          type: 'info' as const,
          message: `${minutesOutside} min utanför arbetstid`,
          color: 'blue',
        };
      default:
        return {
          show: false,
          type: 'success' as const,
          message: 'Inom arbetstid',
          color: 'green',
        };
    }
  }, [businessHoursWarning]);

  // Get indicator styles
  const getIndicatorStyles = useCallback(() => {
    if (!indicatorPosition || !indicatorState.show) {
      return { display: 'none' };
    }

    const baseStyles = {
      position: 'absolute' as const,
      left: `${indicatorPosition.x}px`,
      top: `${indicatorPosition.y}px`,
      transform: 'translate(-50%, -100%)',
      zIndex: 1000,
      pointerEvents: 'none' as const,
    };

    const colorStyles: Record<string, string> = {
      success: 'bg-green-50 border-green-300 text-green-900',
      warning: 'bg-amber-50 border-amber-300 text-amber-900',
      error: 'bg-red-50 border-red-300 text-red-900',
      info: 'bg-blue-50 border-blue-300 text-blue-900',
    };

    return {
      ...baseStyles,
      className: `business-hours-indicator px-3 py-2 rounded-lg border-2 shadow-lg text-sm font-medium ${colorStyles[indicatorState.color]}`,
    };
  }, [indicatorPosition, indicatorState]);

  // Get indicator icon
  const getIndicatorIcon = useCallback(() => {
    switch (indicatorState.type) {
      case 'error': return '⚠️';
      case 'warning': return '⚡';
      case 'info': return 'ℹ️';
      case 'success': return '✓';
      default: return '🕐';
    }
  }, [indicatorState]);

  if (!isVisible || !config.enabled) {
    return null;
  }

  return (
    <div className="business-hours-indicator-container">
      {/* Main indicator */}
      <div
        ref={indicatorRef}
        style={getIndicatorStyles()}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{getIndicatorIcon()}</span>
          <span>{indicatorState.message}</span>
        </div>
        
        {/* Suggested time */}
        {businessHoursWarning?.suggestedTime && (
          <div className="mt-2 text-xs opacity-80">
            Förslag: {formatTime(businessHoursWarning.suggestedTime.start)} - 
            {formatTime(businessHoursWarning.suggestedTime.end)}
          </div>
        )}
      </div>

      {/* Business hours overlay */}
      <BusinessHoursOverlay
        config={config}
        calendarRef={calendarRef!}
        isVisible={isVisible}
      />
    </div>
  );
}

// Component for rendering business hours status in the calendar header
export function BusinessHoursStatus({ 
  config 
}: { 
  config: BusinessHoursConfig 
}) {
  if (!config.enabled) {
    return (
      <div className="business-hours-status text-sm text-neutral-500">
        Arbetstid: Inaktiverad
      </div>
    );
  }

  const dayNames = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];
  const activeDays = config.days.map(day => dayNames[day]).join(', ');

  return (
    <div className="business-hours-status text-sm text-neutral-600">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
        <span>Arbetstid: {config.startHour.toString().padStart(2, '0')}:00 - 
          {config.endHour.toString().padStart(2, '0')}:00</span>
      </div>
      <div className="text-xs text-neutral-500 mt-1">
        Dagar: {activeDays}
      </div>
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
    <div className="business-hours-legend flex items-center gap-4 text-xs text-neutral-600 p-2 bg-neutral-50 rounded">
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 bg-green-100/50 border border-green-300/50 rounded"></div>
        <span>Arbetstid</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 bg-amber-100/50 border border-amber-300/50 rounded"></div>
        <span>Varning</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 bg-red-100/50 border border-red-300/50 rounded"></div>
        <span>Fel</span>
      </div>
    </div>
  );
}

// Helper function to format time
function formatTime(date: Date): string {
  return date.toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

// Hook for managing business hours indicators
export function useBusinessHoursIndicator(config?: BusinessHoursConfig) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentWarning, setCurrentWarning] = useState<BusinessHoursWarning | undefined>();

  // Show indicator with warning
  const showIndicator = useCallback((warning: BusinessHoursWarning) => {
    setCurrentWarning(warning);
    setIsVisible(true);
  }, []);

  // Hide indicator
  const hideIndicator = useCallback(() => {
    setIsVisible(false);
    setCurrentWarning(undefined);
  }, []);

  // Update warning
  const updateWarning = useCallback((warning: BusinessHoursWarning) => {
    setCurrentWarning(warning);
  }, []);

  return {
    isVisible,
    currentWarning,
    showIndicator,
    hideIndicator,
    updateWarning,
  };
}

// Add missing import
import { useState } from "react";